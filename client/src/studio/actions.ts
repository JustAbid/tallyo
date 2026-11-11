// Small bridge so cell renderers inside Studio can talk to the app shell.
export type ToastKind = 'ok' | 'error';

export const bridge = {
  notify: (_message: string, _kind: ToastKind = 'ok') => {},
  refresh: async () => {},
};
