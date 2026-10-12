import { createError } from 'h3'
import { authenticatePlatform, platformRequest } from '../../../utils/platform-session'
import { readBoundedBody } from '../../../utils/transport'
export default defineEventHandler(async event => {
  platformRequest(event)
  let body: unknown
  try { body = JSON.parse((await readBoundedBody(event, 16 * 1024))?.toString() || '{}') }
  catch (error: any) { if (error.statusCode === 413) throw error; throw createError({ statusCode: 400, statusMessage: 'Invalid setup details' }) }
  return authenticatePlatform(event, 'bootstrap', body)
})
