import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';
import type {
  ICloudChatAuthSession,
  ICloudChatConversation,
  ICloudChatDbData,
  ICloudChatMessage,
  ICloudChatPeerRecord,
} from '@onekeyhq/shared/types/cloudChat';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

const DEFAULT_DATA: ICloudChatDbData = {
  conversations: {},
};

const MAX_MESSAGES_PER_CONVERSATION = 200;

export class SimpleDbEntityCloudChat extends SimpleDbEntityBase<ICloudChatDbData> {
  entityName = 'cloudChat';

  override enableCache = false;

  @backgroundMethod()
  async getData(): Promise<ICloudChatDbData> {
    return (await this.getRawData()) ?? DEFAULT_DATA;
  }

  @backgroundMethod()
  async getApiBaseUrl(): Promise<string | undefined> {
    const data = await this.getData();
    return data.apiBaseUrl || data.relayUrl;
  }

  @backgroundMethod()
  async getRelayUrl(): Promise<string | undefined> {
    return this.getApiBaseUrl();
  }

  @backgroundMethod()
  async setApiBaseUrl(apiBaseUrl: string): Promise<void> {
    await this.setRawData((current) => ({
      ...(current ?? DEFAULT_DATA),
      apiBaseUrl,
      relayUrl: apiBaseUrl,
      conversations: current?.conversations ?? {},
      session: current?.session,
      peers: current?.peers,
    }));
  }

  @backgroundMethod()
  async setRelayUrl(relayUrl: string): Promise<void> {
    await this.setApiBaseUrl(relayUrl);
  }

  @backgroundMethod()
  async getSession(): Promise<ICloudChatAuthSession | undefined> {
    const data = await this.getData();
    return data.session;
  }

  @backgroundMethod()
  async setSession(session: ICloudChatAuthSession | undefined): Promise<void> {
    await this.setRawData((current) => ({
      ...(current ?? DEFAULT_DATA),
      conversations: current?.conversations ?? {},
      apiBaseUrl: current?.apiBaseUrl,
      relayUrl: current?.relayUrl,
      peers: current?.peers,
      session,
    }));
  }

  @backgroundMethod()
  async getPeer(address: string): Promise<ICloudChatPeerRecord | undefined> {
    const data = await this.getData();
    return data.peers?.[address];
  }

  @backgroundMethod()
  async upsertPeer(peer: ICloudChatPeerRecord): Promise<void> {
    await this.setRawData((current) => {
      const data = current ?? DEFAULT_DATA;
      return {
        ...data,
        conversations: data.conversations ?? {},
        peers: {
          ...data.peers,
          [peer.address]: peer,
        },
      };
    });
  }

  @backgroundMethod()
  async listConversations(): Promise<ICloudChatConversation[]> {
    const data = await this.getData();
    return Object.values(data.conversations).toSorted(
      (a, b) => b.lastMessageAt - a.lastMessageAt,
    );
  }

  @backgroundMethod()
  async getConversation(
    conversationId: string,
  ): Promise<ICloudChatConversation | undefined> {
    const data = await this.getData();
    return data.conversations[conversationId];
  }

  @backgroundMethod()
  async upsertPeerConversation({
    conversation,
  }: {
    conversation: ICloudChatConversation;
  }): Promise<ICloudChatConversation> {
    await this.setRawData((current) => {
      const data = current ?? DEFAULT_DATA;
      const existing = data.conversations[conversation.id];
      const next: ICloudChatConversation = existing
        ? {
            ...existing,
            peerUserId: conversation.peerUserId,
            peerServiceId: conversation.peerServiceId || existing.peerServiceId,
            lastMessagePreview:
              conversation.lastMessagePreview || existing.lastMessagePreview,
            lastMessageAt: Math.max(
              existing.lastMessageAt,
              conversation.lastMessageAt,
            ),
          }
        : conversation;
      return {
        ...data,
        conversations: {
          ...data.conversations,
          [conversation.id]: next,
        },
      };
    });
    const saved = await this.getConversation(conversation.id);
    return saved ?? conversation;
  }

  @backgroundMethod()
  async appendMessage({
    conversationId,
    peerUserId,
    message,
    incrementUnread,
  }: {
    conversationId: string;
    peerUserId: string;
    message: ICloudChatMessage;
    incrementUnread: boolean;
  }): Promise<ICloudChatConversation> {
    let result: ICloudChatConversation | undefined;
    await this.setRawData((current) => {
      const data = current ?? DEFAULT_DATA;
      const existing = data.conversations[conversationId];
      const messages = [...(existing?.messages ?? []), message].slice(
        -MAX_MESSAGES_PER_CONVERSATION,
      );
      const next: ICloudChatConversation = {
        id: conversationId,
        peerUserId,
        peerServiceId: existing?.peerServiceId,
        lastMessagePreview: message.text,
        lastMessageAt: message.createdAt,
        unreadCount: incrementUnread
          ? (existing?.unreadCount ?? 0) + 1
          : (existing?.unreadCount ?? 0),
        messages,
      };
      result = next;
      return {
        ...data,
        conversations: {
          ...data.conversations,
          [conversationId]: next,
        },
      };
    });
    return result as ICloudChatConversation;
  }

  @backgroundMethod()
  async markConversationRead(conversationId: string): Promise<void> {
    await this.setRawData((current) => {
      const data = current ?? DEFAULT_DATA;
      const existing = data.conversations[conversationId];
      if (!existing) {
        return data;
      }
      return {
        ...data,
        conversations: {
          ...data.conversations,
          [conversationId]: {
            ...existing,
            unreadCount: 0,
          },
        },
      };
    });
  }
}
