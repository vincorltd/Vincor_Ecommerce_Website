<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';

const props = defineProps<{
  product: Product
}>();

// Computed property for the direct PDF URL
const pdfUrl = computed(() => {
  const sku = props.product.sku;
  return `https://satchart.com/pdf/${sku}.pdf`;
});

// Use proxy by default to avoid CORS issues and faster loading
const finalPdfUrl = computed(() => {
  // Always use proxy for reliable, fast loading without CORS issues
  return `/api/pdf-proxy?url=${encodeURIComponent(pdfUrl.value)}`;
});

// Client-side only refs (initialized in onMounted)
const pdf = ref<any>(null);
const pages = ref<number[]>([]);
const info = ref<any>(null);
const VuePDFComponent = ref<any>(null);

// Track loading state
const isLoading = ref(true);
const hasError = ref(false);
const errorMessage = ref('');

// Initialize PDF viewer on client-side only
onMounted(async () => {
  // Dynamically import VuePDF only on client-side (SSR compatibility)
  try {
    // Import VuePDF component and usePDF composable
    const { VuePDF, usePDF } = await import('@tato30/vue-pdf');
    
    // Set the component reference
    VuePDFComponent.value = VuePDF;
    
    console.log('[DatasheetTab] Loading PDF:', finalPdfUrl.value);
    
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
        isLoading.value = false;
        hasError.value = false;
      }
    }, { immediate: true });
    
    // Handle case where PDF fails to load (10 second timeout for proxy)
    setTimeout(() => {
      if (!pdf.value && isLoading.value) {
        console.error('[DatasheetTab] ⏱️ PDF load timeout');
        handleError(new Error('PDF load timeout after 10 seconds'));
      }
    }, 10000); // 10 second timeout
    
  } catch (error) {
    console.error('[DatasheetTab] Failed to initialize PDF viewer:', error);
    handleError(error);
  }
});

// Handle PDF load errors
const handleError = (error?: any) => {
  console.error('[DatasheetTab] PDF load error:', error);
  isLoading.value = false;
  hasError.value = true;
  errorMessage.value = 'Unable to load the PDF datasheet. The file may not exist.';
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

    <!-- Error State -->
    <div v-else-if="hasError" class="flex items-center justify-center py-20">
      <div class="text-center max-w-md">
        <svg class="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-gray-600 mb-2">{{ errorMessage }}</p>
        <p class="text-sm text-gray-500">SKU: {{ product.sku }}</p>
        <a 
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
        <div class="flex items-center gap-4">
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
