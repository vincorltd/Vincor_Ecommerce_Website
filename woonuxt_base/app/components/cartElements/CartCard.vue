<script setup>
const { updateItemQuantity } = useCart();
const { addToWishlist } = useWishlist();
const { FALLBACK_IMG } = useHelpers();
const { storeSettings } = useAppConfig();

const { item } = defineProps({
  item: { type: Object, required: true },
});

const productType = computed(() => (item.variation ? item.variation?.node : item.product?.node));
const productSlug = computed(() => `/product/${decodeURIComponent(item.product.node.slug)}`);
const isLowStock = computed(() => (productType.value.stockQuantity ? productType.value.lowStockAmount >= productType.value.stockQuantity : false));
const extraData = JSON.parse(JSON.stringify(item.extraData));
const itemAddons =  computed(() => JSON.parse(extraData ? extraData.find(el => el.key === 'addons').value : []));
const imgScr = computed(() => productType.value.image?.cartSourceUrl || productType.value.image?.sourceUrl || item.product.image?.sourceUrl || FALLBACK_IMG);
const regularPrice = computed(() => parseFloat(productType.value.rawRegularPrice));
const salePrice = computed(() => parseFloat(productType.value.rawSalePrice));
const salePercentage = computed(() => Math.round(((regularPrice.value - salePrice.value) / regularPrice.value) * 100) + '%');

const removeItem = () => {
  updateItemQuantity(item.key, 0);
};

const moveToWishList = () => {
  addToWishlist(item.product.node);
  removeItem();
};

const subtotalPrice = computed(() => {
  const basePrice = parseFloat(productType.value.rawRegularPrice || productType.value.rawSalePrice || 0);
  let addonTotal = 0;
  
  if (itemAddons.value?.length) {
    addonTotal = itemAddons.value.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
  }
  
  const total = (basePrice + addonTotal) * item.quantity;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total);
});
</script>

<template>
  <SwipeCard @remove="removeItem">
    <div v-if="productType" class="flex items-start gap-4 group min-h-[80px] p-2">
      <NuxtLink :to="productSlug" class="shrink-0">
        <NuxtImg
          width="64"
          height="64"
          class="w-16 h-16 rounded-md skeleton"
          :src="imgScr"
          :alt="productType.image?.altText || productType.name"
          :title="productType.image?.title || productType.name"
          loading="lazy" />
      </NuxtLink>
      <div class="flex-1 min-w-0 flex flex-col justify-between h-full space-y-3">
        <div>
          <div class="flex gap-x-2 gap-y-1 flex-wrap items-start mb-2">
            <NuxtLink class="leading-tight break-words pr-2 text-sm font-medium" :to="productSlug">{{ productType.name }}</NuxtLink>
            <span v-if="productType.salePrice" class="text-[10px] border-green-200 leading-none bg-green-100 inline-block p-0.5 rounded text-green-600 border whitespace-nowrap">
              Save {{ salePercentage }}
            </span>
            <span v-if="isLowStock" class="text-[10px] border-yellow-200 leading-none bg-yellow-100 inline-block p-0.5 rounded text-orange-500 border whitespace-nowrap">
              Low Stock
            </span>
          </div>
          <ProductPrice class="mt-1 text-sm font-bold text-red-600" :sale-price="productType.salePrice" :regular-price="productType.regularPrice" />
        </div>
        
        <div v-if="itemAddons && itemAddons.length" class="mt-auto space-y-2">
          <p class="text-xs font-semibold text-gray-600">Addons:</p>
          <ul class="space-y-1.5">
            <li v-for="(addon, index) in itemAddons" 
                :key="index" 
                class="text-xs text-gray-600 flex justify-between items-baseline">
              <span class="break-words flex-1 pr-3">{{ addon.value }}</span>
              <span class="text-red-500 whitespace-nowrap font-medium">${{ addon.price }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="inline-flex gap-3 flex-col items-end shrink-0 ml-3">
        <QuantityInput :item />
        <div class="text-[11px] text-gray-400 group-hover:text-gray-700 flex leading-none items-center">
          <button v-if="storeSettings.showMoveToWishlist" class="mr-2 pr-2 border-r whitespace-nowrap" @click="moveToWishList" type="button">Move to Wishlist</button>
          <button
            title="Remove Item"
            aria-label="Remove Item"
            @click="removeItem"
            type="button"
            class="flex items-center gap-1 hover:text-red-500 cursor-pointer">
            <Icon name="ion:trash" class="hidden md:inline-block" size="12" />
          </button>
        </div>
      </div>
    </div>
  </SwipeCard>
  <div v-if="itemAddons && itemAddons.length" class="mt-1 text-sm font-bold">
    Subtotal: {{ subtotalPrice }}
  </div>
</template>

<style lang="postcss" scoped>
.addon-section {
  max-width: 100%;
}
</style>