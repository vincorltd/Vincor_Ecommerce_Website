<template>
  <div class="fixed bottom-4 right-4 bg-blue-100 p-4 rounded-lg shadow-lg z-[9999] max-w-2xl">
    <h3 class="font-bold text-blue-800">Debug Categories</h3>
    <p class="text-sm text-blue-700">Loading: {{ loading }}</p>
    <p class="text-sm text-blue-700">Categories: {{ categories.length }}</p>
    <p v-if="error" class="text-sm text-red-600">Error: {{ error.message }}</p>
    
    <div class="flex gap-2">
      <button 
        @click="testFetch" 
        class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
      >
        Test Fetch
      </button>
      
      <button 
        @click="testServerAPI" 
        class="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
      >
        Test Server API
      </button>

      <button 
        @click="copyJSON" 
        class="mt-2 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
      >
        📋 Copy JSON
      </button>
    </div>
    
    <div v-if="testResult" class="mt-3 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
      <pre>{{ testResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const { categories, loading, error, fetchCategories } = useCategories();
const testResult = ref<any>(null);

onMounted(async () => {
  console.log('🔥🔥🔥 DebugCategories mounted on CLIENT!');
  console.log('🔥 Categories:', categories.value);
  console.log('🔥 Loading:', loading.value);
  console.log('🔥 Error:', error.value);
  
  // Auto-test on mount
  setTimeout(() => {
    console.log('🔥 Auto-testing server API in 2 seconds...');
    testServerAPI();
  }, 2000);
});

const testFetch = async () => {
  console.log('🧪 Testing fetchCategories...');
  testResult.value = 'Testing fetchCategories...';
  
  try {
    await fetchCategories();
    testResult.value = JSON.stringify({
      success: true,
      count: categories.value.length,
      categories: categories.value
    }, null, 2);
  } catch (e: any) {
    console.error('🧪 Fetch error:', e);
    testResult.value = `Error: ${e.message || JSON.stringify(e)}`;
  }
};

const testServerAPI = async () => {
  console.log('🧪 Testing server API proxy...');
  testResult.value = 'Testing server API proxy...';
  
  try {
    const data = await $fetch('/api/categories');
    console.log('🧪 Server API response:', data);
    
    testResult.value = JSON.stringify({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      rawData: data
    }, null, 2);
  } catch (e: any) {
    console.error('🧪 Server API error:', e);
    testResult.value = `Error: ${e.message || JSON.stringify(e)}`;
  }
};

const copyJSON = () => {
  if (testResult.value) {
    navigator.clipboard.writeText(testResult.value);
    alert('JSON copied to clipboard!');
  } else {
    alert('No data to copy. Click "Test Server API" first.');
  }
};
</script>



