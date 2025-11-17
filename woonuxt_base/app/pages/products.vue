<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { setProducts, updateProductList } = useProducts();
const { isFiltersActive } = useFiltering();
const route = useRoute();
const { storeSettings } = useAppConfig();
const { isQueryEmpty } = useHelpers();

// Use Pinia products store (plural) for listing page
const productsStore = useProductsStore();

// Fetch products from API (with caching)
const { data: allProducts, pending, error } = await useAsyncData(
  'all-products',
  async () => {
    console.log('[Products Page] 🔄 Loading products...');
    const products = await productsStore.fetchAll();
    return products;
  },
  {
    server: true,
    lazy: false,
  }
);

// Set products in the old composable (for backwards compatibility)
if (allProducts.value) {
  setProducts(allProducts.value);
}

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
</template>
