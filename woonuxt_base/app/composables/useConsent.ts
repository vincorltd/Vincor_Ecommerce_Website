export const useAnalyticsConsent = () => {
    const grantConsent = () => {
      if (import.meta.client) {
        try {
          // Google Analytics consent - nuxt-gtag v4 API
          const { gtag } = useGtag()
          if (gtag && typeof gtag === 'function') {
            gtag('consent', 'update', {
              analytics_storage: 'granted',
              ad_storage: 'granted'
            })
          }
        } catch (error) {
          console.warn('Google Analytics consent update failed:', error)
        }
    
        // Matomo consent
        try {
          if (window._paq) {
            window._paq.push(['setConsentGiven'])
          }
        } catch (error) {
          console.warn('Matomo consent update failed:', error)
        }
      }
    }
  
    const denyConsent = () => {
      if (import.meta.client) {
        try {
          // Google Analytics consent - nuxt-gtag v4 API
          const { gtag } = useGtag()
          if (gtag && typeof gtag === 'function') {
            gtag('consent', 'update', {
              analytics_storage: 'denied',
              ad_storage: 'denied'
            })
          }
        } catch (error) {
          console.warn('Google Analytics consent update failed:', error)
        }
    
        // Matomo consent
        try {
          if (window._paq) {
            window._paq.push(['forgetConsentGiven'])
          }
        } catch (error) {
          console.warn('Matomo consent update failed:', error)
        }
      }
    }
  
    return {
      grantConsent,
      denyConsent
    }
  }