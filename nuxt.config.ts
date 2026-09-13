// export default defineNuxtConfig({
//   compatibilityDate: '2025-07-15',

//   devtools: {
//     enabled: true,
//   },

//   modules: [
//     '@pinia/nuxt',
//   ],

//   ssr: true,

//   typescript: {
//     strict: true,
//     typeCheck: true,
//   },

//   runtimeConfig: {
//     backendApiUrl: '',

//     public: {
//       appName: 'CureFlow',
//     },
//   },

//   nitro: {
//     preset: 'node-server',
//   },
// })
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-11',

  css: ['~/assets/css/main.css', '~/assets/css/patients.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  pages: true,

  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ||
        `${process.env.NUXT_BACKEND_API_URL || 'https://localhost:7180'}/api`,
    },
  },
})
