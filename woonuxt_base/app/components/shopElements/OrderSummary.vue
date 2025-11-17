<script setup lang="ts">
const { cart, isUpdatingCart } = useCart();

const hasItems = computed(() => {
  return cart.value?.contents?.nodes?.length > 0;
});

// Format price utility
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

// Parse addons from cart item to calculate prices
const getItemAddons = (item: any): any[] => {
  try {
    if (!item.extraData || !Array.isArray(item.extraData)) return [];
    
    const addonsEntry = item.extraData.find((entry: any) => entry.key === 'addons');
    if (!addonsEntry?.value) return [];
    
    return JSON.parse(addonsEntry.value);
  } catch (error) {
    console.error('[OrderSummary] Error parsing addons:', error);
    return [];
  }
};

// Calculate addons total for an item
const getItemAddonsTotal = (item: any): number => {
  const addons = getItemAddons(item);
  return addons.reduce((total: number, addon: any) => {
    // Ensure price is a number, not a string (prevents string concatenation)
    const price = typeof addon.price === 'string' 
      ? parseFloat(addon.price.replace(/[^0-9.-]+/g, '')) || 0
      : parseFloat(addon.price) || 0;
    return total + price;
  }, 0);
};

// Calculate cart subtotal manually: sum of (base price + addons) * quantity for each item
// NOTE: WooCommerce Store API cart.subtotal doesn't include Product Add-ons prices
const calculateSubtotal = computed(() => {
  if (!cart.value?.contents?.nodes || cart.value.contents.nodes.length === 0) {
    return '$0.00';
  }
  
  let subtotal = 0;
  
  cart.value.contents.nodes.forEach((item: any) => {
    // Get base price
    const productType = item.variation ? item.variation.node : item.product.node;
    const basePrice = parseFloat(productType.rawPrice || productType.rawRegularPrice || '0');
    
    // Get addons total
    const addonsTotal = getItemAddonsTotal(item);
    
    // Calculate line total: (base + addons) * quantity
    const lineTotal = (basePrice + addonsTotal) * item.quantity;
    
    subtotal += lineTotal;
  });
  
  console.log('[OrderSummary] 💰 Subtotal calculated:', {
    subtotal: formatPrice(subtotal),
    wcSubtotal: cart.value.subtotal || 'N/A',
  });
  
  return formatPrice(subtotal);
});

// Calculate total (subtotal - discount)
const calculateTotal = computed(() => {
  if (!cart.value?.contents?.nodes || cart.value.contents.nodes.length === 0) {
    return '$0.00';
  }
  
  // Get subtotal as number
  const subtotalStr = calculateSubtotal.value.replace(/[^0-9.-]+/g, '');
  let total = parseFloat(subtotalStr);
  
  // Subtract discount if any
  if (cart.value.discountTotal) {
    const discountStr = cart.value.discountTotal.replace(/[^0-9.-]+/g, '');
    const discount = parseFloat(discountStr) || 0;
    total -= discount;
  }
  
  return formatPrice(total);
});
</script>

<template>
  <aside v-if="cart" class="bg-white rounded-lg shadow-lg mb-8 w-full min-h-[300px] p-4 sm:p-8 relative md:max-w-sm lg:max-w-xl md:top-36 md:sticky">
    <h2 class="mb-6 text-xl font-semibold leading-none">{{ $t('messages.shop.orderSummary') }}</h2>

    <ul class="flex flex-col gap-12 mb-16 -mr-2 overflow-y-auto">
      <CartCard v-for="item in cart.contents.nodes" :key="item.key" :item />
    </ul>

    

    <div class="grid gap-1 text-sm font-semibold text-gray-500">
      <div class="flex justify-between">
        <span>{{ $t('messages.shop.subtotal') }}</span>
        <span class="text-gray-700 tabular-nums">{{ calculateSubtotal }}</span>
      </div>

      <Transition name="scale-y" mode="out-in">
        <div v-if="cart && cart.appliedCoupons" class="flex justify-between">
          <span>{{ $t('messages.shop.discount') }}</span>
          <span class="text-primary tabular-nums">- <span v-html="cart.discountTotal" /></span>
        </div>
      </Transition>
      <div class="flex justify-between mt-4">
        <span>{{ $t('messages.shop.total') }}</span>
        <span class="text-lg font-bold text-gray-700 tabular-nums">{{ calculateTotal }}</span>
      </div>
    </div>

    <slot v-if="cart.contents?.nodes?.length"></slot>

    <div v-if="isUpdatingCart" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
      <LoadingIcon />
    </div>
  </aside>
</template>
