import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-11',
  ssr: true,
  devtools: { enabled: false },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/feedback.css',
    '~/assets/css/patients.css',
    '~/assets/css/whatsapp.css',
    '~/assets/css/campaigns.css',
    '~/assets/css/analytics.css',
    '~/assets/css/followups.css',
    '~/assets/css/referrals.css',
    '~/assets/css/staff.css',
    '~/assets/css/staff-layout.css',
    '~/assets/css/settings.css',
    '~/assets/css/email.css',
    '~/assets/css/platform.css',
  ],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: { include: ['axios'] },
  },

  pages: true,

  runtimeConfig: {
    // Private server configuration; never infer production trust from Host or proxy headers.
    publicOrigin: process.env.NUXT_PUBLIC_ORIGIN || '',
    backendApiUrl: process.env.NUXT_BACKEND_API_URL || 'http://localhost:5180/api',
    public: {
      approvedMediaOrigins: process.env.NUXT_PUBLIC_APPROVED_MEDIA_ORIGINS || '',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '/api/bff',
    },
  },

  routeRules: {
    '/platform/**': { ssr: false },
    '/platform': { ssr: false },
    '/login': { ssr: true },
    '/register': { ssr: true },
  },
})
