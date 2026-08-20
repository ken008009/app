import {
  MineLanguageRow,
  MinePasswordRow,
  MineThemeRow,
  MineVersionRow,
} from './MineSpecialRows';
import { MineSettingsRow } from './MineSettingsRow';

import type { IMineMenuItem } from '../hooks/useMineMenuConfig';

export function MineMenuItemView({
  item,
  showDivider,
}: {
  item: IMineMenuItem;
  showDivider?: boolean;
}) {
  switch (item.kind) {
    case 'theme':
      return <MineThemeRow item={item} showDivider={showDivider} />;
    case 'language':
      return <MineLanguageRow item={item} showDivider={showDivider} />;
    case 'version':
      return <MineVersionRow item={item} showDivider={showDivider} />;
    case 'password':
      return <MinePasswordRow item={item} showDivider={showDivider} />;
    default:
      return (
        <MineSettingsRow
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          onPress={item.onPress}
          showDivider={showDivider}
        />
      );
  }
}
