/**
 * Get Current Customer Data from WooCommerce
 * 
 * Returns detailed customer information including billing/shipping addresses
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

    console.log('[Customer Me] 👤 Fetching customer data for ID:', customerId);

    // Get customer data from WooCommerce
    const customerUrl = `${config.public.wooRestApiUrl}/customers/${customerId}`;
    
    const customerData = await $fetch(customerUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${config.wooConsumerKey}:${config.wooConsumerSecret}`
        ).toString('base64')}`,
      },
    });

    console.log('[Customer Me] ✅ Customer data retrieved');

    return {
      success: true,
      customer: customerData,
    };
  } catch (error: any) {
    console.error('[Customer Me] 💥 Error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch customer data',
    });
  }
});

