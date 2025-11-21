<script setup lang="ts">
/**
 * Product Tabs Component - New Plugin Version
 * 
 * Supports multiple tab types:
 * - specifications: Newegg-style structured specs table
 * - content: Rich HTML content from WordPress editor
 * - media_gallery: Image gallery tabs
 * - datasheet: PDF datasheet viewer (always included)
 */
import DatasheetTab from './DatasheetTab.vue';

interface Props {
  productSku?: string;
  product?: any;
}

const props = defineProps<Props>();
const route = useRoute();

const tabs = ref<ProductTab[]>([]);
const activeTab = ref<string>('');
const loading = ref(true);
const error = ref('');
const hasDatasheet = ref(false);

// Special ID for datasheet tab
const DATASHEET_TAB_ID = 'tab-datasheet-builtin';

// Fetch tabs from product data or API
const fetchTabs = async () => {
  try {
    // Skip cache in dev mode when ?refresh=true query param is present
    const cacheBuster = process.dev && route.query.refresh === 'true' ? `?t=${Date.now()}` : '';
    
    // First check if tabs are in product data (from WooCommerce API)
    // Handle both camelCase (customTabs) and snake_case (custom_tabs)
    const productTabs = props.product?.customTabs || props.product?.custom_tabs;
    
    if (productTabs && Array.isArray(productTabs)) {
      tabs.value = productTabs;
      console.log('[ProductTabs] ✅ Using tabs from product data:', tabs.value.length, 'tabs');
    } else if (props.productSku || props.product?.databaseId) {
      // Fallback: fetch from API endpoint using SKU or product ID
      const identifier = props.productSku || props.product?.databaseId;
      console.log('[ProductTabs] 🔍 Fetching tabs for:', identifier);
      
      const response = await $fetch<ProductTabsResponse>(`/api/product-tabs/${identifier}${cacheBuster}`);
      if (response?.tabs) {
        tabs.value = response.tabs;
        console.log('[ProductTabs] ✅ Fetched tabs from API:', tabs.value.length, 'tabs');
      }
    }
    
    // Check if product has a datasheet
    if (props.product?.databaseId) {
      try {
        // Always use cache-busting in dev mode, or when ?refresh=true query param is present
        const shouldBustCache = process.dev || route.query.refresh === 'true';
        const datasheetCacheBuster = shouldBustCache ? `?t=${Date.now()}` : '';
        
        console.log('[ProductTabs] 🔍 Checking datasheet for product:', props.product.databaseId, {
          cacheBuster: datasheetCacheBuster || 'none'
        });
        
        const datasheetMetadata = await $fetch(`/api/products/${props.product.databaseId}/datasheet${datasheetCacheBuster}`, {
          headers: shouldBustCache ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          } : {}
        });
        
        hasDatasheet.value = datasheetMetadata?.hasDatasheet || false;
        console.log('[ProductTabs] 📄 Datasheet check:', {
          hasDatasheet: hasDatasheet.value,
          datasheetUrl: datasheetMetadata?.datasheetUrl,
          productId: datasheetMetadata?.productId
        });
      } catch (err: any) {
        console.warn('[ProductTabs] ⚠️ Could not check datasheet:', err.message);
        hasDatasheet.value = false;
      }
    }
    
    // Set first tab as active (or datasheet if no tabs and datasheet exists)
    if (tabs.value.length > 0) {
      activeTab.value = tabs.value[0].id;
    } else if (hasDatasheet.value) {
      // If no custom tabs but datasheet exists, show datasheet by default
      activeTab.value = DATASHEET_TAB_ID;
    } else if (tabs.value.length === 0 && !hasDatasheet.value) {
      // No tabs and no datasheet - set to empty string (will show nothing)
      activeTab.value = '';
    }
  } catch (err: any) {
    console.error('[ProductTabs] Error loading tabs:', err);
    error.value = err.message || 'Failed to load product tabs';
    // Only show datasheet tab on error if datasheet exists
    if (hasDatasheet.value) {
      activeTab.value = DATASHEET_TAB_ID;
    }
  } finally {
    loading.value = false;
  }
};

// Initial fetch
onMounted(() => {
  fetchTabs();
});

// Watch for product changes and refresh tabs
watch(() => props.product?.databaseId, () => {
  if (props.product?.databaseId) {
    console.log('[ProductTabs] 🔄 Product changed, refreshing tabs...');
    loading.value = true;
    fetchTabs();
  }
});

// Group specifications by category for better display
const groupedSpecs = (specifications: TabSpec[]) => {
  const grouped: Record<string, TabSpec[]> = {};
  
  specifications.forEach(spec => {
    const category = spec.category || 'General';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(spec);
  });
  
  return grouped;
};
</script>

<template>
  <div v-if="!loading" class="product-tabs-container">
    <!-- Tab Navigation -->
    <div class="tabs-navigation">
      <!-- Custom tabs from plugin -->
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.title }}
      </button>
      
      <!-- Show Datasheet tab only if datasheet exists -->
      <button
        v-if="hasDatasheet"
        :class="['tab-button', { active: activeTab === DATASHEET_TAB_ID }]"
        @click="activeTab = DATASHEET_TAB_ID"
      >
        Datasheet
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tabs-content">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        v-show="activeTab === tab.id"
        class="tab-panel"
      >
        <!-- Specifications Tab (Newegg Style) -->
        <div v-if="tab.type === 'specifications' && tab.specifications" class="specifications-tab">
          <div
            v-for="(specs, category) in groupedSpecs(tab.specifications)"
            :key="category"
            class="spec-category"
          >
            <h3 class="spec-category-title">{{ category }}</h3>
            <table class="spec-table">
              <tbody>
                <tr
                  v-for="(spec, index) in specs"
                  :key="index"
                  :class="{ 'even-row': index % 2 === 0 }"
                >
                  <td class="spec-label">{{ spec.label }}</td>
                  <td class="spec-value">{{ spec.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Content Tab (WordPress Editor) -->
        <div v-else-if="tab.type === 'content' && tab.content" class="content-tab">
          <div class="tab-content-html" v-html="tab.content" />
        </div>

        <!-- Media Gallery Tab -->
        <div v-else-if="tab.type === 'media_gallery' && tab.images" class="media-gallery-tab">
          <div class="gallery-grid">
            <div
              v-for="image in tab.images"
              :key="image.id"
              class="gallery-item"
            >
              <NuxtImg
                :src="image.url"
                :alt="image.alt"
                class="gallery-image"
                loading="lazy"
                width="300"
                height="300"
              />
              <p v-if="image.caption" class="gallery-caption">
                {{ image.caption }}
              </p>
            </div>
          </div>
        </div>

        <!-- Fallback for unknown tab type -->
        <div v-else class="tab-empty">
          <p>No content available for this tab.</p>
        </div>
      </div>
      
      <!-- Datasheet Tab (Only if datasheet exists) -->
      <div
        v-if="hasDatasheet"
        v-show="activeTab === DATASHEET_TAB_ID"
        class="tab-panel datasheet-panel"
      >
        <DatasheetTab :product="product" :key="`datasheet-${product?.databaseId}`" />
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-else-if="loading" class="tabs-loading">
    <LoadingIcon />
  </div>

  <!-- Error State - Show Datasheet tab only if datasheet exists -->
  <div v-else-if="error" class="product-tabs-container">
    <div v-if="hasDatasheet" class="tabs-navigation">
      <button
        :class="['tab-button', { active: activeTab === DATASHEET_TAB_ID }]"
        @click="activeTab = DATASHEET_TAB_ID"
      >
        Datasheet
      </button>
    </div>
    <div class="tabs-content">
      <div v-if="hasDatasheet" v-show="activeTab === DATASHEET_TAB_ID" class="tab-panel datasheet-panel">
        <DatasheetTab :product="product" :key="`datasheet-${product?.databaseId}`" />
      </div>
      <div v-else class="tab-empty">
        <p>{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.product-tabs-container {
  margin-top: 40px;
}

/* Tab Navigation - Vincor Style (matching old ProductTabs) */
.tabs-navigation {
  @apply border-b flex gap-8;
}

.tab-button {
  @apply border-transparent border-b-2 text-lg pb-8;
  margin-bottom: -1px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  @apply text-primary;
}

.tab-button.active {
  @apply border-primary text-primary;
}

/* Tab Content */
.tabs-content {
  @apply mt-8;
  min-height: 300px;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Specifications Tab - Newegg Style */
.specifications-tab {
  max-width: 100%;
}

.spec-category {
  margin-bottom: 30px;
}

.spec-category:last-child {
  margin-bottom: 0;
}

.spec-category-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #ff6900;
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.spec-table tr {
  border-bottom: 1px solid #e5e5e5;
}

.spec-table tr.even-row {
  background-color: #f9f9f9;
}

.spec-table td {
  padding: 12px 16px;
  vertical-align: top;
}

.spec-label {
  font-weight: 600;
  color: #333;
  width: 35%;
}

.spec-value {
  color: #666;
  width: 65%;
}

/* Content Tab */
.content-tab {
  @apply font-light prose;
}

.tab-content-html {
  @apply font-light prose;
  max-width: 100%;
}

.tab-content-html :deep(h1),
.tab-content-html :deep(h2),
.tab-content-html :deep(h3) {
  margin-top: 20px;
  margin-bottom: 10px;
  font-weight: 600;
}

.tab-content-html :deep(p) {
  margin-bottom: 12px;
}

.tab-content-html :deep(ul),
.tab-content-html :deep(ol) {
  margin-left: 20px;
  margin-bottom: 12px;
}

.tab-content-html :deep(li) {
  margin-bottom: 6px;
}

.tab-content-html :deep(img) {
  max-width: 100%;
  height: auto;
}

.tab-content-html :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.tab-content-html :deep(table td),
.tab-content-html :deep(table th) {
  border: 1px solid #ddd;
  padding: 8px;
}

/* Media Gallery Tab */
.media-gallery-tab {
  padding: 10px 0;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.gallery-item {
  text-align: center;
}

.gallery-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.gallery-image:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gallery-caption {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}

/* Loading & Error States */
.tabs-loading,
.tabs-error {
  padding: 40px;
  text-align: center;
  color: #666;
}

.tab-empty {
  padding: 40px;
  text-align: center;
  color: #999;
}

/* Datasheet Tab - Full Width */
.datasheet-panel {
  padding: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .tabs-navigation {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .tab-button {
    padding: 12px 16px;
    font-size: 14px;
    white-space: nowrap;
  }

  .tabs-content {
    padding: 20px;
  }

  .spec-label,
  .spec-value {
    display: block;
    width: 100%;
  }

  .spec-label {
    padding-bottom: 4px;
    font-weight: 700;
  }

  .spec-value {
    padding-top: 0;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
}
</style>

