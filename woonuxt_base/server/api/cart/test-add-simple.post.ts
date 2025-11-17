/**
 * TEST ENDPOINT: Add item to cart WITHOUT add-ons
 * This helps isolate whether the issue is with add-ons or general cart functionality
 * 
 * Usage: POST /api/cart/test-add-simple
 * Body: { "id": 6738, "quantity": 1 }
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooStoreApiUrl = config.public.wooStoreApiUrl || 'https://satchart.com/wp-json/wc/store/v1';

  console.log('[TEST] 🧪 Adding item WITHOUT add-ons...');

  try {
    const body = await readBody(event);
    const cookies = getHeader(event, 'cookie') || '';
    
    // Fetch nonce
    const nonceResponse = await fetch(`${wooStoreApiUrl}/cart`, {
      method: 'GET',
      headers: { 'Cookie': cookies },
    });
    
    const nonce = nonceResponse.headers.get('Nonce') || '';
    console.log('[TEST] Nonce:', nonce ? 'Present' : 'None');
    
    // Simple payload WITHOUT add-ons
    const simplePayload = {
      id: body.id,
      quantity: body.quantity || 1,
    };
    
    console.log('[TEST] 📤 Payload:', JSON.stringify(simplePayload, null, 2));
    
    // Add to cart
    const response = await fetch(`${wooStoreApiUrl}/cart/add-item`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
        ...(nonce ? { 'Nonce': nonce } : {}),
      },
      body: JSON.stringify(simplePayload),
    });
    
    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }
    
    // Forward cookies
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      setHeader(event, 'set-cookie', setCookieHeaders);
    }
    
    const result = await response.json();
    
    console.log('[TEST] ✅ Result:', {
      itemsCount: result.items?.length || 0,
      items_count: result.items_count,
    });
    
    console.log('[TEST] 📊 FULL response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error: any) {
    console.error('[TEST] ❌ Error:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Test failed',
    });
  }
});

