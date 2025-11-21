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

    // Strategy: Try to get user ID from WooCommerce customer first (works for customers)
    // If no customer record, search WordPress users (works for admins)
    let userId = null;
    let userRoles = ['customer'];
    let userEmail = username;
    let firstName = '';
    let lastName = '';
    let displayName = username;
    let avatarUrl = null;

    // Try to find user by email first (search all roles using WooCommerce API)
    let customerData = null;
    try {
      console.log('[Auth Login] 📡 Searching for user by email:', username);
      const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
        params: {
          email: username,
          per_page: 1,
          role: 'all', // Search all roles, not just customers
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });

      if (Array.isArray(customers) && customers.length > 0) {
        customerData = customers[0];
        userId = customerData.id;
        console.log('[Auth Login] 👤 Found user by email:', userId);
      }
    } catch (error) {
      console.log('[Auth Login] ⚠️ User not found by email');
    }

    // If not found by email, try by username search (all roles)
    if (!customerData) {
      try {
        console.log('[Auth Login] 📡 Searching for user by username:', username);
        const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
          params: {
            search: username,
            per_page: 10,
            role: 'all', // Search all roles, not just customers
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${config.wooConsumerKey}:${config.wooConsumerSecret}`
            ).toString('base64')}`,
          },
        });

        if (Array.isArray(customers)) {
          customerData = customers.find(c => c.username === username);
          if (!customerData && customers.length > 0) {
            customerData = customers[0];
          }
          if (customerData) {
            userId = customerData.id;
            console.log('[Auth Login] 👤 Found user by username:', userId);
          }
        }
      } catch (error) {
        console.log('[Auth Login] ⚠️ User not found by username');
      }
    }

    // If we have user data from WooCommerce customers endpoint
    if (customerData) {
      userEmail = customerData.email;
      firstName = customerData.first_name || '';
      lastName = customerData.last_name || '';
      displayName = `${firstName} ${lastName}`.trim() || customerData.username;
      avatarUrl = customerData.avatar_url || null;
      
      console.log('[Auth Login] 🔍 Customer data keys:', Object.keys(customerData));
      console.log('[Auth Login] 🔍 Customer role field:', customerData.role);
      
      // WooCommerce customers endpoint returns 'role' field
      if (customerData.role) {
        userRoles = [customerData.role];
        console.log('[Auth Login] ✅ Using role from customer data:', userRoles);
      }
    }

    if (!userId) {
      throw createError({
        statusCode: 500,
        message: 'Failed to retrieve user data after authentication',
      });
    }

    // Create session cookie with user ID
    setCookie(event, 'wc-customer-id', String(userId), {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
    });

    console.log('[Auth Login] ✅ Login successful for user:', userId, 'Roles:', userRoles);

    return {
      success: true,
      user: {
        id: userId,
        username: customerData?.username || username,
        email: userEmail,
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        avatar: avatarUrl,
        roles: userRoles,
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

