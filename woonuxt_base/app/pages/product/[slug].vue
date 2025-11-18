<script lang="ts" setup>
import { StockStatusEnum, ProductTypesEnum, type AddToCartInput } from '#woo';
import type { SelectedAddon } from '~/services/api/types';
import { useProductStore } from '~/stores/product';

const route = useRoute();
const { storeSettings } = useAppConfig();
const { arraysEqual, formatArray, checkForVariationTypeOfAny } = useHelpers();
const { addToCart, isUpdatingCart } = useCart();
const { t } = useI18n();

// Ensure slug is properly decoded
const slug = computed(() => {
  const rawSlug = route.params.slug as string;
  if (!rawSlug) return '';
  // Decode URI component in case it's encoded
  try {
    return decodeURIComponent(rawSlug);
  } catch {
    return rawSlug;
  }
});

// Use Pinia product store (singular) for individual product pages
const productStore = useProductStore();

// Fetch product with TRUE hybrid: SSR first load, then Pinia cache
const { data: productData, pending, error, refresh } = await useAsyncData(
  () => `product-${slug.value}`,
  async () => {
    const currentSlug = slug.value;
    if (!currentSlug) {
      throw createError({ statusCode: 404, message: 'Product slug is required' });
    }
    console.log('[Product Page] 🔄 Loading product:', currentSlug);
    try {
      const product = await productStore.fetchProduct(currentSlug);
      
      if (!product) {
        console.warn('[Product Page] ⚠️ Product not found:', currentSlug);
        // During server-side rendering (including prerendering), return null instead of throwing
        // This allows the build to continue. At runtime, the template will handle the 404 gracefully
        if (process.server) {
          return null;
        }
        // Only throw at client-side runtime (not during SSR/prerender)
        throw createError({ statusCode: 404, message: 'Product not found' });
      }
      
      console.log('[Product Page] ✅ Product loaded:', product.name);
      console.log('[Product Page] 🎁 Add-ons count:', product.addons?.length || 0);
      
      // Debug: Log addon IDs
      if (product.addons && product.addons.length > 0) {
        console.log('[Product Page] 🔍 Add-ons debug:', product.addons.map((a: any) => ({
          id: a.id,
          name: a.name,
          fieldName: a.fieldName,
          type: a.type
        })));
      }
      
      return product;
    } catch (err: any) {
      // During server-side rendering (including prerendering), catch errors and return null
      // This allows the build to continue
      if (process.server) {
        console.warn('[Product Page] ⚠️ Error during SSR/prerender, skipping:', err.message);
        return null;
      }
      // If it's already a createError, rethrow it (only at client-side runtime)
      if (err.statusCode) {
        throw err;
      }
      // Otherwise wrap it (only at client-side runtime)
      throw createError({ statusCode: 404, message: err.message || 'Product not found' });
    }
  },
  {
    server: true,   // SSR/SSG for instant first load
    lazy: false,    // Blocking (wait for data before showing page)
    transform: (result) => result || null,
    watch: [slug],
    getCachedData: (key) => {
      // On client-side navigation, check Pinia cache FIRST
      const cached = productStore.productCache.get(slug.value);
      if (process.client && cached && productStore.isProductCached(slug.value)) {
        console.log('[Product Page] ⚡ Using Pinia cached product (client navigation):', slug.value);
        return cached.product;
      }
      return undefined; // Server-side or cache expired: fetch fresh
    }
  }
);

// Initialize product with SSR data
const product = ref<Product>(productData.value);

// Update product when data changes (for client-side navigation)
watch(productData, (newProduct) => {
  if (newProduct) {
    product.value = newProduct;
  }
}, { immediate: true });

// Handle 404 errors - only throw at client-side runtime, not during SSR/prerendering
// Use watchEffect to reactively handle errors
watchEffect(() => {
  // Skip error handling during server-side rendering
  if (process.server) {
    return;
  }
  
  // Only throw error at client-side runtime if:
  // 1. Fetch is complete (not pending)
  // 2. There's an actual error from the fetch
  // 3. No product data was returned
  if (!pending.value && error.value && !productData.value) {
    // Check if it's a 404 error
    const errorMessage = error.value.message || '';
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw createError({ statusCode: 404, message: 'Product not found' });
    }
  }
});

// Your existing refs and computed properties
const quantity = ref<number>(1);
const activeVariation = ref<Variation | null>(null);
const variation = ref<VariationAttribute[]>([]);
const indexOfTypeAny = computed<number[]>(() => checkForVariationTypeOfAny(product.value));
const attrValues = ref();
const isSimpleProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.SIMPLE);
const isVariableProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.VARIABLE);
const isExternalProduct = computed<boolean>(() => product.value?.type === ProductTypesEnum.EXTERNAL);

const hasNorsatTag = computed(() => {
  return product.value?.productTags?.nodes?.some(tag => tag.name.toLowerCase() === 'norsat');
});

const type = computed(() => activeVariation.value || product.value);
const selectProductInput = computed<any>(() => ({ 
  productId: type.value?.databaseId, 
  quantity: quantity.value 
})) as ComputedRef<AddToCartInput>;

// Merge live stock status
const mergeLiveStockStatus = (payload: Product): void => {
  if (!product.value) return;
  
  product.value.stockStatus = payload.stockStatus ?? product.value?.stockStatus;

  payload.variations?.nodes?.forEach((variation: Variation, index: number) => {
    if (product.value?.variations?.nodes[index]) {
      product.value.variations.nodes[index].stockStatus = variation.stockStatus;
    }
  });
};

// Enhanced onMounted with visibility tracking
onMounted(async () => {
  if (!product.value) return;
  
  // Stock status already included in REST API response
  // No need for separate stock status check like GraphQL
  console.log('[Product Page] ⚡ Product initialized with stock status:', product.value.stockStatus);
  
  if (product.value.variations) {
    indexOfTypeAny.value.push(...checkForVariationTypeOfAny(product.value));
  }
});

// Improved refresh strategy
const refreshProduct = async () => {
  try {
    await refresh();
  } catch (error) {
    console.error('Error refreshing product:', error);
  }
};

// Set up visibility change handler
useVisibilityChange(async (isVisible) => {
  if (isVisible && process.client) {
    await refreshProduct();
  }
});

// Watch for product data changes with improved error handling
watch(productData, (newData) => {
  if (newData) {
    product.value = newData;
  }
}, { deep: true });

// Keep all your existing helper functions
const stockStatus = computed(() => type.value?.stockStatus || StockStatusEnum.OUT_OF_STOCK);
const disabledAddToCart = computed(() => !type.value || stockStatus.value === StockStatusEnum.ON_BACKORDER || isUpdatingCart.value);

const selectedOptions = ref([]) as Ref<ProductAddonOption>;

// Format price as currency string
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

// Get the base product price as a number
const regularProductPrice = computed(() => {
  // Use rawRegularPrice (numeric) or fallback to regularPrice (may have $)
  const rawPrice = type.value?.rawRegularPrice || type.value?.rawPrice || type.value?.regularPrice || type.value?.price || '0';
  
  // Remove any currency symbols and parse to float
  const priceString = typeof rawPrice === 'string' ? rawPrice.replace(/[^0-9.-]+/g, '') : rawPrice.toString();
  const price = parseFloat(priceString);
  
  console.log('[Product Page] 💰 regularProductPrice computed:', {
    typeValue: type.value?.name,
    rawRegularPrice: type.value?.rawRegularPrice,
    rawPrice: type.value?.rawPrice,
    regularPrice: type.value?.regularPrice,
    salePrice: type.value?.salePrice,
    price: type.value?.price,
    selectedRaw: rawPrice,
    priceString: priceString,
    parsed: price,
    typeOf: typeof rawPrice,
  });
  
  if (!price || isNaN(price)) {
    console.error('[Product Page] ❌ Invalid base price! Parsed as:', price, 'from type.value:', type.value);
    return 0;
  }
  
  return Math.round(price * 100) / 100;
});

// Get formatted base product price with currency symbol
const formattedProductPrice = computed(() => formatPrice(regularProductPrice.value));

// Calculate total price of all add-ons as computed property
const addonsTotalPrice = computed(() => {
  let totalPrice = 0;
  for (const selectedOption of selectedOptions.value) {
    // Ensure price is a number, not a string (prevents string concatenation)
    const price = typeof selectedOption.price === 'string' 
      ? parseFloat(selectedOption.price.replace(/[^0-9.-]+/g, '')) || 0
      : parseFloat(selectedOption.price) || 0;
    totalPrice += price;
  }
  return Math.round(totalPrice * 100) / 100;
});

// Helper function for backward compatibility
function calculateAddonTotalPrice(): number {
  return addonsTotalPrice.value;
}

// Calculate subtotal: base product + add-ons (computed for reactivity)
const subtotalPrice = computed(() => {
  // Ensure both values are numbers
  const addonTotal = addonsTotalPrice.value || 0;
  const basePrice = regularProductPrice.value || 0;
  const total = basePrice + addonTotal;
  
  console.log('[Product Page] 🧮 subtotalPrice computed:', {
    basePrice: basePrice,
    addonsTotal: addonTotal,
    subtotal: total,
  });
  
  return Math.round(total * 100) / 100;
});

// Helper function for backward compatibility
function calculateTotalPrice(): number {
  return subtotalPrice.value;
}

// Get formatted total with currency: (base + addons) * quantity
const formattedTotal = computed(() => {
  const subtotal = subtotalPrice.value;
  const qty = quantity.value;
  const total = subtotal * qty;
  
  console.log('[Product Page] 💵 formattedTotal computed:', {
    basePrice: regularProductPrice.value,
    addonsTotal: addonsTotalPrice.value,
    subtotal: subtotal,
    quantity: qty,
    grandTotal: total,
    formatted: formatPrice(total),
  });
  
  return formatPrice(total);
});

// Watch for changes and log pricing details
watch([selectedOptions, quantity], () => {
  const basePrice = regularProductPrice.value;
  const addonsTotal = calculateAddonTotalPrice();
  const total = calculateTotalPrice();
  
  console.log('[Product Page] 💰 Price Breakdown:', {
    basePrice: formatPrice(basePrice),
    addonsTotal: formatPrice(addonsTotal),
    subtotal: formatPrice(total),
    quantity: quantity.value,
    grandTotal: formatPrice(total * quantity.value),
  });
}, { deep: true });

// Validate add-ons selection
function validateAddonsSelection(addons: any[], selected: any[]): { isValid: boolean; error?: string } {
  for (let i = 0; i < addons.length; i++) {
    const addon = addons[i];
    
    // Skip if not required
    if (!addon.required) continue;
    
    // Check if this addon has a selection
    const hasSelection = selected.some((option: any) => {
      // For array items (checkboxes), check if fieldName matches
      if (Array.isArray(selected)) {
        return option?.fieldName === addon.fieldName;
      }
      // For indexed items (radio/select), check the index
      return selected[i] && selected[i] !== addon.name;
    });
    
    if (!hasSelection) {
      return {
        isValid: false,
        error: `Please select an option for "${addon.name}"`
      };
    }
  }
  
  return { isValid: true };
}

// Format add-ons for Store API addons_configuration
// Reference: https://woocommerce.com/document/product-add-ons-rest-api-reference/
function formatAddonsForCart(selected: any[], addons: any[]): Array<{ key: string; value: string }> {
  const formatted: Array<{ key: string; value: string }> = [];
  const addonsArray: any[] = [];
  const processedAddonIds = new Set<string>(); // Track processed addons to prevent duplicates
  
  console.log('[Product Page] 🔍 Formatting addons for cart:', {
    selectedCount: selected.length,
    addonsCount: addons.length,
    selected: selected,
  });
  
  // First, process all checkbox addons (they're stored in a flat array, not indexed)
  addons.forEach((addon) => {
    if (addon.type.toUpperCase() === 'CHECKBOX') {
      // For checkboxes, find all selections with matching fieldName
      const checkboxSelections = Array.isArray(selected) 
        ? selected.filter((s: any) => s?.fieldName === addon.fieldName || s?.fieldName === addon.name)
        : [];
      
      console.log('[Product Page] 🔍 Checkbox addon:', {
        addonName: addon.name,
        fieldName: addon.fieldName,
        foundSelections: checkboxSelections.length,
        selections: checkboxSelections,
      });
      
      checkboxSelections.forEach((item: any) => {
        const checkboxIndex = addon.options.findIndex((opt: any) => opt.label === item.label);
        
        // Ensure price is a number, not a string
        const checkboxPrice = typeof item.price === 'string' 
          ? parseFloat(item.price.replace(/[^0-9.-]+/g, '')) || 0
          : parseFloat(item.price) || 0;
        
        const addonId = (addon.id || addon.fieldName || addon.name).toString();
        const uniqueKey = `${addonId}-${item.label}`;
        
        // Prevent duplicates
        if (!processedAddonIds.has(uniqueKey)) {
          processedAddonIds.add(uniqueKey);
          
          addonsArray.push({
            addonId: addonId,
            fieldName: addon.name, // Use addon name for display
            label: item.label || item.value,
            value: item.label || item.value,
            price: checkboxPrice,
            optionIndex: checkboxIndex >= 0 ? checkboxIndex : 0,
          });
          
          console.log('[Product Page] ✅ Added checkbox addon:', {
            fieldName: addon.name,
            label: item.label,
            price: checkboxPrice,
          });
        }
      });
    }
  });
  
  // Then, process indexed addons (multiple choice, selects, etc.)
  addons.forEach((addon, addonIndex) => {
    // Skip checkboxes (already processed)
    if (addon.type.toUpperCase() === 'CHECKBOX') {
      return;
    }
    
    const selection = selected[addonIndex];
    
    // Skip if no selection or if it's the default placeholder
    if (!selection || selection === addon.name || (typeof selection === 'object' && !selection.label && !selection.value)) {
      return;
    }
    
    // Find the option index for this selection
    let optionIndex = 0;
    if (addon.options && Array.isArray(addon.options)) {
      const foundIndex = addon.options.findIndex((opt: any) => 
        opt.label === (selection.label || selection.value || selection)
      );
      optionIndex = foundIndex >= 0 ? foundIndex : 0;
    }
    
    const addonId = (addon.id || addon.fieldName || addon.name).toString();
    const selectionLabel = selection.label || selection.value || selection;
    const uniqueKey = `${addonId}-${selectionLabel}`;
    
    // Prevent duplicates
    if (processedAddonIds.has(uniqueKey)) {
      console.log('[Product Page] ⚠️ Skipping duplicate addon:', uniqueKey);
      return;
    }
    
    processedAddonIds.add(uniqueKey);
    
    console.log('[Product Page] 🔍 Formatting indexed addon:', {
      addonIndex,
      id: addon.id,
      fieldName: addon.fieldName,
      name: addon.name,
      selection: selectionLabel,
      optionIndex,
      optionsCount: addon.options?.length
    });
    
    // Ensure price is a number, not a string
    const price = typeof selection.price === 'string' 
      ? parseFloat(selection.price.replace(/[^0-9.-]+/g, '')) || 0
      : parseFloat(selection.price) || 0;
    
    addonsArray.push({
      addonId: addonId,
      fieldName: addon.name, // Use addon name for display
      label: selectionLabel,
      value: selectionLabel,
      price: price,
      optionIndex: optionIndex,
    });
    
    console.log('[Product Page] ✅ Added indexed addon:', {
      fieldName: addon.name,
      label: selectionLabel,
      price: price,
    });
  });
  
  console.log('[Product Page] 📦 Final addons array:', addonsArray);
  
  // Add 'addons' key with all add-ons as JSON (includes optionIndex for Store API)
  if (addonsArray.length > 0) {
    formatted.push({
      key: 'addons',
      value: JSON.stringify(addonsArray),
    });
  }
  
  return formatted;
}

// Add to cart handler with REST API add-ons formatting
function handleAddToCart() {
  if (!product.value) return;
  
  console.log('[Product Page] 🛒 Adding to cart...');
  console.log('[Product Page] Selected options:', selectedOptions.value);
  
  // Validate add-ons if product has them
  if (product.value.addons && product.value.addons.length > 0) {
    const validation = validateAddonsSelection(
      product.value.addons,
      selectedOptions.value as any[]
    );
    
    if (!validation.isValid) {
      alert(validation.error || 'Please complete all required options');
      return;
    }
    
    // Format add-ons for cart as extraData
    const extraData = formatAddonsForCart(
      selectedOptions.value as any[],
      product.value.addons
    );
    
    console.log('[Product Page] ✅ Add-ons formatted as extraData:', extraData);
    
    // Add to cart with extraData
    addToCart({
      productId: type.value?.databaseId,
      quantity: quantity.value,
      extraData: extraData,
    } as any);
  } else {
    // No add-ons, simple add to cart
    addToCart({
      productId: type.value?.databaseId,
      quantity: quantity.value,
    } as any);
  }
}

// Helper function for multiple choice options (keeps UI compatibility)
function getMultipleChoiceTypeOptions(addon: any) {
  return addon.options.map((o: any, index) => {
    return {
      ...o,
      valueText: `${o.label}-${index+1}`,
      fieldName: addon.fieldName,
      fieldType: addon.type,
      label: o.label,
      price: parseFloat(o.price) || 0,
    };
  });
}

// Update selected variations
function updateSelectedVariations(attrs: Attribute[]) {
  variation.value = attrs;
  const matchingVariation = product.value?.variations?.nodes.find((variant: Variation) => {
    return arraysEqual(
      formatArray(variant.attributes?.nodes || []),
      formatArray(attrs)
    );
  });
  activeVariation.value = matchingVariation || null;
}

// Add SEO composables
const { public: { siteUrl } } = useRuntimeConfig();

// SEO setup with proper typing
const seo = computed(() => {
  if (!product.value) return null;

  const productName = product.value.name;
  const description = product.value.shortDescription || product.value.description || `Buy ${productName} from our store`;
  const price = type.value?.regularPrice || '';
  const images = [
    product.value.image?.sourceUrl,
    ...(product.value.galleryImages?.nodes?.map(img => img.sourceUrl) || [])
  ].filter(Boolean);

  return {
    title: productName,
    description: description.replace(/(<([^>]+)>)/gi, ''), // Strip HTML tags
    ogTitle: `${productName} - ${price}`,
    ogDescription: description.replace(/(<([^>]+)>)/gi, ''),
    ogImage: images[0],
    twitterCard: 'summary_large_image',
    twitterImage: images[0],
    canonical: `${siteUrl}/product/${product.value.slug}`,
    // Add structured data for product
    schemaOrg: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productName,
      description: description.replace(/(<([^>]+)>)/gi, ''),
      image: images,
      sku: product.value.sku,
      offers: {
        '@type': 'Offer',
        price: type.value?.rawPrice || '',
        priceCurrency: 'USD', // Adjust based on your store currency
        availability: `https://schema.org/${type.value?.stockStatus === 'IN_STOCK' ? 'InStock' : 'OutOfStock'}`,
        url: `${siteUrl}/product/${product.value.slug}`
      },
      ...(product.value.reviews?.nodes?.length && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: product.value.averageRating,
          reviewCount: product.value.reviewCount
        }
      })
    }
  };
});

// Replace existing useHead implementation with enhanced SEO
useHead(() => ({
  title: seo.value?.title,
  link: [
    { rel: 'canonical', href: seo.value?.canonical },
    // Keep existing prefetch links
    ...product.value?.related?.nodes?.map(related => ({
      rel: 'prefetch',
      href: `/product/${related.slug}`,
      as: 'document'
    })) || []
  ]
}));

// Add comprehensive SEO meta tags
useSeoMeta(() => ({
  title: seo.value?.title,
  ogTitle: seo.value?.ogTitle,
  description: seo.value?.description,
  ogDescription: seo.value?.ogDescription,
  ogImage: seo.value?.ogImage,
  twitterCard: seo.value?.twitterCard,
  twitterImage: seo.value?.twitterImage,
  robots: 'index, follow',
}));

// Add JSON-LD structured data
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(seo.value?.schemaOrg)
    }
  ]
}));
</script>


<template>
  <main class="container relative py-6 xl:max-w-7xl">
    <div v-if="product">
      <SEOHead :info="product" />
      <Breadcrumb :product class="mb-6" v-if="storeSettings.showBreadcrumbOnSingleProduct" />

      <div class="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 lg:gap-24">
        <!-- Left Column - Sticky Image Gallery -->
        <div class="md:col-span-5 lg:col-span-6">
          <div class="md:sticky md:top-6 self-start">
            <ProductImageGallery
              v-if="product.image"
              :main-image="product.image"
              :gallery="product.galleryImages!"
              :node="type"
              :activeVariation="activeVariation || {}" />
            <NuxtImg 
              v-else 
              class="skeleton" 
              src="/images/placeholder.jpg" 
              :alt="product?.name || 'Product'" 
            />
          </div>
        </div>

        <!-- Right Column - Scrollable Product Details -->
        <div 
          :key="`details-${product.databaseId}`"
          class="md:col-span-7 lg:col-span-6"
        >
          <!-- Product Header - Amazon Style -->
          <div class="mb-4">
            <h1 class="text-2xl font-normal text-gray-900 leading-snug mb-2">
              {{ type.name }}
            </h1>
            <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <BrandImage :product="product" />
              <span v-if="storeSettings.showSKU">SKU: <span class="text-gray-900">{{ product.sku || 'N/A' }}</span></span>
              <WPAdminLink :link="`/wp-admin/post.php?post=${product.databaseId}&action=edit`" class="text-primary hover:text-primary-dark hover:underline">Edit</WPAdminLink>
            </div>
          </div>

          <hr class="border-gray-300 mb-4" />

          <!-- Price Box - Amazon Style -->
          <div class="bg-white border border-gray-300 rounded p-4 mb-4">
            <div class="flex items-baseline gap-2 mb-2">
              <ProductPrice 
                class="text-3xl" 
                :sale-price="type.salePrice" 
                :regular-price="type.regularPrice" 
              />
            </div>
            <div v-if="hasNorsatTag" class="text-sm text-gray-700 mt-2">
              <p>MSRP: {{ type.regularPrice }}</p>
              <p class="text-red-700 font-semibold">Call for pricing</p>
            </div>
          </div>

          <!-- Product Description -->
          <div class="mb-6">
            <h2 class="text-lg font-bold text-gray-900 mb-2">About this item</h2>
            <div class="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none" v-html="product.shortDescription || product.description" />
          </div>

          <hr class="border-gray-300 mb-6" />

          <form @submit.prevent="handleAddToCart">
            <div class="flex flex-col gap-4" v-if="product.addons && product.addons.length > 0">
              <!-- Configuration Section Header - Amazon Style -->
              <div class="mb-2">
                <h2 class="text-lg font-bold text-gray-900">Product Configuration</h2>
                <p class="text-sm text-gray-600">Select your options below</p>
              </div>
              
              <!-- Addon Sections - Simple Boxes -->
              <div class="border border-gray-300 rounded p-4 bg-white" v-for="(addon, index) in product.addons" :key="index">
                <label class="block text-sm font-bold text-gray-900 mb-1">
                  {{ addon.name }}
                  <span v-if="addon.required" class="ml-2 text-xs font-normal text-red-700">(Required)</span>
                </label>
                
                <!-- Show description if enabled -->
                <p v-if="addon.description_enable && addon.description" class="text-xs text-gray-600 mb-3">
                  {{ addon.description }}
                </p>
                <div v-else class="mb-3"></div>

                <!-- Multiple Choice as SELECT DROPDOWN - Clean Style -->
                <div v-if="addon.type.toUpperCase().replace('_', '').includes('MULTIPLECHOICE') && addon.display === 'select'">
                  <select 
                    class="w-full px-3 py-2 text-sm bg-white border border-gray-400 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    v-model="selectedOptions[index]" 
                    :selected="addon.name" 
                    :required="addon.required"
                  >
                    <option disabled selected :value="addon.name">Select {{ addon.name }}</option>
                    <option 
                      v-for="option in getMultipleChoiceTypeOptions(addon)" 
                      :key="option.label"
                      :value="option"
                    >
                      {{ option.label }}<span v-if="option.price"> (+{{ formatPrice(option.price) }})</span>
                    </option>
                  </select>
                </div>

                <!-- Multiple Choice as RADIO BUTTONS - Clean Style -->
                <div v-if="addon.type.toUpperCase().replace('_', '').includes('MULTIPLECHOICE') && addon.display === 'radiobutton'">
                  <div class="space-y-2">
                    <label 
                      v-for="option in getMultipleChoiceTypeOptions(addon)" 
                      :key="option.label"
                      class="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <div class="flex items-center flex-1">
                        <input 
                          type="radio" 
                          :name="`addon-${addon.id || index}`"
                          v-model="selectedOptions[index]" 
                          :value="option"
                          :required="addon.required"
                          class="w-4 h-4 text-primary border-gray-400 focus:ring-primary" 
                        />
                        <span class="ml-2 text-sm text-gray-900">{{ option.label }}</span>
                      </div>
                      <span v-if="option.price" class="text-sm text-gray-900 ml-4">+{{ formatPrice(option.price) }}</span>
                    </label>
                  </div>
                </div>

                <!-- Checkbox - Clean Style -->
                <div v-if="addon.type.toUpperCase() === 'CHECKBOX'">
                  <div class="space-y-2">
                    <label 
                      v-for="option in addon.options" 
                      :key="option.label"
                      class="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <div class="flex items-center flex-1">
                        <input 
                          type="checkbox" 
                          v-model="selectedOptions" 
                          :value="{...option, fieldName: addon.fieldName, fieldType: addon.type, value: option.label}" 
                          class="w-4 h-4 text-primary border-gray-400 rounded focus:ring-primary" 
                        />
                        <span class="ml-2 text-sm text-gray-900">{{ option.label }}</span>
                      </div>
                      <span v-if="option.price" class="text-sm text-gray-900 ml-4">+{{ formatPrice(parseFloat(option.price) || 0) }}</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Order Summary - Amazon Style -->
              <div class="border border-gray-300 rounded p-4 bg-gray-50 mt-4">
                <h3 class="text-sm font-bold text-gray-900 mb-3">Order Summary</h3>
                
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-700">Base Price:</span>
                    <span class="font-semibold text-gray-900">{{ formattedProductPrice }}</span>
                  </div>
                  
                  <!-- Show selected options if any -->
                  <div v-if="selectedOptions.some((option) => option.price)">
                    <div class="border-t border-gray-300 pt-2 mt-2 mb-2">
                      <div class="font-semibold text-gray-700 mb-2">Configuration:</div>
                      <div v-for="(option, index) in selectedOptions" :key="index" class="flex justify-between mb-1 pl-2">
                        <span class="text-gray-600">{{ option.label }}</span>
                        <span v-if="option.price" class="text-gray-900">+{{ formatPrice(option.price) }}</span>
                      </div>
                    </div>
                    
                    <div class="flex justify-between border-t border-gray-300 pt-2 mt-2">
                      <span class="text-gray-700">Options Total:</span>
                      <span class="font-semibold text-gray-900">{{ formatPrice(calculateAddonTotalPrice()) }}</span>
                    </div>
                  </div>
                  
                  <div class="flex justify-between text-sm pt-2">
                    <span class="text-gray-700">Quantity:</span>
                    <span class="font-semibold text-gray-900">{{ quantity }}</span>
                  </div>
                </div>
                
                <!-- Grand Total -->
                <div v-if="selectedOptions.some((option) => option.price)" class="border-t-2 border-gray-400 mt-3 pt-3">
                  <div class="flex justify-between items-baseline">
                    <span class="text-base font-bold text-gray-900">Order Total:</span>
                    <span class="text-2xl font-bold text-red-700">{{ formattedTotal }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Variations Section - Amazon Style -->
            <div v-if="product.type == 'VARIABLE' && product.attributes && product.variations" class="border border-gray-300 rounded p-4 bg-white mt-4">
              <h3 class="text-sm font-bold text-gray-900 mb-3">Product Variations</h3>
              <AttributeSelections
                :attributes="product.attributes.nodes"
                :defaultAttributes="product.defaultAttributes"
                :variations="product.variations.nodes"
                @attrs-changed="updateSelectedVariations" 
              />
            </div>

            <!-- Add to Cart Section - Vincor Style -->
            <div class="fixed bottom-0 left-0 z-10 flex items-center w-full gap-3 p-4 mt-8 bg-white md:static md:bg-transparent border-t md:border-t-0 md:p-0 shadow-lg md:shadow-none">
              <div class="flex items-center">
                <label class="text-xs text-gray-700 mr-2 font-semibold">Qty:</label>
                <input
                  v-model="quantity"
                  type="number"
                  min="1"
                  aria-label="Quantity"
                  class="w-16 px-2 py-1 text-sm text-center border border-gray-400 rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" 
                />
              </div>
              <AddToCartButton 
                class="flex-1 md:max-w-xs px-6 py-2.5 text-sm font-bold text-white bg-gray-800 hover:bg-gray-900 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400" 
                :disabled="disabledAddToCart" 
                :class="{ loading: isUpdatingCart }" 
              />
            </div>
          </form>

          <!-- Product Information - Clean Style -->
          <div class="mt-8 border-t border-gray-300 pt-6">
            <h3 class="text-base font-bold text-gray-900 mb-3">Product Information</h3>
            
            <div class="text-sm space-y-2">
              <div v-if="storeSettings.showProductCategoriesOnSingleProduct && product.productCategories" class="flex items-start">
                <span class="text-gray-600 w-32">{{ $t('messages.shop.category', 2) }}:</span>
                <div class="flex-1 flex flex-wrap gap-1">
                  <NuxtLink
                    v-for="(category, idx) in product.productCategories.nodes"
                    :key="category.slug"
                    :to="`/product-category/${decodeURIComponent(category.slug)}`"
                    class="text-primary hover:text-primary-dark hover:underline"
                    :title="category.name"
                  >
                    {{ category.name }}<span v-if="idx < product.productCategories.nodes.length - 1">,&nbsp;</span>
                  </NuxtLink>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <WishlistButton :product="product" />
            </div>
          </div>
        </div>
      </div>

      <!-- Product Tabs Section -->
      <div 
        v-if="product.description || product.reviews" 
        class="my-32"
        :key="`tabs-${product.databaseId}`"
      >
        <ProductTabs :productSku="product.sku" :product="product" />
      </div>

      <!-- Related Products Section -->
      <div 
        class="my-32" 
        v-if="product.related && storeSettings.showRelatedProducts"
        :key="`related-${product.databaseId}`"
      >
        <div class="mb-4 text-xl font-semibold">{{ $t('messages.shop.youMayLike') }}</div>
        <ProductRow 
          :products="product.related.nodes" 
          class="grid-cols-2 md:grid-cols-4 lg:grid-cols-5" 
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
input[type='number']::-webkit-inner-spin-button {
  opacity: 1;
}

/* Ensure prose styling doesn't break layout */
.prose {
  max-width: 100%;
}

.prose p {
  margin-bottom: 0.5rem;
}
</style>