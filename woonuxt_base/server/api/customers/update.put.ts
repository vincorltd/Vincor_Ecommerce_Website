/**
 * Update Customer Data
 * 
 * Updates customer information including billing/shipping addresses
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

    const body = await readBody(event);

    console.log('[Customer Update] 📝 Updating customer data for ID:', customerId);

    // Update customer data in WooCommerce
    const customerUrl = `${config.public.wooRestApiUrl}/customers/${customerId}`;
    
    const customerData = await $fetch(customerUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${config.wooConsumerKey}:${config.wooConsumerSecret}`
        ).toString('base64')}`,
      },
      body,
    });

    console.log('[Customer Update] ✅ Customer data updated');

    return {
      success: true,
      customer: customerData,
    };
  } catch (error: any) {
    console.error('[Customer Update] 💥 Error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: error.statusCode || 500,
      message: error.data?.message || error.message || 'Failed to update customer data',
    });
  }
});

