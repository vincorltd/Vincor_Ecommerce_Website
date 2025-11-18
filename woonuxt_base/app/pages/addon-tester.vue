<template>
  <div style="max-width: 1400px; margin: 0 auto; padding: 30px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">🎁 Product Add-Ons Tester</h1>
    <p style="color: #666; margin-bottom: 30px; font-size: 14px;">Test and debug WooCommerce Product Add-Ons with Store API</p>

    <!-- Product ID Input -->
    <div style="margin-bottom: 20px;">
      <label for="productId" style="display: block; font-weight: 600; margin-bottom: 8px; color: #333;">🏷️ Product ID with Add-Ons</label>
      <input
        id="productId"
        v-model="productId"
        type="text"
        placeholder="e.g., 7624"
        style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
      />
    </div>

    <!-- Test Actions -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 30px;">
      <button
        type="button"
        @click="getProductAddons"
        :disabled="loading"
        style="padding: 12px 24px; background: #7c3aed; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        📦 Get Product Add-Ons
      </button>

      <button
        type="button"
        @click="testAddToCart"
        :disabled="loading || !productId"
        style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🛒 Add to Cart (Simple)
      </button>

      <button
        type="button"
        @click="testAddToCartWithAddons"
        :disabled="loading || !productId || !selectedAddons.length"
        style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🎁 Add to Cart (With Add-Ons)
      </button>

      <button
        type="button"
        @click="getCurrentCart"
        :disabled="loading"
        style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🛍️ Get Current Cart
      </button>

      <button
        type="button"
        @click="clearCart"
        :disabled="loading"
        style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🗑️ Clear Cart
      </button>

      <button
        type="button"
        @click="clearResults"
        style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px;"
      >
        🔄 Clear Results
      </button>
    </div>

    <!-- Add-On Configuration -->
    <div v-if="productAddons.length > 0" style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #e5e7eb;">
      <h3 style="color: #333; margin-bottom: 15px; font-size: 18px;">⚙️ Configure Add-Ons for Testing</h3>
      
      <div v-for="(addon, index) in productAddons" :key="index" style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <div style="margin-bottom: 10px;">
          <strong>{{ addon.name }}</strong>
          <span v-if="addon.required" style="color: #ef4444; margin-left: 5px;">(Required)</span>
          <div style="color: #6b7280; font-size: 12px; margin-top: 5px;">
            Type: {{ addon.type }} | ID: {{ addon.id }}
          </div>
        </div>

        <!-- Multiple Choice / Radio -->
        <div v-if="addon.type === 'multiple_choice' && addon.options">
          <select
            v-model="selectedAddons[index]"
            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
          >
            <option :value="null">-- Select Option --</option>
            <option
              v-for="(option, optIndex) in addon.options"
              :key="optIndex"
              :value="{ addon, option, optIndex }"
            >
              {{ option.label }} (+${{ option.price }})
            </option>
          </select>
        </div>

        <!-- Checkbox -->
        <div v-if="addon.type === 'checkbox' && addon.options">
          <div v-for="(option, optIndex) in addon.options" :key="optIndex" style="margin-bottom: 8px;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input
                type="checkbox"
                :checked="isCheckboxSelected(addon.id, optIndex)"
                @change="toggleCheckbox(addon, option, optIndex)"
                style="margin-right: 8px;"
              />
              {{ option.label }} (+${{ option.price }})
            </label>
          </div>
        </div>

        <!-- Custom Text -->
        <div v-if="addon.type === 'custom_text' || addon.type === 'custom_textarea'">
          <input
            v-if="addon.type === 'custom_text'"
            v-model="selectedAddons[index]"
            type="text"
            :placeholder="addon.placeholder || 'Enter text...'"
            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
          />
          <textarea
            v-else
            v-model="selectedAddons[index]"
            :placeholder="addon.placeholder || 'Enter text...'"
            rows="3"
            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;"
          ></textarea>
        </div>
      </div>

      <!-- Show Configuration Preview -->
      <div v-if="addonConfigurationPreview" style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-top: 20px;">
        <p style="font-weight: 600; margin-bottom: 10px;">Store API Configuration Preview:</p>
        <pre style="font-family: monospace; font-size: 13px; white-space: pre-wrap; word-wrap: break-word;">{{ addonConfigurationPreview }}</pre>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="text-align: center; padding: 20px;">
      <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #7c3aed; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- Results -->
    <div v-if="results && !loading" style="margin-top: 30px;">
      <!-- Action Info -->
      <div style="background: #eff6ff; padding: 12px; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 15px;">
        <p style="font-weight: 600; margin-bottom: 5px; font-size: 12px;">Action:</p>
        <p style="font-family: monospace; font-size: 13px;">{{ results.action }}</p>
      </div>

      <!-- Success Info -->
      <div v-if="results.success" style="background: #efe; border: 2px solid #cfc; color: #3c3; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="font-weight: 600; margin-bottom: 10px;">✅ Success!</p>
        <div v-if="results.stats" style="font-size: 14px;">
          <p v-for="(value, key) in results.stats" :key="key">
            <strong>{{ formatStatKey(key) }}:</strong> {{ value }}
          </p>
        </div>
      </div>

      <!-- Error -->
      <div v-if="!results.success" style="background: #fee; border: 2px solid #fcc; color: #c33; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="font-weight: 600;">❌ Error:</p>
        <p>{{ results.error }}</p>
      </div>

      <!-- JSON Output -->
      <div style="background: #1f2937; padding: 20px; border-radius: 6px; overflow-x: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px; flex-wrap: wrap;">
          <p style="color: #f3f4f6; font-weight: 600; font-size: 14px;">Response Data:</p>
          <button
            type="button"
            @click="copyToClipboard"
            style="padding: 8px 16px; background: #374151; color: #f3f4f6; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
          >
            📋 Copy JSON
          </button>
        </div>
        <pre style="color: #10b981; font-size: 13px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;">{{ formattedJSON }}</pre>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="copied" style="position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 1000;">
      ✅ JSON copied to clipboard!
    </div>
  </div>
</template>

<script setup lang="ts">
const productId = ref('7624'); // Default to the product mentioned in the terminal
const loading = ref(false);
const loadingMessage = ref('');
const results = ref<any>(null);
const copied = ref(false);
const productAddons = ref<any[]>([]);
const selectedAddons = ref<any[]>([]);
const checkboxSelections = ref<Map<string, Set<number>>>(new Map());

const formattedJSON = computed(() => {
  if (!results.value?.data) return '';
  return JSON.stringify(results.value.data, null, 2);
});

const addonConfigurationPreview = computed(() => {
  if (!selectedAddons.value.length && checkboxSelections.value.size === 0) return null;
  
  const config: any = {};
  
  // Process regular selections
  selectedAddons.value.forEach((selection, index) => {
    if (!selection) return;
    const addon = productAddons.value[index];
    if (!addon) return;
    
    if (typeof selection === 'object' && selection.addon) {
      // Multiple choice with option
      config[selection.addon.id] = selection.optIndex;
    } else if (typeof selection === 'string') {
      // Text input
      config[addon.id] = selection;
    }
  });
  
  // Process checkbox selections
  checkboxSelections.value.forEach((indexes, addonId) => {
    if (indexes.size > 0) {
      config[addonId] = Array.from(indexes);
    }
  });
  
  return JSON.stringify(config, null, 2);
});

function isCheckboxSelected(addonId: number, optIndex: number): boolean {
  const selections = checkboxSelections.value.get(addonId.toString());
  return selections ? selections.has(optIndex) : false;
}

function toggleCheckbox(addon: any, option: any, optIndex: number) {
  const addonIdKey = addon.id.toString();
  
  if (!checkboxSelections.value.has(addonIdKey)) {
    checkboxSelections.value.set(addonIdKey, new Set());
  }
  
  const selections = checkboxSelections.value.get(addonIdKey)!;
  
  if (selections.has(optIndex)) {
    selections.delete(optIndex);
  } else {
    selections.add(optIndex);
  }
}

async function getProductAddons() {
  if (!productId.value) {
    alert('Please enter a Product ID');
    return;
  }

  loading.value = true;
  loadingMessage.value = 'Fetching product add-ons...';
  results.value = null;

  try {
    const response = await $fetch('/api/test-woo-api', {
      params: {
        endpoint: 'single-product',
        productId: productId.value,
      },
    });

    if (response.success && response.data?.addons) {
      productAddons.value = response.data.addons;
      selectedAddons.value = new Array(response.data.addons.length).fill(null);
      checkboxSelections.value.clear();
      
      results.value = {
        success: true,
        action: `GET /wc/v3/products/${productId.value}`,
        data: {
          product_name: response.data.name,
          product_id: response.data.id,
          addons: response.data.addons,
        },
        stats: {
          'Add-Ons Found': response.data.addons.length,
          'Required Add-Ons': response.data.addons.filter((a: any) => a.required).length,
        },
      };
    } else {
      results.value = {
        success: false,
        action: `GET /wc/v3/products/${productId.value}`,
        error: 'No add-ons found for this product',
      };
    }
  } catch (error: any) {
    results.value = {
      success: false,
      action: `GET /wc/v3/products/${productId.value}`,
      error: error?.message || 'Failed to fetch product',
    };
  } finally {
    loading.value = false;
  }
}

async function testAddToCart() {
  loading.value = true;
  loadingMessage.value = 'Adding product to cart...';
  results.value = null;

  try {
    const response = await $fetch('/api/cart/add-item', {
      method: 'POST',
      body: {
        id: parseInt(productId.value),
        quantity: 1,
      },
    });

    results.value = {
      success: true,
      action: 'POST /api/cart/add-item (no add-ons)',
      data: response,
      stats: {
        'Cart Items': response.items_count || response.items?.length || 0,
      },
    };
  } catch (error: any) {
    results.value = {
      success: false,
      action: 'POST /api/cart/add-item (no add-ons)',
      error: error?.message || error?.data?.message || 'Failed to add to cart',
    };
  } finally {
    loading.value = false;
  }
}

async function testAddToCartWithAddons() {
  loading.value = true;
  loadingMessage.value = 'Adding product with add-ons to cart...';
  results.value = null;

  try {
    // Build addons array
    const addonsArray: any[] = [];
    
    // Process regular selections
    selectedAddons.value.forEach((selection, index) => {
      if (!selection) return;
      const addon = productAddons.value[index];
      if (!addon) return;
      
      if (typeof selection === 'object' && selection.addon) {
        // Multiple choice
        addonsArray.push({
          addonId: selection.addon.id,
          fieldName: selection.addon.name,
          label: selection.option.label,
          value: selection.option.label,
          price: parseFloat(selection.option.price) || 0,
          optionIndex: selection.optIndex,
        });
      } else if (typeof selection === 'string') {
        // Text input
        addonsArray.push({
          addonId: addon.id,
          fieldName: addon.name,
          label: selection,
          value: selection,
          price: parseFloat(addon.price) || 0,
        });
      }
    });
    
    // Process checkbox selections
    checkboxSelections.value.forEach((indexes, addonId) => {
      const addon = productAddons.value.find(a => a.id.toString() === addonId);
      if (!addon) return;
      
      indexes.forEach(optIndex => {
        const option = addon.options[optIndex];
        if (option) {
          addonsArray.push({
            addonId: addon.id,
            fieldName: addon.name,
            label: option.label,
            value: option.label,
            price: parseFloat(option.price) || 0,
            optionIndex: optIndex,
          });
        }
      });
    });

    const response = await $fetch('/api/cart/add-item', {
      method: 'POST',
      body: {
        id: parseInt(productId.value),
        quantity: 1,
        extraData: [
          {
            key: 'addons',
            value: JSON.stringify(addonsArray),
          },
        ],
      },
    });

    results.value = {
      success: true,
      action: 'POST /api/cart/add-item (with add-ons)',
      data: {
        cart_response: response,
        addons_sent: addonsArray,
      },
      stats: {
        'Cart Items': response.items_count || response.items?.length || 0,
        'Add-Ons Sent': addonsArray.length,
      },
    };
  } catch (error: any) {
    results.value = {
      success: false,
      action: 'POST /api/cart/add-item (with add-ons)',
      error: error?.message || error?.data?.message || 'Failed to add to cart',
      data: error?.data || null,
    };
  } finally {
    loading.value = false;
  }
}

async function getCurrentCart() {
  loading.value = true;
  loadingMessage.value = 'Fetching current cart...';
  results.value = null;

  try {
    const response = await $fetch('/api/cart');

    const cartItems = response.items || [];
    const stats: any = {
      'Cart Items': cartItems.length,
      'Total': response.totals?.total_price || 'N/A',
    };

    // Analyze add-ons in cart
    const itemsWithAddons = cartItems.filter((item: any) => {
      const hasExtensions = item.extensions?.addons;
      const hasItemData = item.item_data && item.item_data.length > 0;
      return hasExtensions || hasItemData;
    });
    
    stats['Items with Add-Ons'] = itemsWithAddons.length;

    results.value = {
      success: true,
      action: 'GET /api/cart',
      data: response,
      stats,
    };
  } catch (error: any) {
    results.value = {
      success: false,
      action: 'GET /api/cart',
      error: error?.message || 'Failed to fetch cart',
    };
  } finally {
    loading.value = false;
  }
}

async function clearCart() {
  loading.value = true;
  loadingMessage.value = 'Clearing cart...';
  results.value = null;

  try {
    const response = await $fetch('/api/cart/remove-items', {
      method: 'DELETE',
    });

    results.value = {
      success: true,
      action: 'DELETE /api/cart/remove-items',
      data: response,
      stats: {
        'Cart Items': response.items_count || 0,
      },
    };
  } catch (error: any) {
    results.value = {
      success: false,
      action: 'DELETE /api/cart/remove-items',
      error: error?.message || 'Failed to clear cart',
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
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 3000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

function formatStatKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Auto-load product addons on mount
onMounted(() => {
  if (productId.value) {
    getProductAddons();
  }
});

// SEO
useHead({
  title: 'Add-Ons Tester',
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













