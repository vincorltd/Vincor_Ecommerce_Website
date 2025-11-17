/**
 * Server API endpoint to fetch categories with authentication
 * This proxies requests to WooCommerce REST API with consumer keys
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  // Build authenticated URL with consumer keys
  const url = new URL(`${config.public.wooRestApiUrl}/products/categories`);
  url.searchParams.append('consumer_key', config.wooConsumerKey);
  url.searchParams.append('consumer_secret', config.wooConsumerSecret);
  url.searchParams.append('per_page', '100');
  url.searchParams.append('hide_empty', 'true');
  url.searchParams.append('orderby', 'count');
  url.searchParams.append('order', 'desc');
  
  console.log('[Server API] Fetching categories from WooCommerce...');
  
  try {
    const response = await $fetch(url.toString());
    console.log('[Server API] ✅ Categories fetched successfully:', Array.isArray(response) ? response.length : 0);
    return response;
  } catch (error: any) {
    console.error('[Server API] ❌ Error fetching categories:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to fetch categories',
    });
  }
});



