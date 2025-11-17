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

      useGqlError((err: any) => {
        console.error('Debug - GraphQL Error in initStore:', {
          message: err?.gqlErrors?.[0]?.message,
          fullError: err
        });

        const serverErrors = ['The iss do not match with this server', 'Invalid session token'];
        if (serverErrors.includes(err?.gqlErrors?.[0]?.message)) {
          console.log('Debug - Server error detected, clearing cookies and storage');
          clearAllCookies();
          clearAllLocalStorage();
          window.location.reload();
        }
      });

      if (!success) {
        console.log('Debug - Cart refresh failed, clearing data');
        clearAllCookies();
        clearAllLocalStorage();

        const reloadCount = useCookie('reloadCount');
        console.log('Debug - Reload count:', reloadCount.value);
        
        if (!reloadCount.value) {
          reloadCount.value = '1';
          console.log('Debug - Set reload count to 1');
        } else {
          console.log('Debug - Already attempted reload, stopping');
          return;
        }

        const { logoutUser } = useAuth();
        console.log('Debug - Logging out user');
        await logoutUser();

        if (!reloadCount.value) {
          console.log('Debug - Triggering page reload');
          window.location.reload();
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
