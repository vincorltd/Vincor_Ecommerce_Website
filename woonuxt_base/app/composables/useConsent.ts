export const useAnalyticsConsent = () => {
    const { gtag } = useGtag()
  
    const grantConsent = () => {
      // Google Analytics consent
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted'
      })
  
      // Matomo consent
      window._paq?.push(['setConsentGiven'])
    }
  
    const denyConsent = () => {
      // Google Analytics consent
      gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied'
      })
  
      // Matomo consent
      window._paq?.push(['forgetConsentGiven'])
    }
  
    return {
      grantConsent,
      denyConsent
    }
  }