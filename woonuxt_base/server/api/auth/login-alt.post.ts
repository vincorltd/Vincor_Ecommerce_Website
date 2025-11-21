/**
 * Alternative Login Using WooCommerce Customer Authentication
 * 
 * This uses WooCommerce's customer endpoint with email and creates a session
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

    console.log('[Auth Login Alt] 🔐 Attempting login for:', username);

    // Try to find user by email or username using WooCommerce API with role=all
    let customer = null;
    
    try {
      // Try to find by email first (all roles)
      const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
        params: {
          email: username,
          per_page: 1,
          role: 'all', // Search all roles including administrators
        },
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${config.wooConsumerKey}:${config.wooConsumerSecret}`
          ).toString('base64')}`,
        },
      });

      if (Array.isArray(customers) && customers.length > 0) {
        customer = customers[0];
      }
    } catch (error) {
      console.log('[Auth Login Alt] ⚠️ User not found by email, trying username');
    }

    // If not found by email, try by username (all roles)
    if (!customer) {
      try {
        const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
          params: {
            search: username,
            per_page: 10,
            role: 'all', // Search all roles including administrators
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${config.wooConsumerKey}:${config.wooConsumerSecret}`
            ).toString('base64')}`,
          },
        });

        if (Array.isArray(customers)) {
          // Find exact username match
          customer = customers.find(c => c.username === username);
          if (!customer && customers.length > 0) {
            customer = customers[0];
          }
        }
      } catch (error) {
        console.error('[Auth Login Alt] ❌ Failed to search for user:', error);
      }
    }

    // If no user found
    if (customer) {
      console.log('[Auth Login Alt] 👤 Found user:', customer.id, 'Role:', customer.role);
    } else {
      console.log('[Auth Login Alt] ℹ️ No user found');
    }

    // Verify password by attempting WordPress authentication
    // Since we can't verify password directly through WooCommerce API,
    // we'll use WordPress XML-RPC or wp-login.php
    const baseUrl = config.public.wooApiUrl.replace('/wp-json', '');
    const loginUrl = `${baseUrl}/wp-login.php`;
    
    const formData = new URLSearchParams();
    formData.append('log', username);
    formData.append('pwd', password);
    formData.append('wp-submit', 'Log In');

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    // Check if WordPress accepted the credentials
    const loginCookies = loginResponse.headers.get('set-cookie');
    
    if (!loginCookies || loginResponse.status === 200) {
      // Status 200 means login form was returned (failed)
      // Successful login typically returns 302 redirect
      throw createError({
        statusCode: 401,
        message: 'Invalid username or password',
      });
    }

    console.log('[Auth Login Alt] ✅ Password verified');

    // Forward authentication cookies to client
    setHeader(event, 'set-cookie', loginCookies);

    // Parse cookies to use for WordPress API
    // WordPress returns multiple Set-Cookie headers as a comma-separated string
    // We need to extract just the cookie name=value pairs
    let cookieString = '';
    if (loginCookies) {
      // Split by line breaks or commas that are followed by a cookie name
      const cookieArray = loginCookies.split(/,\s*(?=[a-zA-Z_][a-zA-Z0-9_]*=)/);
      
      const cookieValues = cookieArray.map(cookie => {
        // Extract just the name=value part (before first semicolon)
        const match = cookie.match(/^([^;]+)/);
        return match ? match[1].trim() : '';
      }).filter(Boolean);
      
      cookieString = cookieValues.join('; ');
      
      console.log('[Auth Login Alt] 🍪 Parsed cookies:', cookieValues.length, 'cookies');
      console.log('[Auth Login Alt] 🍪 Cookie names:', cookieValues.map(c => c.split('=')[0]).join(', '));
    }

    // Extract user data from WooCommerce customer object
    let userId = customer?.id;
    let userRoles = customer?.role ? [customer.role] : ['customer'];
    let userEmail = customer?.email || username;
    let firstName = customer?.first_name || '';
    let lastName = customer?.last_name || '';
    let displayName = `${firstName} ${lastName}`.trim() || customer?.username || username;
    let avatarUrl = customer?.avatar_url || null;

    console.log('[Auth Login Alt] 🔍 User data:', {
      id: userId,
      role: customer?.role,
      roles: userRoles,
    });

    // Verify we have a user ID
    if (!userId) {
      console.error('[Auth Login Alt] ❌ No user ID available');
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

    console.log('[Auth Login Alt] ✅ Login successful for user:', userId, 'Roles:', userRoles);

    // Return user data
    return {
      success: true,
      user: {
        id: userId,
        username: customer?.username || username,
        email: userEmail,
        firstName: firstName,
        lastName: lastName,
        displayName: displayName,
        avatar: avatarUrl,
        roles: userRoles,
      },
      customer: customer, // May be null for admin users
    };
  } catch (error: any) {
    console.error('[Auth Login Alt] 💥 Error:', error);
    
    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Authentication failed',
    });
  }
});























