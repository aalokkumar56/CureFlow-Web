// Notifications carry no identity, credentials or clinical content. Every
// recipient independently verifies its server-controlled cookie context.
export type SessionKind = 'tenant' | 'platform'
export const sessionEventSender = import.meta.client ? crypto.randomUUID() : ''
export const sessionEventChannel = (kind: SessionKind) => `cureflow:${kind}-session-change`
export function notifySessionChange(kind: SessionKind) {
  if (!import.meta.client || typeof BroadcastChannel === 'undefined') return
  const channel = new BroadcastChannel(sessionEventChannel(kind))
  channel.postMessage({ sender: sessionEventSender })
  channel.close()
}
