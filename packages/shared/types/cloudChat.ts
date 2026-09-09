export type ICloudChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  createdAt: number;
  /** Sent means accepted by the server, not read by the recipient. */
  status: 'local' | 'sent' | 'received' | 'failed';
};

export type ICloudChatConversation = {
  id: string;
  peerUserId: string;
  peerServiceId?: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
  messages: ICloudChatMessage[];
};

export type ICloudChatAuthSession = {
  address: string;
  userId: string;
  serviceId: string;
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  registered: boolean;
};

export type ICloudChatPeerRecord = {
  address: string;
  serviceId: string;
};

export type ICloudChatDbData = {
  apiBaseUrl?: string;
  /** @deprecated migrated to apiBaseUrl */
  relayUrl?: string;
  session?: ICloudChatAuthSession;
  peers?: Record<string, ICloudChatPeerRecord>;
  conversations: Record<string, ICloudChatConversation>;
};

export type ICloudChatSnapshot = {
  selfUserId: string;
  serviceId: string;
  apiBaseUrl: string;
  relayUrl: string;
  connected: boolean;
  connecting: boolean;
  loggedIn: boolean;
  signalReady: boolean;
  lastError?: string;
  conversations: ICloudChatConversation[];
};

export type ICloudChatAtomState = {
  connected: boolean;
  connecting: boolean;
  loggedIn: boolean;
  signalReady: boolean;
  apiBaseUrl: string;
  relayUrl: string;
  selfUserId: string;
  serviceId: string;
  lastError?: string;
};

export type ICloudChatChallengeResponse = {
  challenge_id: string;
  message: string;
  expires_at: string;
};

export type ICloudChatUser = {
  id: string;
  address: string;
  service_id: string;
};

export type ICloudChatAuthResponse = {
  user: ICloudChatUser;
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type ICloudChatEnvelope = {
  id: string;
  sender_service_id: string;
  sender_device_id: number;
  client_message_id: string;
  message_type: 'prekey' | 'whisper';
  ciphertext: string;
  created_at: string;
};

export type ICloudChatPublicKey = {
  key_id: number;
  public_key: string;
  signature?: string;
};

export type ICloudChatKeyUpload = {
  device_id: number;
  registration_id: number;
  identity_key: string;
  client_library: string;
  signed_pre_key: ICloudChatPublicKey;
  pq_last_resort_pre_key: ICloudChatPublicKey;
  pre_keys: ICloudChatPublicKey[];
  pq_pre_keys: ICloudChatPublicKey[];
};

export type ICloudChatKeyCounts = {
  device_id: number;
  registration_id: number;
  pre_keys: number;
  pq_pre_keys: number;
};

export type ICloudChatClaim = {
  service_id: string;
  device_id: number;
  request_id: string;
};

export type ICloudChatBundle = {
  service_id: string;
  device_id: number;
  registration_id: number;
  identity_key: string;
  client_library: string;
  signed_pre_key: ICloudChatPublicKey;
  pre_key: ICloudChatPublicKey | null;
  pq_pre_key: ICloudChatPublicKey;
  pq_is_last_resort: boolean;
};

export type ICloudChatSendBody = {
  recipient_service_id: string;
  recipient_device_id: number;
  recipient_registration_id: number;
  client_message_id: string;
  message_type: 'prekey' | 'whisper';
  ciphertext: string;
};

export type ICloudChatNativeOperations = {
  getAuth: [Record<string, never>, ICloudChatAuthSession | null];
  setAuth: [{ session: ICloudChatAuthSession | null }, null];
  bind: [{ address: string; serviceId: string }, null];
  registration: [Record<string, never>, number];
  pendingUpload: [Record<string, never>, ICloudChatKeyUpload | null];
  upload: [{ ec: number; pq: number }, ICloudChatKeyUpload];
  uploaded: [Record<string, never>, null];
  addPeer: [{ address: string; serviceId: string }, ICloudChatConversation];
  list: [Record<string, never>, ICloudChatConversation[]];
  conversation: [{ peer: string }, ICloudChatConversation | null];
  read: [{ peer: string }, null];
  claim: [{ peer: string }, ICloudChatClaim | null];
  bundle: [{ peer: string; bundle: ICloudChatBundle }, null];
  send: [{ peer: string; text: string }, ICloudChatMessage];
  outbox: [Record<string, never>, ICloudChatSendBody[]];
  sent: [{ id: string }, null];
  rejected: [{ id: string }, null];
  retry: [{ peer: string }, null];
  receive: [{ envelope: ICloudChatEnvelope }, null];
  pendingAcknowledgements: [Record<string, never>, string[]];
  acknowledged: [{ ids: string[] }, null];
  fingerprints: [{ peer: string }, { self: string; peer: string }];
};
