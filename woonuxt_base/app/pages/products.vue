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
    default: () => [],   // Default empty array
    // CRITICAL: Transform ensures proper data serialization for SSR hydration
    // Match the pattern from /product/[slug].vue which works correctly
    transform: (result) => {
      // Ensure we always return an array (never null/undefined)
      // This is critical for SSR hydration
      const transformed = Array.isArray(result) ? result : [];
      console.log('[Products Page] 🔄 Transform called:', { 
        inputType: typeof result, 
        isArray: Array.isArray(result),
        length: transformed.length 
      });
      return transformed;
    },
    // Match the working /product/[slug].vue pattern exactly
    getCachedData: (key) => {
      // Server: Always fetch fresh for SSR (ensures latest data)
      if (process.server) {
        return undefined;
      }
      
      // Client: For initial hydration (hard refresh), let Nuxt hydrate SSR data from HTML
      // Only use Pinia cache for client-side navigation, not initial page load
      
      // CRITICAL: In dev mode on initial load, return undefined to allow SSR hydration
      // Returning cached data here would prevent SSR data from hydrating
      if (process.dev && process.client) {
        // Check if this is an initial load (no previous navigation)
        // If window.__NUXT__ exists with data, Nuxt should hydrate it
        // Don't interfere with that process
        return undefined;
      }
      
      // Skip cache on refresh request
      if (process.client && route.query.refresh === 'true') {
        return undefined;
      }
      
      // Client navigation: Use Pinia cache if fresh (not initial load)
      // This gives instant loading when navigating between pages
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        console.log('[Products Page] 💾 Using Pinia cache for navigation:', productsStore.allProducts.length, 'products');
        return productsStore.allProducts;
      }
      
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

// Initial update - wait a tick for Nuxt hydration to complete
if (process.client) {
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
    
    // CRITICAL: If still empty after hydration, SSR hydration failed
    // Force a refresh to fetch data from the API
    if (!allProducts.value || allProducts.value.length === 0) {
      console.error('[Products Page] ❌ SSR hydration FAILED! allProducts.value is empty after nextTick');
      console.error('[Products Page] 🔍 Checking Nuxt payload...');
      const nuxtData = (window as any).__NUXT__;
      if (nuxtData) {
        console.log('[Products Page] 🔍 Nuxt data exists:', {
          hasData: !!nuxtData.data,
          hasState: !!nuxtData.state,
          keys: Object.keys(nuxtData),
          dataType: nuxtData.data ? typeof nuxtData.data : null,
        });
        
        // Try to manually extract SSR data if it exists
        if (nuxtData.data && Array.isArray(nuxtData.data)) {
          const ssrEntry = nuxtData.data.find((entry: any) => entry && entry['all-products']);
          if (ssrEntry && ssrEntry['all-products']) {
            console.warn('[Products Page] 🔍 Found SSR data in payload but not hydrated!', ssrEntry['all-products'].length);
          }
        }
      }
      
      // Force refresh to fetch data
      console.warn('[Products Page] 🔄 Forcing refresh to fetch products...');
      setTimeout(() => {
        refreshProducts();
      }, 100);
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

// Watch for changes and sync
watch(allProducts, (newProducts) => {
  if (newProducts && newProducts.length > 0) {
    setProducts(newProducts);
    
    // Populate Pinia store from SSR data on first client hydration
    if (process.client && productsStore.allProducts.length === 0) {
      console.log('[Products Page] 💾 Populating Pinia store from watch:', newProducts.length, 'products');
      productsStore.allProducts = newProducts;
      productsStore.lastFetched = Date.now();
    }
  } else if (process.client && (!newProducts || newProducts.length === 0)) {
    console.warn('[Products Page] ⚠️ allProducts is empty on client!', {
      value: newProducts,
      pending: pending.value,
      error: error.value
    });
  }
}, { immediate: true });

onMounted(() => {
  if (!isQueryEmpty.value) updateProductList();
});

watch(
  () => route.query,
  () => {
    if (route.name !== 'products') return;
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
    <!-- Loading state -->
    <div v-if="pending" class="min-h-screen w-full flex items-center justify-center">
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
