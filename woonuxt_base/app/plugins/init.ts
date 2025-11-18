export default defineNuxtPlugin(async (nuxtApp) => {
  if (!import.meta.env.SSR) {
    const { storeSettings } = useAppConfig();
    const { clearAllCookies, clearAllLocalStorage, getDomain } = useHelpers();
    const currentDomain = getDomain(window.location.href);
    
    // Debug all cookies
    const allCookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    console.log('Debug - All Cookies:', allCookies);
    
    const sessionToken = useCookie('woocommerce-session', { 
      domain: currentDomain,
      path: '/',
      secure: true,
      sameSite: 'lax'
    });

    console.log('Debug - Cookie Settings:', {
      domain: currentDomain,
      path: '/',
      secure: true,
      sameSite: 'lax',
      cookieValue: sessionToken.value
    });

    if (sessionToken.value) {
      const headers = {
        'woocommerce-session': `Session ${sessionToken.value}`,
        'X-WP-Nonce': document.querySelector('meta[name="x-wp-nonce"]')?.getAttribute('content') || '',
      };
      console.log('Debug - Setting GQL Headers:', headers);
      useGqlHeaders(headers);
    }

    useGqlError((err: any) => {
      console.error('Debug - GraphQL Error:', {
        message: err?.gqlErrors?.[0]?.message,
        fullError: err
      });
    });

    // Wait for the user to interact with the page before refreshing the cart, this is helpful to prevent excessive requests to the server
    let initialised = false;
    const eventsToFireOn = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click', 'resize', 'mousemove', 'mouseover'];

    async function initStore() {
      console.log('Debug - InitStore called:', {
        alreadyInitialized: initialised,
        currentPath: useRoute().path
      });

      if (initialised) {
        console.log('Debug - Store already initialized, removing listeners');
        eventsToFireOn.forEach((event) => {
          window.removeEventListener(event, initStore);
        });
        return;
      }

      initialised = true;

      // Initialize user session (check if logged in)
      const { initSession } = useAuth();
      console.log('Debug - Initializing user session...');
      await initSession();
      console.log('Debug - User session initialized');

      // Hydrate cart addons store from localStorage BEFORE refreshing cart
      const { useCartAddonsStore } = await import('~/stores/cart-addons');
      const addonsStore = useCartAddonsStore();
      addonsStore.hydrate();
      console.log('Debug - Cart addons store hydrated');

      const { refreshCart } = useCart();
      console.log('Debug - Refreshing cart...');
      const success: boolean = await refreshCart();
      console.log('Debug - Cart refresh result:', { success });

      // Use sessionStorage to track reload attempts (survives clearAllLocalStorage)
      const RELOAD_KEY = 'cart_refresh_attempted';
      
      if (!success) {
        console.log('Debug - Cart refresh failed');
        
        // Check if we've already tried to recover
        const alreadyAttempted = sessionStorage.getItem(RELOAD_KEY);
        if (alreadyAttempted) {
          console.log('Debug - Already attempted recovery, stopping to prevent infinite loop');
          // Clear the flag so next time user visits it can try again
          sessionStorage.removeItem(RELOAD_KEY);
          return;
        }

        console.log('Debug - First attempt, marking and reloading');
        
        // Set flag BEFORE clearing/reloading (sessionStorage survives localStorage clear)
        sessionStorage.setItem(RELOAD_KEY, 'true');
        
        // Now clear cookies and localStorage
        clearAllCookies();
        clearAllLocalStorage();

        const { logoutUser } = useAuth();
        console.log('Debug - Logging out user');
        await logoutUser();

        console.log('Debug - Triggering page reload');
        window.location.reload();
      } else {
        // Success! Clear any existing reload flag
        const alreadyAttempted = sessionStorage.getItem(RELOAD_KEY);
        if (alreadyAttempted) {
          console.log('Debug - Cart refresh successful, clearing reload flag');
          sessionStorage.removeItem(RELOAD_KEY);
        }
      }
    }

    // If we are in development mode, we want to initialise the store immediately
    const isDev = process.env.NODE_ENV === 'development';

    // Check if the current route path is one of the pages that need immediate initialization
    const pagesToInitializeRightAway = ['/checkout', '/my-account', '/order-summary', '/product/'];
    const currentPath = useRoute().path;
    const isPathThatRequiresInit = pagesToInitializeRightAway.some((page) => currentPath.includes(page));

    const shouldInit = isDev || isPathThatRequiresInit || !storeSettings.initStoreOnUserActionToReduceServerLoad;

    console.log('Debug - Initialization conditions:', {
      isDev,
      currentPath,
      isPathThatRequiresInit,
      initStoreOnUserAction: storeSettings.initStoreOnUserActionToReduceServerLoad,
      shouldInitImmediately: shouldInit
    });

    if (shouldInit) {
      console.log('Debug - Initializing store immediately');
      initStore();
    } else {
      console.log('Debug - Adding event listeners for delayed initialization');
      eventsToFireOn.forEach((event) => {
        window.addEventListener(event, initStore, { once: true });
      });
    }
  }
});
