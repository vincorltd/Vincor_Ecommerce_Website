/**
 * Server API endpoint to get cart via WooCommerce Store API
 * GET requests don't require nonce
 * 
 * Reference: https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart/
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooStoreApiUrl = config.public.wooStoreApiUrl || 'https://satchart.com/wp-json/wc/store/v1';

  console.log('[Cart API] 🔄 Fetching cart from Store API');

  try {
    // Get cookies from the request to maintain session
    const cookies = getHeader(event, 'cookie') || '';
    console.log('[Cart API] 🍪 Request cookies:', cookies ? 'Present' : 'None');

    // Use raw fetch to properly access response headers
    const response = await fetch(`${wooStoreApiUrl}/cart`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Store API returned ${response.status}`);
    }

    // Forward Set-Cookie headers from WooCommerce to client
    const setCookieHeaders = response.headers.get('set-cookie');
    console.log('[Cart API] 🍪 Response Set-Cookie:', setCookieHeaders ? 'Present' : 'None');
    
    if (setCookieHeaders) {
      setHeader(event, 'set-cookie', setCookieHeaders);
      console.log('[Cart API] ✅ Cookies forwarded to client');
    }

    const cart = await response.json();
    console.log('[Cart API] ✅ Cart fetched successfully');
    
    console.log('[Cart API] 🔍 Full cart structure:', {
      hasItems: !!cart.items,
      itemsCount: cart.items?.length || 0,
      itemsCountField: cart.items_count,
      keys: Object.keys(cart),
    });
    
    if (!cart.items) {
      console.error('[Cart API] ❌ Cart response has NO items array!');
    } else if (cart.items.length === 0) {
      console.log('[Cart API] ℹ️ Cart is empty (0 items)');
    } else {
      console.log('[Cart API] 📦 Cart has', cart.items.length, 'items');
      
      cart.items.forEach((item: any, index: number) => {
        console.log(`[Cart API] 🔍 Item ${index + 1} FULL DATA:`, JSON.stringify(item, null, 2));
        
        console.log(`[Cart API] Item ${index + 1} summary:`, {
          name: item.name,
          id: item.id,
          key: item.key,
          hasExtensions: !!item.extensions,
          extensionKeys: item.extensions ? Object.keys(item.extensions) : [],
        });
        
        // Check for product add-ons in extensions (multiple possible keys)
        const hasAddons = item.extensions?.['product-add-ons'] || 
                         item.extensions?.addons || 
                         item.item_data;
        
        if (item.extensions?.['product-add-ons']) {
          console.log(`[Cart API] ✅ Item ${index + 1} has add-ons in extensions['product-add-ons']:`, 
            JSON.stringify(item.extensions['product-add-ons'], null, 2)
          );
        } else if (item.extensions?.addons) {
          console.log(`[Cart API] ✅ Item ${index + 1} has add-ons in extensions.addons:`, 
            JSON.stringify(item.extensions.addons, null, 2)
          );
        } else if (item.item_data && item.item_data.length > 0) {
          console.log(`[Cart API] ✅ Item ${index + 1} has add-ons in item_data:`, 
            JSON.stringify(item.item_data, null, 2)
          );
        } else {
          console.log(`[Cart API] ⚠️ Item ${index + 1} has NO add-ons`);
          if (item.extensions) {
            console.log(`[Cart API] Available extensions:`, Object.keys(item.extensions));
            // Log what's actually in each extension
            Object.keys(item.extensions).forEach(key => {
              console.log(`[Cart API] extensions.${key}:`, 
                typeof item.extensions[key] === 'object' 
                  ? JSON.stringify(item.extensions[key], null, 2)
                  : item.extensions[key]
              );
            });
          }
        }
      });
    }
    
    return cart;
  } catch (error: any) {
    console.error('[Cart API] ❌ Error fetching cart:', error);
    throw createError({
      statusCode: error?.response?.status || 500,
      message: error?.message || 'Failed to fetch cart',
    });
  }
});
