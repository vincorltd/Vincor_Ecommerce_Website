/**
 * Get Current Authenticated User
 * 
 * Returns the currently logged-in user data from WordPress
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

    console.log('[Auth Me] 👤 Fetching customer data for ID:', customerId);

    // Get customer data from WooCommerce
    const customerUrl = `${config.public.wooRestApiUrl}/customers/${customerId}`;
    const customerData = await $fetch(customerUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${config.wooConsumerKey}:${config.wooConsumerSecret}`
        ).toString('base64')}`,
      },
    });

    console.log('[Auth Me] ✅ Customer data retrieved');

    return {
      success: true,
      user: {
        id: customerData.id,
        username: customerData.username,
        email: customerData.email,
        firstName: customerData.first_name || '',
        lastName: customerData.last_name || '',
        displayName: `${customerData.first_name} ${customerData.last_name}`.trim() || customerData.username,
        avatar: customerData.avatar_url || null,
        roles: ['customer'],
      },
      customer: customerData,
    };
  } catch (error: any) {
    console.error('[Auth Me] 💥 Error:', error);
    
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch user data',
    });
  }
});

