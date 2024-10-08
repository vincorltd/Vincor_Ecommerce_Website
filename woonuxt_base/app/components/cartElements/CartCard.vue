<script setup>
const { updateItemQuantity } = useCart();
const { addToWishlist } = useWishlist();
const { fallbackImage } = useHelpers();
const { storeSettings } = useAppConfig();

const { item } = defineProps({
  item: { type: Object, required: true },
});

const productType = computed(() => (item.variation ? item.variation?.node : item.product?.node));
const productSlug = computed(() => `/product/${decodeURIComponent(item.product.node.slug)}`);
const isLowStock = computed(() => (productType.value.stockQuantity ? productType.value.lowStockAmount >= productType.value.stockQuantity : false));

const extraData = JSON.parse(JSON.stringify(item.extraData));
const itemAddons =  computed(() => JSON.parse(extraData ? extraData.find(el => el.key === 'addons').value : []));

const removeItem = () => {
  updateItemQuantity(item.key, 0);
};

const moveToWishList = () => {
  addToWishlist(item.product.node);
  removeItem();
};

const salePercentage = computed(() => {
  const regularPrice = parseFloat(productType.value.regularPrice.replace(/\D/g, ''));
  const salePrice = parseFloat(productType.value.salePrice.replace(/\D/g, ''));
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100) + '%';
});
</script>

<template>
  <SwipeCard @remove="removeItem">
    <div v-if="productType" class="flex items-center gap-3 group">
      <NuxtLink :to="productSlug">
        <NuxtImg
          width="64"
          height="64"
          class="w-16 h-16 rounded-md skeleton"
          :src="productType.image.cartSourceUrl || productType.image.sourceUrl || item.product.image.sourceUrl || fallbackImage"
          :alt="productType.image?.altText || productType.name"
          :title="productType.image?.title || productType.name"
          loading="lazy" />
      </NuxtLink>
      <div class="flex-1">
        <div class="flex gap-x-2 gap-y-1 flex-wrap items-center">
          <NuxtLink class="leading-tight" :to="productSlug">{{ productType.name }}</NuxtLink>
          <span v-if="productType.salePrice" class="text-[10px] border-green-200 leading-none bg-green-100 inline-block p-0.5 rounded text-green-600 border"
            >Save {{ salePercentage }}
          </span>
          <span v-if="isLowStock" class="text-[10px] border-yellow-200 leading-none bg-yellow-100 inline-block p-0.5 rounded text-orange-500 border">Low Stock</span>
        </div>
        <ProductPrice class="mt-1 text-xs" :sale-price="productType.salePrice" :regular-price="productType.regularPrice" />
        <p class=" pt-2 text-sm font-semibold">Addons:</p>
<ul class="item-addons ">
          <li v-for="addon, index in itemAddons" key="index" class="">{{ addon.value }} - ${{ addon.price }}</li>
        </ul>
      </div>
      <div class="inline-flex gap-2 flex-col items-end">
        <QuantityInput :item />
        <div class="text-xs text-gray-400 group-hover:text-gray-700 flex leading-none items-center">
          <button v-if="storeSettings.showMoveToWishlist" class="mr-2 pr-2 border-r" @click="moveToWishList" type="button">Move to Wishlist</button>
          <button title="Remove Item" aria-label="Remove Item" @click="removeItem" type="button" class="flex items-center gap-1 hover:text-red-500 cursor-pointer">
            <Icon name="ion:trash" class="hidden md:inline-block" size="12" />
          </button>
        </div>
      </div>
    </div>
  </SwipeCard>
</template>
<style scoped lang="postcss">
/* always show up and down buttons on number input */
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  opacity: 1;
}

.removeItem {
  @apply hidden md:inline-block;
}

.item-addons {
  font-size: 14px;
  list-style: auto;
  padding-left: 16px;
  padding-top: 16px;
  color: inherit;
  word-break: break-word;
}
</style>