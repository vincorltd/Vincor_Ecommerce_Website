/**
 * Server API endpoint to get product variations
 * Handles authentication on the server-side
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const productId = getRouterParam(event, 'id');

  console.log('[Products API] 🔍 Fetching variations for product:', productId);

  if (!productId) {
    throw createError({
      statusCode: 400,
      message: 'Product ID is required',
    });
  }

  try {
    const consumerKey = config.wooConsumerKey;
    const consumerSecret = config.wooConsumerSecret;

    if (!consumerKey || !consumerSecret) {
      throw new Error('Missing WooCommerce API credentials in server config');
    }

    // Build authenticated URL with context=view
    const apiUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json/wc/v3';
    const url = new URL(`${apiUrl}/products/${productId}/variations`);
    url.searchParams.append('consumer_key', consumerKey);
    url.searchParams.append('consumer_secret', consumerSecret);
    url.searchParams.append('context', 'view'); // Get all data including add-ons
    url.searchParams.append('per_page', '100'); // Get all variations

    console.log('[Products API] 🔐 Calling authenticated REST API for variations with context=view');

    const variations = await $fetch(url.toString());

    console.log('[Products API] ✅ Variations fetched:', Array.isArray(variations) ? variations.length : 0);
    return variations;
  } catch (error: any) {
    console.error('[Products API] ❌ Error fetching variations:', error);
    throw createError({
      statusCode: error?.response?.status || 500,
      message: error?.message || 'Failed to fetch variations',
    });
  }
});


