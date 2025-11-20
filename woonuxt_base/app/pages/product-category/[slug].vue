<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { setProducts, updateProductList } = useProducts();
const { isQueryEmpty } = useHelpers();
const { storeSettings } = useAppConfig();
const route = useRoute();
const slug = computed(() => route.params.slug as string);

const productsStore = useProductsStore();

// Fetch products filtered by category slug using REST API
const { data } = await useAsyncData(
  () => `category-${slug.value}`,
  async () => {
    const allProducts = await productsStore.fetchAll();
    
    // Filter products by category slug
    const filtered = allProducts.filter((product: any) => {
      if (!product.productCategories?.nodes) return false;
      return product.productCategories.nodes.some((cat: any) => 
        cat.slug === slug.value || decodeURIComponent(cat.slug) === slug.value
      );
    });
    
    console.log(`[Category Page] Found ${filtered.length} products for category: ${slug.value}`);
    return filtered;
  },
  { 
    server: false,  // Client-side only to reduce build memory for dynamic routes
    lazy: true,     // Non-blocking load
    watch: [slug],
    getCachedData: (key) => {
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        const allProducts = productsStore.allProducts;
        const filtered = allProducts.filter((product: any) => {
          if (!product.productCategories?.nodes) return false;
          return product.productCategories.nodes.some((cat: any) => 
            cat.slug === slug.value || decodeURIComponent(cat.slug) === slug.value
          );
        });
        console.log(`[Category Page] Using cached products for category: ${slug.value}`);
        return filtered;
      }
      return undefined;
    }
  }
);

const productsInCategory = computed(() => (data.value || []) as Product[]);

// Set products in the old composable (for backwards compatibility)
watch(productsInCategory, (newProducts) => {
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
    if (route.name !== 'product-category-slug') return;
    updateProductList();
  },
);

useHead({
  title: 'Products',
  meta: [{ hid: 'description', name: 'description', content: 'Products' }],
});
</script>

<template>
  <div class="container flex items-start gap-16" v-if="productsInCategory.length">
    <Filters v-if="storeSettings.showFilters" :hide-categories="true" />

    <div class="w-full">
      <div class="flex items-center justify-between w-full gap-4 mt-8 md:gap-8">
        <ProductResultCount />
        <OrderByDropdown class="hidden md:inline-flex" v-if="storeSettings.showOrderByDropdown" />
        <ShowFilterTrigger v-if="storeSettings.showFilters" class="md:hidden" />
      </div>
      <ProductGrid />
    </div>
  </div>
</template>
