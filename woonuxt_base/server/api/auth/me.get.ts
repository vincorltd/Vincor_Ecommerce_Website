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

    // Get cookies from request
    const cookieHeader = getHeader(event, 'cookie');
    
    if (!cookieHeader) {
      throw createError({
        statusCode: 401,
        message: 'Not authenticated - no session cookies',
      });
    }

    // Get WordPress user data (works for all users including admins)
    const userDataUrl = `${config.public.wooApiUrl}/wp/v2/users/me`;
    const userResponse = await fetch(userDataUrl, {
      headers: {
        'Cookie': cookieHeader,
        'Accept': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw createError({
        statusCode: 401,
        message: 'Invalid session',
      });
    }

    const wordpressUser = await userResponse.json();
    console.log('[Auth Me] ✅ WordPress user retrieved:', wordpressUser.id, 'Roles:', wordpressUser.roles);

    // Try to get customer data from WooCommerce (may not exist for admin users)
    let customerData = null;
    try {
      const customerUrl = `${config.public.wooRestApiUrl}/customers/${userId}`;
      customerData = await $fetch(customerUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });
      console.log('[Auth Me] ✅ Customer data retrieved');
    } catch (error) {
      console.log('[Auth Me] ℹ️ No customer record (might be admin user)');
    }

    return {
      success: true,
      user: {
        id: wordpressUser.id,
        username: wordpressUser.slug || wordpressUser.name,
        email: customerData?.email || wordpressUser.email || '',
        firstName: customerData?.first_name || wordpressUser.first_name || '',
        lastName: customerData?.last_name || wordpressUser.last_name || '',
        displayName: wordpressUser.name || `${customerData?.first_name || ''} ${customerData?.last_name || ''}`.trim(),
        avatar: wordpressUser.avatar_urls?.['96'] || customerData?.avatar_url || null,
        roles: wordpressUser.roles || ['customer'],
      },
      customer: customerData, // May be null for admin users
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

