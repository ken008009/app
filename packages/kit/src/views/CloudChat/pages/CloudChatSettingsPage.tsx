import type { IPageScreenProps } from '@onekeyhq/components';
import {
  Icon,
  Page,
  ScrollView,
  SizableText,
  Switch,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import type {
  ETabCloudChatRoutes,
  ITabCloudChatParamList,
} from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';

const GROUPS = [
  ['设置备注', '推荐给好友'],
  ['查找聊天记录'],
  ['设置权限', '自动删除'],
  ['置顶', '消息免打扰'],
  ['清除历史消息'],
  ['举报'],
];

export default function CloudChatSettingsPage({
  route,
}: IPageScreenProps<ITabCloudChatParamList, ETabCloudChatRoutes.ChatSettings>) {
  const placeholder = () =>
    Toast.message({ title: '此功能即将开放，当前不会修改聊天数据' });
  return (
    <Page>
      <Page.Header title="聊天设置" />
      <Page.Body bg="$bgSubdued">
        <ScrollView>
          <XStack bg="$bg" p="$5" gap="$8" mb="$3">
            <YStack gap="$2" alignItems="center" maxWidth="$24">
              <YStack
                bg="$bgInfo"
                width="$14"
                height="$14"
                borderRadius="$3"
                alignItems="center"
                justifyContent="center"
              >
                <Icon name="PeopleOutline" size="$8" />
              </YStack>
              <SizableText numberOfLines={1}>
                {accountUtils.shortenAddress({
                  address: route.params.peerUserId,
                })}
              </SizableText>
            </YStack>
            <YStack
              width="$14"
              height="$14"
              borderWidth={1}
              borderStyle="dashed"
              borderColor="$borderStrong"
              borderRadius="$3"
              alignItems="center"
              justifyContent="center"
              onPress={placeholder}
              testID="cloud-chat-settings-add-member"
            >
              <Icon name="PlusLargeOutline" color="$iconSubdued" />
            </YStack>
          </XStack>
          {GROUPS.map((group) => (
            <YStack key={group[0]} bg="$bg" px="$4" mb="$3">
              {group.map((label, index) => (
                <XStack
                  key={label}
                  minHeight="$16"
                  gap="$3"
                  alignItems="center"
                  borderTopWidth={index ? 1 : 0}
                  borderColor="$borderSubdued"
                  onPress={placeholder}
                  testID={`cloud-chat-setting-${label}`}
                >
                  <SizableText flex={1} size="$bodyLg">
                    {label}
                  </SizableText>
                  <SizableText size="$bodySm" color="$textSubdued">
                    即将开放
                  </SizableText>
                  {label === '置顶' || label === '消息免打扰' ? (
                    <Switch
                      value={false}
                      disabled
                      testID={`cloud-chat-setting-${label}-switch`}
                    />
                  ) : (
                    <Icon
                      name="ChevronRightOutline"
                      size="$5"
                      color="$iconSubdued"
                    />
                  )}
                </XStack>
              ))}
            </YStack>
          ))}
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
