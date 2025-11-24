<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { setProducts, updateProductList } = useProducts();
const { isFiltersActive } = useFiltering();
const route = useRoute();
const { storeSettings } = useAppConfig();
const { isQueryEmpty } = useHelpers();

// Use Pinia products store (plural) for listing page
const productsStore = useProductsStore();

// Fetch products with proper SSR + hydration strategy
// Uses server-side rendering for first load, then client-side cache for navigation
const { data: allProducts, pending, error, refresh: refreshProducts } = await useAsyncData(
  'all-products',
  async () => {
    // Force refresh if ?refresh=true query param is present
    const forceRefresh = route.query.refresh === 'true';
    
    // On server, fetch directly from API (bypasses Pinia for SSR)
    if (process.server) {
      try {
        const products = await $fetch('/api/products');
        // Transform products to match component expectations
        // Use the store's transform method
        const transformed = products.map((product: any) => {
          const mainImage = product.images && product.images.length > 0 ? product.images[0] : null;
          const isPriceZero = (p: any) => {
            if (!p) return true;
            const val = parseFloat(p);
            return isNaN(val) || val === 0;
          };
          return {
            ...product,
            menuOrder: product.menu_order,
            featured: product.featured,
            onSale: product.on_sale,
            date: product.date_created,
            averageRating: parseFloat(product.average_rating || '0'),
            regularPrice: !isPriceZero(product.regular_price) ? `<span class="woocommerce-Price-amount amount"><bdi>${product.currency_symbol || '$'}${product.regular_price}</bdi></span>` : null,
            salePrice: !isPriceZero(product.sale_price) ? `<span class="woocommerce-Price-amount amount"><bdi>${product.currency_symbol || '$'}${product.sale_price}</bdi></span>` : null,
            price: !isPriceZero(product.price) ? `<span class="woocommerce-Price-amount amount"><bdi>${product.currency_symbol || '$'}${product.price}</bdi></span>` : null,
            rawRegularPrice: product.regular_price,
            rawSalePrice: product.sale_price,
            rawPrice: product.price,
            productCategories: { nodes: product.categories || [] },
            productTags: { nodes: product.tags || [] },
            productBrands: { nodes: product.brands || [] },
            image: mainImage ? {
              sourceUrl: mainImage.src,
              producCardSourceUrl: mainImage.src,
              altText: mainImage.alt || product.name,
              title: mainImage.name || product.name
            } : null,
            galleryImages: {
              nodes: (product.images || []).map((img: any) => ({
                sourceUrl: img.src,
                altText: img.alt || product.name,
                title: img.name || product.name
              }))
            },
            stockStatus: product.stock_status?.toUpperCase() || 'INSTOCK',
            slug: product.slug,
            databaseId: product.id,
            addons: product.addons || []
          };
        });
        return transformed;
      } catch (err: any) {
        console.error('[Products Page] ❌ Server fetch failed:', err);
        return [];
      }
    }
    
    // On client, use Pinia store (with caching)
    const products = await productsStore.fetchAll(forceRefresh);
    
    if (!products || products.length === 0) {
      console.warn('[Products Page] ⚠️ No products returned from store');
    }
    
    return products || [];
  },
  {
    server: true,   // SSR/ISR for fast first load with actual content
    lazy: false,    // CRITICAL: Blocking - wait for data before showing page (no empty shell)
    default: () => [], // Default to empty array
    getCachedData: (key) => {
      // Skip cache when ?refresh=true query param is present
      if (process.client && route.query.refresh === 'true') {
        return undefined;
      }
      
      // On server: NEVER use cache - always fetch fresh for SSR
      // This ensures SSR HTML has the latest data and renders immediately
      if (process.server) {
        return undefined;
      }
      
      // On client: Check Pinia cache FIRST - will be instant after first load
      // This gives instant loading when navigating back to products page
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        console.log('[Products Page] ⚡ Using cached products:', productsStore.allProducts.length);
        return productsStore.allProducts;
      }
      
      // If cache exists but expired, still return it (will refresh in background)
      // This prevents "no products" flash while data refreshes
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
