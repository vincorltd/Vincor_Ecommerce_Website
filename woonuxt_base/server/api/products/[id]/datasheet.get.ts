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

    console.log('[Datasheet API] 🔍 Fetching datasheet for product:', productId);

    // Fetch product data including meta_data with cache-busting
    const timestamp = Date.now();
    const fullUrl = `${baseUrl}/wc/v3/products/${productId}?context=view&_=${timestamp}&consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`;
    
    console.log('[Datasheet API] 🌐 Fetching from WooCommerce:', fullUrl.replace(/consumer_secret=[^&]+/, 'consumer_secret=***'));
    
    const product: any = await $fetch(fullUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!product) {
      throw createError({
        statusCode: 404,
        message: `Product not found: ${productId}`,
      });
    }

    // Extract datasheet URL from meta_data
    let datasheetUrl: string | null = null;
    let datasheetId: string | null = null;

    console.log('[Datasheet API] 📊 Product meta_data keys:', product.meta_data?.map((m: any) => m.key) || 'none');
    
    if (product.meta_data && Array.isArray(product.meta_data)) {
      const urlMeta = product.meta_data.find((m: any) => m.key === '_product_datasheet_url');
      const idMeta = product.meta_data.find((m: any) => m.key === '_product_datasheet_id');
      
      console.log('[Datasheet API] 🔍 Searching meta_data:', {
        urlMeta: urlMeta ? { key: urlMeta.key, hasValue: !!urlMeta.value } : null,
        idMeta: idMeta ? { key: idMeta.key, hasValue: !!idMeta.value } : null
      });
      
      datasheetUrl = urlMeta?.value || null;
      datasheetId = idMeta?.value || null;
    }

    // Check if datasheet is available in a direct field (in case plugin exposes it differently)
    if (!datasheetUrl && product.datasheet_url) {
      console.log('[Datasheet API] 📄 Found datasheet_url in direct field');
      datasheetUrl = product.datasheet_url;
    }
    
    // Check for other possible field names
    if (!datasheetUrl && product.datasheet) {
      console.log('[Datasheet API] 📄 Found datasheet in direct field');
      datasheetUrl = product.datasheet;
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

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      datasheetUrl,
      datasheetId,
      hasDatasheet: !!datasheetUrl,
    };
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

