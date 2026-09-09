export enum ETabCloudChatRoutes {
  TabCloudChat = 'TabCloudChat',
  Conversation = 'Conversation',
}

export type ITabCloudChatParamList = {
  [ETabCloudChatRoutes.TabCloudChat]: undefined;
  [ETabCloudChatRoutes.Conversation]: {
    peerUserId: string;
  };
};
