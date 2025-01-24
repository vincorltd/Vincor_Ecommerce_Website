<script setup lang="ts">
const { setProducts, updateProductList } = useProducts();
const route = useRoute();
const { storeSettings } = useAppConfig();
const { isQueryEmpty } = useHelpers();

const { data } = await useAsyncGql('getProducts');
const allProducts = (data.value?.products?.nodes || []) as Product[];
setProducts(allProducts);

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
  <div class="min-h-screen w-full" v-if="allProducts.length">
    <div class="container mx-auto px-4 lg:px-8">
      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Desktop Filters -->
        <div class="hidden lg:block w-[280px] flex-shrink-0">
          <Filters v-if="storeSettings.showFilters" :hide-categories="false" />
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

    <!-- Mobile Filters - Fixed position when active -->
    <Filters 
      v-if="storeSettings.showFilters" 
      :hide-categories="false" 
      class="lg:hidden fixed inset-0 z-50 transform transition-transform duration-300"
      :class="{ '-translate-x-full': !isFiltersActive, 'translate-x-0': isFiltersActive }"
    />
  </div>
  <NoProductsFound v-else>Could not fetch products from your store. Please check your configuration.</NoProductsFound>
</template>
