/**
 * Register New User
 * 
 * Creates a new WooCommerce customer account
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email, username, password, firstName, lastName } = body;

    if (!email || !username || !password) {
      throw createError({
        statusCode: 400,
        message: 'Email, username, and password are required',
      });
    }

    const config = useRuntimeConfig();

    console.log('[Auth Register] 📝 Registering new user:', username);

    // Create customer using WooCommerce REST API
    const customerData = {
      email,
      username,
      password,
      first_name: firstName || '',
      last_name: lastName || '',
      billing: {
        first_name: firstName || '',
        last_name: lastName || '',
        email,
      },
      shipping: {
        first_name: firstName || '',
        last_name: lastName || '',
      },
    };

    const response = await $fetch(`${config.public.wooRestApiUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${config.wooConsumerKey}:${config.wooConsumerSecret}`
        ).toString('base64')}`,
      },
      body: customerData,
    });

    console.log('[Auth Register] ✅ User registered successfully:', response.id);

    return {
      success: true,
      customer: {
        id: response.id,
        email: response.email,
        username: response.username,
        firstName: response.first_name,
        lastName: response.last_name,
      },
    };
  } catch (error: any) {
    console.error('[Auth Register] 💥 Error:', error);

    // Parse WooCommerce error
    let message = 'Registration failed';
    if (error.data?.message) {
      message = error.data.message;
    } else if (error.message) {
      message = error.message;
    }

    // Check for specific error codes
    if (message.includes('email_exists')) {
      message = 'An account with this email already exists';
    } else if (message.includes('username_exists')) {
      message = 'This username is already taken';
    }

    throw createError({
      statusCode: error.statusCode || 400,
      message,
    });
  }
});















