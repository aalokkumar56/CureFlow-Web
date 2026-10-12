import { backendBaseUrl, fetchBackend } from '../../../utils/backend'
import { clearPlatformCookie, platformAccessToken, platformRequest } from '../../../utils/platform-session'
export default defineEventHandler(async event => {
  platformRequest(event)
  const token = platformAccessToken(event)
  clearPlatformCookie(event)
  if (!token) return { signedOut: true, revoked: true }
  try {
    await fetchBackend(`${backendBaseUrl(event)}/platform/auth/logout`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, retry: 0, timeout: 15000, redirect: 'error',
    })
    return { signedOut: true, revoked: true }
  } catch (error: any) {
    return { signedOut: true, revoked: (error.statusCode || error.status) === 401 }
  }
})
