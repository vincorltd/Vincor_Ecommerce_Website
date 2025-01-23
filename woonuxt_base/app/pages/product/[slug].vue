<script lang="ts" setup>
import { StockStatusEnum, ProductTypesEnum, type AddToCartInput } from '#woo';

const route = useRoute();
const { storeSettings } = useAppConfig();
const { arraysEqual, formatArray, checkForVariationTypeOfAny } = useHelpers();
const { addToCart, isUpdatingCart } = useCart();
const { t } = useI18n();
const slug = route.params.slug as string;

// Improved data fetching strategy
const { data: productData, pending, error, refresh } = await useAsyncData(
  `product-${slug}`,
  async () => {
    const { data } = await useAsyncGql('getProduct', { slug });
    return data?.value?.product;
  },
  {
    server: true,
    immediate: true,
    transform: (result) => result || null,
    watch: [route],
    refreshOnReconnect: true,
  }
);

// Initialize product with SSR data
const product = ref<Product>(productData.value);

// Move 404 handling after data is ready
watchEffect(() => {
  if (!pending.value && !productData.value) {
    throw createError({ statusCode: 404, message: 'Product not found' });
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
  
  try {
    const { product: stockProduct } = await GqlGetStockStatus({ slug });
    if (stockProduct) mergeLiveStockStatus(stockProduct as Product);
  } catch (error: any) {
    const errorMessage = error?.gqlErrors?.[0].message;
    if (errorMessage) console.error(errorMessage);
  }
  
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
const regularProductPrice = computed(() => {
  const price = parseFloat(type.value?.rawRegularPrice || '0');
  return Math.round(price * 100) / 100;
});

function calculateAddonTotalPrice() {
  let totalPrice = 0;
  for (const selectedOption of selectedOptions.value) {
    totalPrice += selectedOption.price;
  }
  return totalPrice;
}

function calculateTotalPrice() {
  const addonTotalPrice = calculateAddonTotalPrice();
  const regularPrice = regularProductPrice.value || 0;
  const totalPrice = addonTotalPrice + regularPrice;
  return Math.round(totalPrice * 100) / 100;
}

function convertData(inputData: any) {
  return inputData.reduce((accumulator, { fieldName, label, valueText }) => {
    const entry = accumulator.get(fieldName) || { fieldName, value: valueText ? '' : [] };
    if (valueText) {
      entry.value = valueText;
    } else {
      entry.value.push(valueText ? valueText : label);
    }
    accumulator.set(fieldName, entry);
    return accumulator;
  }, new Map()).values();
}

function getMultipleChoiceTypeOptions(addon: any) {
  return addon.options.map((o: any, index) => {
    return {
      ...o,
      valueText: `${o.label}-${index+1}`,
      fieldName: addon.fieldName,
      fieldType: addon.type
    };
  });
}

function mergeArrayValuesForCheckboxType(selectedAddons: any, allAddons: any) {
  return allAddons.map((addon: any) => ({
    fieldName: addon.fieldName,
    value: (selectedAddons.find((selectedAddon: any) => 
      selectedAddon.fieldName === addon.fieldName
    ) || { value: '' }).value,
  }));
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

      <div class="flex flex-col gap-10 md:flex-row md:justify-between lg:gap-24">
        <ProductImageGallery
          v-if="product.image"
          class="relative flex-1"
          :main-image="product.image"
          :gallery="product.galleryImages!"
          :node="type"
          :activeVariation="activeVariation || {}" />
        <NuxtImg 
          v-else 
          class="relative flex-1 skeleton" 
          src="/images/placeholder.jpg" 
          :alt="product?.name || 'Product'" 
        />

        <div 
          :key="`details-${product.databaseId}`"
          class="lg:max-w-md xl:max-w-lg md:py-2 w-full"
        >
          <div class="flex justify-between">
            <div class="flex-1">
              <h1 class="flex flex-wrap items-center gap-2 text-2xl font-semibold">
                {{ type.name }}
                <WPAdminLink :link="`/wp-admin/post.php?post=${product.databaseId}&action=edit`">Edit</WPAdminLink>
              </h1>
            </div>
            <ProductPrice 
              class="text-xl" 
              :sale-price="type.salePrice" 
              :regular-price="type.regularPrice" 
            />
          </div>

          <div class="grid gap-2 text-sm">
            <BrandImage class="mb-2" :product="product" />
            <div v-if="hasNorsatTag">
              <p class="text-base font-semibold">MSRP: {{ type.regularPrice }}</p>
              <p class="text-base text-red-600 font-semibold">Sale Price: Call for pricing</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-gray-400">{{ $t('messages.shop.availability') }}: </span>
              <StockStatus :stockStatus @updated="mergeLiveStockStatus" />
            </div>
            <div class="flex items-center gap-2" v-if="storeSettings.showSKU">
              <span class="text-gray-400">{{ $t('messages.shop.sku') }}: </span>
              <span>{{ product.sku || 'N/A' }}</span>
            </div>
          </div>

          <div class="mb-8 font-light prose" v-html="product.shortDescription || product.description" />

          <hr />

          <form @submit.prevent="{
              const addons = [...convertData(JSON.parse(JSON.stringify(selectedOptions)))];
              const addonsWithCheckBoxType = mergeArrayValuesForCheckboxType(addons, JSON.parse(JSON.stringify(product.addons)));
              addToCart({...selectProductInput, addons: addonsWithCheckBoxType });
            }">
            <div class="pt-6 flex flex-col" v-if="product.addons && product.addons.length > 0">
              <div class="flex flex-col gap-4 pb-4" v-for="(addon, index) in product.addons" :key="index">
                <label>{{ addon.name }}:<span class="text-base italic text-gray-700 py-2">{{ addon.required ? ' ( Selection Required )' : '' }}</span></label>

                <div v-if="addon.type === 'MULTIPLE_CHOICE'">
                  <select 
                    class="select select-bordered font-semibold text-base w-full" 
                    v-model="selectedOptions[index]" 
                    :selected="addon.name" 
                    :required="addon.required"
                  >
                    <option disabled selected>{{ addon.name }}:</option>
                    <option 
                      class="font-semibold text-base" 
                      v-for="(option, optionIndex) in getMultipleChoiceTypeOptions(addon)" 
                      :key="option.label" 
                      :value="option"
                    >
                      {{ option.label }} -{{ optionIndex }}
                      <p class="text-red-500" v-if="option.price">(+${{ option.price }})</p>
                    </option>
                  </select>
                </div>

                <div v-if="addon.type === 'CHECKBOX'">
                  <div v-for="option in addon.options" :key="option.label">
                    <input 
                      type="checkbox" 
                      v-model="selectedOptions" 
                      :value="{...option, fieldName: addon.fieldName, fieldType: addon.type}" 
                      class="mr-2" 
                    />
                    {{ option.label }}
                    <p class="text-red-500" v-if="option.price">(+${{ option.price }})</p>
                    <label class="flex items-center"> </label>
                  </div>
                </div>
              </div>

              <div class="flex flex-col">
                <hr />
                <div v-if="selectedOptions.some((option) => option.price)">
                  <div class="my-2">
                    <h2 class="text-base font-bold">Product:</h2>
                    <p class="font-semibold text-base text-gray-700">
                      ({{ quantity }}) - {{ product.name }} 
                      <span v-if="regularProductPrice && !isNaN(regularProductPrice)">
                        - <span class="text-lg text-red-400">{{ `$` + regularProductPrice }}</span>
                      </span>
                    </p>
                    <hr class="my-2" />
                    <div class="flex flex-col gap-2 pt-4">
                      <h2 class="text-base font-bold">Selected Options:</h2>
                      <ul>
                        <li 
                          class="text-gray-700 font-semibold text-base" 
                          v-for="(option, index) in selectedOptions" 
                          :key="index"
                        >
                          {{ option.label }}
                          <span v-if="option.price" class="text-red-400"> - ${{ option.price }}</span>
                        </li>
                      </ul>
                    </div>
                    <p 
                      class="text-base font-bold text-black pt-4" 
                      v-if="selectedOptions.some((option) => option.price)"
                    >
                      Total Selected Options: <span class="text-red-600">${{ calculateAddonTotalPrice() }}</span>
                    </p>
                  </div>
                </div>
                <div v-if="selectedOptions.some((option) => option.price)">
                  <hr class="my-4" />
                  <p class="font-bold text-xl text-red-600 text-right">Total: ${{ calculateTotalPrice() * quantity }}</p>
                  <hr class="my-4" />
                </div>
              </div>
            </div>

            <AttributeSelections
              v-if="product.type == 'VARIABLE' && product.attributes && product.variations"
              class="mt-4 mb-8"
              :attributes="product.attributes.nodes"
              :defaultAttributes="product.defaultAttributes"
              :variations="product.variations.nodes"
              @attrs-changed="updateSelectedVariations" 
            />

            <div class="fixed bottom-0 left-0 z-10 flex items-center w-full gap-4 p-4 mt-12 bg-white md:static md:bg-transparent bg-opacity-90 md:p-0">
              <input
                v-model="quantity"
                type="number"
                min="1"
                aria-label="Quantity"
                class="bg-white border rounded-lg flex text-left p-2.5 w-20 gap-4 items-center justify-center focus:outline-none" 
              />
              <AddToCartButton 
                class="flex-1 w-full md:max-w-xs" 
                :disabled="disabledAddToCart" 
                :class="{ loading: isUpdatingCart }" 
              />
            </div>
          </form>

          <div v-if="storeSettings.showProductCategoriesOnSingleProduct && product.productCategories">
            <div class="grid gap-2 my-8 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-gray-400">{{ $t('messages.shop.category', 2) }}:</span>
                <div class="product-categories">
                  <NuxtLink
                    v-for="category in product.productCategories.nodes"
                    :key="category.slug"
                    :to="`/product-category/${decodeURIComponent(category.slug)}`"
                    class="hover:text-primary"
                    :title="category.name"
                  >
                    {{ category.name }}<span class="comma">, </span>
                  </NuxtLink>
                </div>
              </div>
            </div>
            <hr />
          </div>

          <div class="flex flex-wrap gap-4">
            <WishlistButton :product="product" />
          </div>
        </div>
      </div>

      <div 
        v-if="product.description || product.reviews" 
        class="my-32"
        :key="`tabs-${product.databaseId}`"
      >
        <ProductTabs :productSku="product.sku" :product="product" />
      </div>

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
.product-categories > a:last-child .comma {
  display: none;
}

input[type='number']::-webkit-inner-spin-button {
  opacity: 1;
}
</style>