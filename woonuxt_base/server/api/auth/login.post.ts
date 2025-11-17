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

    // Now get user data using WordPress REST API
    const userDataUrl = `${config.public.wooApiUrl}/wp/v2/users/me`;
    
    console.log('[Auth Login] 📡 Fetching user data from:', userDataUrl);
    console.log('[Auth Login] 🍪 Using cookies:', cookieString.substring(0, 100));
    
    const userResponse = await fetch(userDataUrl, {
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
      },
    });

    console.log('[Auth Login] 📡 User data response status:', userResponse.status);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('[Auth Login] ❌ Failed to get user data:', errorText.substring(0, 200));
      
      // Login was successful but we can't get user data
      // This might be a CORS or API issue, but the user is logged in
      // Let's try to return basic info at least
      throw createError({
        statusCode: 500,
        message: 'Login successful but failed to retrieve user data. Please refresh the page.',
      });
    }

    const userData = await userResponse.json();
    console.log('[Auth Login] 👤 User data:', { id: userData.id, username: userData.username || userData.slug });
    console.log('[Auth Login] ✅ Login successful for user:', userData.id);

    // Get customer data from WooCommerce if available
    let customerData = null;
    try {
      const customerUrl = `${config.public.wooRestApiUrl}/customers/${userData.id}`;
      const customerResponse = await $fetch(customerUrl, {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });
      customerData = customerResponse;
      console.log('[Auth Login] 👤 Customer data retrieved');
    } catch (error) {
      console.warn('[Auth Login] ⚠️ Could not fetch customer data:', error);
      // Not critical, continue without customer data
    }

    return {
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.first_name || '',
        lastName: userData.last_name || '',
        displayName: userData.name,
        avatar: userData.avatar_urls?.['96'] || null,
        roles: userData.roles || [],
      },
      customer: customerData,
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

