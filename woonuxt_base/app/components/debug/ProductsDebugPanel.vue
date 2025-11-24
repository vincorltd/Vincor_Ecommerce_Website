<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const route = useRoute();
const productsStore = useProductsStore();

// Props to receive useAsyncData state from parent
interface Props {
  allProducts?: any;
  pending?: boolean;
  error?: any;
  refresh?: () => Promise<void>;
}

const props = defineProps<Props>();

const showDebugPanel = ref(false);
const debugLog = ref<any[]>([]);
const ssrPayload = ref<any>(null);
const hydrationState = ref<any>(null);

// Safe process checks
const isServer = typeof process !== 'undefined' && process.server;
const isClient = typeof process !== 'undefined' ? process.client : typeof window !== 'undefined';
const isDev = import.meta.dev;

// Track all relevant state
const state = reactive({
  useAsyncData: {
    data: props.allProducts,
    pending: props.pending,
    error: props.error,
    length: computed(() => Array.isArray(props.allProducts) ? props.allProducts.length : 0),
  },
  piniaStore: {
    allProducts: computed(() => productsStore.allProducts),
    length: computed(() => productsStore.allProducts.length),
    isCacheFresh: computed(() => productsStore.isCacheFresh),
    lastFetched: computed(() => productsStore.lastFetched),
    cacheAge: computed(() => productsStore.cacheAge),
  },
  environment: {
    isServer: typeof process !== 'undefined' ? process.server : false,
    isClient: typeof process !== 'undefined' ? process.client : true,
    isDev: import.meta.dev,
  },
  route: {
    path: computed(() => route.path),
    query: computed(() => route.query),
    name: computed(() => route.name),
  },
});

// Add log entry
const addLog = (category: string, message: string, data?: any) => {
  debugLog.value.unshift({
    timestamp: new Date().toISOString(),
    category,
    message,
    data: data ? JSON.parse(JSON.stringify(data)) : null,
  });
  
  // Keep last 50 logs
  if (debugLog.value.length > 50) {
    debugLog.value = debugLog.value.slice(0, 50);
  }
};

// Check SSR payload in HTML
const checkSSRPayload = () => {
  if (!isClient) return;
  
  try {
    // Check multiple possible locations for Nuxt SSR payload
    const windowAny = window as any;
    const nuxtData = windowAny.__NUXT__ || windowAny.$nuxt || windowAny.__NUXT_DATA__;
    const nuxtDataKeys = nuxtData ? Object.keys(nuxtData) : [];
    
    // Check for 'all-products' key in various payload structures
    let allProductsPayload = null;
    let payloadLocation = 'none';
    
    // Try different possible locations
    if (nuxtData?.data) {
      // Nuxt 3 structure
      if (Array.isArray(nuxtData.data)) {
        // Look through all data entries
        for (const entry of nuxtData.data) {
          if (entry && entry['all-products']) {
            allProductsPayload = entry['all-products'];
            payloadLocation = 'nuxtData.data[].all-products';
            break;
          }
        }
      } else if (nuxtData.data['all-products']) {
        allProductsPayload = nuxtData.data['all-products'];
        payloadLocation = 'nuxtData.data.all-products';
      }
    }
    
    if (!allProductsPayload && nuxtData?.state) {
      if (nuxtData.state['all-products']) {
        allProductsPayload = nuxtData.state['all-products'];
        payloadLocation = 'nuxtData.state.all-products';
      }
    }
    
    if (!allProductsPayload && nuxtData?.['all-products']) {
      allProductsPayload = nuxtData['all-products'];
      payloadLocation = 'nuxtData.all-products';
    }
    
    // Check HTML for inline script tags with SSR data
    const scripts = document.querySelectorAll('script');
    let foundInScript = false;
    let scriptContent = '';
    
    for (const script of Array.from(scripts)) {
      const content = script.textContent || script.innerHTML;
      if (content && content.includes('all-products')) {
        foundInScript = true;
        scriptContent = content.substring(0, 2000);
        break;
      }
    }
    
    ssrPayload.value = {
      exists: !!nuxtData,
      keys: nuxtDataKeys,
      allProductsInPayload: !!allProductsPayload,
      allProductsLength: allProductsPayload?.length || 0,
      payloadLocation,
      foundInScript,
      scriptPreview: foundInScript ? scriptContent : null,
      // Try to get a sample of the payload structure
      payloadStructure: nuxtData ? {
        hasData: !!nuxtData.data,
        dataType: nuxtData.data ? (Array.isArray(nuxtData.data) ? 'array' : typeof nuxtData.data) : null,
        dataLength: Array.isArray(nuxtData.data) ? nuxtData.data.length : null,
        hasState: !!nuxtData.state,
        topLevelKeys: Object.keys(nuxtData).slice(0, 10),
      } : null,
      fullPayload: nuxtData ? JSON.stringify(nuxtData, null, 2).substring(0, 10000) : null,
    };
    
    addLog('SSR Payload', 'Checked SSR payload', ssrPayload.value);
  } catch (err: any) {
    addLog('Error', 'Failed to check SSR payload', { error: err.message, stack: err.stack });
  }
};

// Check hydration state
const checkHydrationState = () => {
  if (!isClient) return;
  
  hydrationState.value = {
    useAsyncDataValue: {
      exists: !!props.allProducts,
      isArray: Array.isArray(props.allProducts),
      length: Array.isArray(props.allProducts) ? props.allProducts.length : 0,
      type: typeof props.allProducts,
      firstItem: Array.isArray(props.allProducts) && props.allProducts.length > 0 
        ? Object.keys(props.allProducts[0] || {}) 
        : null,
    },
    piniaStore: {
      hasProducts: productsStore.allProducts.length > 0,
      length: productsStore.allProducts.length,
      isCacheFresh: productsStore.isCacheFresh,
    },
    pending: props.pending,
    error: props.error,
  };
  
  addLog('Hydration', 'Checked hydration state', hydrationState.value);
};

// Test API endpoint
const testAPI = async () => {
  addLog('API Test', 'Testing /api/products endpoint...');
  
  try {
    const startTime = Date.now();
    const response = await $fetch('/api/products', {
      query: { ssr: 'true', _test: Date.now() },
      headers: { 'x-nuxt-ssr': 'true' },
    });
    const duration = Date.now() - startTime;
    
    addLog('API Test', `API returned ${Array.isArray(response) ? response.length : 0} products`, {
      duration: `${duration}ms`,
      isArray: Array.isArray(response),
      length: Array.isArray(response) ? response.length : 0,
      firstItem: Array.isArray(response) && response.length > 0 ? response[0] : null,
    });
  } catch (err: any) {
    addLog('API Test', 'API test failed', {
      error: err.message,
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
    });
  }
};

// Force refresh
const forceRefresh = async () => {
  addLog('Action', 'Force refreshing products...');
  if (props.refresh) {
    await props.refresh();
    checkHydrationState();
  }
};

// Clear Pinia cache
const clearCache = () => {
  addLog('Action', 'Clearing Pinia cache...');
  productsStore.clearAllCache();
  checkHydrationState();
};

// Initialize on mount
onMounted(() => {
  checkSSRPayload();
  checkHydrationState();
  
  // Watch for changes
  watch(() => props.allProducts, () => {
    checkHydrationState();
    addLog('State Change', 'allProducts changed', {
      length: Array.isArray(props.allProducts) ? props.allProducts.length : 0,
    });
  }, { deep: true });
  
  watch(() => productsStore.allProducts, () => {
    checkHydrationState();
    addLog('State Change', 'Pinia store changed', {
      length: productsStore.allProducts.length,
    });
  }, { deep: true });
});

// Auto-check on mount and after 1 second
onMounted(() => {
  setTimeout(() => {
    checkSSRPayload();
    checkHydrationState();
  }, 1000);
});
</script>

<template>
  <div v-if="isDev" class="fixed bottom-4 right-4 z-[9999]">
    <!-- Toggle Button -->
    <button
      @click="showDebugPanel = !showDebugPanel"
      class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm mb-2"
    >
      🐛 Debug Panel {{ showDebugPanel ? '▼' : '▲' }}
    </button>

    <!-- Debug Panel -->
    <div
      v-if="showDebugPanel"
      class="bg-white border-2 border-red-600 rounded-lg shadow-2xl p-4 max-w-4xl max-h-[80vh] overflow-auto"
      style="width: 600px;"
    >
      <div class="mb-4">
        <h3 class="text-lg font-bold mb-2">Products Page Debug Panel</h3>
        <div class="flex gap-2 flex-wrap mb-4">
          <button @click="checkSSRPayload" class="bg-blue-500 text-white px-3 py-1 rounded text-xs">
            Check SSR Payload
          </button>
          <button @click="checkHydrationState" class="bg-green-500 text-white px-3 py-1 rounded text-xs">
            Check Hydration
          </button>
          <button @click="testAPI" class="bg-purple-500 text-white px-3 py-1 rounded text-xs">
            Test API
          </button>
          <button @click="forceRefresh" class="bg-orange-500 text-white px-3 py-1 rounded text-xs">
            Force Refresh
          </button>
          <button @click="clearCache" class="bg-red-500 text-white px-3 py-1 rounded text-xs">
            Clear Cache
          </button>
        </div>
      </div>

      <!-- Current State -->
      <div class="mb-4 border-b pb-4">
        <h4 class="font-bold mb-2">Current State</h4>
        <div class="text-xs space-y-1">
          <div>
            <strong>useAsyncData:</strong>
            <ul class="ml-4">
              <li>Length: {{ state.useAsyncData.length }}</li>
              <li>Pending: {{ state.useAsyncData.pending }}</li>
              <li>Error: {{ state.useAsyncData.error ? 'Yes' : 'No' }}</li>
            </ul>
          </div>
          <div>
            <strong>Pinia Store:</strong>
            <ul class="ml-4">
              <li>Length: {{ state.piniaStore.length }}</li>
              <li>Cache Fresh: {{ state.piniaStore.isCacheFresh }}</li>
              <li>Cache Age: {{ state.piniaStore.cacheAge }}s</li>
            </ul>
          </div>
          <div>
            <strong>Environment:</strong>
            <ul class="ml-4">
              <li>Server: {{ state.environment.isServer }}</li>
              <li>Client: {{ state.environment.isClient }}</li>
              <li>Dev: {{ state.environment.isDev }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SSR Payload -->
      <div v-if="ssrPayload" class="mb-4 border-b pb-4">
        <h4 class="font-bold mb-2">SSR Payload Check</h4>
        <div class="text-xs space-y-1">
          <div>Payload Exists: <strong>{{ ssrPayload.exists ? '✅' : '❌' }}</strong></div>
          <div>Keys: {{ ssrPayload.keys?.join(', ') || 'None' }}</div>
          <div>all-products in Payload: <strong>{{ ssrPayload.allProductsInPayload ? '✅' : '❌' }}</strong></div>
          <div>Payload Length: <strong>{{ ssrPayload.allProductsLength }}</strong></div>
          <details v-if="ssrPayload.fullPayload" class="mt-2">
            <summary class="cursor-pointer text-blue-600">View Full Payload (first 5000 chars)</summary>
            <pre class="mt-2 p-2 bg-gray-100 text-xs overflow-auto max-h-40">{{ ssrPayload.fullPayload }}</pre>
          </details>
        </div>
      </div>

      <!-- Hydration State -->
      <div v-if="hydrationState" class="mb-4 border-b pb-4">
        <h4 class="font-bold mb-2">Hydration State</h4>
        <div class="text-xs space-y-1">
          <div>
            <strong>useAsyncData.value:</strong>
            <ul class="ml-4">
              <li>Exists: {{ hydrationState.useAsyncDataValue.exists ? '✅' : '❌' }}</li>
              <li>Is Array: {{ hydrationState.useAsyncDataValue.isArray ? '✅' : '❌' }}</li>
              <li>Length: <strong>{{ hydrationState.useAsyncDataValue.length }}</strong></li>
              <li>Type: {{ hydrationState.useAsyncDataValue.type }}</li>
            </ul>
          </div>
          <div>
            <strong>Pinia Store:</strong>
            <ul class="ml-4">
              <li>Has Products: {{ hydrationState.piniaStore.hasProducts ? '✅' : '❌' }}</li>
              <li>Length: {{ hydrationState.piniaStore.length }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Debug Log -->
      <div>
        <h4 class="font-bold mb-2">Debug Log</h4>
        <div class="text-xs space-y-1 max-h-60 overflow-auto">
          <div
            v-for="(log, idx) in debugLog"
            :key="idx"
            class="p-2 border-b"
            :class="{
              'bg-red-50': log.category === 'Error',
              'bg-blue-50': log.category === 'SSR Payload',
              'bg-green-50': log.category === 'Hydration',
              'bg-purple-50': log.category === 'API Test',
              'bg-orange-50': log.category === 'Action',
            }"
          >
            <div class="font-bold">{{ log.category }} - {{ log.message }}</div>
            <div class="text-gray-600 text-xs">{{ log.timestamp }}</div>
            <pre v-if="log.data" class="mt-1 text-xs overflow-auto max-h-20">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

