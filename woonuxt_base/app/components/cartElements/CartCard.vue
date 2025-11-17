<script setup lang="ts">
const { updateItemQuantity, removeItem: removeCartItem } = useCart();
const { addToWishlist } = useWishlist();
const { FALLBACK_IMG } = useHelpers();
const { storeSettings } = useAppConfig();

const { item } = defineProps({
  item: { type: Object, required: true },
});

const productType = computed(() => (item.variation ? item.variation?.node : item.product?.node));
const productSlug = computed(() => `/product/${decodeURIComponent(item.product.node.slug)}`);
const isLowStock = computed(() => (productType.value.stockQuantity ? productType.value.lowStockAmount >= productType.value.stockQuantity : false));

// Format price utility
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

// Parse add-ons from extraData
const itemAddons = computed(() => {
  try {
    if (!item.extraData || !Array.isArray(item.extraData)) {
      console.log('[CartCard] No extraData for item:', item.product.node.name);
      return [];
    }
    
    const addonsEntry = item.extraData.find(entry => entry.key === 'addons');
    if (!addonsEntry?.value) {
      console.log('[CartCard] No addons entry for item:', item.product.node.name);
      return [];
    }
    
    const parsed = JSON.parse(addonsEntry.value);
    console.log('[CartCard] ✅ Parsed add-ons for', item.product.node.name, ':', parsed);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[CartCard] ❌ Error parsing add-ons:', e);
    return [];
  }
});

const imgScr = computed(() => productType.value.image?.cartSourceUrl || productType.value.image?.sourceUrl || item.product.image?.sourceUrl || FALLBACK_IMG);

// Get base product price (unit price)
const baseUnitPrice = computed(() => {
  const rawPrice = parseFloat(productType.value.rawRegularPrice || productType.value.rawSalePrice || productType.value.rawPrice || '0');
  console.log('[CartCard] Base unit price for', item.product.node.name, ':', rawPrice);
  return rawPrice;
});

// Calculate add-ons total
const addonsTotal = computed(() => {
  return itemAddons.value.reduce((total, addon) => total + (parseFloat(addon.price) || 0), 0);
});

// Get formatted base price
const formattedBasePrice = computed(() => formatPrice(baseUnitPrice.value));

// Calculate regular price and sale price for sale badge
const regularPrice = computed(() => parseFloat(productType.value.rawRegularPrice || '0'));
const salePrice = computed(() => parseFloat(productType.value.rawSalePrice || '0'));
const salePercentage = computed(() => {
  if (!salePrice.value || salePrice.value >= regularPrice.value) return '0%';
  return Math.round(((regularPrice.value - salePrice.value) / regularPrice.value) * 100) + '%';
});

const removeItem = () => {
  removeCartItem(item.key);
};

const moveToWishList = () => {
  addToWishlist(item.product.node);
  removeItem();
};

// Calculate line total: (base price + add-ons) * quantity
// NOTE: WooCommerce Store API line_total doesn't include Product Add-ons prices
// We need to calculate manually: (base + addons) * quantity
const subtotalPrice = computed(() => {
  // Get base unit price
  const basePrice = baseUnitPrice.value;
  
  // Get addons total
  const addonsPrice = addonsTotal.value;
  
  // Calculate: (base + addons) * quantity
  const lineTotal = (basePrice + addonsPrice) * item.quantity;
  
  console.log('[CartCard] 💰 Line total calculation for', item.product.node.name, ':', {
    basePrice: formatPrice(basePrice),
    addonsPrice: formatPrice(addonsPrice),
    subtotal: formatPrice(basePrice + addonsPrice),
    quantity: item.quantity,
    lineTotal: formatPrice(lineTotal),
    // Also log what WooCommerce thinks (for comparison)
    wcLineTotal: item.totals?.line_total ? formatPrice(parseFloat(item.totals.line_total) / 100) : 'N/A',
  });
  
  return formatPrice(lineTotal);
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
            <span v-if="salePrice > 0 && salePrice < regularPrice" class="text-[10px] border-green-200 leading-none bg-green-100 inline-block p-0.5 rounded text-green-600 border whitespace-nowrap">
              Save {{ salePercentage }}
            </span>
            <span v-if="isLowStock" class="text-[10px] border-yellow-200 leading-none bg-yellow-100 inline-block p-0.5 rounded text-orange-500 border whitespace-nowrap">
              Low Stock
            </span>
          </div>
          <div class="mt-1 text-sm">
            <p class="font-semibold text-gray-700">
              Base Price: <span class="text-red-600 font-bold">{{ formattedBasePrice }}</span>
            </p>
          </div>
        </div>
        
        <div v-if="itemAddons && itemAddons.length" class="space-y-2">
          <p class="text-xs font-semibold text-gray-600">Selected Options:</p>
          <ul class="space-y-1.5">
            <li v-for="(addon, index) in itemAddons" 
                :key="index" 
                class="text-xs text-gray-700 flex justify-between items-baseline">
              <span class="break-words flex-1 pr-3">
                <span class="font-medium">{{ addon.fieldName }}:</span> {{ addon.label || addon.value }}
              </span>
              <span v-if="addon.price > 0" class="text-red-600 whitespace-nowrap font-medium">{{ formatPrice(addon.price) }}</span>
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
  <div class="mt-2 px-2 py-1 bg-gray-50 rounded-md">
    <div class="flex justify-between items-center text-sm">
      <span class="font-semibold text-gray-700">Line Total (x{{ item.quantity }}):</span>
      <span class="font-bold text-red-600">{{ subtotalPrice }}</span>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.addon-section {
  max-width: 100%;
}
</style>