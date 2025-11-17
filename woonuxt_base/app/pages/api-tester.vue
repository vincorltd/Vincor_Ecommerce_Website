<template>
  <div style="max-width: 1200px; margin: 0 auto; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">🔍 WooCommerce API Tester</h1>
    <p style="color: #666; margin-bottom: 30px; font-size: 14px;">Test and explore your WooCommerce product addons via REST API</p>

    <!-- Endpoint Selector -->
    <div style="margin-bottom: 20px;">
      <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #333;">📡 Select Endpoint</label>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
        <button
          v-for="ep in endpoints"
          :key="ep.value"
          type="button"
          @click="selectEndpoint(ep.value)"
          :style="{
            padding: '10px',
            background: selectedEndpoint === ep.value ? '#7c3aed' : '#f3f4f6',
            color: selectedEndpoint === ep.value ? 'white' : '#333',
            border: selectedEndpoint === ep.value ? '2px solid #7c3aed' : '2px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.3s'
          }"
        >
          {{ ep.label }}
        </button>
      </div>
    </div>

    <!-- Product ID Input -->
    <div v-if="needsProductId" style="margin-bottom: 20px;">
      <label for="productId" style="display: block; font-weight: 600; margin-bottom: 8px; color: #333;">🏷️ Product ID or Slug</label>
      <input
        id="productId"
        v-model="productId"
        type="text"
        placeholder="e.g., 6738 or element-12w-ka-band-buc"
        style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
      />
    </div>

    <!-- Buttons -->
    <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
      <button
        type="button"
        @click="testAPI"
        :disabled="loading"
        style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        <span v-if="!loading">🚀 Test API</span>
        <span v-else>⏳ Loading...</span>
      </button>

      <button
        type="button"
        @click="getAllProductsWithAddons"
        :disabled="loading"
        style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        📦 Get All Products with Addons
      </button>

      <button
        type="button"
        @click="clearResults"
        style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🔄 Clear Results
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="text-align: center; padding: 20px;">
      <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #7c3aed; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
      <p>Fetching data from WooCommerce...</p>
    </div>

    <!-- Results -->
    <div v-if="results && !loading" style="margin-top: 30px;">
      <!-- Endpoint URL -->
      <div style="background: #eff6ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 15px;">
        <p style="font-weight: 600; margin-bottom: 5px; font-size: 12px;">Endpoint:</p>
        <p style="font-family: monospace; font-size: 13px; word-break: break-all;">{{ results.endpoint }}</p>
      </div>

      <!-- Success Info -->
      <div v-if="results.success && results.stats" style="background: #efe; border: 2px solid #cfc; color: #3c3; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="font-weight: 600; margin-bottom: 10px;">✅ Results:</p>
        <div style="font-size: 14px;">
          <p v-if="results.stats.totalProducts !== undefined"><strong>Total Products:</strong> {{ results.stats.totalProducts }}</p>
          <p v-if="results.stats.productsWithAddons !== undefined"><strong>🎁 Products with Addons:</strong> {{ results.stats.productsWithAddons }}</p>
          <p v-if="results.stats.totalAddonFields !== undefined"><strong>📦 Total Addon Fields:</strong> {{ results.stats.totalAddonFields }}</p>
          <p v-if="results.stats.addonCount !== undefined"><strong>🎁 Addons Found:</strong> {{ results.stats.addonCount }}</p>
          <p v-if="results.stats.globalGroups !== undefined"><strong>🌍 Global Addon Groups:</strong> {{ results.stats.globalGroups }}</p>
        </div>
      </div>

      <!-- Warning -->
      <div v-if="results.success && results.stats?.productsWithAddons === 0" style="background: #fffbeb; border: 2px solid #fbbf24; color: #92400e; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="font-weight: 600; margin-bottom: 10px;">⚠️ Warning:</p>
        <p style="margin-bottom: 10px;">No products with addons found. This could mean:</p>
        <ul style="margin-left: 20px;">
          <li>No products have addons configured</li>
          <li>The WooCommerce Product Add-ons plugin REST API is not working</li>
          <li>Cache needs to be cleared in WordPress</li>
          <li>The plugin needs to be reactivated</li>
        </ul>
      </div>

      <!-- Error -->
      <div v-if="!results.success" style="background: #fee; border: 2px solid #fcc; color: #c33; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="font-weight: 600;">❌ Error:</p>
        <p>{{ results.error }}</p>
      </div>

      <!-- JSON Output -->
      <div style="background: #1f2937; padding: 20px; border-radius: 6px; overflow-x: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px; flex-wrap: wrap;">
          <p style="color: #f3f4f6; font-weight: 600; font-size: 14px;">Response:</p>
          <div style="display: flex; gap: 10px;">
            <button
              type="button"
              @click="copyToClipboard"
              style="padding: 8px 16px; background: #374151; color: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
            >
              📋 Copy JSON
            </button>
            <button
              type="button"
              @click="downloadJSON"
              style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
            >
              💾 Download JSON
            </button>
          </div>
        </div>
        <pre style="color: #10b981; font-size: 13px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">{{ formattedJSON }}</pre>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="copied" style="position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
const endpoints = [
  { label: 'All Products', value: 'products' },
  { label: 'Single Product', value: 'single-product' },
  { label: 'Global Addons', value: 'global-addons' },
  { label: 'Product Addons (v3)', value: 'product-addons' },
  { label: 'Product Addons (v1)', value: 'product-addons-v1' },
];

const selectedEndpoint = ref('products');
const productId = ref('');
const loading = ref(false);
const results = ref<any>(null);
const copied = ref(false);
const successMessage = ref('');

const needsProductId = computed(() => {
  return ['single-product', 'product-addons', 'product-addons-v1'].includes(selectedEndpoint.value);
});

const formattedJSON = computed(() => {
  if (!results.value?.data) return '';
  return JSON.stringify(results.value.data, null, 2);
});

function selectEndpoint(endpoint: string) {
  selectedEndpoint.value = endpoint;
}

async function testAPI() {
  if (needsProductId.value && !productId.value) {
    alert('Please enter a Product ID or Slug');
    return;
  }

  loading.value = true;
  results.value = null;

  try {
    const response = await $fetch('/api/test-woo-api', {
      params: {
        endpoint: selectedEndpoint.value,
        productId: productId.value || undefined,
      },
    });

    if (response.success) {
      const data = response.data;
      const stats: any = {};

      // Calculate stats based on response
      if (Array.isArray(data)) {
        stats.totalProducts = data.length;
        
        const withAddons = data.filter((p: any) => p.addons && Array.isArray(p.addons) && p.addons.length > 0);
        stats.productsWithAddons = withAddons.length;
        stats.totalAddonFields = withAddons.reduce((sum: number, p: any) => sum + p.addons.length, 0);
      } else if (data?.addons) {
        stats.addonCount = Array.isArray(data.addons) ? data.addons.length : 0;
      } else if (selectedEndpoint.value === 'global-addons') {
        stats.globalGroups = Array.isArray(data) ? data.length : 0;
      }

      results.value = {
        success: true,
        endpoint: response.endpoint,
        data,
        stats,
      };
    } else {
      results.value = response;
    }
  } catch (error: any) {
    results.value = {
      success: false,
      error: error?.message || 'Failed to fetch data',
      endpoint: 'Error occurred',
    };
  } finally {
    loading.value = false;
  }
}

async function getAllProductsWithAddons() {
  loading.value = true;
  results.value = null;

  try {
    const response = await $fetch('/api/test-woo-api', {
      params: {
        endpoint: 'products',
      },
    });

    if (response.success) {
      const products = response.data as any[];
      
      const productsWithAddons = products
        .filter((p: any) => p.addons && Array.isArray(p.addons) && p.addons.length > 0)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          addon_count: p.addons.length,
          addons: p.addons.map((a: any) => ({
            name: a.name,
            type: a.type,
            required: a.required,
            options: a.options?.length || 0,
          })),
        }));

      results.value = {
        success: true,
        endpoint: response.endpoint,
        data: productsWithAddons,
        stats: {
          totalProducts: products.length,
          productsWithAddons: productsWithAddons.length,
        },
      };
    } else {
      results.value = response;
    }
  } catch (error: any) {
    results.value = {
      success: false,
      error: error?.message || 'Failed to fetch data',
      endpoint: 'Error occurred',
    };
  } finally {
    loading.value = false;
  }
}

function clearResults() {
  results.value = null;
  copied.value = false;
}

async function copyToClipboard() {
  if (!formattedJSON.value) return;
  
  try {
    await navigator.clipboard.writeText(formattedJSON.value);
    successMessage.value = '✅ JSON copied to clipboard!';
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

function downloadJSON() {
  if (!formattedJSON.value) return;
  
  // Create a blob from the JSON string
  const blob = new Blob([formattedJSON.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  
  // Generate filename based on endpoint
  let filename = 'woocommerce-data.json';
  if (selectedEndpoint.value === 'products') {
    filename = 'all-products.json';
  } else if (selectedEndpoint.value === 'single-product') {
    filename = `product-${productId.value}.json`;
  } else if (selectedEndpoint.value === 'global-addons') {
    filename = 'global-addons.json';
  } else if (selectedEndpoint.value.includes('product-addons')) {
    filename = `product-${productId.value}-addons.json`;
  }
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  // Show success message
  successMessage.value = `💾 JSON downloaded as ${filename}`;
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 3000);
}

// SEO
useHead({
  title: 'WooCommerce API Tester',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
  ],
});
</script>

<style scoped>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

