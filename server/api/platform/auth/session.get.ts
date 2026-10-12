import { createError } from 'h3'
import { platformAccessToken, platformOperator, platformRequest } from '../../../utils/platform-session'
export default defineEventHandler(async event => {
  platformRequest(event)
  const token = platformAccessToken(event)
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Sign in to continue' })
  return { user: await platformOperator(event, token) }
})
