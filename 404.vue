<script lang="ts" setup>
const error = useError();
const { siteName } = useAppConfig();

// Handle the clear error and return to home
const handleError = () => {
  clearError({ redirect: '/' });
};

useHead({
  title: `Page Not Found | ${siteName}`,
});
</script>

<template>
  <main class="container mx-auto px-4 py-16">
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

    <!-- Quick Links Section -->
    <section class="mb-16">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Quick Links</h2>
      </div>
      <div class="grid grid-cols-2 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink 
          to="/products" 
          class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <div class="text-4xl mb-2">🛍️</div>
          <h3 class="font-semibold text-gray-800">All Products</h3>
        </NuxtLink>
        <NuxtLink 
          to="/categories" 
          class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <div class="text-4xl mb-2">📂</div>
          <h3 class="font-semibold text-gray-800">Categories</h3>
        </NuxtLink>
        <NuxtLink 
          to="/about-us" 
          class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <div class="text-4xl mb-2">ℹ️</div>
          <h3 class="font-semibold text-gray-800">About Us</h3>
        </NuxtLink>
        <NuxtLink 
          to="/contact" 
          class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-center"
        >
          <div class="text-4xl mb-2">📞</div>
          <h3 class="font-semibold text-gray-800">Contact</h3>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
