/**
 * Product Tabs API Endpoint
 * 
 * Fetches tabs from WordPress Vincor Product Tabs plugin
 * Supports product ID or SKU lookup
 */
import type { ProductTabsResponse } from '../../../types/product-tabs';

export default defineEventHandler(async (event): Promise<ProductTabsResponse> => {
  const identifier = getRouterParam(event, 'identifier');
  
  if (!identifier) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Product ID or SKU is required'
    });
  }
  
  const config = useRuntimeConfig();
  const wordpressUrl = config.public.wooApiUrl || 'https://satchart.com/wp-json';
  
  try {
    console.log('[Product Tabs API] Fetching tabs for:', identifier);
    
    // Fetch from Vincor custom endpoint
    const url = `${wordpressUrl}/vincor/v1/product-tabs/${identifier}`;
    
    const response = await $fetch<ProductTabsResponse>(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('[Product Tabs API] ✅ Tabs fetched:', response?.tabs?.length || 0, 'tabs');
    
    return response;
  } catch (error: any) {
    console.error('[Product Tabs API] ❌ Error fetching tabs:', error.message);
    
    // Return empty tabs array on error rather than failing
    // This ensures type safety and graceful degradation
    return {
      product_id: typeof identifier === 'number' ? identifier : 0,
      tabs: []
    };
  }
});

