export enum ETabCloudChatRoutes {
  TabCloudChat = 'TabCloudChat',
  Conversation = 'Conversation',
  ChatSettings = 'ChatSettings',
}

export type ITabCloudChatParamList = {
  [ETabCloudChatRoutes.ChatSettings]: { peerUserId: string };
  [ETabCloudChatRoutes.TabCloudChat]: undefined;
  [ETabCloudChatRoutes.Conversation]: {
    peerUserId: string;
  };
};
