import * as Haptics from 'expo-haptics';

const safe = async (fn: () => Promise<void> | void) => {
  try { await fn(); } catch {}
};

export const tap = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

export const select = () =>
  safe(() => Haptics.selectionAsync());

export const success = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

export const warning = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

export const error = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));


export const withHaptics = <T extends (...args: any[]) => any>(
  handler: T,
  kind: 'tap' | 'select' | 'success' | 'warning' | 'error' = 'tap'
) => {
  const map = { tap, select, success, warning, error } as const;
  return (...args: Parameters<T>) => { map[kind](); return handler?.(...args); };
};
