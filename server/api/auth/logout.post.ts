import { deleteCookie } from 'h3'

export default defineEventHandler((event) => {
  deleteCookie(event, 'cureflow_session', { path: '/' })
  return { ok: true }
})
