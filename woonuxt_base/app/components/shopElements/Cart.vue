<script setup lang="ts">
const { cart, toggleCart, isUpdatingCart } = useCart();

const calculateCartTotal = computed(() => {
  if (!cart.value?.contents?.nodes) return 0;
  
  return cart.value.contents.nodes.reduce((total, item) => {
    const productType = item.variation ? item.variation.node : item.product.node;
    const basePrice = parseFloat(productType?.rawRegularPrice || productType?.rawSalePrice || '0');
    let addonTotal = 0;
    
    try {
      const extraData = JSON.parse(JSON.stringify(item.extraData));
      const addons = JSON.parse(extraData ? extraData.find(el => el.key === 'addons')?.value || '[]' : '[]');
      addonTotal = addons.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
    } catch (e) {
      console.error('Error parsing addons:', e);
    }
    
    return total + ((basePrice + addonTotal) * item.quantity);
  }, 0);
});

const formattedTotal = computed(() => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(calculateCartTotal.value);
});
</script>

<template>
  <div class="fixed top-0 bottom-0 right-0 z-50 flex flex-col w-11/12 max-w-lg overflow-x-hidden bg-white shadow-lg">
    <Icon name="ion:close-outline" class="absolute p-1 rounded-lg shadow-lg top-6 left-6 md:left-8 cursor-pointer" size="34" @click="toggleCart(false)" />
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
