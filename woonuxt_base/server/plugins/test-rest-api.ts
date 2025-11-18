/**
 * Server plugin to test REST API credentials during build
 * This helps debug credential issues during prerendering
 */
export default defineNitroPlugin(async (nitroApp) => {
  // Run during server-side operations (build/prerendering)
  // Use 'ready' hook to ensure config is available
  nitroApp.hooks.hook('ready', async () => {
    console.log('[REST API Test] 🔍 Testing WooCommerce REST API credentials...');
    console.log('[REST API Test] 📋 Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      isServer: process.server,
      isDev: process.dev,
    });
    
    try {
      const config = useRuntimeConfig();
      const wooRestApiUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
      const consumerKey = config.wooConsumerKey;
      const consumerSecret = config.wooConsumerSecret;
      
      console.log('[REST API Test] 📋 Configuration:', {
        wooRestApiUrl,
        hasConsumerKey: !!consumerKey,
        hasConsumerSecret: !!consumerSecret,
        consumerKeyLength: consumerKey?.length || 0,
        consumerSecretLength: consumerSecret?.length || 0,
        envVars: {
          WOO_REST_API_CONS_KEY: process.env.WOO_REST_API_CONS_KEY ? `SET (${process.env.WOO_REST_API_CONS_KEY.length} chars)` : 'NOT SET',
          WOO_REST_API_CONS_SEC: process.env.WOO_REST_API_CONS_SEC ? `SET (${process.env.WOO_REST_API_CONS_SEC.length} chars)` : 'NOT SET',
        }
      });
      
      if (!consumerKey || !consumerSecret) {
        console.error('[REST API Test] ❌ Missing WooCommerce API credentials!');
        console.error('[REST API Test] ⚠️ Make sure WOO_REST_API_CONS_KEY and WOO_REST_API_CONS_SEC are set in your environment variables.');
        console.error('[REST API Test] ⚠️ For Netlify, add these in Site settings > Environment variables');
        return;
      }
      
      // Test the connection
      const testUrl = `${wooRestApiUrl}/products?per_page=1&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      console.log('[REST API Test] 🌐 Testing connection to:', testUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));
      
      const response = await fetch(testUrl);
      const status = response.status;
      
      if (status === 401 || status === 403) {
        console.error('[REST API Test] ❌ Authentication failed! Status:', status);
        console.error('[REST API Test] ⚠️ Check that your consumer key and secret are correct.');
        const errorText = await response.text().catch(() => 'Could not read error');
        console.error('[REST API Test] Error details:', errorText.substring(0, 500));
      } else if (!response.ok) {
        console.warn('[REST API Test] ⚠️ Request failed with status:', status);
        const errorText = await response.text().catch(() => 'Could not read error');
        console.warn('[REST API Test] Error details:', errorText.substring(0, 500));
      } else {
        const data = await response.json();
        console.log('[REST API Test] ✅ Connection successful!');
        console.log('[REST API Test] ✅ Found', Array.isArray(data) ? data.length : 0, 'product(s)');
      }
    } catch (error: any) {
      console.error('[REST API Test] ❌ Connection test failed:', error.message);
      console.error('[REST API Test] Stack:', error.stack?.substring(0, 500));
    }
  });
});

