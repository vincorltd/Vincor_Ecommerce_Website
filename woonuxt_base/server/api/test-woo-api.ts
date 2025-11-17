/**
 * Server API endpoint to test WooCommerce REST API endpoints
 * Uses environment variables for secure authentication
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  const endpoint = query.endpoint as string;
  const productId = query.productId as string;

  if (!endpoint) {
    throw createError({
      statusCode: 400,
      message: 'Endpoint parameter is required',
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
      throw new Error('Missing WooCommerce API credentials in server config');
    }

    let fullUrl = '';

    // Build the appropriate URL based on endpoint type
    switch (endpoint) {
      case 'products':
        // Fetch ALL products by paginating through all pages
        const allProducts: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
          const pageUrl = `${baseUrl}/wc/v3/products?per_page=100&page=${page}&context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
          console.log('[Test API] 🔍 Fetching page:', page);
          
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
        
        console.log('[Test API] ✅ Total products fetched:', allProducts.length);
        
        return {
          success: true,
          endpoint: `${baseUrl}/wc/v3/products`,
          data: allProducts,
        };
        break;

      case 'single-product':
        if (!productId) {
          throw createError({ statusCode: 400, message: 'Product ID required' });
        }
        // Check if it's a slug or ID
        if (isNaN(Number(productId))) {
          fullUrl = `${baseUrl}/wc/v3/products?slug=${productId}&context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        } else {
          fullUrl = `${baseUrl}/wc/v3/products/${productId}?context=view&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        }
        break;

      case 'global-addons':
        fullUrl = `${baseUrl}/wc-product-add-ons/v2/global-add-ons?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        break;

      case 'product-addons':
        if (!productId) {
          throw createError({ statusCode: 400, message: 'Product ID required' });
        }
        fullUrl = `${baseUrl}/wc/v3/products/${productId}/addons?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        break;

      case 'product-addons-v1':
        if (!productId) {
          throw createError({ statusCode: 400, message: 'Product ID required' });
        }
        fullUrl = `${baseUrl}/wc-product-add-ons/v1/product-add-ons/${productId}?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
        break;

      default:
        throw createError({ statusCode: 400, message: 'Invalid endpoint' });
    }

    console.log('[Test API] 🔍 Fetching:', fullUrl.replace(consumerKey, 'KEY').replace(consumerSecret, 'SECRET'));

    const response = await $fetch(fullUrl);

    return {
      success: true,
      endpoint: fullUrl.split('?')[0], // Return URL without credentials
      data: response,
    };
  } catch (error: any) {
    console.error('[Test API] ❌ Error:', error);
    
    return {
      success: false,
      error: error?.message || 'Failed to fetch data',
      statusCode: error?.statusCode || 500,
    };
  }
});

