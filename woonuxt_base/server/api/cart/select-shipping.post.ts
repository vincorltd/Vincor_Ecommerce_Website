/**
 * Server API endpoint to select shipping rate via Store API
 * Handles CORS and authentication on the server-side
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiUrl = config.public.apiUrl || 'https://satchart.com/wp-json';

  console.log('[Cart API] 🚚 Selecting shipping rate');

  try {
    // Get the request body
    const body = await readBody(event);
    
    // Get cookies from the request to maintain session
    const cookies = getHeader(event, 'cookie') || '';

    const response = await $fetch('/wc/store/v1/cart/select-shipping-rate', {
      baseURL: apiUrl,
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
      body,
    });

    // Forward the Set-Cookie headers from WooCommerce back to the client
    const setCookieHeader = response?.headers?.get?.('set-cookie');
    if (setCookieHeader) {
      setHeader(event, 'set-cookie', setCookieHeader);
    }

    console.log('[Cart API] ✅ Shipping rate selected');
    return response;
  } catch (error: any) {
    console.error('[Cart API] ❌ Error selecting shipping:', error);
    throw createError({
      statusCode: error?.response?.status || 500,
      message: error?.message || 'Failed to select shipping rate',
    });
  }
});





