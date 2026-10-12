import { backendBaseUrl, fetchBackend } from '../../../utils/backend'
import { platformFailure, platformRequest } from '../../../utils/platform-session'
export default defineEventHandler(async event => {
  platformRequest(event)
  try {
    const result = await fetchBackend<{ needs_setup: boolean }>(`${backendBaseUrl(event)}/platform/auth/setup-status`, { retry: 0, timeout: 15000, redirect: 'error' })
    if (typeof result.needs_setup !== 'boolean') throw new Error('Invalid setup status')
    return { needsSetup: result.needs_setup }
  } catch (error) { return platformFailure(event, error) }
})
