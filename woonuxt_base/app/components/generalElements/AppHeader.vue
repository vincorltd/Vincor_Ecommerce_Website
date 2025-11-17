<script setup lang="ts">
const { isShowingSearch } = useSearching();

// Hide header on scroll down, show on scroll up
const isHeaderVisible = ref(true);
let lastScrollY = 0;

const handleScroll = () => {
  if (typeof window === 'undefined') return;
  
  const currentScrollY = window.scrollY;
  
  // Show header if scrolling up or at the top
  if (currentScrollY < lastScrollY || currentScrollY < 10) {
    isHeaderVisible.value = true;
  } 
  // Hide header if scrolling down and past threshold
  else if (currentScrollY > lastScrollY && currentScrollY > 150) {
    isHeaderVisible.value = false;
  }
  
  lastScrollY = currentScrollY;
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <header 
    class="sticky top-0 z-40 bg-[#192551] shadow-sm shadow-light-500 transition-transform duration-300"
    :class="{ '-translate-y-full': !isHeaderVisible }"
  >
    <div class="bg-primary-light py-2 px-4 shadow-md">
      <div class="container flex flex-col sm:flex-row items-center justify-center text-white space-y-2 sm:space-y-0 sm:space-x-4">
        <p class="text-center text-sm font-semibold mb-1">Call us today:</p>
        <div class="flex space-x-4">
          <a class="font-bold text-sm text-blue-200 hover:text-blue-300 transition-colors duration-300 underline" href="tel:+17085340008">+1 (708) 534-0008</a>
          <span class="hidden sm:inline">|</span>
          <a class="font-bold text-sm text-blue-200 hover:text-blue-300 transition-colors duration-300 underline" href="tel:+1882846267">+1 (888) 284-6267</a>
        </div>
      </div>
    </div>
    <div class="container flex items-center justify-between py-4">
      <div class="flex items-center">
        <Logo class="md:w-[160px]" />
      </div>
      <MainMenu class="items-center hidden gap-12 lg:flex lg:px-4 text-base font-bold text-white pt-8 ml-10 md:flex" />
      <div class="flex gap-5 justify-end items-center md:w-[160px] flex-1 ml-auto pt-6">
        <ProductSearch class="hidden sm:inline-flex max-w-[320px] w-[60%]" />
        <SearchTrigger class="pb-2" />
        <NuxtLink to="/wishlist" title="Wishlist" class="flex items-center">
          <Icon class="text-blue-300" name="ion:bookmark-outline" size="20" />
        </NuxtLink>
        <SignInLink class="flex items-center" />
        <CartTrigger class="text-blue-300" />
        <NuxtLink to="https://cloud.vincor.com/" title="Cloud" class="flex items-center">
          <Icon class="text-blue-300" name="ion:cloud-outline" size="22" />
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
</template>