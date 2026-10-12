// Per Nuxt app, in memory only. SSR requests and hospital workspaces never
// share browser credentials or a persistent client-side throttling store.
const budgets = new WeakMap<object, Map<string, number>>()
export function retrySeconds(error: any): number | undefined {
  const headers = error?.response?.headers
  const raw = headers?.get?.('retry-after') ?? headers?.['retry-after']
  if (typeof raw !== 'string' || raw.length > 80) return undefined
  const seconds = /^\d+$/.test(raw) ? Number(raw) : (Date.parse(raw) - Date.now()) / 1000
  return Number.isFinite(seconds) ? Math.min(3600, Math.max(1, Math.ceil(seconds))) : undefined
}
export function requestFeedback(scope: object) {
  if (!budgets.has(scope)) budgets.set(scope, new Map())
  const budget = budgets.get(scope)!
  return {
    check(key: string) {
      const until = budget.get(key) || 0
      if (until <= Date.now()) { budget.delete(key); return }
      const seconds = Math.ceil((until - Date.now()) / 1000)
      const message = `Too many requests. Try again in ${seconds} seconds. Your input has been kept.`
      throw Object.assign(new Error(message), {
        throttledLocally: true, statusCode: 429,
        response: { status: 429, headers: { 'retry-after': String(seconds) }, data: { message } },
      })
    },
    record(key: string, error: any) {
      if ((error?.response?.status || error?.statusCode || error?.status) !== 429) return
      // A missing or invalid server interval still needs a brief local pause.
      const seconds = retrySeconds(error) ?? 30
      if (budget.size >= 100) budget.delete(budget.keys().next().value!)
      budget.set(key, Date.now() + seconds * 1000)
    },
  }
}
