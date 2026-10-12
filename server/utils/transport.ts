import { createError, getHeader, type H3Event } from 'h3'

const MiB = 1024 * 1024
export function requestBodyLimit(path: string): number {
  if (/^conversations\/[^/]+\/media$/i.test(path)) return 101 * MiB
  if (/^whatsapp\/sendmedia$/i.test(path)) return 101 * MiB
  if (/^patients\/[^/]+\/documents$|^lab-reports\/upload$|^leads\/import-excel$/i.test(path)) return 11 * MiB
  if (/^patients\/import-(csv|excel)$/i.test(path)) return 11 * MiB
  return MiB
}

export function requestTimeout(path: string): number {
  return /media$|sendmedia$|upload$|import-|documents$|translation$|ai\//i.test(path) ? 120000 : 30000
}

export function boundedRetryAfter(value: string | null | undefined): string | undefined {
  if (!value || value.length > 80) return undefined
  const seconds = /^\d+$/.test(value) ? Number(value) : (Date.parse(value) - Date.now()) / 1000
  return Number.isFinite(seconds) ? String(Math.min(3600, Math.max(1, Math.ceil(seconds)))) : undefined
}

export async function readBoundedBody(event: H3Event, limit: number, timeout = 30000): Promise<Buffer | undefined> {
  const declared = getHeader(event, 'content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit))
    throw createError({ statusCode: 413, statusMessage: 'Request body is too large' })
  if (event.node.req.readableEnded) return undefined
  return await new Promise((resolve, reject) => {
    const req = event.node.req
    const chunks: Buffer[] = []
    let size = 0
    const cleanup = () => {
      clearTimeout(timer)
      req.off('data', data); req.off('end', end); req.off('aborted', interrupted); req.off('error', interrupted)
    }
    const fail = (statusCode: number, statusMessage: string) => {
      cleanup()
      // Close this HTTP/1 connection after the rejection rather than retain an
      // attacker-controlled body indefinitely. Do not destroy the safe response.
      event.node.res.setHeader('Connection', 'close')
      req.resume()
      reject(createError({ statusCode, statusMessage }))
    }
    const data = (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.length
      if (size > limit) return fail(413, 'Request body is too large')
      chunks.push(bytes)
    }
    const end = () => { cleanup(); resolve(size ? Buffer.concat(chunks, size) : undefined) }
    const interrupted = () => fail(400, 'Upload interrupted')
    const timer = setTimeout(() => fail(408, 'Upload timed out. Use a smaller file or a faster connection.'), timeout)
    timer.unref()
    req.on('data', data); req.once('end', end); req.once('aborted', interrupted); req.once('error', interrupted)
  })
}

export function bffLocation(value: string, upstreamUrl: string, baseUrl: string): string | undefined {
  try {
    const target = new URL(value, upstreamUrl)
    const base = new URL(baseUrl)
    if (target.origin !== base.origin || !target.pathname.startsWith(`${base.pathname}/`)) return undefined
    return `/api/bff${target.pathname.slice(base.pathname.length)}${target.search}${target.hash}`
  } catch { return undefined }
}

export function safeDisposition(value: string): string {
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = value.match(/filename="([^"]*)"|filename=([^;]+)/i)
  let name = plain?.[1] || plain?.[2] || 'download'
  try { if (encoded) name = decodeURIComponent(encoded) } catch { /* Use ordinary filename. */ }
  name = name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f\u007f";]/g, '_').slice(0, 200) || 'download'
  return `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`
}

export async function validationBody(stream?: ReadableStream<Uint8Array>): Promise<unknown> {
  if (!stream) return undefined
  const reader = stream.getReader()
  let size = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > 64 * 1024) return undefined
      chunks.push(result.value)
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return undefined }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
