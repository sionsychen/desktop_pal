export const Channels = {
  ChatSend: 'chat:send',
  ChatDelta: 'chat:delta',
  ChatDone: 'chat:done',
  ChatError: 'chat:error',
  ChatAbort: 'chat:abort',
  PassthroughSet: 'passthrough:set',
  WindowMove: 'window:move',
  WindowQuit: 'window:quit',
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsTest: 'settings:test',
} as const
export type ChannelName = (typeof Channels)[keyof typeof Channels]
