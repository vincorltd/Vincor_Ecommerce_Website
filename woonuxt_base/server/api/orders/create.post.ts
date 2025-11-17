/**
 * Server API endpoint to create order via WooCommerce REST API
 * POST /api/orders/create
 * 
 * This endpoint proxies the order creation to WooCommerce with proper authentication
 * Reference: https://woocommerce.github.io/woocommerce-rest-api-docs/#create-an-order
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

  console.log('[Orders API] 📝 Creating order...');

  try {
    // Get order data from request body
    const orderData = await readBody(event);
    
    console.log('[Orders API] 📦 Order data:', {
      billing: orderData.billing?.email,
      lineItemsCount: orderData.line_items?.length || 0,
      paymentMethod: orderData.payment_method,
      hasAddons: orderData.line_items?.some((item: any) => item.meta_data?.length > 0),
    });

    // Build authenticated URL with OAuth 1.0a
    const url = new URL(`${wooRestApiUrl}/orders`);
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);

    // Make authenticated request to WooCommerce
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error('[Orders API] ❌ WooCommerce error:', {
        status: response.status,
        error: errorData,
      });
      
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to create order',
        data: errorData,
      });
    }

    const order = await response.json();
    
    console.log('[Orders API] ✅ Order created successfully:', {
      orderId: order.id,
      orderKey: order.order_key,
      total: order.total,
      status: order.status,
    });

    // Log add-ons if present for debugging
    if (order.line_items) {
      order.line_items.forEach((item: any, index: number) => {
        if (item.meta_data && item.meta_data.length > 0) {
          console.log(`[Orders API] 🎁 Line item ${index + 1} has ${item.meta_data.length} add-ons:`, 
            item.meta_data.map((m: any) => ({ key: m.key, value: m.value }))
          );
        }
      });
    }

    return order;
  } catch (error: any) {
    console.error('[Orders API] ❌ Error creating order:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create order',
    });
  }
});



