<script lang="ts" setup>
import { useProductsStore } from '~/stores/products';

const productsStore = useProductsStore();

// Fetch categories from products using REST API
const { data } = await useAsyncData(
  'all-categories',
  async () => {
    const allProducts = await productsStore.fetchAll();
    
    // Extract unique categories from all products
    const categoriesMap = new Map();
    allProducts.forEach((product: any) => {
      if (product.productCategories?.nodes) {
        product.productCategories.nodes.forEach((cat: any) => {
          if (!categoriesMap.has(cat.id)) {
            categoriesMap.set(cat.id, cat);
          }
        });
      }
    });
    
    // Convert to array and sort alphabetically
    return Array.from(categoriesMap.values()).sort((a: any, b: any) => 
      (a.name || '').localeCompare(b.name || '')
    );
  },
  { 
    server: false,  // Client-side only to reduce build memory
    lazy: true,     // Non-blocking load
    getCachedData: (key) => {
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        const allProducts = productsStore.allProducts;
        const categoriesMap = new Map();
        allProducts.forEach((product: any) => {
          if (product.productCategories?.nodes) {
            product.productCategories.nodes.forEach((cat: any) => {
              if (!categoriesMap.has(cat.id)) {
                categoriesMap.set(cat.id, cat);
              }
            });
          }
        });
        return Array.from(categoriesMap.values()).sort((a: any, b: any) => 
          (a.name || '').localeCompare(b.name || '')
        );
      }
      return undefined;
    }
  }
);

const productCategories = computed(() => (data.value || []) as ProductCategory[]);

useHead({
  title: `Categories`,
  meta: [{ name: 'description', content: 'All product categories' }],
  link: [{ rel: 'canonical', href: 'https://v3.woonuxt.com/categories' }],
});
</script>

<template>
  <main class="container">
    <div v-if="productCategories?.length" class="grid grid-cols-2 gap-4 my-6 md:grid-cols-3 lg:gap-8 xl:grid-cols-4">
      <CategoryCard v-for="(category, i) in productCategories" :key="i" :node="category" :image-loading="i <= 2 ? 'eager' : 'lazy'" />
    </div>
  </main>
</template>
