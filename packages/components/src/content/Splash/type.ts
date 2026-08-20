import type { PropsWithChildren } from 'react';

import type { ImageSourcePropType, LayoutChangeEvent } from 'react-native';

export interface ISplashViewProps {
  canDismissSplash: boolean;
  onExit?: () => void;
  source?: ImageSourcePropType;
}

export type ISplashViewChildrenContentProps = PropsWithChildren<{
  onLayout?: (event: LayoutChangeEvent) => void;
}>;
