export const useToast = () => {
  const messages = useState<{ id: string; message: string; type: 'success' | 'error' }[]>(
    'app-toasts',
    () => [],
  )
  const dismiss = (id: string) => {
    messages.value = messages.value.filter((item) => item.id !== id)
  }
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    if (messages.value.some((item) => item.message === message)) return
    const id = globalThis.crypto.randomUUID()
    messages.value.push({ id, message, type })
    if (type === 'success' && import.meta.client) setTimeout(() => dismiss(id), 6000)
  }
  return { messages, show, dismiss }
}
