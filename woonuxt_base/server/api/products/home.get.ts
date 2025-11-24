/**
 * Lightweight server API endpoint for homepage
 * GET /api/products/home
 * 
 * Only fetches featured and popular products (limited set)
 * Much faster than fetching all products
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

    // Set cache headers for CDN/Edge caching (5 minutes)
    setHeaders(event, {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Vary': 'Accept-Encoding',
    });

    // Fetch featured products (limit to 5)
    const featuredUrl = `${baseUrl}/wc/v3/products?featured=true&per_page=5&orderby=menu_order&order=asc&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    
    // Fetch popular products (sorted by menu_order, limit to 5)
    const popularUrl = `${baseUrl}/wc/v3/products?per_page=5&orderby=menu_order&order=asc&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;

    console.log('[Products Home API] 🏠 Fetching featured and popular products...');

    // Fetch both in parallel for speed
    const [featuredResponse, popularResponse] = await Promise.all([
      $fetch(featuredUrl).catch(() => []),
      $fetch(popularUrl).catch(() => [])
    ]);

    const featured = Array.isArray(featuredResponse) ? featuredResponse : [];
    const popular = Array.isArray(popularResponse) ? popularResponse : [];

    console.log('[Products Home API] ✅ Fetched', featured.length, 'featured and', popular.length, 'popular products');

    return {
      featured,
      popular,
      // Extract unique categories from both sets
      categories: extractCategories([...featured, ...popular])
    };
  } catch (error: any) {
    console.error('[Products Home API] ❌ Error:', error);
    
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || 'Failed to fetch home products',
    });
  }
});

/**
 * Extract unique categories from products
 */
function extractCategories(products: any[]): any[] {
  const categoryMap = new Map();
  
  products.forEach((product: any) => {
    if (product.categories && Array.isArray(product.categories)) {
      product.categories.forEach((cat: any) => {
        if (cat.id && !categoryMap.has(cat.id)) {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          });
        }
      });
    }
  });
  
  return Array.from(categoryMap.values()).slice(0, 6);
}





