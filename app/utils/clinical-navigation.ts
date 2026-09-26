// Component-scoped handlers are removed on unmount. No clinical text is stored here.
const handlers = new Map<() => Promise<boolean>, () => boolean>()
export function registerClinicalNavigation(handler: () => Promise<boolean>, hasUnsavedWork: () => boolean = () => false) {
  handlers.set(handler, hasUnsavedWork)
  return () => { handlers.delete(handler) }
}
export function hasUnsavedClinicalWork() {
  return [...handlers.values()].some(check => check())
}
export async function prepareClinicalNavigation() {
  for (const handler of handlers.keys()) if (!await handler()) return false
  return true
}
