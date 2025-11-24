<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const route = useRoute();
const productsStore = useProductsStore();

const showDebugPanel = ref(false);
const debugLog = ref<any[]>([]);
const ssrPayload = ref<any>(null);
const hydrationState = ref<any>(null);
const isCapturing = ref(false);

// Expand/collapse state for each section
const expandedSections = reactive({
  currentState: true,
  ssrPayload: false,
  hydrationState: false,
  debugLog: true,
  allJson: false,
});

// Computed property to generate all JSON data for copy
const allJsonData = computed(() => {
  const windowAny = window as any;
  const productsAsyncData = windowAny.__PRODUCTS_ASYNC_DATA__;
  
  return {
    exportTimestamp: new Date().toISOString(),
    sessionInfo: {
      startTime: debugLog.value.length > 0 ? debugLog.value[debugLog.value.length - 1].timestamp : null,
      endTime: new Date().toISOString(),
      logCount: debugLog.value.length,
    },
    environment: {
      isServer,
      isClient,
      isDev,
      userAgent: isClient ? navigator.userAgent : null,
      location: isClient ? window.location.href : null,
      windowSize: isClient ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      platform: isClient ? navigator.platform : null,
    },
    currentState: {
      route: {
        path: route.path,
        name: route.name,
        query: route.query,
        params: route.params,
      },
      piniaStore: {
        allProductsLength: productsStore.allProducts.length,
        isCacheFresh: productsStore.isCacheFresh,
        lastFetched: productsStore.lastFetched,
        cacheAge: productsStore.cacheAge,
        sampleProduct: productsStore.allProducts.length > 0 ? {
          id: productsStore.allProducts[0].id,
          name: productsStore.allProducts[0].name,
          slug: productsStore.allProducts[0].slug,
        } : null,
      },
      productsPageAsyncData: productsAsyncData || null,
      ssrPayload: ssrPayload.value,
      hydrationState: hydrationState.value,
      nuxtState: windowAny.__NUXT__ ? {
        keys: Object.keys(windowAny.__NUXT__),
        hasData: !!windowAny.__NUXT__.data,
        dataKeys: windowAny.__NUXT__.data ? (Array.isArray(windowAny.__NUXT__.data) 
          ? windowAny.__NUXT__.data.map((d: any) => Object.keys(d || {})).flat()
          : Object.keys(windowAny.__NUXT__.data)) : null,
      } : null,
    },
    logs: debugLog.value,
    summary: {
      errors: debugLog.value.filter(l => l.level === 'error').length,
      warnings: debugLog.value.filter(l => l.level === 'warn').length,
      info: debugLog.value.filter(l => l.level === 'info').length,
      categories: [...new Set(debugLog.value.map(l => l.category))],
      routes: [...new Set(debugLog.value.map(l => l.route?.path).filter(Boolean))],
    },
  };
});

// Copy JSON to clipboard
const copyAllJson = async () => {
  try {
    const jsonString = JSON.stringify(allJsonData.value, null, 2);
    await navigator.clipboard.writeText(jsonString);
    addLog('System', 'Copied all JSON data to clipboard', { 
      length: jsonString.length,
      logCount: debugLog.value.length,
    });
    // Show temporary success message
    alert('✅ All JSON data copied to clipboard!');
  } catch (err: any) {
    addLog('Error', 'Failed to copy JSON to clipboard', { error: err.message }, 'error');
    alert('❌ Failed to copy to clipboard: ' + err.message);
  }
};

// Safe process checks
const isServer = typeof process !== 'undefined' && process.server;
const isClient = typeof process !== 'undefined' ? process.client : typeof window !== 'undefined';
const isDev = import.meta.dev;

// Track all relevant state
const state = reactive({
  route: {
    path: computed(() => route.path),
    query: computed(() => route.query),
    name: computed(() => route.name),
    params: computed(() => route.params),
  },
  piniaStore: {
    allProducts: computed(() => productsStore.allProducts),
    length: computed(() => productsStore.allProducts.length),
    isCacheFresh: computed(() => productsStore.isCacheFresh),
    lastFetched: computed(() => productsStore.lastFetched),
    cacheAge: computed(() => productsStore.cacheAge),
  },
  environment: {
    isServer,
    isClient,
    isDev,
    userAgent: isClient ? navigator.userAgent : null,
    timestamp: new Date().toISOString(),
  },
  window: isClient ? {
    location: window.location.href,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  } : null,
});

// Add log entry with automatic categorization
const addLog = (category: string, message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    category,
    message,
    data: data ? JSON.parse(JSON.stringify(data)) : null,
    level,
    route: {
      path: route.path,
      name: route.name,
      query: route.query,
    },
  };
  
  debugLog.value.unshift(logEntry);
  
  // Keep last 200 logs for comprehensive debugging
  if (debugLog.value.length > 200) {
    debugLog.value = debugLog.value.slice(0, 200);
  }
  
  // Also log to console with appropriate level
  if (isDev) {
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleMethod(`[Debug Panel ${category}]`, message, data || '');
  }
};

// Check SSR payload in HTML (comprehensive check)
const checkSSRPayload = () => {
  if (!isClient) return;
  
  try {
    const windowAny = window as any;
    
    // Check multiple possible locations for Nuxt SSR payload
    const nuxtData = windowAny.__NUXT__ || windowAny.$nuxt || windowAny.__NUXT_DATA__ || windowAny.__NUXT_STATE__;
    const nuxtDataKeys = nuxtData ? Object.keys(nuxtData) : [];
    
    // Check for 'all-products' key in various payload structures
    let allProductsPayload = null;
    let payloadLocation = 'none';
    
    // Try different possible locations
    if (nuxtData?.data) {
      if (Array.isArray(nuxtData.data)) {
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
    let scriptCount = 0;
    
    for (const script of Array.from(scripts)) {
      const content = script.textContent || script.innerHTML;
      scriptCount++;
      if (content && (content.includes('all-products') || content.includes('__NUXT__'))) {
        foundInScript = true;
        scriptContent = content.substring(0, 3000);
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
      scriptCount,
      scriptPreview: foundInScript ? scriptContent : null,
      payloadStructure: nuxtData ? {
        hasData: !!nuxtData.data,
        dataType: nuxtData.data ? (Array.isArray(nuxtData.data) ? 'array' : typeof nuxtData.data) : null,
        dataLength: Array.isArray(nuxtData.data) ? nuxtData.data.length : null,
        hasState: !!nuxtData.state,
        topLevelKeys: Object.keys(nuxtData).slice(0, 20),
        dataSample: nuxtData.data && Array.isArray(nuxtData.data) && nuxtData.data.length > 0 
          ? Object.keys(nuxtData.data[0] || {}) 
          : null,
      } : null,
      fullPayloadPreview: nuxtData ? JSON.stringify(nuxtData, null, 2).substring(0, 15000) : null,
    };
    
    addLog('SSR Payload', 'Checked SSR payload', ssrPayload.value, allProductsPayload ? 'info' : 'warn');
  } catch (err: any) {
    addLog('Error', 'Failed to check SSR payload', { error: err.message, stack: err.stack }, 'error');
  }
};

// Export all logs as JSON with comprehensive data
const exportLogs = () => {
  // Get all window state
  const windowAny = window as any;
  const productsAsyncData = windowAny.__PRODUCTS_ASYNC_DATA__;
  
  const exportTimestamp = new Date().toISOString();
  const startTime = debugLog.value.length > 0 ? debugLog.value[debugLog.value.length - 1].timestamp : null;
  
  const exportData = {
    exportTimestamp,
    sessionInfo: {
      startTime,
      endTime: exportTimestamp,
      logCount: debugLog.value.length,
      totalDuration: startTime 
        ? new Date(exportTimestamp).getTime() - new Date(startTime).getTime()
        : null,
    },
    environment: {
      isServer,
      isClient,
      isDev,
      userAgent: isClient ? navigator.userAgent : null,
      location: isClient ? window.location.href : null,
      windowSize: isClient ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
      platform: isClient ? navigator.platform : null,
    },
    currentState: {
      route: {
        path: route.path,
        name: route.name,
        query: route.query,
        params: route.params,
      },
      piniaStore: {
        allProductsLength: productsStore.allProducts.length,
        isCacheFresh: productsStore.isCacheFresh,
        lastFetched: productsStore.lastFetched,
        cacheAge: productsStore.cacheAge,
        sampleProduct: productsStore.allProducts.length > 0 ? {
          id: productsStore.allProducts[0].id,
          name: productsStore.allProducts[0].name,
          slug: productsStore.allProducts[0].slug,
        } : null,
      },
      productsPageAsyncData: productsAsyncData || null,
      ssrPayload: ssrPayload.value,
      hydrationState: hydrationState.value,
      nuxtState: windowAny.__NUXT__ ? {
        keys: Object.keys(windowAny.__NUXT__),
        hasData: !!windowAny.__NUXT__.data,
        dataKeys: windowAny.__NUXT__.data ? (Array.isArray(windowAny.__NUXT__.data) 
          ? windowAny.__NUXT__.data.map((d: any) => Object.keys(d || {})).flat()
          : Object.keys(windowAny.__NUXT__.data)) : null,
      } : null,
    },
    logs: debugLog.value,
    summary: {
      errors: debugLog.value.filter(l => l.level === 'error').length,
      warnings: debugLog.value.filter(l => l.level === 'warn').length,
      info: debugLog.value.filter(l => l.level === 'info').length,
      categories: [...new Set(debugLog.value.map(l => l.category))],
      routes: [...new Set(debugLog.value.map(l => l.route?.path).filter(Boolean))],
    },
  };
  
  // Calculate duration
  if (exportData.sessionInfo.startTime) {
    exportData.sessionInfo.totalDuration = 
      new Date(exportData.exportTimestamp).getTime() - new Date(exportData.sessionInfo.startTime).getTime();
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debug-logs-${route.name || 'unknown'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addLog('Export', 'Exported debug logs to JSON file', { 
    logCount: debugLog.value.length,
    fileName: a.download,
    fileSize: `${(blob.size / 1024).toFixed(2)} KB`,
  });
};

// Clear logs
const clearLogs = () => {
  debugLog.value = [];
  addLog('System', 'Debug logs cleared');
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
      firstItemSample: Array.isArray(response) && response.length > 0 ? {
        id: response[0].id,
        name: response[0].name,
        slug: response[0].slug,
        keys: Object.keys(response[0] || {}).slice(0, 10),
      } : null,
    }, 'info');
  } catch (err: any) {
    addLog('API Test', 'API test failed', {
      error: err.message,
      statusCode: err.statusCode,
      statusMessage: err.statusMessage,
      stack: err.stack,
    }, 'error');
  }
};

// Monitor route changes
watch(() => route.path, (newPath, oldPath) => {
  addLog('Navigation', `Route changed from ${oldPath} to ${newPath}`, {
    oldPath,
    newPath,
    query: route.query,
    name: route.name,
  });
  
  // Auto-check SSR payload and hydration on route change
  if (isClient) {
    setTimeout(() => {
      checkSSRPayload();
      if (newPath === '/products') {
        checkHydrationState();
      }
    }, 500);
  }
});

// Monitor Pinia store changes
watch(() => productsStore.allProducts.length, (newLength, oldLength) => {
  if (oldLength !== undefined && newLength !== oldLength) {
    addLog('Pinia Store', `Products count changed: ${oldLength} → ${newLength}`, {
      oldLength,
      newLength,
      isCacheFresh: productsStore.isCacheFresh,
      cacheAge: productsStore.cacheAge,
    }, newLength === 0 && oldLength > 0 ? 'error' : 'info');
  }
});

// Check hydration state (for products page)
const checkHydrationState = () => {
  if (!isClient) return;
  
  // Try to get useAsyncData state from window (if exposed)
  const windowAny = window as any;
  const useAsyncDataState = windowAny.__PRODUCTS_ASYNC_DATA__;
  
  hydrationState.value = {
    useAsyncData: useAsyncDataState || {
      exists: false,
      note: 'Not exposed to window - check page component',
    },
    piniaStore: {
      hasProducts: productsStore.allProducts.length > 0,
      length: productsStore.allProducts.length,
      isCacheFresh: productsStore.isCacheFresh,
    },
    route: {
      path: route.path,
      name: route.name,
    },
    timestamp: new Date().toISOString(),
  };
  
  addLog('Hydration', 'Checked hydration state', hydrationState.value);
};

// Auto-capture mode - periodically check state when enabled
watch(isCapturing, (capturing) => {
  if (capturing && isClient) {
    addLog('System', 'Auto-capture mode enabled - will check state every 3 seconds', null, 'info');
    
    const interval = setInterval(() => {
      checkSSRPayload();
      if (route.path === '/products') {
        checkHydrationState();
      }
    }, 3000);
    
    onUnmounted(() => clearInterval(interval));
  }
});

// Initialize on mount
onMounted(() => {
  // Initial check
  checkSSRPayload();
  checkHydrationState();
  
  // Auto-check after delays to catch hydration at different stages
  setTimeout(() => {
    checkSSRPayload();
    checkHydrationState();
    addLog('Hydration', 'Post-mount check (1s delay)', null, 'info');
  }, 1000);
  
  setTimeout(() => {
    checkSSRPayload();
    checkHydrationState();
    addLog('Hydration', 'Post-mount check (3s delay)', null, 'info');
  }, 3000);
  
  addLog('System', 'Debug panel initialized', {
    route: route.path,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });
});

// Expose methods to window for external access
if (isClient) {
  (window as any).__DEBUG_PANEL__ = {
    checkSSRPayload,
    checkHydrationState,
    testAPI,
    exportLogs,
    clearLogs,
    addLog,
    getLogs: () => debugLog.value,
    getState: () => state,
  };
}
</script>

<template>
  <div v-if="isDev" class="fixed bottom-4 right-4 z-[9999]">
    <!-- Toggle Button -->
    <button
      @click="showDebugPanel = !showDebugPanel"
      class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm mb-2 flex items-center gap-2"
    >
      🐛 Debug {{ showDebugPanel ? '▼' : '▲' }}
      <span v-if="debugLog.length > 0" class="bg-white text-red-600 rounded-full px-2 py-0.5 text-xs">
        {{ debugLog.length }}
      </span>
    </button>

    <!-- Debug Panel -->
    <div
      v-if="showDebugPanel"
      class="bg-white border-2 border-red-600 rounded-lg shadow-2xl p-4 overflow-auto"
      style="width: 800px; max-height: 90vh; background-color: #ffffff;"
    >
      <div class="mb-4 border-b-2 border-gray-300 pb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-bold text-gray-900">🔍 Global Debug Panel</h3>
          <div class="flex gap-2">
            <button
              @click="isCapturing = !isCapturing"
              :class="isCapturing ? 'bg-green-500' : 'bg-gray-500'"
              class="text-white px-2 py-1 rounded text-xs"
            >
              {{ isCapturing ? '⏺ Recording' : '⏸ Paused' }}
            </button>
            <button @click="exportLogs" class="bg-blue-500 text-white px-3 py-1 rounded text-xs">
              💾 Export JSON
            </button>
            <button @click="clearLogs" class="bg-red-500 text-white px-2 py-1 rounded text-xs">
              🗑 Clear
            </button>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap text-xs">
          <button @click="checkSSRPayload" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
            Check SSR Payload
          </button>
          <button @click="checkHydrationState" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">
            Check Hydration
          </button>
          <button @click="testAPI" class="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded">
            Test API
          </button>
          <button @click="expandedSections.allJson = !expandedSections.allJson" class="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded">
            {{ expandedSections.allJson ? 'Hide' : 'Show' }} All JSON
          </button>
        </div>
      </div>

      <!-- Current State -->
      <div class="mb-4 border-b-2 border-gray-300 pb-3">
        <button
          @click="expandedSections.currentState = !expandedSections.currentState"
          class="w-full flex items-center justify-between font-bold text-base mb-2 text-gray-800 hover:text-gray-900"
        >
          <span>📊 Current State</span>
          <span class="text-lg">{{ expandedSections.currentState ? '−' : '+' }}</span>
        </button>
        <div v-show="expandedSections.currentState" class="text-xs space-y-2 text-gray-700">
          <div class="bg-gray-50 p-2 rounded">
            <strong class="text-gray-900">Route:</strong> 
            <span class="text-blue-600 font-mono">{{ state.route.path }}</span> 
            <span class="text-gray-500">({{ state.route.name }})</span>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <strong class="text-gray-900">Pinia Store:</strong>
            <ul class="ml-4 mt-1 space-y-1">
              <li>Products: <strong class="text-blue-600">{{ state.piniaStore.length }}</strong></li>
              <li>Cache Fresh: <strong :class="state.piniaStore.isCacheFresh ? 'text-green-600' : 'text-red-600'">{{ state.piniaStore.isCacheFresh ? '✅ Yes' : '❌ No' }}</strong></li>
              <li>Cache Age: <strong class="text-gray-900">{{ state.piniaStore.cacheAge }}s</strong></li>
            </ul>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <strong class="text-gray-900">Environment:</strong>
            <ul class="ml-4 mt-1 space-y-1">
              <li>Server: <strong class="text-purple-600">{{ state.environment.isServer ? 'Yes' : 'No' }}</strong></li>
              <li>Client: <strong class="text-purple-600">{{ state.environment.isClient ? 'Yes' : 'No' }}</strong></li>
              <li>Dev: <strong class="text-purple-600">{{ state.environment.isDev ? 'Yes' : 'No' }}</strong></li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SSR Payload -->
      <div v-if="ssrPayload" class="mb-4 border-b-2 border-gray-300 pb-3">
        <button
          @click="expandedSections.ssrPayload = !expandedSections.ssrPayload"
          class="w-full flex items-center justify-between font-bold text-base mb-2 text-gray-800 hover:text-gray-900"
        >
          <span>📦 SSR Payload Check</span>
          <span class="text-lg">{{ expandedSections.ssrPayload ? '−' : '+' }}</span>
        </button>
        <div v-show="expandedSections.ssrPayload" class="text-xs space-y-2 text-gray-700">
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-gray-50 p-2 rounded">
              <strong class="text-gray-900">Payload Exists:</strong> 
              <span class="{{ ssrPayload.exists ? 'text-green-600' : 'text-red-600' }} font-bold ml-1">
                {{ ssrPayload.exists ? '✅ Yes' : '❌ No' }}
              </span>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <strong class="text-gray-900">all-products in Payload:</strong> 
              <span class="{{ ssrPayload.allProductsInPayload ? 'text-green-600' : 'text-red-600' }} font-bold ml-1">
                {{ ssrPayload.allProductsInPayload ? '✅ Yes' : '❌ No' }}
              </span>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <strong class="text-gray-900">Payload Length:</strong> 
              <span class="text-blue-600 font-bold ml-1">{{ ssrPayload.allProductsLength }}</span>
            </div>
            <div class="bg-gray-50 p-2 rounded">
              <strong class="text-gray-900">Scripts Found:</strong> 
              <span class="text-gray-900 font-bold ml-1">{{ ssrPayload.scriptCount }}</span>
            </div>
          </div>
          <div class="bg-gray-50 p-2 rounded">
            <strong class="text-gray-900">Location:</strong> 
            <code class="text-blue-600 font-mono text-xs ml-1">{{ ssrPayload.payloadLocation }}</code>
          </div>
          <details v-if="ssrPayload.fullPayloadPreview" class="mt-2">
            <summary class="cursor-pointer text-blue-600 font-semibold hover:text-blue-700 mb-2">
              🔍 View Payload Preview
            </summary>
            <pre class="mt-2 p-3 bg-gray-900 text-green-400 text-xs overflow-auto max-h-60 rounded border border-gray-700 font-mono">{{ ssrPayload.fullPayloadPreview }}</pre>
          </details>
        </div>
      </div>

      <!-- Hydration State -->
      <div v-if="hydrationState" class="mb-4 border-b-2 border-gray-300 pb-3">
        <button
          @click="expandedSections.hydrationState = !expandedSections.hydrationState"
          class="w-full flex items-center justify-between font-bold text-base mb-2 text-gray-800 hover:text-gray-900"
        >
          <span>💧 Hydration State</span>
          <span class="text-lg">{{ expandedSections.hydrationState ? '−' : '+' }}</span>
        </button>
        <div v-show="expandedSections.hydrationState">
          <pre class="text-xs p-3 bg-gray-900 text-green-400 overflow-auto max-h-96 rounded border border-gray-700 font-mono whitespace-pre-wrap">{{ JSON.stringify(hydrationState, null, 2) }}</pre>
        </div>
      </div>

      <!-- Show All JSON -->
      <div class="mb-4 border-b-2 border-gray-300 pb-3">
        <div class="flex items-center justify-between mb-2">
          <button
            @click="expandedSections.allJson = !expandedSections.allJson"
            class="flex items-center justify-between font-bold text-base text-gray-800 hover:text-gray-900 flex-1"
          >
            <span>📋 All JSON Data (Copy/Paste)</span>
            <span class="text-lg ml-2">{{ expandedSections.allJson ? '−' : '+' }}</span>
          </button>
          <button
            v-if="expandedSections.allJson"
            @click="copyAllJson"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded text-sm font-semibold ml-2"
          >
            📋 Copy All JSON
          </button>
        </div>
        <div v-show="expandedSections.allJson" class="relative mt-2">
          <pre id="all-json-content" class="text-xs p-4 bg-gray-900 text-green-400 overflow-auto max-h-[600px] rounded border-2 border-gray-700 font-mono whitespace-pre-wrap select-all">{{ JSON.stringify(allJsonData, null, 2) }}</pre>
          <button
            @click="copyAllJson"
            class="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold opacity-90 hover:opacity-100 z-10"
          >
            📋 Copy
          </button>
        </div>
        <p v-if="expandedSections.allJson" class="text-xs text-gray-600 mt-2">
          💡 Tip: Click the "Copy" button or select all text (Ctrl+A / Cmd+A) and copy (Ctrl+C / Cmd+C). All data is selectable.
        </p>
      </div>

      <!-- Debug Log -->
      <div class="mb-4">
        <button
          @click="expandedSections.debugLog = !expandedSections.debugLog"
          class="w-full flex items-center justify-between font-bold text-base mb-2 text-gray-800 hover:text-gray-900"
        >
          <span>📝 Debug Log ({{ debugLog.length }} entries)</span>
          <span class="text-lg">{{ expandedSections.debugLog ? '−' : '+' }}</span>
        </button>
        <div v-show="expandedSections.debugLog" class="text-xs space-y-1 max-h-96 overflow-auto border border-gray-300 rounded p-2">
          <div
            v-for="(log, idx) in debugLog"
            :key="idx"
            class="p-2 border-b border-gray-200 rounded mb-1"
            :class="{
              'bg-red-100 border-red-300': log.level === 'error',
              'bg-blue-100 border-blue-300': log.category === 'SSR Payload',
              'bg-green-100 border-green-300': log.category === 'Hydration',
              'bg-purple-100 border-purple-300': log.category === 'API Test',
              'bg-orange-100 border-orange-300': log.category === 'Navigation',
              'bg-yellow-100 border-yellow-300': log.level === 'warn',
              'bg-gray-50 border-gray-200': !log.level || (log.level === 'info' && !['SSR Payload', 'Hydration', 'API Test', 'Navigation'].includes(log.category)),
            }"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-bold text-gray-900">
                  <span v-if="log.level === 'error'" class="text-red-600">❌</span>
                  <span v-else-if="log.level === 'warn'" class="text-yellow-600">⚠️</span>
                  <span v-else class="text-blue-600">ℹ️</span>
                  <span class="ml-1">{{ log.category }}</span> - 
                  <span class="text-gray-800">{{ log.message }}</span>
                </div>
                <div class="text-gray-600 text-xs mt-1">
                  <span class="font-mono">{{ new Date(log.timestamp).toLocaleTimeString() }}</span> | 
                  <span class="text-blue-600">{{ log.route?.path || 'N/A' }}</span>
                </div>
                <details v-if="log.data" class="mt-2">
                  <summary class="cursor-pointer text-gray-600 hover:text-gray-900 text-xs font-semibold">
                    📋 View Data
                  </summary>
                  <pre class="mt-2 p-2 text-xs overflow-auto max-h-40 bg-gray-900 text-green-400 rounded border border-gray-700 font-mono">{{ JSON.stringify(log.data, null, 2) }}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

