/**
 * Login User via WordPress REST API
 * 
 * This endpoint handles user authentication using WordPress cookies
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { username, password } = body;

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        message: 'Username and password are required',
      });
    }

    const config = useRuntimeConfig();
    const baseUrl = config.public.wooApiUrl.replace('/wp-json', '');

    console.log('[Auth Login] 🔐 Attempting login for:', username);

    // Use WordPress wp-login.php for authentication
    // This will set the WordPress authentication cookies
    const loginUrl = `${baseUrl}/wp-login.php`;
    
    const formData = new URLSearchParams();
    formData.append('log', username);
    formData.append('pwd', password);
    formData.append('wp-submit', 'Log In');
    formData.append('redirect_to', baseUrl);
    formData.append('testcookie', '1');

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual', // Don't follow redirects
    });

    console.log('[Auth Login] 📡 Response status:', response.status);

    // Get cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('[Auth Login] 🍪 Set-Cookie header:', setCookieHeader?.substring(0, 100));

    // Parse cookies into a format we can use
    let cookieString = '';
    if (setCookieHeader) {
      // Extract cookie values (before the first semicolon)
      const cookies = setCookieHeader.split(',').map(cookie => {
        const parts = cookie.trim().split(';');
        return parts[0]; // Get the name=value part
      }).join('; ');
      cookieString = cookies;
      console.log('[Auth Login] 🍪 Cookie string:', cookieString.substring(0, 100));
    }

    // Check if login was successful
    // WordPress redirects on successful login (302) or returns 200
    const isSuccess = setCookieHeader && (response.status === 302 || response.status === 200);

    if (!isSuccess) {
      // Try to get error message from response
      const text = await response.text();
      console.error('[Auth Login] ❌ Login failed:', text.substring(0, 200));
      
      throw createError({
        statusCode: 401,
        message: 'Invalid username or password',
      });
    }

    // Forward cookies to the client
    if (setCookieHeader) {
      setHeader(event, 'set-cookie', setCookieHeader);
    }

    console.log('[Auth Login] ✅ WordPress authentication successful');

    // Get WordPress user data via WooCommerce API (works for all users)
    // We can't use /users/me with cookies in server-side context due to domain restrictions
    // So we'll search for the user via the WordPress API with admin credentials
    let wordpressUser = null;
    let userId = null;

    try {
      console.log('[Auth Login] 📡 Searching for WordPress user:', username);
      
      const wpUsersUrl = `${config.public.wooApiUrl}/wp/v2/users`;
      const usersResponse = await $fetch(wpUsersUrl, {
        params: {
          search: username,
          per_page: 10,
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });

      if (Array.isArray(usersResponse) && usersResponse.length > 0) {
        // Find exact match by username/slug or email
        wordpressUser = usersResponse.find(u => 
          u.slug === username || 
          u.email === username ||
          u.name === username
        ) || usersResponse[0];

        if (wordpressUser) {
          userId = wordpressUser.id;
          console.log('[Auth Login] 👤 Found WordPress user:', userId, 'Roles:', wordpressUser.roles);
        }
      }
    } catch (error: any) {
      console.error('[Auth Login] ❌ Failed to fetch WordPress user:', error.message);
    }

    if (!userId) {
      throw createError({
        statusCode: 500,
        message: 'Failed to retrieve user data after authentication',
      });
    }

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
      console.log('[Auth Login] 👤 Customer data retrieved');
    } catch (error) {
      console.log('[Auth Login] ℹ️ No customer record (might be admin user)');
    }

    // Create session cookie with user ID
    setCookie(event, 'wc-customer-id', String(userId), {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
    });

    console.log('[Auth Login] ✅ Login successful for user:', userId);

    return {
      success: true,
      user: {
        id: userId,
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
    console.error('[Auth Login] 💥 Error:', error);
    
    // If it's already a createError, rethrow it
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Authentication failed',
    });
  }
});

