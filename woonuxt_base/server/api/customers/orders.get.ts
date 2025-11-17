/**
 * Get Customer Orders
 * 
 * Returns all orders for the currently authenticated customer
 */

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    
    // Get customer ID from cookie
    const customerId = getCookie(event, 'wc-customer-id');
    
    if (!customerId) {
      throw createError({
        statusCode: 401,
        message: 'Not authenticated',
      });
    }

    console.log('[Customer Orders] 📦 Fetching orders for customer:', customerId);

    // Get orders from WooCommerce
    const ordersUrl = `${config.public.wooRestApiUrl}/orders`;
    
    const orders = await $fetch(ordersUrl, {
      params: {
        customer: customerId,
        per_page: 100,
        orderby: 'date',
        order: 'desc',
      },
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${config.wooConsumerKey}:${config.wooConsumerSecret}`
        ).toString('base64')}`,
      },
    });

    console.log('[Customer Orders] ✅ Retrieved', orders?.length || 0, 'orders');

    return {
      success: true,
      orders: orders || [],
    };
  } catch (error: any) {
    console.error('[Customer Orders] 💥 Error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch orders',
    });
  }
});

