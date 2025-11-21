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

    // Find customer by email or username
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

    if (!customer) {
      throw createError({
        statusCode: 401,
        message: 'Invalid username or password',
      });
    }

    console.log('[Auth Login Alt] 👤 Found customer:', customer.id);

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

    // Create a simple session cookie with customer ID
    const sessionToken = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64');
    
    setCookie(event, 'wc-customer-id', String(customer.id), {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
    });

    // Parse cookies to use for WordPress API
    let cookieString = '';
    if (loginCookies) {
      const cookies = loginCookies.split(',').map(cookie => {
        const parts = cookie.trim().split(';');
        return parts[0];
      }).join('; ');
      cookieString = cookies;
    }

    // Get actual user roles from WordPress
    let userRoles = ['customer']; // Default fallback
    try {
      const userDataUrl = `${config.public.wooApiUrl}/wp/v2/users/me`;
      const userResponse = await fetch(userDataUrl, {
        headers: {
          'Cookie': cookieString,
          'Accept': 'application/json',
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        userRoles = userData.roles || ['customer'];
        console.log('[Auth Login Alt] 👤 User roles:', userRoles);
      }
    } catch (error) {
      console.warn('[Auth Login Alt] ⚠️ Could not fetch user roles, using default');
    }

    console.log('[Auth Login Alt] ✅ Login successful for user:', customer.id);

    return {
      success: true,
      user: {
        id: customer.id,
        username: customer.username,
        email: customer.email,
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        displayName: `${customer.first_name} ${customer.last_name}`.trim() || customer.username,
        avatar: customer.avatar_url || null,
        roles: userRoles,
      },
      customer: customer,
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























