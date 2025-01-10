<script setup>
const { cart, isUpdatingCart } = useCart();
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
        <span class="text-gray-700 tabular-nums" v-html="cart.subtotal" />
      </div>

      <Transition name="scale-y" mode="out-in">
        <div v-if="cart && cart.appliedCoupons" class="flex justify-between">
          <span>{{ $t('messages.shop.discount') }}</span>
          <span class="text-primary tabular-nums">- <span v-html="cart.discountTotal" /></span>
        </div>
      </Transition>
      <div class="flex justify-between mt-4">
        <span>{{ $t('messages.shop.total') }}</span>
        <span class="text-lg font-bold text-gray-700 tabular-nums" v-html="cart.total" />
      </div>
    </div>

    <slot></slot>

    <div v-if="isUpdatingCart" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
      <LoadingIcon />
    </div>
  </aside>
</template>
