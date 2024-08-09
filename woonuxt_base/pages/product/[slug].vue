<script lang="ts" setup>
import { StockStatusEnum } from '@/woonuxt_base/types/commonTypes';
const route = useRoute();
const { arraysEqual, formatArray, checkForVariationTypeOfAny } = useHelpers();
const { addToCart, isUpdatingCart } = useCart();
const slug = route.params.slug as string;

const { data } = (await useAsyncGql('getProduct', { slug })) as { data: { value: { product: Product } } };
const product = ref<Product>(data?.value?.product);

const quantity = ref(1);
const activeVariation = ref(null) as Ref<Variation | null>;
const variation = ref([]) as Ref<Variation[]>;
const indexOfTypeAny = [] as number[];
const attrValues = ref();

const type = computed(() => (activeVariation.value ? activeVariation.value : product.value));
const selectProductInput = computed(() => ({ productId: type.value.databaseId, quantity: quantity.value })) as ComputedRef<AddToCartInput>;
const mergeLiveStockStatus = (payload: Product): void => {
  product.value.stockStatus = payload.stockStatus ?? product.value.stockStatus;

  payload.variations?.nodes.forEach((variation: Variation, index: number) => {
    if (product.value.variations?.nodes[index]) {
      // @ts-ignore
      product.value.variations.nodes[index].stockStatus = variation.stockStatus;
    }
  });
};

onMounted(async () => {
  try {
    const { product } = (await GqlGetStockStatus({ slug })) as { product: Product };
    mergeLiveStockStatus(product);
  } catch (error: any) {
    const errorMessage = error?.gqlErrors?.[0].message;
    if (errorMessage) console.error(errorMessage);
  }
  if (product.value.variations) indexOfTypeAny.push(...checkForVariationTypeOfAny(product.value));
});

const updateSelectedVariations = (variations: Attribute[]): void => {
  if (!product.value.variations) return;

  attrValues.value = variations.map((el) => ({ attributeName: el.name, attributeValue: el.value }));
  const cloneArray = JSON.parse(JSON.stringify(variations));
  const getActiveVariation = product.value.variations.nodes.filter((variation: any) => {
    // If there is any variation of type ANY set the value to ''
    if (variation.attributes) {
      indexOfTypeAny.forEach((index) => (cloneArray[index].value = ''));
      return arraysEqual(formatArray(variation.attributes.nodes), formatArray(cloneArray));
    }
  });

  activeVariation.value = getActiveVariation[0];
  selectProductInput.value.variationId = activeVariation.value?.databaseId ?? null;
  selectProductInput.value.variation = activeVariation.value ? attrValues.value : null;
  variation.value = variations;
};

const stockStatus = computed(() => type.value?.stockStatus || StockStatusEnum.OUT_OF_STOCK);
const disabledAddToCart = computed(() => !type.value || stockStatus.value === StockStatusEnum.ON_BACKORDER || isUpdatingCart.value);

const selectedOptions = ref([]) as Ref<ProductAddonOption>;
const regularProductPrice = computed(() => parseInt(type.value.rawRegularPrice));

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

  return addonTotalPrice + regularPrice;
}

function convertData(inputData:any) {
  // valueText is the value used for multipleChoice type, It's a constructed type.
  return inputData.reduce((accumulator, { fieldName, label, valueText }) => {
    const entry =  accumulator.get(fieldName) || { fieldName, value: valueText ? '' : [] };
    if(valueText) {
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
    }
  });
}


function mergeArrayValuesForCheckboxType(selectedAddons:any, allAddons:any) {
    return allAddons.map((addon: any) => ({
        fieldName: addon.fieldName,
        value: (selectedAddons.find((selectedAddon: any) => selectedAddon.fieldName === addon.fieldName) || { value: '' }).value,
    }));
}

</script>

<template>
  <main class="container relative py-6 xl:max-w-7xl" v-if="product">
    <SEOHead :info="product" />
    <Breadcrumb :product="product" class="mb-6" />

    <div class="flex flex-col gap-10 md:flex-row md:justify-between lg:gap-24">
      <ProductImageGallery
        v-if="product.image?.sourceUrl"
        class="relative flex-1"
        :first-image="product.image.sourceUrl"
        :main-image="type.image ? type.image?.sourceUrl || product.image.sourceUrl : '/images/placeholder.jpg'"
        :gallery="product.galleryImages!"
        :node="type" />
      <NuxtImg v-else class="relative flex-1 skeleton" src="/images/placeholder.jpg" :alt="product?.name || 'Product'" />

      <div class="lg:max-w-md xl:max-w-lg md:py-2 w-full">
        <div class="flex justify-between mb-4">
          <div class="flex-1">
            <h1 class="flex flex-wrap items-center gap-2 mb-2 text-2xl font-sesmibold">
              {{ type.name }}
              <WPAdminLink :link="`/wp-admin/post.php?post=${product.databaseId}&action=edit`">Edit</WPAdminLink>
            </h1>
                      </div>
          <ProductPrice class="text-xl" :sale-price="type.salePrice" :regular-price="type.regularPrice" />
        </div>

        <div class="grid gap-2 my-8 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-400">{{ $t('messages.shop.availability') }}: </span>
            <StockStatus :status="stockStatus" @updated="mergeLiveStockStatus" />
          </div>
          <div class="flex items-center gap-2">
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
          <div class="pt-6 flex flex-col" v-if="product.addons">
            <div class="flex flex-col gap-4 pb-4" v-for="(addon, index) in product.addons" :key="index">
              <label>{{ addon.name }}:<span class=" text-base italic text-gray-700 py-2">{{ addon.required ? ' ( Selection Required )' : '' }}</span></label>

              <div v-if="addon.type === 'MULTIPLE_CHOICE'">
                <select class="select select-bordered font-semibold text-base w-full" v-model="selectedOptions[index]" :selected="addon.name" :required="addon.required">
                  <option disabled selected>{{ addon.name }}:</option>
                  <option class="font-semibold text-base" v-for="(option, optionIndex) in getMultipleChoiceTypeOptions(addon)" :key="option.label" :value="option">
                    {{ option.label }} -{{ optionIndex }}
                    <p class="text-red-500" v-if="option.price">(+${{ option.price }})</p>
                  </option>
                </select>

              </div>

              <div v-if="addon.type === 'CHECKBOX'">
                <div v-for="option in addon.options" :key="option.label">
                  <input type="checkbox" v-model="selectedOptions" :value="{...option, fieldName: addon.fieldName, fieldType: addon.type}" class="mr-2" />
                  {{ option.label }}
                  <p class="text-red-500" v-if="option.price">(+${{ option.price }})</p>
                  <label class="flex items-center"> </label>
                </div>
              </div>
            </div>
            <div class="flex flex-col">
              <hr class="" />
              <div v-if="selectedOptions.some((option) => option.price)">
                <div class="my-2">
                  <h2 class="text-base font-bold">Product:</h2>
                  <p class="font-semibold text-base text-gray-700">
                    ({{ quantity }}) - {{ product.name }} - <span class="text-lg text-red-400">{{ `$` + regularProductPrice }}</span>
                  </p>
                  <hr class="my-2" />
                  <div class="flex flex-col gap-2 pt-4">
                    <h2 class="text-base font-bold">Selected Options:</h2>
                    <ul>
                      <li class=" text-gray-700 font-semibold text-base" v-for="(option, index) in selectedOptions" :key="index">{{ option.label }} - <span class="text-red-400">${{ option.price }}</span></li>
                    </ul>
                  </div>
                  <p class="text-base font-bold text-black pt-4" v-if="selectedOptions.some((option) => option.price)">
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
            :attrs="product.attributes.nodes"
            :variations="product.variations.nodes"
            @attrs-changed="updateSelectedVariations" />
          <div class="fixed bottom-0 left-0 z-10 flex items-center w-full gap-4 p-4 mt-12 bg-white md:static md:bg-transparent bg-opacity-90 md:p-0">
            <input
              v-model="quantity"
              type="number"
              min="1"
              aria-label="Quantity"
              class="bg-white border rounded-lg flex text-left p-2.5 w-20 gap-4 items-center justify-center focus:outline-none" />
            <AddToCartButton class="flex-1 w-full md:max-w-xs" :disabled="disabledAddToCart" :class="{ loading: isUpdatingCart }" />
          </div>
        </form>

        <div class="grid gap-2 my-8 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-gray-400">{{ $t('messages.shop.category', 2) }}:</span>
            <div class="product-categories" v-if="product.productCategories">
              <NuxtLink
                v-for="category in product.productCategories.nodes"
                :key="category.slug"
                :to="`/product-category/${decodeURIComponent(category.slug)}`"
                class="hover:text-primary"
                :title="category.name"
                >{{ category.name }}<span class="comma">, </span>
              </NuxtLink>
            </div>
          </div>
        </div>


        <hr />

        <div class="flex flex-wrap gap-4">
          <WishlistButton :product="product" />
        </div>
      </div>
    </div>
    <div v-if="product.description || product.reviews" class="my-32">
      <!-- <ProductTabs :product="product" /> -->
      <!-- <ProductTabs :product-sku="product.sku || ''" /> -->
      <ProductTabs :productSku="product.sku" />
    </div>
    <div class="my-32" v-if="product.related">
      <div class="mb-4 text-xl font-semibold">{{ $t('messages.shop.youMayLike') }}</div>
      <ProductRow :products="product.related.nodes" class="grid-cols-2 md:grid-cols-4 lg:grid-cols-5" />
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
