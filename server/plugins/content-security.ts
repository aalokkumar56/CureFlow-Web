import { randomBytes } from 'node:crypto'
import { setResponseHeader } from 'h3'

export default defineNitroPlugin(nitro => {
  nitro.hooks.hook('render:html', (html, { event }) => {
    if (process.env.NODE_ENV !== 'production') return
    const nonce = randomBytes(24).toString('base64')
    const origins = String(useRuntimeConfig(event).public.approvedMediaOrigins || '')
      .split(',').map(value => value.trim()).filter(Boolean)
    for (const origin of origins) {
      const url = new URL(origin)
      if (url.protocol !== 'https:' || url.origin !== origin || url.username || url.password)
        throw new Error('Approved media origins must be exact HTTPS origins')
    }
    // Only Nuxt-managed head/payload scripts receive a nonce. Never decorate
    // scripts in the rendered application body or arbitrary API responses.
    for (const field of ['head', 'bodyAppend'] as const) {
      html[field] = html[field].map(chunk => chunk.replace(/<script\b(?![^>]*\bnonce\s*=)/gi, `<script nonce="${nonce}"`))
    }
    setResponseHeader(event, 'Content-Security-Policy', [
      "default-src 'self'", `script-src 'self' 'nonce-${nonce}'`, "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", `img-src 'self' blob: data: ${origins.join(' ')}`.trim(),
      `media-src 'self' blob: ${origins.join(' ')}`.trim(), "font-src 'self' https://fonts.gstatic.com", "connect-src 'self'",
      "frame-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ].join('; '))
    // Request-specific nonces and clinical SSR payloads must not enter shared caches.
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
    setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
    setResponseHeader(event, 'X-Frame-Options', 'DENY')
  })
})
