export const useConsent = () => {
    const { gtag } = useGtag()
  
    const grantConsent = () => {
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted'
      })
    }
  
    const denyConsent = () => {
      gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied'
      })
    }
  
    return {
      grantConsent,
      denyConsent
    }
  }