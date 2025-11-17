/**
 * Logout User
 * 
 * This endpoint handles user logout by clearing authentication cookies
 */

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const baseUrl = config.public.wooApiUrl.replace('/wp-json', '');

    console.log('[Auth Logout] 🚪 Logging out user');

    // Clear all authentication cookies
    const cookiesToClear = [
      'wordpress_logged_in',
      'wordpress_sec',
      'wordpress_test_cookie',
      'woocommerce_session',
      'wc-store-api-nonce',
      'wp_woocommerce_session',
      'wc-customer-id', // Our custom customer ID cookie
    ];

    // Set cookies to expire
    cookiesToClear.forEach(cookieName => {
      deleteCookie(event, cookieName, {
        path: '/',
        secure: true,
        sameSite: 'lax',
      });
    });

    console.log('[Auth Logout] ✅ Logout successful, cookies cleared');

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error: any) {
    console.error('[Auth Logout] 💥 Error:', error);
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Logout failed',
    });
  }
});

