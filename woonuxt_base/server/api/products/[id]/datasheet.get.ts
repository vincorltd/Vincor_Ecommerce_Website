/**
 * Server API endpoint to fetch product datasheet metadata from WooCommerce
 * GET /api/products/[id]/datasheet
 * 
 * Returns the datasheet URL if available, otherwise null
 * Follows the REST API proxy pattern used throughout this project
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const productId = getRouterParam(event, 'id');

  if (!productId) {
    throw createError({
      statusCode: 400,
      message: 'Product ID is required',
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

    // Ensure productId is a number
    const numericProductId = parseInt(productId, 10);
    if (isNaN(numericProductId)) {
      throw createError({
        statusCode: 400,
        message: `Invalid product ID: ${productId}`,
      });
    }

    console.log('[Datasheet API] 🔍 Fetching datasheet for product ID:', numericProductId);

    // Fetch product data including meta_data with cache-busting
    // Use context=edit to ensure we get all meta_data fields
    const timestamp = Date.now();
    const fullUrl = `${baseUrl}/wc/v3/products/${numericProductId}?context=edit&_=${timestamp}`;
    
    console.log('[Datasheet API] 🌐 Fetching from WooCommerce:', fullUrl);
    
    const product: any = await $fetch(fullUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${consumerKey}:${consumerSecret}`
        ).toString('base64')}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!product) {
      throw createError({
        statusCode: 404,
        message: `Product not found: ${numericProductId}`,
      });
    }

    // CRITICAL: Validate that the returned product ID matches what we requested
    if (product.id !== numericProductId) {
      console.error('[Datasheet API] ❌ PRODUCT ID MISMATCH!', {
        requested: numericProductId,
        returned: product.id,
        productName: product.name,
        sku: product.sku
      });
      throw createError({
        statusCode: 500,
        message: `Product ID mismatch: requested ${numericProductId}, got ${product.id}`,
      });
    }

    console.log('[Datasheet API] ✅ Product validated:', {
      id: product.id,
      name: product.name,
      sku: product.sku
    });

    // Extract datasheet URL from meta_data
    // IMPORTANT: Only look for datasheet meta keys that are specific to THIS product
    let datasheetUrl: string | null = null;
    let datasheetId: string | null = null;

    console.log('[Datasheet API] 📊 Product meta_data count:', product.meta_data?.length || 0);
    console.log('[Datasheet API] 📊 All meta_data keys:', product.meta_data?.map((m: any) => m.key) || 'none');
    
    if (product.meta_data && Array.isArray(product.meta_data)) {
      // Look for datasheet-related meta keys
      // Try multiple possible key names that might be used by different plugins
      const possibleKeys = [
        '_product_datasheet_url',
        '_datasheet_url',
        'datasheet_url',
        '_product_datasheet',
        '_datasheet',
        'datasheet'
      ];

      // Find all datasheet-related meta entries
      const datasheetMetas = product.meta_data.filter((m: any) => 
        possibleKeys.includes(m.key)
      );

      console.log('[Datasheet API] 🔍 Found datasheet meta entries:', datasheetMetas.map((m: any) => ({
        key: m.key,
        hasValue: !!m.value,
        valuePreview: typeof m.value === 'string' ? m.value.substring(0, 50) : String(m.value).substring(0, 50)
      })));

      // Prefer _product_datasheet_url if it exists
      const urlMeta = product.meta_data.find((m: any) => m.key === '_product_datasheet_url');
      const idMeta = product.meta_data.find((m: any) => m.key === '_product_datasheet_id');
      
      if (urlMeta && urlMeta.value) {
        datasheetUrl = String(urlMeta.value).trim();
        console.log('[Datasheet API] ✅ Found datasheet URL from _product_datasheet_url:', datasheetUrl);
      }
      
      if (idMeta && idMeta.value) {
        datasheetId = String(idMeta.value).trim();
        console.log('[Datasheet API] ✅ Found datasheet ID:', datasheetId);
      }

      // If no URL found, try other keys (but log warning)
      if (!datasheetUrl && datasheetMetas.length > 0) {
        const altMeta = datasheetMetas.find((m: any) => m.value && m.key !== '_product_datasheet_id');
        if (altMeta && altMeta.value) {
          datasheetUrl = String(altMeta.value).trim();
          console.warn('[Datasheet API] ⚠️ Using alternative datasheet key:', altMeta.key, 'URL:', datasheetUrl);
        }
      }
    }

    // Validate datasheet URL belongs to this product (if it contains product ID or SKU)
    if (datasheetUrl) {
      // Check if URL contains product ID or SKU to ensure it's the right datasheet
      const urlContainsProductId = datasheetUrl.includes(String(numericProductId));
      const urlContainsSku = product.sku && datasheetUrl.includes(product.sku);
      
      console.log('[Datasheet API] 🔍 Validating datasheet URL:', {
        url: datasheetUrl,
        containsProductId: urlContainsProductId,
        containsSku: urlContainsSku,
        productSku: product.sku
      });

      // If URL doesn't contain product ID or SKU, log warning but don't reject (might be valid)
      if (!urlContainsProductId && !urlContainsSku && product.sku) {
        console.warn('[Datasheet API] ⚠️ Datasheet URL does not contain product ID or SKU - may be mismatched!', {
          url: datasheetUrl,
          productId: numericProductId,
          sku: product.sku
        });
      }
    }

    if (datasheetUrl) {
      console.log('[Datasheet API] ✅ Datasheet found:', datasheetUrl);
      console.log('[Datasheet API] 📊 Datasheet metadata:', {
        url: datasheetUrl,
        id: datasheetId,
        hasDatasheet: true
      });
    } else {
      console.log('[Datasheet API] ℹ️ No datasheet found for product:', productId);
      console.log('[Datasheet API] 🔍 Checked fields:', {
        meta_data_keys: product.meta_data?.map((m: any) => m.key) || [],
        hasDatasheetUrl: !!product.datasheet_url,
        hasDatasheet: !!product.datasheet
      });
    }

    // Final validation before returning
    const response = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      datasheetUrl,
      datasheetId,
      hasDatasheet: !!datasheetUrl,
    };

    // Log final response for debugging
    console.log('[Datasheet API] 📤 Returning response:', {
      productId: response.productId,
      productName: response.productName,
      sku: response.sku,
      hasDatasheet: response.hasDatasheet,
      datasheetUrl: response.datasheetUrl ? response.datasheetUrl.substring(0, 100) + '...' : null
    });

    // CRITICAL: Set headers to prevent Netlify/CDN caching AND ensure product-specific cache keys
    // Include product ID in cache key to prevent cross-product contamination
    const lastModified = product.date_modified || product.date_modified_gmt || product.modified || product.modified_gmt;
    const etag = `"datasheet-${product.id}-${lastModified || Date.now()}"`;
    
    setHeaders(event, {
      'Cache-Control': 'no-cache, no-store, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': etag,
      'X-Product-ID': String(product.id),
      'X-Product-SKU': product.sku || '',
      'X-Product-Modified': lastModified || '',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Accept-Encoding, X-Product-ID, X-Product-SKU',
      // Force Netlify to not cache by adding unique, product-specific header
      'X-Cache-Key': `datasheet-${product.id}-${product.sku || 'nosku'}-${Date.now()}`,
    });

    return response;
  } catch (error: any) {
    console.error('[Datasheet API] ❌ Error:', error);
    
    // Return null datasheet instead of erroring (product might not have one)
    if (error?.statusCode === 404) {
      return {
        productId,
        datasheetUrl: null,
        datasheetId: null,
        hasDatasheet: false,
        error: 'Product not found',
      };
    }
    
    throw createError({
      statusCode: error?.statusCode || 500,
      message: error?.message || 'Failed to fetch datasheet metadata',
    });
  }
});

