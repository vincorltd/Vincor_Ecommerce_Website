/**
 * Server API endpoint to fetch a single product by slug from WooCommerce
 * GET /api/products/[slug]
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const slug = getRouterParam(event, 'slug');

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'Product slug is required',
    });
  }

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

    console.log('[Product API] 🔍 Fetching product:', slug);

    // Check if it's a numeric ID or slug
    let fullUrl: string;
    if (isNaN(Number(slug))) {
      // It's a slug
      fullUrl = `${baseUrl}/wc/v3/products?slug=${slug}&context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    } else {
      // It's an ID
      fullUrl = `${baseUrl}/wc/v3/products/${slug}?context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    }

    const response: any = await $fetch(fullUrl);

    // If searching by slug, WooCommerce returns an array
    const product = Array.isArray(response) ? response[0] : response;

    if (!product) {
      throw createError({
        statusCode: 404,
        message: `Product not found: ${slug}`,
      });
    }

    console.log('[Product API] ✅ Product fetched:', product.name);
    
    return product;
  } catch (error: any) {
    console.error('[Product API] ❌ Error:', error);
    
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || 'Failed to fetch product',
    });
  }
});


