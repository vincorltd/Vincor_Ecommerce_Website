<script setup lang="ts">
const { wooNuxtVersionInfo } = useHelpers();
const versionInfo = `WooNuxt v${wooNuxtVersionInfo}`;
</script>

<template>
  <footer class="bg-[#192551] order-last border-t-8 border-primary">
    <div class="flex gap-12 my-24">
      <div class="ml-auto">
        <Logo />
        <WebsiteShortDescription />
      </div>
      <div class="flex gap-24 mr-auto">
      <div class="w-4/6 text-white">
        <div class="mb-1 font-semibold">Information</div>
        <div class="text-sm">
          <a class="py-1.5 block" href="/about-us" target="_blank">About Us</a>
          <a href="/" class="py-1.5 block">Our World Map Experience Map</a>
          <a href="/" class="py-1.5 block">Testimonials</a>
          <a href="https://woonuxt.com/faq" class="py-1.5 block" rel="noreferrer" target="_blank">Government Bids/RFQ</a>
        </div>
      </div>
      <div class="w-4/6 text-white">
        <div class="mb-1 font-semibold">Products</div>
        <div class="text-sm">
          <NuxtLink to="/products" class="py-1.5 block">{{ $t('messages.shop.newArrivals') }}</NuxtLink>
          <NuxtLink to="/products?filter=sale[true]" class="py-1.5 block">On sale</NuxtLink>
          <NuxtLink to="/products?orderby=rating&order=ASC&filter=rating[1]" class="py-1.5 block">Top rated</NuxtLink>
        </div>
      </div>
      <div class="w-4/6 text-white">
        <div class="mb-1 font-semibold">{{ $t('messages.general.customerService') }}</div>
        <div class="text-sm">
          <NuxtLink to="/contact" class="py-1.5 block">Contact Us</NuxtLink>
          <a href="/" class="py-1.5 block">Privacy Policy</a>
          <a href="/" class="py-1.5 block">Terms & Conditions</a>
        </div>
      </div>
      <div class="w-4/6 text-white">
        <div class="mb-1 font-semibold">{{ $t('messages.account.myAccount') }}</div>
        <div class="text-sm">
          <NuxtLink to="/my-account/" class="py-1.5 block">{{ $t('messages.account.myAccount') }}</NuxtLink>
          <NuxtLink to="/my-account/?tab=orders" class="py-1.5 block">{{ $t('messages.shop.orderHistory') }}</NuxtLink>
          <NuxtLink to="/wishlist" class="py-1.5 block">{{ $t('messages.shop.wishlist') }}</NuxtLink>
        </div>
      </div>
    </div>
    </div>
    <div class="container border-t flex items-center justify-center mb-4">
      <div class="copywrite">
        <p class="py-4 text-xs text-white text-center">Copyright © 2007-2024 Vincor, Ltd. All Rights Reserved.
        </p>
        <p class="py-4 text-xs text-white text-center">Vincor, Ltd.
5652 W. Monee-Manhattan Road
Monee, IL 60449 U.S.A.
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="postcss">
a {
  @apply hover:underline;
}
</style>
