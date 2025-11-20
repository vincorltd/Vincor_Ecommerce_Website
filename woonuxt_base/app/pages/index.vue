<script lang="ts" setup>
import { useProductsStore } from '~/stores/products';

const { siteName, description, shortDescription, siteImage } = useAppConfig();
const productsStore = useProductsStore();

// Fetch all data in a single call to reduce memory pressure during build
const { data: homeData } = await useAsyncData(
  'home-data',
  async () => {
    const allProducts = await productsStore.fetchAll();
    
    // Extract categories
    const categoriesMap = new Map();
    allProducts.forEach((product: any) => {
      if (product.productCategories?.nodes) {
        product.productCategories.nodes.forEach((cat: any) => {
          if (!categoriesMap.has(cat.id)) {
            categoriesMap.set(cat.id, cat);
          }
        });
      }
    });
    
    const categories = Array.from(categoriesMap.values()).slice(0, 6);
    
    // Get popular products (sorted by menu order)
    const popular = allProducts
      .filter((p: any) => p.menuOrder !== undefined && p.menuOrder !== null)
      .sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0))
      .slice(0, 5);
    
    // Get featured products
    const featured = allProducts
      .filter((p: any) => p.featured === true)
      .slice(0, 5);
    
    return { categories, popular, featured };
  },
  { 
    server: true,
    lazy: false,
    getCachedData: (key) => {
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        const allProducts = productsStore.allProducts;
        
        const categoriesMap = new Map();
        allProducts.forEach((product: any) => {
          if (product.productCategories?.nodes) {
            product.productCategories.nodes.forEach((cat: any) => {
              if (!categoriesMap.has(cat.id)) {
                categoriesMap.set(cat.id, cat);
              }
            });
          }
        });
        
        return {
          categories: Array.from(categoriesMap.values()).slice(0, 6),
          popular: allProducts
            .filter((p: any) => p.menuOrder !== undefined && p.menuOrder !== null)
            .sort((a: any, b: any) => (a.menuOrder || 0) - (b.menuOrder || 0))
            .slice(0, 5),
          featured: allProducts
            .filter((p: any) => p.featured === true)
            .slice(0, 5)
        };
      }
      return undefined;
    }
  }
);

const productCategories = computed(() => homeData.value?.categories || []);
const popularProducts = computed(() => homeData.value?.popular || []);
const featuredProducts = computed(() => homeData.value?.featured || []);

useSeoMeta({
  title: `Home | Earth Station Antenna Specialists`,
  ogTitle: siteName,
  description: description,
  ogDescription: shortDescription,
  ogImage: siteImage,
  twitterCard: `summary_large_image`,
});
</script>

<template>
  <main>
    <HeroBanner />
    <div class="container my-16">
  <h2 class="text-lg font-semibold md:text-2xl mb-8">Featured Brands:</h2>
  <div class="relative overflow-hidden">
    <div class="brands-carousel">
      <div class="brands-track">
        <template v-for="(group, groupIndex) in 2" :key="groupIndex">
          <NuxtImg 
            v-for="(brand, index) in [
              { src: '/images/brands/ai.png', alt: 'AI' },
              { src: '/images/brands/andrew.png', alt: 'Andrew' },
              { src: '/images/brands/ast.png', alt: 'AST' },
              { src: '/images/brands/atci.png', alt: 'ATCI' },
              { src: '/images/brands/avcom.png', alt: 'Avcom' },
              { src: '/images/brands/belden.png', alt: 'Belden' },
              { src: '/images/brands/blondertongue.png', alt: 'Blonder Tongue' },
              { src: '/images/brands/commscope.png', alt: 'CommScope' },
              { src: '/images/brands/dh.png', alt: 'DH' },
              { src: '/images/brands/eti.png', alt: 'ETI' },
              { src: '/images/brands/kratos.png', alt: 'Kratos' },
              { src: '/images/brands/norsat.png', alt: 'Norsat' },
              { src: '/images/brands/polyphaser.png', alt: 'PolyPhaser' },
              { src: '/images/brands/quintech.png', alt: 'Quintech' },
              { src: '/images/brands/thompson.png', alt: 'Thompson' },
              { src: '/images/brands/thor.png', alt: 'Thor' },
              { src: '/images/brands/times.png', alt: 'Times' },
              { src: '/images/brands/venture.png', alt: 'Venture' },
              { src: '/images/brands/vincor.png', alt: 'Vincor' },
              { src: '/images/brands/walton.png', alt: 'Walton' }
            ]"
            :key="`${groupIndex}-${index}`"
            :src="brand.src"
            :alt="brand.alt"
            width="1280"
            height="720"
            class="brand-logo"
          />
        </template>
      </div>
    </div>
  </div>
</div>


    <section class="container mx-auto my-16 px-4" v-if="popularProducts">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Popular Products</h2>
        <NuxtLink class="text-blue-600 hover:underline" to="/products">{{ $t('messages.general.viewAll') }}</NuxtLink>
      </div>
      <ProductRow :products="popularProducts" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" />
    </section>

    <section class="container mx-auto my-16 px-4" v-if="featuredProducts?.length">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Featured Products</h2>
        <NuxtLink class="text-blue-600 hover:underline" to="/products">{{ $t('messages.general.viewAll') }}</NuxtLink>
      </div>
      <ProductRow :products="featuredProducts" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" />
    </section>
  </main>
</template>

<style scoped>
.brands-carousel {
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 20px 0;
}

.brands-track {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  width: max-content;
  animation: scroll 60s linear infinite;
}

.brand-logo {
  width: 150px; /* Set a fixed width */
  height: 100px; /* Set a fixed height */
   /* Ensure the image fits within the container */
  object-position: center;
  transition: transform 0.3s ease;
  padding: 10px;
  flex-shrink: 0;
}

.brand-logo:hover {
  transform: scale(1.1);
}

@keyframes scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.brands-carousel:hover .brands-track {
  animation-play-state: paused;
}
</style>