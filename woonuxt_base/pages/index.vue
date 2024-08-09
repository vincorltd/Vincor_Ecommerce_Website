<script lang="ts" setup>
const { data } = await useAsyncGql('getProductCategories', { first: 6 });
const productCategories = data.value?.productCategories?.nodes || [];
const { setProducts, updateProductList } = useProducts();
const { data: featuredProductsData } = await useAsyncGql('getProducts', { first: 6 }); 

useSeoMeta({
  title: `Home`,
  ogTitle: `Vincor Ltd.`,
  description: `This is an example of a WooNuxt store. It provides a modern, fast, and SEO friendly ecommerce store built with Nuxt and WooCommerce.`,
  ogDescription: `This is an example of a WooNuxt store. It provides a modern, fast, and SEO friendly ecommerce store built with Nuxt and WooCommerce.`,
  ogImage: `https://user-images.githubusercontent.com/5116925/218879668-f4c1f9fd-bef4-44b0-bc7f-e87d994aa3a1.png`,
  twitterCard: `summary_large_image`,
});
</script>

<template>
  <main>
    <HeroBanner />
<div class="container my-16">

      <h2 class="text-lg font-semibold md:text-2xl">Featured Brands:</h2>
    <div class="container flex flex-wrap items-center justify-center gap-8 my-16 text-center brand lg:justify-between">
    
      <NuxtImg src="/images/brands/norsat.png" alt="Brand 1" width="200" height="35" />
      <NuxtImg src="/images/brands/eti.png" alt="Brand 2" width="80" height="30" />
      <NuxtImg src="/images/brands/andrew.png" alt="Brand 3" width="175" height="48" />
      <NuxtImg src="/images/brands/venture.png" alt="Brand 4" width="200" height="30" />
      <NuxtImg src="/images/brands/quintech.png" alt="Brand 5" width="200" height="44" />
      <NuxtImg src="/images/brands/dh.png" alt="Brand 6" width="65" height="40" />


</div>
    </div>
    <section class="container my-16">
      <div class="flex items-end justify-between">
        <h2 class="text-lg font-semibold md:text-2xl">{{ $t('messages.shop.shopByCategory') }}</h2>
        <NuxtLink class="text-primary" to="/categories">{{ $t('messages.general.viewAll') }}</NuxtLink>
      </div>
      <div class="grid justify-center grid-cols-2 gap-4 mt-8 md:grid-cols-3 lg:grid-cols-6">
        <CategoryCard v-for="(category, i) in productCategories" :key="i" class="w-full" :node="category" />
      </div>

    </section>


    <section class="container my-16">

    </section>



    
  </main>
</template>

<style scoped>
.brand img {
  max-height: min(8vw, 120px);
  object-fit: contain;
  object-position: center;
}
</style>
