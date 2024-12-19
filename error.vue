<script lang="ts" setup>
import { ProductsOrderByEnum } from '#woo';
const error = useError();
const { siteName } = useAppConfig();

// Fetch popular products
const { data: productData } = await useAsyncGql('getProducts', { 
  first: 4,
  orderby: ProductsOrderByEnum.POPULARITY 
});
const popularProducts = productData.value?.products?.nodes || [];

// Fetch featured products
const { data: featuredProductData } = await useAsyncGql('getFeaturedProducts', { first: 4 });
const featuredProducts = featuredProductData.value?.products?.nodes || [];

// Handle the clear error and return to home
const handleError = () => {
  clearError({ redirect: '/' });
};

useHead({
  title: `Page Not Found | ${siteName}`,
});
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />
    
    <main class="container mx-auto px-4 py-16 flex-grow">
      <div class="text-center mb-16">
        <h1 class="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-600 mb-8">Page Not Found</h2>
        <p class="text-gray-600 max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved. 
          Let us help you find what you're looking for.
        </p>
        <div class="flex gap-4 justify-center">
          <button 
            @click="handleError"
            class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Return Home
          </button>
          <NuxtLink 
            to="/products" 
            class="bg-gray-100 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Browse Products
          </NuxtLink>
        </div>
      </div>

      <!-- Popular Products Section -->
      <section v-if="popularProducts.length" class="mb-16">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Popular Products</h2>
          <NuxtLink class="text-blue-600 hover:underline" to="/products">
            {{ $t('messages.general.viewAll') }}
          </NuxtLink>
        </div>
        <ProductRow 
          :products="popularProducts" 
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6" 
        />
      </section>

      <!-- Featured Products Section -->
      <section v-if="featuredProducts?.length" class="mb-16">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Featured Products</h2>
          <NuxtLink class="text-blue-600 hover:underline" to="/products">
            {{ $t('messages.general.viewAll') }}
          </NuxtLink>
        </div>
        <ProductRow 
          :products="featuredProducts" 
          class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6" 
        />
      </section>
    </main>

    <AppFooter />
  </div>
</template>
