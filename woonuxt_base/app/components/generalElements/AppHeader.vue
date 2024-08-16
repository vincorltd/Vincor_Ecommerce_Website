<script setup lang="ts">
const { isShowingSearch } = useSearching();
</script>

<template>
  <header class="sticky top-0 z-40 bg-[#192551] shadow-sm shadow-light-500 ">
    <div class="container flex items-center justify-between py-4">
      <div class="flex items-center">
        <MenuTrigger class="lg:hidden" />
        <Logo class="md:w-[160px]" />
      </div>
      <MainMenu class="items-center hidden gap-12 lg:flex lg:px-4 text-base font-bold text-white pt-8 ml-10 md:flex " />
      <div class="flex gap-4 justify-end items-center md:w-[160px] flex-1 ml-auto pt-6">
        <ProductSearch class="hidden sm:inline-flex max-w-[320px] w-[60%]" />
        <SearchTrigger />
        <NuxtLink to="/wishlist" title="Wishlist">
          <Icon class="text-white" name="ion:bookmark-outline" size="20" />
        </NuxtLink>
        <SignInLink class="text-white" />
        <CartTrigger class="text-white" />
        <NuxtLink to="https://cloud.vincor.com/" title="Wishlist">
          <Icon class="text-white" name="ion:cloud-outline" size="20" />
        </NuxtLink>
      </div>
    </div>
    <Transition name="scale-y" mode="out-in">
      <div class="container mb-3 -mt-1 sm:hidden" v-if="isShowingSearch">
        <ProductSearch class="flex w-full" />
      </div>
    </Transition>
  </header>
<div class=" bg-primary-light">
    <p class=" text-right font-semibold text-white pr-6">Call us today:  <a class="font-bold text-blue-200" href=”callto://+17085340008″>+1 (708) 534-0008</a>

|  <a class="font-bold text-blue-200" href=”callto://+1882846267″>+1(888) 284-6267</a>
</p>
</div>
</template>
