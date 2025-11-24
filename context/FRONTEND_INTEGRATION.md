# Frontend Integration Guide

This guide explains how to fetch and display product tabs in your Nuxt 3 frontend using the Vincor Product Tabs REST API.

## 🔌 API Endpoints

### Option 1: Custom Vincor Endpoint (Recommended)

```
GET /wp-json/vincor/v1/product-tabs/{product_id_or_sku}
```

**Advantages:**
- ✅ Works with product ID or SKU
- ✅ Lightweight response (tabs only)
- ✅ Fast and focused

### Option 2: WooCommerce Products API

```
GET /wp-json/wc/v3/products/{product_id}
```

**Advantages:**
- ✅ Get product data + tabs in one request
- ✅ Tabs included in `custom_tabs` field
- ✅ Standard WooCommerce authentication

---

## 📊 Response Format

### Vincor Endpoint Response

```json
{
  "product_id": 123,
  "tabs": [
    {
      "id": "tab-1732123456789",
      "type": "specifications",
      "title": "Technical Specifications",
      "priority": 10,
      "specifications": [
        {
          "category": "General",
          "label": "Brand",
          "value": "Samsung"
        },
        {
          "category": "Physical",
          "label": "Weight",
          "value": "2.5 lbs"
        },
        {
          "category": "Technical",
          "label": "Frequency Range",
          "value": "3.7-4.2 GHz"
        }
      ]
    },
    {
      "id": "tab-1732123456790",
      "type": "content",
      "title": "Features",
      "priority": 20,
      "content": "<ul><li>100% Tested</li><li>Adjustable Scalar Ring</li></ul>"
    },
    {
      "id": "tab-1732123456791",
      "type": "media_gallery",
      "title": "Product Gallery",
      "priority": 30,
      "images": [
        {
          "id": 456,
          "url": "https://yoursite.com/wp-content/uploads/image.jpg",
          "alt": "Product image",
          "caption": "Product in use"
        }
      ]
    }
  ]
}
```

### WooCommerce API Response (Partial)

The tabs are nested in the `custom_tabs` field:

```json
{
  "id": 123,
  "name": "Product Name",
  "slug": "product-slug",
  "sku": "PRODUCT-SKU",
  "custom_tabs": [
    {
      "id": "tab-1732123456789",
      "type": "specifications",
      "title": "Technical Specifications",
      "priority": 10,
      "specifications": [...]
    }
  ]
}
```

---

## 🚀 Nuxt 3 Implementation

### 1. Create Composable for API Calls

**File:** `composables/useProductTabs.ts`

```typescript
export const useProductTabs = () => {
  const config = useRuntimeConfig()
  
  /**
   * Fetch tabs by product ID
   */
  const fetchTabsByProductId = async (productId: number) => {
    try {
      const { data, error } = await useFetch(
        `${config.public.wordpressUrl}/wp-json/vincor/v1/product-tabs/${productId}`,
        {
          key: `product-tabs-${productId}`,
        }
      )
      
      if (error.value) {
        console.error('Failed to fetch tabs:', error.value)
        return null
      }
      
      return data.value
    } catch (err) {
      console.error('Error fetching product tabs:', err)
      return null
    }
  }
  
  /**
   * Fetch tabs by SKU
   */
  const fetchTabsBySku = async (sku: string) => {
    try {
      const { data, error } = await useFetch(
        `${config.public.wordpressUrl}/wp-json/vincor/v1/product-tabs/${sku}`,
        {
          key: `product-tabs-${sku}`,
        }
      )
      
      if (error.value) {
        console.error('Failed to fetch tabs:', error.value)
        return null
      }
      
      return data.value
    } catch (err) {
      console.error('Error fetching product tabs:', err)
      return null
    }
  }
  
  return {
    fetchTabsByProductId,
    fetchTabsBySku,
  }
}
```

### 2. Create Tab Component

**File:** `components/ProductTabs.vue`

```vue
<template>
  <div v-if="tabs && tabs.length > 0" class="product-tabs">
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.title }}
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="tab-content">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        v-show="activeTab === tab.id"
        class="tab-panel"
      >
        <!-- Specifications Tab -->
        <div v-if="tab.type === 'specifications'" class="specifications-tab">
          <SpecificationsTable :specifications="tab.specifications" />
        </div>
        
        <!-- Content Tab -->
        <div v-else-if="tab.type === 'content'" class="content-tab">
          <div v-html="tab.content" class="tab-content-html"></div>
        </div>
        
        <!-- Media Gallery Tab -->
        <div v-else-if="tab.type === 'media_gallery'" class="gallery-tab">
          <MediaGallery :images="tab.images" />
        </div>
      </div>
    </div>
  </div>
  
  <div v-else-if="loading" class="loading">
    Loading tabs...
  </div>
  
  <div v-else class="no-tabs">
    No additional information available.
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  productId?: number
  sku?: string
}>()

const { fetchTabsByProductId, fetchTabsBySku } = useProductTabs()

const tabs = ref([])
const activeTab = ref(null)
const loading = ref(true)

// Fetch tabs on mount
onMounted(async () => {
  let response = null
  
  if (props.productId) {
    response = await fetchTabsByProductId(props.productId)
  } else if (props.sku) {
    response = await fetchTabsBySku(props.sku)
  }
  
  if (response && response.tabs) {
    // Sort by priority (ascending)
    tabs.value = response.tabs.sort((a, b) => a.priority - b.priority)
    
    // Set first tab as active
    if (tabs.value.length > 0) {
      activeTab.value = tabs.value[0].id
    }
  }
  
  loading.value = false
})
</script>

<style scoped>
.product-tabs {
  margin: 40px 0;
}

.tab-navigation {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #ddd;
  margin-bottom: 30px;
}

.tab-button {
  padding: 15px 25px;
  background: #f5f5f5;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s;
}

.tab-button:hover {
  background: #e9e9e9;
}

.tab-button.active {
  background: #fff;
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.tab-content {
  padding: 20px 0;
}

.tab-panel {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.loading,
.no-tabs {
  padding: 40px;
  text-align: center;
  color: #666;
}
</style>
```

### 3. Specifications Table Component

**File:** `components/SpecificationsTable.vue`

```vue
<template>
  <div class="specifications-table">
    <div
      v-for="category in groupedSpecs"
      :key="category.name"
      class="spec-category"
    >
      <h3 class="category-title">{{ category.name }}</h3>
      <table class="specs-table">
        <tbody>
          <tr
            v-for="(spec, index) in category.specs"
            :key="index"
            :class="{ even: index % 2 === 0 }"
          >
            <td class="spec-label">{{ spec.label }}</td>
            <td class="spec-value">{{ spec.value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  specifications: Array<{
    category: string
    label: string
    value: string
  }>
}>()

// Group specifications by category
const groupedSpecs = computed(() => {
  const groups = {}
  
  props.specifications.forEach(spec => {
    const category = spec.category || 'General'
    if (!groups[category]) {
      groups[category] = {
        name: category,
        specs: []
      }
    }
    groups[category].specs.push(spec)
  })
  
  return Object.values(groups)
})
</script>

<style scoped>
.specifications-table {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.spec-category {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.category-title {
  background: #f8f8f8;
  padding: 12px 20px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
}

.specs-table {
  width: 100%;
  border-collapse: collapse;
}

.specs-table tr {
  border-bottom: 1px solid #f0f0f0;
}

.specs-table tr:last-child {
  border-bottom: none;
}

.specs-table tr.even {
  background: #fafafa;
}

.spec-label {
  padding: 12px 20px;
  font-weight: 500;
  color: #555;
  width: 35%;
  vertical-align: top;
}

.spec-value {
  padding: 12px 20px;
  color: #333;
}

@media (max-width: 768px) {
  .specs-table tr {
    display: flex;
    flex-direction: column;
  }
  
  .spec-label,
  .spec-value {
    width: 100%;
    padding: 10px 15px;
  }
  
  .spec-label {
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
  }
}
</style>
```

### 4. Media Gallery Component

**File:** `components/MediaGallery.vue`

```vue
<template>
  <div class="media-gallery">
    <div class="gallery-grid">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="gallery-item"
        @click="openLightbox(index)"
      >
        <img
          :src="image.url"
          :alt="image.alt || 'Product image'"
          class="gallery-image"
        />
        <p v-if="image.caption" class="image-caption">{{ image.caption }}</p>
      </div>
    </div>
    
    <!-- Lightbox (optional - use a library like vue-easy-lightbox) -->
    <div v-if="lightboxOpen" class="lightbox" @click="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox">&times;</button>
      <img
        :src="images[currentImageIndex].url"
        :alt="images[currentImageIndex].alt"
        class="lightbox-image"
      />
      <button
        v-if="currentImageIndex > 0"
        class="lightbox-prev"
        @click.stop="prevImage"
      >
        ‹
      </button>
      <button
        v-if="currentImageIndex < images.length - 1"
        class="lightbox-next"
        @click.stop="nextImage"
      >
        ›
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  images: Array<{
    id: number
    url: string
    alt?: string
    caption?: string
  }>
}>()

const lightboxOpen = ref(false)
const currentImageIndex = ref(0)

const openLightbox = (index: number) => {
  currentImageIndex.value = index
  lightboxOpen.value = true
}

const closeLightbox = () => {
  lightboxOpen.value = false
}

const nextImage = () => {
  if (currentImageIndex.value < props.images.length - 1) {
    currentImageIndex.value++
  }
}

const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}
</script>

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.gallery-item {
  cursor: pointer;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.gallery-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

.image-caption {
  padding: 10px;
  font-size: 14px;
  color: #666;
  margin: 0;
  text-align: center;
}

/* Lightbox */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 30px;
  font-size: 40px;
  color: white;
  background: none;
  border: none;
  cursor: pointer;
}

.lightbox-prev,
.lightbox-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 60px;
  color: white;
  background: rgba(0,0,0,0.5);
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  border-radius: 4px;
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}
</style>
```

### 5. Usage in Product Page

**File:** `pages/products/[slug].vue`

```vue
<template>
  <div class="product-page">
    <div class="product-header">
      <h1>{{ product.name }}</h1>
      <p class="sku">SKU: {{ product.sku }}</p>
    </div>
    
    <!-- Product Images, Price, Add to Cart, etc. -->
    <div class="product-main">
      <!-- Your existing product content -->
    </div>
    
    <!-- Product Tabs -->
    <ProductTabs :product-id="product.id" />
    <!-- OR use SKU: -->
    <!-- <ProductTabs :sku="product.sku" /> -->
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const product = ref(null)

// Fetch product data
onMounted(async () => {
  // Your existing product fetch logic
  product.value = await fetchProduct(route.params.slug)
})
</script>
```

---

## 🔄 Alternative: Fetch with WooCommerce API

If you want to get tabs along with product data in one request:

```typescript
// composables/useWooCommerce.ts
export const useWooCommerce = () => {
  const config = useRuntimeConfig()
  
  const fetchProduct = async (productId: number) => {
    const auth = btoa(`${config.wooCommerceKey}:${config.wooCommerceSecret}`)
    
    const { data } = await useFetch(
      `${config.public.wordpressUrl}/wp-json/wc/v3/products/${productId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    )
    
    return {
      ...data.value,
      tabs: data.value.custom_tabs || []
    }
  }
  
  return { fetchProduct }
}
```

---

## 📱 TypeScript Types

**File:** `types/product-tabs.ts`

```typescript
export interface ProductTab {
  id: string
  type: 'specifications' | 'content' | 'media_gallery'
  title: string
  priority: number
  specifications?: Specification[]
  content?: string
  images?: GalleryImage[]
}

export interface Specification {
  category: string
  label: string
  value: string
}

export interface GalleryImage {
  id: number
  url: string
  alt?: string
  caption?: string
}

export interface ProductTabsResponse {
  product_id: number
  tabs: ProductTab[]
}
```

---

## 🎨 Styling Tips

### Newegg-Style Specifications
```css
.specs-table tr:nth-child(odd) {
  background: #f9f9f9;
}

.spec-label {
  font-weight: 600;
  color: #000;
  width: 30%;
}

.spec-value {
  color: #555;
}
```

### Content Tab HTML Styling
```css
.tab-content-html ul {
  list-style: disc;
  margin-left: 20px;
  line-height: 1.8;
}

.tab-content-html p {
  margin-bottom: 1em;
  line-height: 1.6;
}

.tab-content-html h3 {
  margin: 1.5em 0 0.5em;
  font-size: 1.3em;
}
```

---

## 🚀 Performance Tips

### 1. **Cache API Responses**
```typescript
const { data } = await useFetch(url, {
  key: `tabs-${productId}`,
  getCachedData: (key) => nuxtApp.static.data[key]
})
```

### 2. **Lazy Load Tabs**
Only fetch tabs when user scrolls to them:

```typescript
const { data: tabs } = await useFetch(url, {
  lazy: true,
  server: false
})
```

### 3. **Preload Critical Tabs**
Fetch specifications tab immediately, lazy load others.

---

## 🔒 Security Notes

1. **Content Tab HTML** - Already sanitized by WordPress `wp_kses_post()`
2. **Image URLs** - Already validated by WordPress
3. **No authentication required** - Public API endpoints
4. **XSS Protection** - Use `v-html` carefully, content is pre-sanitized

---

## 📞 Support

- **Plugin Issues:** GitHub Issues
- **Frontend Questions:** Check Nuxt 3 docs
- **API Problems:** Test with curl/Postman first

---

**Happy coding! 🎉**

