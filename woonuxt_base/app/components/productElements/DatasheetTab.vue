<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';

const props = defineProps<{
  product: Product
}>();

// Datasheet metadata from API
const datasheetMetadata = ref<any>(null);
const fetchingDatasheet = ref(true);
const datasheetFetchError = ref<string | null>(null);

// Function to fetch datasheet metadata
const fetchDatasheetMetadata = async () => {
  if (!props.product?.databaseId) {
    console.error('[DatasheetTab] ❌ No product database ID available');
    fetchingDatasheet.value = false;
    return;
  }

  // Reset state when fetching new product
  datasheetMetadata.value = null;
  datasheetFetchError.value = null;
  fetchingDatasheet.value = true;
  pdf.value = null;
  pages.value = [];
  info.value = null;
  hasPdfError.value = false;
  pdfErrorMessage.value = '';

  const requestedProductId = props.product.databaseId;
  const requestedSku = props.product.sku;
  
  console.log('[DatasheetTab] 🔍 Fetching datasheet metadata for product:', {
    id: requestedProductId,
    sku: requestedSku,
    name: props.product.name
  });
  
  try {
    // Add cache-busting timestamp to prevent Netlify/CDN caching
    const timestamp = Date.now();
    const metadata = await $fetch(`/api/products/${requestedProductId}/datasheet?_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });
    
    // CRITICAL: Validate that the returned metadata matches the product we requested
    if (metadata.productId !== requestedProductId) {
      console.error('[DatasheetTab] ❌ PRODUCT ID MISMATCH!', {
        requested: requestedProductId,
        returned: metadata.productId,
        requestedSku: requestedSku,
        returnedSku: metadata.sku
      });
      datasheetFetchError.value = `Datasheet mismatch: returned product ID ${metadata.productId} does not match requested ${requestedProductId}`;
      datasheetMetadata.value = null;
      return;
    }

    // Additional validation: check SKU matches if both are available
    if (requestedSku && metadata.sku && metadata.sku !== requestedSku) {
      console.warn('[DatasheetTab] ⚠️ SKU mismatch:', {
        requested: requestedSku,
        returned: metadata.sku
      });
      // Don't fail completely, but log warning
    }
    
    datasheetMetadata.value = metadata;
    console.log('[DatasheetTab] ✅ Datasheet metadata fetched and validated:', {
      productId: metadata.productId,
      sku: metadata.sku,
      hasDatasheet: metadata.hasDatasheet,
      datasheetUrl: metadata.datasheetUrl ? metadata.datasheetUrl.substring(0, 50) + '...' : null
    });
  } catch (error: any) {
    console.error('[DatasheetTab] ❌ Failed to fetch datasheet metadata:', error);
    datasheetFetchError.value = error.message || 'Failed to load datasheet metadata';
    datasheetMetadata.value = null;
  } finally {
    fetchingDatasheet.value = false;
  }
};

// Fetch on mount
onMounted(() => {
  fetchDatasheetMetadata();
});

// Watch for product changes and refetch
watch(() => props.product?.databaseId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    console.log('[DatasheetTab] 🔄 Product changed, refetching datasheet:', { oldId, newId });
    fetchDatasheetMetadata();
  }
}, { immediate: false });

// Computed property for the PDF URL (priority: API > fallback to SKU-based)
const pdfUrl = computed(() => {
  // If we have a datasheet URL from the API, use it
  if (datasheetMetadata.value?.datasheetUrl) {
    console.log('[DatasheetTab] 📄 Using API datasheet URL:', datasheetMetadata.value.datasheetUrl);
    return datasheetMetadata.value.datasheetUrl;
  }
  
  // Fallback to SKU-based URL (legacy behavior)
  if (props.product?.sku) {
    console.log('[DatasheetTab] 📄 Falling back to SKU-based URL for:', props.product.sku);
    return `https://satchart.com/pdf/${props.product.sku}.pdf`;
  }
  
  return null;
});

// Use proxy by default to avoid CORS issues and faster loading
const finalPdfUrl = computed(() => {
  if (!pdfUrl.value) return null;
  // Always use proxy for reliable, fast loading without CORS issues
  return `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl.value)}`;
});

// Client-side only refs (initialized after datasheet URL is fetched)
const pdf = ref<any>(null);
const pages = ref<number[]>([]);
const info = ref<any>(null);
const VuePDFComponent = ref<any>(null);

// Track PDF loading state (separate from datasheet metadata fetching)
const isPdfLoading = ref(false);
const hasPdfError = ref(false);
const pdfErrorMessage = ref('');

// Combined loading state for UI
const isLoading = computed(() => fetchingDatasheet.value || isPdfLoading.value);
const hasError = computed(() => !!datasheetFetchError.value || hasPdfError.value);
const errorMessage = computed(() => {
  if (datasheetFetchError.value) return datasheetFetchError.value;
  if (pdfErrorMessage.value) return pdfErrorMessage.value;
  return '';
});

// Initialize PDF viewer after datasheet URL is available
const initializePdfViewer = async () => {
  if (!finalPdfUrl.value) {
    console.warn('[DatasheetTab] ⚠️ No PDF URL available');
    hasPdfError.value = true;
    pdfErrorMessage.value = 'No datasheet available for this product';
    return;
  }

  isPdfLoading.value = true;
  hasPdfError.value = false;
  pdfErrorMessage.value = '';

  try {
    // Dynamically import VuePDF only on client-side (SSR compatibility)
    const { VuePDF, usePDF } = await import('@tato30/vue-pdf');
    
    // Set the component reference
    VuePDFComponent.value = VuePDF;
    
    console.log('[DatasheetTab] 📄 Loading PDF:', finalPdfUrl.value);
    
    // Initialize PDF with usePDF composable
    const pdfData = usePDF(finalPdfUrl.value);
    
    // Assign to our refs
    pdf.value = pdfData.pdf.value;
    pages.value = pdfData.pages.value;
    info.value = pdfData.info.value;
    
    // Watch for PDF load completion
    watch(pdfData.pdf, (newPdf) => {
      if (newPdf) {
        console.log('[DatasheetTab] ✅ PDF loaded successfully via proxy');
        pdf.value = newPdf;
        pages.value = pdfData.pages.value;
        info.value = pdfData.info.value;
        isPdfLoading.value = false;
        hasPdfError.value = false;
      }
    }, { immediate: true });
    
    // Handle case where PDF fails to load (10 second timeout for proxy)
    setTimeout(() => {
      if (!pdf.value && isPdfLoading.value) {
        console.error('[DatasheetTab] ⏱️ PDF load timeout');
        handlePdfError(new Error('PDF load timeout after 10 seconds'));
      }
    }, 10000); // 10 second timeout
    
  } catch (error) {
    console.error('[DatasheetTab] ❌ Failed to initialize PDF viewer:', error);
    handlePdfError(error);
  }
};

// Watch for finalPdfUrl changes and initialize viewer when URL becomes available
watch(finalPdfUrl, (newUrl) => {
  if (newUrl && process.client && !fetchingDatasheet.value) {
    console.log('[DatasheetTab] 🔄 PDF URL available, initializing viewer...');
    initializePdfViewer();
  }
}, { immediate: true });

// Handle PDF load errors
const handlePdfError = (error?: any) => {
  console.error('[DatasheetTab] ❌ PDF load error:', error);
  isPdfLoading.value = false;
  hasPdfError.value = true;
  pdfErrorMessage.value = 'Unable to load the PDF datasheet. The file may not exist or is not accessible.';
};
</script>

<template>
  <div class="pdf-viewer-container">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="animate-spin h-12 w-12 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="text-gray-600">Loading datasheet...</p>
      </div>
    </div>

    <!-- Error State / No Datasheet Available -->
    <div v-else-if="hasError" class="flex items-center justify-center py-20">
      <div class="text-center max-w-md">
        <!-- Different icon for "no datasheet" vs "error loading" -->
        <svg 
          v-if="!datasheetMetadata?.hasDatasheet && !datasheetFetchError" 
          class="h-12 w-12 text-gray-400 mx-auto mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <svg 
          v-else 
          class="h-12 w-12 text-red-500 mx-auto mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        
        <p class="text-gray-600 mb-2 font-medium">
          {{ !datasheetMetadata?.hasDatasheet && !datasheetFetchError ? 'No Datasheet Available' : errorMessage }}
        </p>
        <p class="text-sm text-gray-500">
          Product: {{ product.name }}<br>
          SKU: {{ product.sku }}
        </p>
        
        <!-- Only show "try opening" link if we have a fallback URL -->
        <a 
          v-if="pdfUrl" 
          :href="pdfUrl" 
          target="_blank" 
          rel="noopener noreferrer"
          class="inline-block mt-4 text-primary hover:underline"
        >
          Try opening directly in new tab →
        </a>
      </div>
    </div>

    <!-- PDF Display -->
    <div v-else-if="pdf" class="pdf-content">
      <!-- PDF Info -->
      <div v-if="info" class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
        <div class="flex items-center gap-4 flex-wrap">
          <span class="text-gray-600">
            <strong>Pages:</strong> {{ pages.length }}
          </span>
          <span v-if="info.title" class="text-gray-600">
            <strong>Title:</strong> {{ info.title }}
          </span>
        </div>
        <a 
          :href="pdfUrl" 
          target="_blank" 
          rel="noopener noreferrer"
          class="text-primary hover:underline flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open in new tab
        </a>
      </div>

      <!-- PDF Pages - Client Only -->
      <ClientOnly>
        <div class="pdf-pages bg-white">
          <component
            :is="VuePDFComponent"
            v-for="page in pages" 
            :key="page"
            :pdf="pdf" 
            :page="page"
            text-layer
            annotation-layer
            class="pdf-page"
          />
        </div>
        <template #fallback>
          <div class="flex items-center justify-center py-20">
            <p class="text-gray-600">Initializing PDF viewer...</p>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-container {
  @apply w-full border border-gray-300 rounded-lg overflow-hidden bg-white;
}

.pdf-pages {
  @apply flex flex-col items-center gap-4 p-4;
  max-height: 1200px;
  overflow-y: auto;
}

.pdf-page {
  @apply shadow-lg border border-gray-200 rounded;
  max-width: 100%;
}

/* Custom scrollbar for better UX */
.pdf-pages::-webkit-scrollbar {
  width: 10px;
}

.pdf-pages::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.pdf-pages::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.pdf-pages::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

<style>
/* Scoped styles for vue-pdf text and annotation layers (only within pdf-viewer-container) */
.pdf-viewer-container .textLayer {
  position: absolute;
  text-align: initial;
  inset: 0;
  overflow: hidden;
  opacity: 1;
  line-height: 1;
  -webkit-text-size-adjust: none;
  -moz-text-size-adjust: none;
  text-size-adjust: none;
  forced-color-adjust: none;
  transform-origin: 0 0;
  z-index: 2;
}

.pdf-viewer-container .textLayer :is(span, br) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}

.pdf-viewer-container .textLayer span.markedContent {
  top: 0;
  height: 0;
}

.pdf-viewer-container .textLayer ::selection {
  background: rgb(0 0 255 / 0.25);
  background: AccentColor;
}

.pdf-viewer-container .annotationLayer {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 3;
}
</style>
