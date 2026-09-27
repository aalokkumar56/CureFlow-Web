import { platformGet, platformPatch, platformPost } from '../../utils/auth/platformClient'
export const usePlatformResource = <T>(path: () => string) => {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = shallowRef<unknown>(null)
  const toast = useToast()
  let generation = 0
  const load = async () => {
    const current = ++generation
    loading.value = true
    error.value = null
    try {
      const response = await platformGet<T>(path())
      if (current === generation) data.value = response as typeof data.value
    } catch (cause) {
      if (current === generation) error.value = cause
    } finally {
      if (current === generation) loading.value = false
    }
  }
  const save = async (target: string, input: unknown, create = false) => {
    if (saving.value) return false
    saving.value = true
    error.value = null
    try {
      await (create ? platformPost : platformPatch)(target, input)
      toast.show('Changes saved.')
      await load()
      return true
    } catch (cause) {
      error.value = cause
      return false
    } finally {
      saving.value = false
    }
  }
  return { data, loading, saving, error, load, save }
}
