import axios from 'axios';

import {
  CLOUD_CHAT_INBOX_LIMIT,
  createCloudChatApiError,
  isCloudChatRetryableStatus,
  parseCloudChatApiErrorCode,
} from '@onekeyhq/shared/src/utils/cloudChatApi';
import type {
  ICloudChatAuthResponse,
  ICloudChatBundle,
  ICloudChatChallengeResponse,
  ICloudChatClaim,
  ICloudChatEnvelope,
  ICloudChatKeyCounts,
  ICloudChatKeyUpload,
  ICloudChatSendBody,
  ICloudChatUser,
} from '@onekeyhq/shared/types/cloudChat';

import type { AxiosError, AxiosInstance } from 'axios';

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRY_ATTEMPTS = 3;

type ICloudChatAuthPurpose = 'register' | 'login';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readHttpStatus(error: unknown): number {
  const converted = error as { httpStatusCode?: number } | undefined;
  return (
    converted?.httpStatusCode ??
    (error as AxiosError | undefined)?.response?.status ??
    0
  );
}

export class CloudChatHttpClient {
  private retryNotBefore = 0;
  constructor(
    private getBaseUrl: () => Promise<string>,
    private getAccessToken: () => Promise<string | undefined>,
  ) {}

  async ready(): Promise<boolean> {
    const response = await this.request<{ status?: string }>({
      method: 'GET',
      path: '/readyz',
      auth: false,
      retry: true,
    });
    return Boolean(response);
  }

  async challenge(params: {
    address: string;
    chainId: number;
    purpose: ICloudChatAuthPurpose;
  }): Promise<ICloudChatChallengeResponse> {
    return this.request<ICloudChatChallengeResponse>({
      method: 'POST',
      path: '/v1/auth/challenge',
      auth: false,
      body: {
        address: params.address,
        chain_id: params.chainId,
        purpose: params.purpose,
      },
    });
  }

  async register(params: {
    challengeId: string;
    signature: string;
  }): Promise<ICloudChatAuthResponse> {
    return this.submitAuth('/v1/auth/register', params);
  }

  async login(params: {
    challengeId: string;
    signature: string;
  }): Promise<ICloudChatAuthResponse> {
    return this.submitAuth('/v1/auth/login', params);
  }

  async logout(): Promise<void> {
    await this.request<{ ok?: boolean }>({
      method: 'POST',
      path: '/v1/auth/logout',
      auth: true,
    });
  }

  async me(): Promise<ICloudChatUser> {
    return this.request<ICloudChatUser>({
      method: 'GET',
      path: '/v1/users/me',
      auth: true,
      retry: true,
    });
  }

  async lookup(address: string): Promise<ICloudChatUser> {
    return this.request<ICloudChatUser>({
      method: 'GET',
      path: '/v1/users/lookup',
      auth: true,
      retry: true,
      query: { address },
    });
  }

  async listInbox(): Promise<ICloudChatEnvelope[]> {
    const response = await this.request<{ messages?: ICloudChatEnvelope[] }>({
      method: 'GET',
      path: '/v1/signal/messages',
      auth: true,
      retry: true,
      query: { limit: CLOUD_CHAT_INBOX_LIMIT },
    });
    return response.messages ?? [];
  }

  async ackInbox(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.request<{ ok?: boolean }>({
      method: 'POST',
      path: '/v1/signal/messages/ack',
      auth: true,
      body: { ids: ids.slice(0, 100) },
      retry: true,
    });
  }

  async uploadKeys(body: ICloudChatKeyUpload): Promise<void> {
    await this.request({
      method: 'PUT',
      path: '/v1/signal/keys',
      auth: true,
      body,
      retry: true,
    });
  }

  async keyCounts(): Promise<ICloudChatKeyCounts> {
    return this.request({
      method: 'GET',
      path: '/v1/signal/keys',
      auth: true,
      retry: true,
    });
  }

  async claimKeys(body: ICloudChatClaim): Promise<ICloudChatBundle> {
    return this.request({
      method: 'POST',
      path: '/v1/signal/prekeys/claim',
      auth: true,
      body,
      retry: true,
    });
  }

  async sendCiphertext(
    body: ICloudChatSendBody,
  ): Promise<{ id: string; acknowledged: boolean }> {
    return this.request({
      method: 'POST',
      path: '/v1/signal/messages',
      auth: true,
      body,
      retry: true,
    });
  }

  private async submitAuth(
    path: string,
    params: { challengeId: string; signature: string },
  ): Promise<ICloudChatAuthResponse> {
    return this.request<ICloudChatAuthResponse>({
      method: 'POST',
      path,
      auth: false,
      body: {
        challenge_id: params.challengeId,
        signature: params.signature,
      },
    });
  }

  private async request<T>({
    method,
    path,
    auth,
    body,
    query,
    retry = false,
  }: {
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    auth: boolean;
    body?: Record<string, unknown>;
    query?: Record<string, string | number>;
    retry?: boolean;
  }): Promise<T> {
    let lastError: unknown;
    const attempts = retry ? MAX_RETRY_ATTEMPTS : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.requestOnce<T>({
          method,
          path,
          auth,
          body,
          query,
        });
      } catch (error) {
        lastError = error;
        const status = readHttpStatus(error);
        const canRetry =
          retry && isCloudChatRetryableStatus(status) && attempt < attempts - 1;
        if (!canRetry) {
          throw error;
        }
        await sleep(400 * 2 ** attempt + Math.floor(Math.random() * 200));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('云聊请求失败');
  }

  private async requestOnce<T>({
    method,
    path,
    auth,
    body,
    query,
  }: {
    method: 'GET' | 'POST' | 'PUT';
    path: string;
    auth: boolean;
    body?: Record<string, unknown>;
    query?: Record<string, string | number>;
  }): Promise<T> {
    // One cooldown for all operations on this authenticated client, including polling.
    while (Date.now() < this.retryNotBefore) {
      await sleep(Math.min(60_000, this.retryNotBefore - Date.now()));
    }
    const client = await this.createClient(auth);
    try {
      const response = await client.request<T>({
        method,
        url: path,
        data: body,
        params: query,
      });
      return response.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private async createClient(auth: boolean): Promise<AxiosInstance> {
    const baseURL = await this.getBaseUrl();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (auth) {
      const token = await this.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
    return axios.create({
      baseURL,
      timeout: REQUEST_TIMEOUT_MS,
      headers,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private toApiError(error: unknown): Error {
    const axiosError = error as AxiosError;
    const httpStatus = axiosError.response?.status ?? 0;
    if (httpStatus === 429 || httpStatus === 503) {
      const header = axiosError.response?.headers?.['retry-after'];
      const value =
        typeof header === 'string' || typeof header === 'number'
          ? String(header).trim()
          : '';
      const seconds = /^\d+$/.test(value) ? Number(value) : undefined;
      const deadline =
        seconds === undefined ? Date.parse(value) : Date.now() + seconds * 1000;
      const fallback = httpStatus === 429 ? 60_000 : 1000;
      this.retryNotBefore = Math.max(
        this.retryNotBefore,
        Number.isFinite(deadline)
          ? Math.max(Date.now(), deadline)
          : Date.now() + fallback,
      );
    }
    const code = parseCloudChatApiErrorCode(axiosError.response?.data);
    if (httpStatus > 0) {
      return createCloudChatApiError({ httpStatus, code });
    }
    return createCloudChatApiError({
      httpStatus: 0,
      message: '无法连接云聊服务，请检查地址和网络',
    });
  }
}
