/**
 * Server API endpoint to fetch all products from WooCommerce
 * GET /api/products
 * 
 * Optimized with:
 * - Response caching (5 min CDN, 1 min browser)
 * - Parallel pagination for faster loading
 * - Proper error handling
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

    // Check if this is a server-side request (SSR) - bypass cache for fresh data
    // Server requests include a special header or query param to bypass cache
    const isSSRRequest = getHeader(event, 'x-nuxt-ssr') === 'true' || 
                         getQuery(event).ssr === 'true' ||
                         getQuery(event).refresh === 'true';
    
    // For SSR requests, disable caching to ensure fresh data
    // For client requests, use shorter cache for better performance
    if (isSSRRequest) {
      setHeaders(event, {
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
    } else {
      // Set cache headers for CDN/Edge caching (shorter for client requests)
      // Reduced to 1 minute CDN, 30 seconds browser to allow faster updates
      setHeaders(event, {
        'Cache-Control': 'public, s-maxage=60, max-age=30, stale-while-revalidate=120',
        'Vary': 'Accept-Encoding',
      });
    }

    // First, get total count to determine how many pages we need
    // Add cache-busting timestamp for SSR requests to ensure fresh data
    const cacheBuster = isSSRRequest ? `&_=${Date.now()}` : '';
    const firstPageUrl = `${baseUrl}/wc/v3/products?per_page=100&page=1&context=view${cacheBuster}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    
    console.log('[Products API] 🔄 Fetching all products...', { isSSRRequest, cacheBuster: !!cacheBuster });
    
    // Use $fetch with no-cache option for SSR requests
    const fetchOptions = isSSRRequest ? { 
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    } : {};
    
    const firstPageResponse: any = await $fetch(firstPageUrl, fetchOptions);
    
    if (!Array.isArray(firstPageResponse)) {
      throw new Error('Invalid response from WooCommerce API');
    }

    const allProducts: any[] = [...firstPageResponse];
    
    // If we got 100 products, there might be more pages
    if (firstPageResponse.length === 100) {
      // Fetch remaining pages in parallel (batches of 5 for efficiency)
      const batchSize = 5;
      let page = 2;
      let hasMore = true;
      
      while (hasMore) {
        // Create batch of page requests
        const pagePromises: Promise<any>[] = [];
        for (let i = 0; i < batchSize && hasMore; i++) {
          const pageUrl = `${baseUrl}/wc/v3/products?per_page=100&page=${page + i}&context=view${cacheBuster}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
          pagePromises.push(
            $fetch(pageUrl, fetchOptions).catch((err) => {
              console.warn(`[Products API] ⚠️ Failed to fetch page ${page + i}:`, err);
              return [];
            })
          );
        }
        
        // Fetch batch in parallel
        const batchResults = await Promise.all(pagePromises);
        
        // Process results
        let foundAny = false;
        for (const result of batchResults) {
          if (Array.isArray(result) && result.length > 0) {
            allProducts.push(...result);
            foundAny = true;
            // If we got less than 100, this is the last page
            if (result.length < 100) {
              hasMore = false;
            }
          }
        }
        
        if (!foundAny) {
          hasMore = false;
        } else {
          page += batchSize;
        }
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


