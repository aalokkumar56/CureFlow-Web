import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-11',
  ssr: true,
  devtools: { enabled: false },

  css: ['~/assets/css/main.css', '~/assets/css/patients.css', '~/assets/css/whatsapp.css', '~/assets/css/campaigns.css', '~/assets/css/analytics.css', '~/assets/css/followups.css', '~/assets/css/referrals.css', '~/assets/css/staff.css', '~/assets/css/staff-layout.css', '~/assets/css/settings.css', '~/assets/css/email.css', '~/assets/css/platform.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  pages: true,

  runtimeConfig: {
    backendApiUrl:
      process.env.NUXT_BACKEND_API_URL || 'https://localhost:7180/api',
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        '/api/bff',
    },
  },

  routeRules: {
    '/login': { ssr: true },
    '/register': { ssr: true },
  },
})
