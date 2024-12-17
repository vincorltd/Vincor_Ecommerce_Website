import VueMatomo from 'vue-matomo'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  
  nuxtApp.vueApp.use(VueMatomo, {
    host: 'https://vincor.matomo.cloud/',
    siteId: 1,
    router: router,
    enableLinkTracking: true,
    requireConsent: true,
    trackInitialView: true,
    disableCookies: false,
    requireCookieConsent: true,
    debug: process.env.NODE_ENV !== 'production'
  })

  // Optional: Track 404 errors
  router.onError((error) => {
    if (error.message.includes('Failed to load')) {
      window._paq?.push(['trackEvent', 'Error', '404', window.location.pathname])
    }
  })
})