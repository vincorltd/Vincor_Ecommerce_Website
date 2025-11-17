/**
 * Server API endpoint to remove a single item from cart via Store API
 * POST requests require nonce token
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooStoreApiUrl = config.public.wooStoreApiUrl || 'https://satchart.com/wp-json/wc/store/v1';

  console.log('[Cart API] 🗑️ Removing item from cart via Store API');

  try {
    // Get the request body (should contain { key: 'cart_item_key' })
    const body = await readBody(event);
    console.log('[Cart API] Remove item key:', body.key);
    
    // Get cookies from the request to maintain session
    const cookies = getHeader(event, 'cookie') || '';

    // Step 1: Fetch nonce from Store API
    const nonceResponse = await fetch(`${wooStoreApiUrl}/cart`, {
      method: 'GET',
      headers: { 'Cookie': cookies },
    });
    
    const nonce = nonceResponse.headers.get('Nonce') || '';

    // Step 2: Remove item with nonce
    const headers: any = {
      'Cookie': cookies,
      'Content-Type': 'application/json',
    };
    
    if (nonce) {
      headers['Nonce'] = nonce;
    }

    const response = await fetch(`${wooStoreApiUrl}/cart/remove-item`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key: body.key }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to remove item',
      });
    }

    // Forward Set-Cookie headers
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      setHeader(event, 'set-cookie', setCookieHeaders);
    }

    const result = await response.json();
    console.log('[Cart API] ✅ Item removed from cart');
    return result;
  } catch (error: any) {
    console.error('[Cart API] ❌ Error removing item:', error);
    throw createError({
      statusCode: error?.response?.status || error?.statusCode || 500,
      message: error?.message || 'Failed to remove item',
    });
  }
});

