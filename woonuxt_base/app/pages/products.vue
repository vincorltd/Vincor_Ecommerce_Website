<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { setProducts, updateProductList } = useProducts();
const { isFiltersActive } = useFiltering();
const route = useRoute();
const { storeSettings } = useAppConfig();
const { isQueryEmpty } = useHelpers();

// Use Pinia products store (plural) for listing page
const productsStore = useProductsStore();

// Dev mode check for template (safe for SSR)
const isDev = computed(() => typeof process !== 'undefined' && process.dev);

// PRODUCTION FIX: Track manual refresh state to ensure UI shows loading
const isManuallyRefreshing = ref(false);

// Fetch products following Nuxt, WooCommerce, and Netlify best practices
// - Nuxt: useAsyncData for SSR-compatible data fetching
// - WooCommerce: REST API with pagination (per_page=100, parallel batches)
// - Netlify: Edge Functions with ISR (isr: 300) for optimal caching
// Server: Always fetches fresh data from API endpoint with SSR flag
// Client: Uses Pinia store cache for instant navigation (when fresh)
const { data: allProducts, pending, error, refresh: refreshProducts } = await useAsyncData<Product[]>(
  'all-products',
  async () => {
    // CRITICAL: This function should only run:
    // 1. On SSR - to fetch and serialize data
    // 2. On client - when SSR data is missing or invalid (hydration failed)
    try {
      const forceRefresh = route.query.refresh === 'true';
      
      // Determine if this is SSR request
      const isSSR = process.server;
      
      if (isSSR) {
        console.log('[Products Page] 🔄 SSR: Fetching from /api/products');
        
        const products = await $fetch('/api/products', {
          query: { ssr: 'true' },
          headers: { 'x-nuxt-ssr': 'true' }
        });
        
        console.log('[Products Page] ✅ SSR: Received', Array.isArray(products) ? products.length : 0, 'products');
        
        if (!Array.isArray(products)) {
          console.error('[Products Page] ❌ SSR: Invalid response type');
          return [];
        }
        
        // Transform for SSR - ensure data is JSON serializable
        const transformed = productsStore.transformProducts(products);
        console.log('[Products Page] ✅ SSR: Transformed', transformed.length, 'products');
        
        // CRITICAL: Ensure data is fully serializable for SSR hydration
        // Deep clone and remove any non-serializable properties
        const serialized = JSON.parse(JSON.stringify(transformed));
        console.log('[Products Page] ✅ SSR: Serialized', serialized.length, 'products for hydration');
        
        return serialized;
      } else {
        // Client-side: This runs when SSR data is missing or invalid
        // On initial load (hard refresh), this shouldn't run IF SSR data hydrates properly
        // If this runs, it means SSR hydration failed
        
        console.warn('[Products Page] ⚠️ Client async function running - SSR hydration may have failed');
        console.log('[Products Page] 🔄 Client: Fetching from store...', { forceRefresh });
        
        const products = await productsStore.fetchAll(forceRefresh);
        console.log('[Products Page] ✅ Client: Got', products.length, 'products from store');
        
        if (products.length === 0) {
          console.error('[Products Page] ❌ Store returned 0 products - SSR hydration failed and client fetch returned empty!');
        }
        
        return products;
      }
    } catch (err: any) {
      console.error('[Products Page] ❌ Fetch failed:', err);
      return [];
    }
  },
  {
    server: true,        // Enable SSR - Nuxt best practice
    lazy: false,         // Blocking: wait for data before rendering (no empty shell)
    // CRITICAL: In Nuxt 4, do NOT set default in dev mode - let SSR data hydrate naturally
    // Setting default can interfere with SSR hydration. Only use in production for graceful degradation.
    ...(process.dev ? {} : { default: () => [] }),
    // CRITICAL: Transform ensures proper data serialization for SSR hydration
    // In Nuxt 4, transform is called for both SSR serialization AND client hydration
    // The transform must ALWAYS return an array - never undefined/null
    transform: (result) => {
      // Ensure we always return an array (never null/undefined)
      // This is critical for SSR hydration - Nuxt expects consistent return types
      const transformed = Array.isArray(result) ? result : [];
      console.log('[Products Page] 🔄 Transform called:', { 
        inputType: typeof result, 
        isArray: Array.isArray(result),
        length: transformed.length,
        isServer: process.server,
        isClient: process.client,
        hasData: transformed.length > 0
      });
      return transformed;
    },
    // CRITICAL: In Nuxt 4, getCachedData should ONLY be used for client-side navigation
    // On initial page load (hard refresh), return undefined to allow SSR hydration
    getCachedData: (key) => {
      // Server: Always fetch fresh for SSR (ensures latest data)
      if (process.server) {
        return undefined;
      }
      
      // CRITICAL FIX for Nuxt 4: On initial client load (hard refresh), 
      // we MUST return undefined to allow Nuxt to hydrate SSR data from __NUXT__ payload.
      // Only use cached data for client-side navigation (when user navigates from another page).
      
      // Skip cache on refresh request
      if (process.client && route.query.refresh === 'true') {
        return undefined;
      }
      
      // Client-side navigation (NOT initial load): Use Pinia cache if fresh
      // Detect navigation vs initial load by checking if we have cached products and this isn't first mount
      // We can't check allProducts.value here (doesn't exist yet), so we check Pinia store state
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        // This is likely a client-side navigation - use cache for instant loading
        console.log('[Products Page] 💾 Using Pinia cache for navigation:', productsStore.allProducts.length, 'products');
        return productsStore.allProducts;
      }
      
      // For initial page load: return undefined to allow Nuxt to hydrate SSR data
      // Nuxt will automatically extract SSR data from __NUXT__ payload during hydration
      return undefined;
    }
  }
);

// Watch for refresh query param and clear cache when needed
watch(() => route.query.refresh, (newVal) => {
  if (newVal === 'true' && process.client) {
    productsStore.clearAllCache();
    refreshProducts();
  }
});

// CRITICAL: Expose useAsyncData state to window for global debug panel access
// This allows the global debug panel to inspect products page state
const updateWindowState = () => {
  if (process.client) {
    (window as any).__PRODUCTS_ASYNC_DATA__ = {
      data: allProducts.value,
      pending: pending.value,
      error: error.value,
      exists: !!allProducts.value,
      length: Array.isArray(allProducts.value) ? allProducts.value.length : 0,
      isArray: Array.isArray(allProducts.value),
      timestamp: new Date().toISOString(),
    };
  }
};

  // CRITICAL: Nuxt 4 hydration fix - manually extract SSR data if Nuxt didn't hydrate it
  // This is a workaround for a Nuxt 4 bug where large SSR payloads don't hydrate automatically
  if (process.client) {
    // Function to manually extract SSR data from Nuxt payload
    const extractSSRData = () => {
      const nuxtData = (window as any).__NUXT__;
      if (!nuxtData) return null;
      
      // Check if SSR data exists in the payload
      // Nuxt 4 stores SSR data in different locations depending on compression
      if (nuxtData.data && Array.isArray(nuxtData.data)) {
        for (const entry of nuxtData.data) {
          if (entry && entry['all-products']) {
            const ssrProducts = entry['all-products'];
            if (Array.isArray(ssrProducts) && ssrProducts.length > 0) {
              console.log('[Products Page] 🔧 Found SSR data in payload - manually extracting', ssrProducts.length, 'products');
              return ssrProducts;
            }
          }
        }
      }
      
      // Also check compressed state format
      if (nuxtData.state && nuxtData.state.$s && nuxtData.state.$s['all-products']) {
        const compressed = nuxtData.state.$s['all-products'];
        if (compressed && typeof compressed === 'object') {
          console.log('[Products Page] 🔧 Found SSR data in compressed state - attempting to extract');
          // Try to decompress or extract
          return null; // Would need decompression logic here
        }
      }
      
      return null;
    };
    
    // Immediate check
    updateWindowState();
    console.log('[Products Page] 💧 Client hydration (immediate) - allProducts.value:', {
      exists: !!allProducts.value,
      length: allProducts.value?.length || 0,
      isArray: Array.isArray(allProducts.value),
      pending: pending.value,
      error: error.value
    });
    
    // Check after next tick (Nuxt hydration might still be in progress)
    nextTick(() => {
      updateWindowState();
      console.log('[Products Page] 💧 Client hydration (nextTick) - allProducts.value:', {
        exists: !!allProducts.value,
        length: allProducts.value?.length || 0,
        isArray: Array.isArray(allProducts.value),
        pending: pending.value,
        error: error.value
      });
      
      // CRITICAL: If still empty after hydration, try to manually extract SSR data
      if (!allProducts.value || allProducts.value.length === 0) {
        console.warn('[Products Page] ⚠️ SSR hydration may have failed - attempting manual extraction');
        const ssrData = extractSSRData();
        
        if (ssrData && ssrData.length > 0) {
          // Manually set the SSR data if we found it
          console.log('[Products Page] ✅ Successfully extracted SSR data - setting products', ssrData.length);
          allProducts.value = ssrData;
          
          // Also populate Pinia store for consistency
          if (ssrData.length > 0) {
            productsStore.setProducts(ssrData);
          }
          
          return; // Success - no need to force refresh
        }
        
        // If we can't extract SSR data, force refresh immediately
        console.error('[Products Page] ❌ SSR hydration FAILED! allProducts.value is empty and SSR data not found in payload');
        console.error('[Products Page] 🔍 Checking Nuxt payload...');
        const nuxtData = (window as any).__NUXT__;
        if (nuxtData) {
          console.log('[Products Page] 🔍 Nuxt data exists:', {
            hasData: !!nuxtData.data,
            hasState: !!nuxtData.state,
            keys: Object.keys(nuxtData),
            dataType: nuxtData.data ? typeof nuxtData.data : null,
          });
        }
        
        // PRODUCTION FIX: Force immediate refresh with retry mechanism
        console.warn('[Products Page] 🔄 Forcing refresh to fetch products (production fallback)...');
        
        // Set manual refresh flag to show loading state immediately
        isManuallyRefreshing.value = true;
        
        // Immediate refresh attempt
        const performRefresh = async () => {
          try {
            // Force refresh - this will trigger the async function
            // Note: refreshProducts() should set pending=true automatically, but we track it manually too
            await refreshProducts();
            
            // Wait a bit and check if products are loaded
            setTimeout(() => {
              if (!allProducts.value || allProducts.value.length === 0) {
                console.warn('[Products Page] ⚠️ First refresh attempt failed - retrying...');
                // Retry once more after 500ms
                setTimeout(async () => {
                  try {
                    await refreshProducts();
                    // Give it time to load
                    setTimeout(() => {
                      isManuallyRefreshing.value = false;
                      if (allProducts.value && allProducts.value.length > 0) {
                        console.log('[Products Page] ✅ Retry refresh successful - products loaded:', allProducts.value.length);
                      }
                    }, 500);
                  } catch (retryError) {
                    console.error('[Products Page] ❌ Retry refresh failed:', retryError);
                    isManuallyRefreshing.value = false;
                  }
                }, 500);
              } else {
                console.log('[Products Page] ✅ Refresh successful - products loaded:', allProducts.value.length);
                isManuallyRefreshing.value = false;
              }
            }, 300);
          } catch (error) {
            console.error('[Products Page] ❌ Refresh failed:', error);
            // Retry after error
            setTimeout(async () => {
              try {
                await refreshProducts();
                setTimeout(() => {
                  isManuallyRefreshing.value = false;
                }, 500);
              } catch (retryError) {
                console.error('[Products Page] ❌ Retry refresh also failed:', retryError);
                isManuallyRefreshing.value = false;
              }
            }, 1000);
          }
        };
        
        // Start refresh immediately (no delay for production)
        performRefresh();
      }
    });
  }

// Update window reference when data, pending, or error changes
watch([allProducts, pending, error], () => {
  updateWindowState();
}, { deep: true, immediate: true });

// CRITICAL: Sync products immediately (both SSR and client)
// This ensures ProductGrid has data available (it uses the old composable)
// Also populate Pinia store from SSR data on client hydration
if (allProducts.value && allProducts.value.length > 0) {
  setProducts(allProducts.value);
  
  // Populate Pinia store from SSR data on first client hydration
  if (process.client && productsStore.allProducts.length === 0) {
    console.log('[Products Page] 💾 Populating Pinia store from SSR data:', allProducts.value.length, 'products');
    productsStore.allProducts = allProducts.value;
    productsStore.lastFetched = Date.now();
  }
}

// Watch for changes and sync - CRITICAL for production refresh fallback
watch(allProducts, (newProducts, oldProducts) => {
  if (newProducts && newProducts.length > 0) {
    console.log('[Products Page] 🔄 Products updated in watch:', {
      oldLength: oldProducts?.length || 0,
      newLength: newProducts.length,
      isClient: process.client
    });
    
    // Clear manual refresh flag when products are successfully loaded
    if (isManuallyRefreshing.value) {
      console.log('[Products Page] ✅ Clearing manual refresh flag - products loaded successfully');
      isManuallyRefreshing.value = false;
    }
    
    setProducts(newProducts);
    
    // Populate Pinia store from SSR data on first client hydration
    if (process.client && productsStore.allProducts.length === 0) {
      console.log('[Products Page] 💾 Populating Pinia store from watch:', newProducts.length, 'products');
      productsStore.allProducts = newProducts;
      productsStore.lastFetched = Date.now();
    } else if (process.client && newProducts.length > (productsStore.allProducts.length || 0)) {
      // Update Pinia store if we got more products (e.g., from refresh)
      console.log('[Products Page] 💾 Updating Pinia store from watch (refresh):', newProducts.length, 'products');
      productsStore.allProducts = newProducts;
      productsStore.lastFetched = Date.now();
    }
  } else if (process.client && (!newProducts || newProducts.length === 0)) {
    // Only log warning if we're not currently loading or manually refreshing
    if (!pending.value && !isManuallyRefreshing.value) {
      console.warn('[Products Page] ⚠️ allProducts is empty on client!', {
        value: newProducts,
        pending: pending.value,
        isManuallyRefreshing: isManuallyRefreshing.value,
        error: error.value
      });
    }
  }
}, { immediate: true, deep: true });

onMounted(() => {
  // Ensure composable's allProducts is synced before filtering
  if (allProducts.value && allProducts.value.length > 0) {
    setProducts(allProducts.value);
  }
  
  if (!isQueryEmpty.value) updateProductList();
});

watch(
  () => route.query,
  () => {
    if (route.name !== 'products') return;
    
    // CRITICAL: Ensure composable's allProducts is synced before filtering
    // This is essential for search/filter to work properly on the products page
    if (allProducts.value && allProducts.value.length > 0) {
      setProducts(allProducts.value);
    }
    
    updateProductList();
  },
);

useHead({
  title: 'Products',
  meta: [{ name: 'description', content: 'Products' }],
});
</script>

<template>
  <div>
    <!-- Loading state - show when pending OR manually refreshing (production fallback) -->
    <div v-if="pending || isManuallyRefreshing" class="min-h-screen w-full flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600">Loading products...</p>
      </div>
    </div>

    <!-- Error state -->
    <NoProductsFound v-else-if="error">
      Error loading products: {{ error.message }}
    </NoProductsFound>

    <!-- Products loaded -->
    <div class="min-h-screen w-full" v-else-if="allProducts && allProducts.length">
      <div class="container mx-auto px-4 lg:px-8">
        <div class="flex flex-col lg:flex-row lg:items-start gap-8">
          <!-- Filters (handles both desktop and mobile internally) -->
          <div v-if="storeSettings.showFilters" class="lg:sticky lg:top-4 lg:self-start">
            <Filters :hide-categories="false" />
          </div>
          
          <!-- Main content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between w-full gap-4 mt-8 lg:gap-8">
              <ProductResultCount />
              <div class="flex items-center gap-2">
                <ShowFilterTrigger v-if="storeSettings.showFilters" class="lg:hidden" />
                <OrderByDropdown class="hidden lg:inline-flex" v-if="storeSettings.showOrderByDropdown" />
              </div>
            </div>
            <ProductGrid />
          </div>
        </div>
      </div>
    </div>

    <!-- No products -->
    <NoProductsFound 
      v-else-if="!pending && !error"
      :async-data-all-products="allProducts"
      :async-data-pending="pending"
      :async-data-error="error"
      :async-data-refresh="refreshProducts"
    >
      No products found. Please check your configuration or try again later.
    </NoProductsFound>
  </div>
</template>
