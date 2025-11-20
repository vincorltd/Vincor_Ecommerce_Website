/**
 * Server API endpoint to get order by ID via WooCommerce REST API
 * GET /api/orders/[id]?order_key=xxx
 * 
 * This endpoint proxies the order retrieval to WooCommerce with proper authentication
 * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-an-order
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooRestApiUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
  const consumerKey = config.wooConsumerKey;
  const consumerSecret = config.wooConsumerSecret;

  if (!consumerKey || !consumerSecret) {
    throw createError({
      statusCode: 500,
      message: 'WooCommerce API credentials are not configured',
    });
  }

  // Get order ID from route params
  const orderId = getRouterParam(event, 'id');
  
  if (!orderId) {
    throw createError({
      statusCode: 400,
      message: 'Order ID is required',
    });
  }

  console.log('[Orders API] 🔍 Fetching order:', orderId);

  try {
    // Get optional order_key query parameter for security
    const query = getQuery(event);
    const orderKey = query.order_key as string | undefined;

    // Build authenticated URL with OAuth 1.0a
    const url = new URL(`${wooRestApiUrl}/orders/${orderId}`);
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);
    
    if (orderKey) {
      url.searchParams.append('order_key', orderKey);
    }

    // Make authenticated request to WooCommerce
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[Orders API] ❌ WooCommerce error:', {
        status: response.status,
        error: errorData,
      });
      
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to fetch order',
        data: errorData,
      });
    }

    const order = await response.json();
    
    console.log('[Orders API] ✅ Order fetched successfully:', {
      orderId: order.id,
      orderKey: order.order_key,
      status: order.status,
      total: order.total,
    });

    return order;
  } catch (error: any) {
    console.error('[Orders API] ❌ Error fetching order:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch order',
    });
  }
});





















