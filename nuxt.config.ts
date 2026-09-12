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
export default defineNuxtConfig({
  compatibilityDate: '2026-09-11',

  css: ['~/assets/css/main.css'],

  pages: true,

  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:5000',
    },
  },
})
