/**
 * Send Password Reset Email
 * 
 * Triggers WordPress password reset email
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { email } = body;

    if (!email) {
      throw createError({
        statusCode: 400,
        message: 'Email is required',
      });
    }

    const config = useRuntimeConfig();
    const baseUrl = config.public.wooApiUrl.replace('/wp-json', '');

    console.log('[Auth Reset] 🔑 Sending password reset for:', email);

    // Use WordPress lost password endpoint
    const lostPasswordUrl = `${baseUrl}/wp-login.php?action=lostpassword`;
    
    const formData = new URLSearchParams();
    formData.append('user_login', email);
    formData.append('wp-submit', 'Get New Password');

    const response = await fetch(lostPasswordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    console.log('[Auth Reset] 📡 Response status:', response.status);

    // WordPress typically redirects with success message
    // We'll return success regardless to prevent email enumeration
    console.log('[Auth Reset] ✅ Password reset email sent (if account exists)');

    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  } catch (error: any) {
    console.error('[Auth Reset] 💥 Error:', error);
    
    // Always return success to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }
});















