<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { setProducts, updateProductList } = useProducts();
const { isFiltersActive } = useFiltering();
const route = useRoute();
const { storeSettings } = useAppConfig();
const { isQueryEmpty } = useHelpers();

// Use Pinia products store (plural) for listing page
const productsStore = useProductsStore();

// Fetch products - Client-side only for speed (uses Pinia cache)
// CRITICAL: Ensure we always have data, even if cache is empty
const { data: allProducts, pending, error, refresh: refreshProducts } = await useAsyncData(
  'all-products',
  async () => {
    // Force refresh if ?refresh=true query param is present
    const forceRefresh = route.query.refresh === 'true';
    const products = await productsStore.fetchAll(forceRefresh);
    
    // CRITICAL: If we got empty array, it might be a real error or cache issue
    // Log it but don't throw - let the UI handle the empty state
    if (!products || products.length === 0) {
      console.warn('[Products Page] ⚠️ No products returned from store');
    }
    
    return products || [];
  },
  {
    server: false,  // Client-side only: fast, prevents build OOM, uses Pinia cache
    lazy: false,    // BLOCKING: Wait for products before showing page (prevents "no products" flash)
    default: () => [], // Default to empty array instead of undefined
    getCachedData: (key) => {
      // Skip cache when ?refresh=true query param is present
      if (process.client && route.query.refresh === 'true') {
        return undefined;
      }
      
      // Check Pinia cache FIRST - will be instant after first load
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        console.log('[Products Page] ⚡ Using cached products:', productsStore.allProducts.length);
        return productsStore.allProducts;
      }
      
      // If cache exists but expired, still return it (will refresh in background)
      if (process.client && productsStore.allProducts.length > 0) {
        console.log('[Products Page] ⏰ Cache expired, using stale data while refreshing');
        return productsStore.allProducts;
      }
      
      return undefined; // First visit: fetch from API
    }
  }
);

// Watch for route changes and refresh if needed
watch(() => route.query.refresh, (newVal) => {
  if (newVal === 'true' && process.client) {
    console.log('[Products Page] 🔄 Refresh requested, clearing cache and refetching');
    productsStore.clearAllCache();
    refreshProducts();
  }
});

// Set products in the old composable (for backwards compatibility)
if (allProducts.value) {
  setProducts(allProducts.value);
}

// Watch for products loading and sync with old composable
watch(allProducts, (newProducts) => {
  if (newProducts) {
    setProducts(newProducts);
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
  title: `Products`,
  meta: [{ hid: 'description', name: 'description', content: 'Products' }],
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
    <NoProductsFound v-else>
      No products found. Please check your configuration or try again later.
    </NoProductsFound>
  </div>
</template>
