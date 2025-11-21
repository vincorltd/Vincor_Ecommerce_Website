/**
 * Get Current Authenticated User
 * 
 * Returns the currently logged-in user data from WordPress
 */

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    
    // Get user ID from cookie
    const userId = getCookie(event, 'wc-customer-id');
    
    if (!userId) {
      throw createError({
        statusCode: 401,
        message: 'Not authenticated',
      });
    }

    console.log('[Auth Me] 👤 Fetching user data for ID:', userId);

    // Get user data from WooCommerce customers API (includes all roles)
    let customerData = null;
    
    try {
      const customerUrl = `${config.public.wooRestApiUrl}/customers/${userId}`;
      customerData = await $fetch(customerUrl, {
        params: {
          role: 'all', // Ensure we get users of any role
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });
      
      console.log('[Auth Me] ✅ User data retrieved:', {
        id: customerData.id,
        role: customerData.role,
      });
    } catch (error: any) {
      console.error('[Auth Me] ❌ Failed to fetch user:', error.message);
      throw createError({
        statusCode: 401,
        message: 'Invalid session or user not found',
      });
    }

    // Extract role from customer data
    const userRoles = customerData.role ? [customerData.role] : ['customer'];

    return {
      success: true,
      user: {
        id: customerData.id,
        username: customerData.username,
        email: customerData.email || '',
        firstName: customerData.first_name || '',
        lastName: customerData.last_name || '',
        displayName: `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() || customerData.username,
        avatar: customerData.avatar_url || null,
        roles: userRoles,
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

