import { getRouterParam } from 'h3'
import { proxyBackend } from '../../utils/proxy'
export default defineEventHandler(event => proxyBackend(event, getRouterParam(event, 'path') || ''))
