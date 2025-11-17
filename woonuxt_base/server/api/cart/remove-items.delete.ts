/**
 * Server API endpoint to empty cart via Store API
 * DELETE requests require nonce token
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooStoreApiUrl = config.public.wooStoreApiUrl || 'https://satchart.com/wp-json/wc/store/v1';

  console.log('[Cart API] 🧹 Emptying cart via Store API');

  try {
    // Get cookies from the request to maintain session
    const cookies = getHeader(event, 'cookie') || '';

    // Step 1: Fetch nonce from Store API
    console.log('[Cart API] 🔐 Fetching nonce...');
    const nonceResponse = await fetch(`${wooStoreApiUrl}/cart`, {
      method: 'GET',
      headers: { 'Cookie': cookies },
    });
    
    const nonce = nonceResponse.headers.get('Nonce') || '';
    console.log('[Cart API] Nonce:', nonce ? 'Present' : 'None');

    // Step 2: Empty cart with nonce
    const headers: any = {
      'Cookie': cookies,
      'Content-Type': 'application/json',
    };
    
    if (nonce) {
      headers['Nonce'] = nonce;
    }

    const response = await fetch(`${wooStoreApiUrl}/cart/items`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to empty cart',
      });
    }

    // Forward Set-Cookie headers
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      setHeader(event, 'set-cookie', setCookieHeaders);
    }

    const result = await response.json();
    console.log('[Cart API] ✅ Cart emptied');
    return result;
  } catch (error: any) {
    console.error('[Cart API] ❌ Error emptying cart:', error);
    throw createError({
      statusCode: error?.response?.status || error?.statusCode || 500,
      message: error?.message || 'Failed to empty cart',
    });
  }
});





