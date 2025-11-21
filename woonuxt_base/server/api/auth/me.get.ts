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

    // Get user roles from WordPress
    let userRoles = ['customer']; // Default fallback
    try {
      // Get cookies from request
      const cookieHeader = getHeader(event, 'cookie');
      
      if (cookieHeader) {
        const userDataUrl = `${config.public.wooApiUrl}/wp/v2/users/me`;
        const userResponse = await fetch(userDataUrl, {
          headers: {
            'Cookie': cookieHeader,
            'Accept': 'application/json',
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          userRoles = userData.roles || ['customer'];
          console.log('[Auth Me] 👤 User roles:', userRoles);
        }
      }
    } catch (error) {
      console.warn('[Auth Me] ⚠️ Could not fetch user roles, using default');
    }

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

