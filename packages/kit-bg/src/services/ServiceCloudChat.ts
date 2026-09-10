import {
  backgroundClass,
  backgroundMethod,
} from '@onekeyhq/shared/src/background/backgroundDecorators';
import {
  cloudChatNative,
  getCloudChatLocalApiBaseUrl,
} from '@onekeyhq/shared/src/cloudChat/signal';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import bufferUtils from '@onekeyhq/shared/src/utils/bufferUtils';
import {
  CLOUD_CHAT_AUTH_CHAIN_ID,
  buildCloudChatAccessExpiresAt,
  isCloudChatJwtExpired,
  normalizeCloudChatApiBaseUrl,
} from '@onekeyhq/shared/src/utils/cloudChatApi';
import {
  normalizeCloudChatUserId,
  previewCloudChatText,
  resolveCloudChatApiBaseUrl,
  shouldResolveCloudChatEvmAccount,
} from '@onekeyhq/shared/src/utils/cloudChatUtils';
import hexUtils from '@onekeyhq/shared/src/utils/hexUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import type {
  ICloudChatAtomState,
  ICloudChatAuthSession,
  ICloudChatConversation,
  ICloudChatKeyCounts,
  ICloudChatMessage,
  ICloudChatSnapshot,
} from '@onekeyhq/shared/types/cloudChat';
import { EMessageTypesEth } from '@onekeyhq/shared/types/message';

import { cloudChatAtom } from '../states/jotai/atoms/cloudChat';

import { CloudChatHttpClient } from './cloudChat/CloudChatHttpClient';
import { CloudChatSerialQueue } from './cloudChat/CloudChatSerialQueue';
import ServiceBase from './ServiceBase';

import type { IAccountDeriveTypes } from '../vaults/types';

type IAccount = {
  accountId: string;
  networkId: string;
  address: string;
  indexedAccountId?: string;
};
type IContext = {
  scope: string;
  baseUrl: string;
  account: IAccount;
  session: ICloudChatAuthSession;
  http: CloudChatHttpClient;
  version: number;
};

@backgroundClass()
class ServiceCloudChat extends ServiceBase {
  private readonly queue = new CloudChatSerialQueue();
  private version = 0;
  private active: IContext | undefined;
  private selected: IAccount | undefined;
  private viewScope: { scope: string; version: number } | undefined;
  private blockedScopes = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pollFailures = 0;
  private keysCheckedAt = 0;

  private check(version: number) {
    if (version !== this.version)
      throw new OneKeyLocalError('钱包或云聊服务已切换，请重试');
  }

  private stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private async sync(
    patch: Partial<ICloudChatAtomState>,
    version = this.version,
  ) {
    this.check(version);
    const previous = await cloudChatAtom.get();
    this.check(version);
    await cloudChatAtom.set({ ...previous, ...patch });
    appEventBus.emit(EAppEventBusNames.CloudChatUpdated, {});
  }

  private async resolveAccount(params: IAccount): Promise<IAccount> {
    let result = params;
    if (shouldResolveCloudChatEvmAccount(params)) {
      const networkId = getNetworkIdsMap().eth;
      const deriveType: IAccountDeriveTypes =
        (await this.backgroundApi.serviceNetwork.getGlobalDeriveTypeOfNetwork({
          networkId,
        })) || 'default';
      const account = await this.backgroundApi.serviceAccount.getNetworkAccount(
        {
          accountId: params.indexedAccountId
            ? undefined
            : params.accountId || undefined,
          indexedAccountId: params.indexedAccountId || undefined,
          networkId,
          deriveType,
        },
      );
      result = { accountId: account.id, networkId, address: account.address };
    }
    const address = normalizeCloudChatUserId(result.address);
    if (
      !networkUtils.isEvmNetwork({ networkId: result.networkId }) ||
      !/^0x[0-9a-f]{40}$/.test(address) ||
      /^0x0{40}$/.test(address)
    ) {
      throw new OneKeyLocalError('云聊需要有效的 EVM 钱包账户');
    }
    return { ...result, address };
  }

  @backgroundMethod()
  async getApiBaseUrl(): Promise<string> {
    return resolveCloudChatApiBaseUrl({
      savedUrl: await this.backgroundApi.simpleDb.cloudChat.getApiBaseUrl(),
      isNativeAndroid: platformEnv.isNativeAndroid,
      localIntegrationUrl: getCloudChatLocalApiBaseUrl(),
    });
  }

  @backgroundMethod()
  async getRelayUrl() {
    return this.getApiBaseUrl();
  }

  @backgroundMethod()
  async setApiBaseUrl({ apiBaseUrl }: { apiBaseUrl: string }): Promise<void> {
    const base = normalizeCloudChatApiBaseUrl(apiBaseUrl);
    const url = new URL(base);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /[\r\n]/.test(base)
    ) {
      throw new OneKeyLocalError(
        '请输入不含账号、查询参数的 HTTP/HTTPS 服务地址',
      );
    }
    this.version += 1;
    const version = this.version;
    this.stop();
    this.active = undefined;
    this.viewScope = undefined;
    await this.sync(
      {
        connected: false,
        loggedIn: false,
        connecting: false,
        signalReady: false,
        selfUserId: '',
        serviceId: '',
      },
      version,
    );
    await this.queue.run(async () => {
      this.check(version);
      await this.backgroundApi.simpleDb.cloudChat.setApiBaseUrl(base);
      await this.sync(
        { apiBaseUrl: base, relayUrl: base, lastError: undefined },
        version,
      );
    });
  }

  @backgroundMethod()
  async setRelayUrl({ relayUrl }: { relayUrl: string }) {
    return this.setApiBaseUrl({ apiBaseUrl: relayUrl });
  }

  @backgroundMethod()
  async getSnapshot(): Promise<ICloudChatSnapshot> {
    const version = this.version;
    const viewScope = this.viewScope;
    const atom = await cloudChatAtom.get();
    const baseUrl = await this.getApiBaseUrl();
    const conversations =
      viewScope && viewScope.version === version
        ? await cloudChatNative(viewScope.scope, 'list', {})
        : [];
    return {
      ...atom,
      apiBaseUrl: baseUrl,
      relayUrl: baseUrl,
      conversations:
        version === this.version
          ? conversations
              .toSorted((a, b) => b.lastMessageAt - a.lastMessageAt)
              .map((item) => ({
                ...item,
                lastMessagePreview: previewCloudChatText(
                  item.lastMessagePreview,
                ),
              }))
          : [],
    };
  }

  @backgroundMethod()
  async resumeSession(
    params: IAccount & { autoLogin?: boolean },
  ): Promise<void> {
    return this.select(params, false, params.autoLogin ?? false);
  }

  @backgroundMethod()
  async login(params: IAccount): Promise<void> {
    return this.select(params, true, true);
  }

  @backgroundMethod()
  async connect(params: {
    userId: string;
    accountId?: string;
    networkId?: string;
    indexedAccountId?: string;
    force?: boolean;
  }): Promise<void> {
    const accountId = params.accountId || this.selected?.accountId;
    const networkId = params.networkId || this.selected?.networkId;
    if (!accountId || !networkId) throw new OneKeyLocalError('请先选择钱包');
    return this.select(
      { ...params, accountId, networkId, address: params.userId },
      Boolean(params.force),
      Boolean(params.force),
    );
  }

  private async select(params: IAccount, force: boolean, autoLogin: boolean) {
    this.version += 1;
    const version = this.version;
    this.stop();
    this.active = undefined;
    this.viewScope = undefined;
    await this.sync(
      {
        connecting: true,
        connected: false,
        loggedIn: false,
        signalReady: false,
        selfUserId: '',
        serviceId: '',
        lastError: undefined,
      },
      version,
    );
    return this.queue.run(async () => {
      try {
        this.check(version);
        const account = await this.resolveAccount(params);
        this.check(version);
        this.selected = account;
        const baseUrl = await this.getApiBaseUrl();
        const scope = `${baseUrl}\n${account.address}`;
        this.check(version);
        this.viewScope = { scope, version };
        if (force) this.blockedScopes.delete(scope);
        await this.sync(
          {
            selfUserId: account.address,
            apiBaseUrl: baseUrl,
            relayUrl: baseUrl,
          },
          version,
        );
        // Legacy plaintext prototype data is not a source of cryptographic identity.
        const saved = await cloudChatNative(scope, 'getAuth', {});
        let session =
          saved &&
          !isCloudChatJwtExpired(saved.expiresAt) &&
          saved.address === account.address
            ? saved
            : undefined;
        if (session && !force) {
          try {
            const me = await this.client(baseUrl, session.accessToken).me();
            if (
              me.address.toLowerCase() !== account.address ||
              me.service_id !== session.serviceId
            )
              throw new OneKeyLocalError('云聊认证身份不匹配');
          } catch (error) {
            if ((error as OneKeyLocalError).httpStatusCode !== 401) throw error;
            session = undefined;
          }
        }
        this.check(version);
        if (!session || force) {
          if (!autoLogin || this.blockedScopes.has(scope)) {
            await this.sync(
              { connecting: false, lastError: '请签名登录云聊' },
              version,
            );
            return;
          }
          session = await this.authenticate(
            account,
            baseUrl,
            Boolean(saved),
            version,
          );
          this.check(version);
          await cloudChatNative(scope, 'setAuth', { session });
        }
        this.check(version);
        await cloudChatNative(scope, 'bind', {
          address: account.address,
          serviceId: session.serviceId,
        });
        const context: IContext = {
          scope,
          account,
          baseUrl,
          session,
          version,
          http: this.client(baseUrl, session.accessToken),
        };
        this.active = context;
        this.keysCheckedAt = 0;
        this.pollFailures = 0;
        await this.sync(
          {
            connecting: false,
            connected: true,
            loggedIn: true,
            serviceId: session.serviceId,
          },
          version,
        );
        try {
          await this.replenish(context);
          await this.sync({ signalReady: true, lastError: undefined }, version);
        } catch (error) {
          await this.report(error, context);
        }
        this.schedule(context);
      } catch (error) {
        if (version === this.version) {
          await this.sync(
            {
              connecting: false,
              signalReady: false,
              lastError:
                error instanceof Error ? error.message : '云聊连接失败',
            },
            version,
          );
        }
        throw error;
      }
    });
  }

  private client(baseUrl: string, token?: string) {
    // Capture both values; retries must never move to a newly selected account/server.
    return new CloudChatHttpClient(
      async () => baseUrl,
      async () => token,
    );
  }

  private async authenticate(
    account: IAccount,
    baseUrl: string,
    registered: boolean,
    version: number,
  ): Promise<ICloudChatAuthSession> {
    const http = this.client(baseUrl);
    const submit = async (purpose: 'register' | 'login') => {
      const challenge = await http.challenge({
        address: account.address,
        chainId: CLOUD_CHAT_AUTH_CHAIN_ID,
        purpose,
      });
      this.check(version);
      const message = hexUtils.addHexPrefix(
        bufferUtils.textToHex(challenge.message, 'utf8'),
      );
      const signature = await this.backgroundApi.serviceSend.signMessage({
        accountId: account.accountId,
        networkId: account.networkId,
        unsignedMessage: {
          type: EMessageTypesEth.PERSONAL_SIGN,
          message,
          payload: [message, account.address],
        },
      });
      this.check(version);
      return http[purpose]({
        challengeId: challenge.challenge_id,
        signature: hexUtils.addHexPrefix(signature),
      });
    };
    let auth;
    try {
      auth = await submit(registered ? 'login' : 'register');
    } catch (error) {
      const status = (error as OneKeyLocalError).httpStatusCode;
      if (!registered && status === 409) auth = await submit('login');
      else if (registered && status === 404) auth = await submit('register');
      else throw error;
    }
    this.check(version);
    const me = await this.client(baseUrl, auth.access_token).me();
    if (
      me.address.toLowerCase() !== account.address ||
      me.service_id !== auth.user.service_id ||
      !Number.isFinite(auth.expires_in) ||
      auth.expires_in <= 0
    )
      throw new OneKeyLocalError('云聊认证响应无效');
    return {
      address: account.address,
      userId: me.id,
      serviceId: me.service_id,
      accessToken: auth.access_token,
      tokenType: auth.token_type,
      expiresAt: buildCloudChatAccessExpiresAt(auth.expires_in),
      registered: true,
    };
  }

  @backgroundMethod()
  async disconnect(): Promise<void> {
    const context = this.active;
    this.version += 1;
    const version = this.version;
    this.stop();
    this.active = undefined;
    this.viewScope = undefined;
    if (context) this.blockedScopes.add(context.scope);
    await this.sync(
      {
        connecting: false,
        connected: false,
        loggedIn: false,
        signalReady: false,
        serviceId: '',
        lastError: undefined,
      },
      version,
    );
    await this.queue.run(async () => {
      if (!context) return;
      await cloudChatNative(context.scope, 'setAuth', { session: null });
      try {
        await context.http.logout();
      } catch {
        /* Local logout survives an unavailable server. */
      }
    });
  }

  private context(): IContext {
    const context = this.active;
    if (!context || context.version !== this.version)
      throw new OneKeyLocalError('请先登录云聊');
    if (isCloudChatJwtExpired(context.session.expiresAt))
      throw new OneKeyLocalError({
        message: '登录已过期，请重新签名登录',
        httpStatusCode: 401,
      });
    return context;
  }

  private async action<T>(task: (context: IContext) => Promise<T>): Promise<T> {
    const version = this.version;
    return this.queue.run(async () => {
      this.check(version);
      const context = this.active;
      try {
        const result = await task(this.context());
        this.check(version);
        return result;
      } catch (error) {
        if (context && version === this.version)
          await this.report(error, context);
        throw error;
      }
    });
  }

  @backgroundMethod()
  async addPeer({
    peerUserId,
  }: {
    peerUserId: string;
  }): Promise<ICloudChatConversation> {
    return this.action(async (context) => {
      const address = normalizeCloudChatUserId(peerUserId);
      if (
        !/^0x[0-9a-f]{40}$/.test(address) ||
        address === context.account.address
      )
        throw new OneKeyLocalError('请输入对方有效的钱包地址');
      const peer = await context.http.lookup(address);
      this.check(context.version);
      if (peer.address.toLowerCase() !== address)
        throw new OneKeyLocalError('联系人身份不匹配');
      const conversation = await cloudChatNative(context.scope, 'addPeer', {
        address,
        serviceId: peer.service_id,
      });
      await this.sync({}, context.version);
      return conversation;
    });
  }

  @backgroundMethod()
  async getConversation({
    peerUserId,
  }: {
    peerUserId: string;
  }): Promise<ICloudChatConversation | undefined> {
    const viewScope = this.viewScope;
    if (!viewScope) return undefined;
    return this.queue.run(async () => {
      this.check(viewScope.version);
      const conversation = await cloudChatNative(
        viewScope.scope,
        'conversation',
        { peer: peerUserId },
      );
      this.check(viewScope.version);
      return conversation ?? undefined;
    });
  }

  @backgroundMethod()
  async markRead({ peerUserId }: { peerUserId: string }): Promise<void> {
    const viewScope = this.viewScope;
    if (!viewScope) return;
    await this.queue.run(async () => {
      this.check(viewScope.version);
      await cloudChatNative(viewScope.scope, 'read', { peer: peerUserId });
    });
  }

  @backgroundMethod()
  async getFingerprints({ peerUserId }: { peerUserId: string }) {
    return this.action(async (context) =>
      cloudChatNative(context.scope, 'fingerprints', { peer: peerUserId }),
    );
  }

  @backgroundMethod()
  async sendMessage({
    peerUserId,
    text,
  }: {
    peerUserId: string;
    text: string;
  }): Promise<ICloudChatMessage> {
    return this.action(async (context) => {
      const atom = await cloudChatAtom.get();
      if (!atom.signalReady)
        throw new OneKeyLocalError('加密设备尚未就绪，请重新连接');
      const claim = await cloudChatNative(context.scope, 'claim', {
        peer: peerUserId,
      });
      if (claim) {
        const bundle = await context.http.claimKeys(claim);
        this.check(context.version);
        await cloudChatNative(context.scope, 'bundle', {
          peer: claim.service_id,
          bundle,
        });
      }
      this.check(context.version);
      const message = await cloudChatNative(context.scope, 'send', {
        peer: peerUserId,
        text,
      });
      // A durable queued message is accepted even when delivery is temporarily unavailable.
      await this.sync({}, context.version);
      this.schedule(context, 50);
      return message;
    });
  }

  private async replenish(context: IContext) {
    const { scope, http } = context;
    const pending = await cloudChatNative(scope, 'pendingUpload', {});
    if (pending) {
      await http.uploadKeys(pending);
      this.check(context.version);
      await cloudChatNative(scope, 'uploaded', {});
    }
    let counts: ICloudChatKeyCounts | undefined;
    try {
      counts = await http.keyCounts();
    } catch (error) {
      if ((error as OneKeyLocalError).httpStatusCode !== 404) throw error;
    }
    this.check(context.version);
    const registration = await cloudChatNative(scope, 'registration', {});
    if (
      counts &&
      (!registration ||
        counts.registration_id !== registration ||
        counts.device_id !== 1)
    )
      throw new OneKeyLocalError(
        '服务端已登记另一套加密身份；请勿清数据或重置密钥',
      );
    if (
      counts &&
      ![counts.pre_keys, counts.pq_pre_keys].every(
        (value) => Number.isInteger(value) && value >= 0,
      )
    )
      throw new OneKeyLocalError('预密钥库存响应无效');
    let ec = 100;
    let pq = 50;
    if (counts) {
      ec = counts.pre_keys <= 20 ? 100 - counts.pre_keys : 0;
      pq = counts.pq_pre_keys <= 10 ? 50 - counts.pq_pre_keys : 0;
    }
    if (ec || pq) {
      const upload = await cloudChatNative(scope, 'upload', { ec, pq });
      await http.uploadKeys(upload);
      this.check(context.version);
      await cloudChatNative(scope, 'uploaded', {});
    }
    this.keysCheckedAt = Date.now();
  }

  private schedule(context: IContext, delay?: number) {
    if (context.version !== this.version || this.active !== context) return;
    this.stop();
    this.timer = setTimeout(
      () => {
        void this.action(async (current) => this.pump(current))
          .catch(() => undefined)
          .finally(() => this.schedule(context));
      },
      delay ??
        Math.min(300_000, 3000 * 2 ** this.pollFailures) +
          Math.floor(Math.random() * 500),
    );
  }

  @backgroundMethod()
  async refresh(): Promise<void> {
    if (!this.active) {
      if (this.selected) await this.select(this.selected, false, false);
      return;
    }
    await this.action(async (context) => {
      this.keysCheckedAt = 0;
      await this.pump(context);
    });
  }

  @backgroundMethod()
  async retryMessages({ peerUserId }: { peerUserId: string }): Promise<void> {
    await this.action(async (context) => {
      await cloudChatNative(context.scope, 'retry', { peer: peerUserId });
      await this.sync({}, context.version);
      this.schedule(context, 50);
    });
  }

  private async pump(context: IContext) {
    const { scope, http } = context;
    if (Date.now() - this.keysCheckedAt > 15 * 60_000) {
      await this.replenish(context);
      await this.sync({ signalReady: true }, context.version);
    }
    // ACKs are persisted by the decrypt transaction and retried without decrypting again.
    const pendingAcknowledgements = (
      await cloudChatNative(scope, 'pendingAcknowledgements', {})
    ).slice(0, 100);
    if (pendingAcknowledgements.length) {
      await http.ackInbox(pendingAcknowledgements);
      this.check(context.version);
      await cloudChatNative(scope, 'acknowledged', {
        ids: pendingAcknowledgements,
      });
    }
    let deliveryError: Error | undefined;
    const outgoing = (await cloudChatNative(scope, 'outbox', {})).slice(0, 25);
    for (const body of outgoing) {
      this.check(context.version);
      try {
        await http.sendCiphertext(body);
        this.check(context.version);
        await cloudChatNative(scope, 'sent', { id: body.client_message_id });
      } catch (error) {
        const status = (error as OneKeyLocalError).httpStatusCode;
        if (status === 401) throw error;
        deliveryError =
          error instanceof Error ? error : new OneKeyLocalError('消息投递失败');
        if (status === 400 || status === 404 || status === 409) {
          await cloudChatNative(scope, 'rejected', {
            id: body.client_message_id,
          });
        } else {
          break;
        }
      }
    }
    const inbox = await http.listInbox();
    let decryptError = false;
    for (const envelope of inbox) {
      this.check(context.version);
      try {
        await cloudChatNative(scope, 'receive', { envelope });
      } catch {
        decryptError = true;
      }
    }
    this.pollFailures = 0;
    await this.sync(
      {
        lastError: decryptError
          ? '部分消息解密失败，已保留在服务端；请核对联系人安全指纹'
          : undefined,
      },
      context.version,
    );
    if (deliveryError) throw new OneKeyLocalError(deliveryError.message);
  }

  private async report(error: unknown, context: IContext) {
    if (context.version !== this.version) return;
    this.pollFailures = Math.min(this.pollFailures + 1, 7);
    if ((error as OneKeyLocalError).httpStatusCode === 401) {
      this.stop();
      this.active = undefined;
      await cloudChatNative(context.scope, 'setAuth', { session: null });
      await this.sync(
        {
          connected: false,
          loggedIn: false,
          signalReady: false,
          lastError: '登录已过期，请重新签名登录',
        },
        context.version,
      );
    } else {
      await this.sync(
        {
          lastError:
            error instanceof Error ? error.message : '云聊请求失败，稍后重试',
        },
        context.version,
      );
    }
  }
}

export default ServiceCloudChat;
