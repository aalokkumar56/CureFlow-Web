import { tenantModuleLandingRoutes } from '~/utils/tenant-modules'

type TenantModule = { key: string; effective: boolean }
type TenantModuleResponse = {
  enabled_keys?: string[]
  enabledKeys?: string[]
  modules?: TenantModule[]
}

// Share pending requests within one Nuxt app, never between SSR sessions.
const requests = new WeakMap<object, { generation: number; pending?: Promise<void> }>()

export const useTenantModules = () => {
  const app = useNuxtApp()
  const identity = useState<string | null>('tenant-auth-identity', () => null)
  const epoch = useState('tenant-auth-epoch', () => 0)
  const requestFetch = useRequestFetch()
  if (!requests.has(app)) requests.set(app, { generation: 0 })
  const request = requests.get(app)!
  const enabled = useState<string[]>('tenant-enabled-modules', () => [])
  const loaded = useState<boolean>('tenant-modules-loaded', () => false)
  const loading = useState<boolean>('tenant-modules-loading', () => false)

  const reset = () => {
    request.generation++
    request.pending = undefined
    enabled.value = []
    loaded.value = false
    loading.value = false
  }

  const load = async (force = false) => {
    if (request.pending) return request.pending
    if (loaded.value && !force) return
    const generation = request.generation
    const principal = identity.value
    const authorityEpoch = epoch.value
    loading.value = true
    request.pending = (async () => {
      try {
        const response = await requestFetch<TenantModuleResponse>('/api/bff/tenant/modules', {
          credentials: 'include',
          headers: principal ? { 'X-CureFlow-Session-Context': principal } : undefined,
          retry: 0, timeout: 15000,
        })
        if (generation !== request.generation || identity.value !== principal || epoch.value !== authorityEpoch) return
        enabled.value =
          response.enabledKeys ||
          response.enabled_keys ||
          response.modules?.filter((item) => item.effective).map((item) => item.key) ||
          []
        loaded.value = true
      } finally {
        if (generation === request.generation) {
          loading.value = false
          request.pending = undefined
        }
      }
    })()
    return request.pending
  }

  const canAccess = (module?: string) => !module || loaded.value && enabled.value.includes(module)
  const firstAvailableRoute = () =>
    enabled.value.map((key) => tenantModuleLandingRoutes[key]).find(Boolean) || '/settings'

  return { enabled, loaded, load, reset, canAccess, firstAvailableRoute }
}
