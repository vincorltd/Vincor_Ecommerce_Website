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

    // Try to find customer by email or username
    // Note: Admin users might not have a customer record, which is OK
    let customer = null;
    
    try {
      // Try to find by email first
      const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
        params: {
          email: username,
          per_page: 1,
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
      console.log('[Auth Login Alt] ⚠️ Customer not found by email, trying username');
    }

    // If not found by email, try by username
    if (!customer) {
      try {
        const customers = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
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

        if (Array.isArray(customers)) {
          // Find exact username match
          customer = customers.find(c => c.username === username);
        }
      } catch (error) {
        console.error('[Auth Login Alt] ❌ Failed to search for customer:', error);
      }
    }

    // If no customer found (e.g., admin user), that's OK - we'll verify password with WordPress
    // and get user info from WordPress API instead
    if (customer) {
      console.log('[Auth Login Alt] 👤 Found customer:', customer.id);
    } else {
      console.log('[Auth Login Alt] ℹ️ No customer record (might be admin user)');
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

    // For customer users, we have the ID from WooCommerce
    // For non-customers (admins), we need to get user ID from WordPress
    let userId = customer?.id;
    let userRoles = ['customer'];
    let userEmail = customer?.email || username;
    let firstName = customer?.first_name || '';
    let lastName = customer?.last_name || '';
    let displayName = `${firstName} ${lastName}`.trim() || username;
    let avatarUrl = customer?.avatar_url || null;

    // If no customer record, try to get WordPress user data via admin API
    if (!customer) {
      console.log('[Auth Login Alt] ℹ️ No customer record, fetching WordPress user via admin API');
      
      try {
        // Use WooCommerce auth to query WordPress users
        const wpUsersUrl = `${config.public.wooApiUrl}/wp/v2/users`;
        const usersResponse = await $fetch(wpUsersUrl, {
          params: {
            search: username,
            per_page: 5,
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${config.wooConsumerKey}:${config.wooConsumerSecret}`
            ).toString('base64')}`,
          },
        });

        if (Array.isArray(usersResponse) && usersResponse.length > 0) {
          // Find exact match by username or email
          const wpUser = usersResponse.find(u => 
            u.slug === username || 
            u.email === username ||
            u.name === username
          ) || usersResponse[0];

          if (wpUser) {
            userId = wpUser.id;
            userRoles = wpUser.roles || ['customer'];
            userEmail = wpUser.email || username;
            firstName = wpUser.first_name || '';
            lastName = wpUser.last_name || '';
            displayName = wpUser.name || `${firstName} ${lastName}`.trim();
            avatarUrl = wpUser.avatar_urls?.['96'] || null;
            
            console.log('[Auth Login Alt] 👤 Found WordPress user:', userId, 'Roles:', userRoles);
          }
        }
      } catch (error: any) {
        console.error('[Auth Login Alt] ❌ Failed to fetch WordPress user:', error.message);
      }
    }

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























