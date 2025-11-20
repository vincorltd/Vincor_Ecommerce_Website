<script lang="ts" setup>
const error = useError();
const { siteName } = useAppConfig();

// Handle the clear error and return to home
const handleError = () => {
  clearError({ redirect: '/' });
};

useHead({
  title: `Error | ${siteName}`,
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

      <!-- Error Details -->
      <section v-if="error" class="mb-16 text-center">
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 class="text-lg font-semibold text-red-800 mb-2">Error Details</h3>
          <p class="text-red-600">{{ error.message || 'An unexpected error occurred' }}</p>
          <p v-if="error.statusCode" class="text-sm text-red-500 mt-2">Status Code: {{ error.statusCode }}</p>
        </div>
      </section>
    </main>

    <AppFooter />
  </div>
</template>
