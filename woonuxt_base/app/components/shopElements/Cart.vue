<script setup lang="ts">
const { cart, toggleCart, isUpdatingCart } = useCart();

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
    console.error('[Cart] Error parsing addons:', error);
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

// Calculate cart total manually: sum of (base price + addons) * quantity for each item
// NOTE: WooCommerce Store API cart.total doesn't include Product Add-ons prices
const calculateCartTotal = computed(() => {
  if (!cart.value?.contents?.nodes || cart.value.contents.nodes.length === 0) {
    console.log('[Cart] 💰 No cart items');
    return 0;
  }
  
  let total = 0;
  
  cart.value.contents.nodes.forEach((item: any) => {
    // Get base price
    const productType = item.variation ? item.variation.node : item.product.node;
    const basePrice = parseFloat(productType.rawPrice || productType.rawRegularPrice || '0');
    
    // Get addons total
    const addonsTotal = getItemAddonsTotal(item);
    
    // Calculate line total: (base + addons) * quantity
    const lineTotal = (basePrice + addonsTotal) * item.quantity;
    
    total += lineTotal;
    
    console.log('[Cart] 📦 Item:', {
      name: item.product.node.name,
      basePrice: formatPrice(basePrice),
      addonsTotal: formatPrice(addonsTotal),
      quantity: item.quantity,
      lineTotal: formatPrice(lineTotal),
    });
  });
  
  console.log('[Cart] 💰 Cart Total:', {
    calculated: formatPrice(total),
    wcTotal: cart.value.rawTotal ? formatPrice(parseFloat(cart.value.rawTotal)) : 'N/A',
    itemCount: cart.value.contents.nodes.length,
  });
  
  return total;
});

const formattedTotal = computed(() => formatPrice(calculateCartTotal.value));
</script>

<template>
  <div class="fixed top-0 bottom-0 right-0 z-50 flex flex-col w-11/12 max-w-lg overflow-x-hidden bg-white shadow-lg">
    <Icon name="ion:close-circle-outline" class="absolute p-1 rounded-lg shadow-lg top-6 left-6 md:left-8 cursor-pointer" size="34" @click="toggleCart(false)" />
    <EmptyCart v-if="cart && !cart.isEmpty" class="rounded-lg shadow-lg p-1.5 hover:bg-red-400 hover:text-white" />

    <div class="mt-8 text-center">
      {{ $t('messages.shop.cart') }}
      <span v-if="cart?.contents?.productCount"> ({{ cart?.contents?.productCount }}) </span>
    </div>

    <ClientOnly>
      <template v-if="cart && !cart.isEmpty">
        <ul class="flex flex-col flex-1 gap-4 p-6 overflow-y-scroll md:p-8">
          <CartCard v-for="item in cart.contents?.nodes" :key="item.key" :item />
        </ul>
        <div class="px-8 mb-8">
          <NuxtLink
            class="block p-3 text-lg text-center text-white bg-gray-800 rounded-lg shadow-md justify-evenly hover:bg-gray-900"
            to="/checkout"
            @click.prevent="toggleCart()">
            <span class="mx-2">{{ $t('messages.shop.checkout') }}</span>
            <span>{{ formattedTotal }}</span>
          </NuxtLink>
        </div>
      </template>
      <!-- Empty Cart Message -->
      <div v-else class="flex flex-col items-center justify-center flex-1 mb-20 text-gray-400">
        <Icon name="ion:cart-outline" size="96" class="opacity-75 mb-5" />
        <div class="mb-2 text-xl font-semibold">{{ $t('messages.shop.cartEmpty') }}</div>
        <span class="mb-8">{{ $t('messages.shop.addProductsInYourCart') }}</span>
        <NuxtLink
          to="/products"
          @click="toggleCart(false)"
          class="flex items-center justify-center gap-3 p-2 px-3 mt-4 font-semibold text-center text-white rounded-lg shadow-md bg-primary hover:bg-primary-dark">
          {{ $t('messages.shop.browseOurProducts') }}
        </NuxtLink>
      </div>
    </ClientOnly>
    <!-- Cart Loading Overlay -->
    <div v-if="isUpdatingCart" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-25">
      <LoadingIcon />
    </div>
  </div>
</template>
