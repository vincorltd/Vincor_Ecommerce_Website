<script setup lang="ts">
const { isShowingSearch } = useSearching();
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#192551] shadow-sm shadow-light-500">
    <div class="container flex items-center justify-between py-4">
      <div class="flex items-center">
        <Logo class="md:w-[160px]" />
      </div>
      <MainMenu class="items-center hidden gap-12 lg:flex lg:px-4 text-base font-bold text-white pt-8 ml-10 md:flex" />
      <div class="flex gap-5 justify-end items-center md:w-[160px] flex-1 ml-auto pt-6">
        <ProductSearch class="hidden sm:inline-flex max-w-[320px] w-[60%]" />
        <SearchTrigger class="pb-2 " />
        <NuxtLink to="/wishlist" title="Wishlist">
          <Icon class="text-blue-300" name="ion:bookmark-outline" size="20" />
        </NuxtLink>
        <CartTrigger class="text-blue-300 pb-2" />
        <NuxtLink to="https://cloud.vincor.com/" title="Wishlist">
          <Icon class="text-blue-300" name="ion:cloud-outline" size="20" />
        </NuxtLink>
        <MenuTrigger class="lg:hidden" />
      </div>
    </div>
    <Transition name="scale-y" mode="out-in">
      <div class="container mb-3 -mt-1 sm:hidden" v-if="isShowingSearch">
        <ProductSearch class="flex w-full" />
      </div>
    </Transition>
  </header>
  <div class="bg-primary-light py-2 px-4 rounded-b-lg shadow-md">
    <p class="text-center text-sm font-semibold text-white mb-1">Call us today:</p>
    <div class="text-white text-center space-x-4">
      <a class="font-bold text-sm text-blue-200 hover:text-blue-300 transition-colors duration-300 underline" href="tel:+17085340008">+1 (708) 534-0008</a>
      <span>|</span>
      <a class="font-bold text-sm text-blue-200 hover:text-blue-300 transition-colors duration-300 underline" href="tel:+1882846267">+1 (888) 284-6267</a>
    </div>
  </div>
</template>
