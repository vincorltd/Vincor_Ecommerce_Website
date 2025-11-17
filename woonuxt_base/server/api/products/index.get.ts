/**
 * Server API endpoint to fetch all products from WooCommerce
 * GET /api/products
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  try {
    const consumerKey = config.wooConsumerKey;
    const consumerSecret = config.wooConsumerSecret;
    
    // Remove any trailing /wc/v3 or /wc/v2 from the base URL
    let baseUrl = config.public.wooRestApiUrl || 'https://satchart.com/wp-json';
    baseUrl = baseUrl.replace(/\/wc\/v[0-9]+\/?$/, '');
    
    // Ensure it ends with /wp-json
    if (!baseUrl.endsWith('/wp-json')) {
      baseUrl = baseUrl.replace(/\/?$/, '/wp-json');
    }

    if (!consumerKey || !consumerSecret) {
      throw createError({
        statusCode: 500,
        message: 'Missing WooCommerce API credentials in server config',
      });
    }

    // Fetch ALL products by paginating through all pages
    const allProducts: any[] = [];
    let page = 1;
    let hasMore = true;
    
    console.log('[Products API] 🔄 Fetching all products...');
    
    while (hasMore) {
      const pageUrl = `${baseUrl}/wc/v3/products?per_page=100&page=${page}&context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
      
      const pageResponse: any = await $fetch(pageUrl);
      
      if (Array.isArray(pageResponse) && pageResponse.length > 0) {
        allProducts.push(...pageResponse);
        page++;
        
        // If we got less than 100, we're on the last page
        if (pageResponse.length < 100) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log('[Products API] ✅ Total products fetched:', allProducts.length);
    
    return allProducts;
  } catch (error: any) {
    console.error('[Products API] ❌ Error:', error);
    
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || 'Failed to fetch products',
    });
  }
});


