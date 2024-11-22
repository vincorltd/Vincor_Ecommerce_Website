<template>
  <div class="mx-auto relative banner-container" @mouseenter="pauseSwiper" @mouseleave="resumeSwiper">
    <swiper
      :modules="[SwiperAutoplay, SwiperEffectFade]"
      :autoplay="{ delay: 3500, disableOnInteraction: false }"
      :effect="'fade'"
      :loop="true"
      class="h-[360px] md:h-[420px] lg:h-[560px] xl:h-[640px]"
      @swiper="onSwiper"
    >
      <swiper-slide v-for="(image, index) in images" :key="index" class="overflow-hidden">
        <img
          :src="image"
          class="object-cover h-full w-full transform transition-transform duration-700 hover:scale-110"
          alt="Hero image"
        />
      </swiper-slide>
    </swiper>
    
    <div class="overlay flex flex-col absolute inset-0 items-start justify-center p-8">
      <h2 class="font-bold text-2xl md:mb-4 lg:text-4xl text-white">{{ tagline }}</h2>
      <NuxtLink 
        class="rounded-xl font-bold bg-blue-600 text-white py-3 px-6 hover:bg-blue-700 transition" 
        to="/products"
      >
        Explore Our Products
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import required Swiper CSS
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/effect-fade';

// Define Swiper modules
const SwiperAutoplay = Autoplay;
const SwiperEffectFade = EffectFade;

// Swiper instance reference
const swiperInstance = ref<SwiperType | null>(null);

const onSwiper = (swiper: SwiperType) => {
  swiperInstance.value = swiper;
};

const pauseSwiper = () => {
  if (swiperInstance.value?.autoplay) {
    swiperInstance.value.autoplay.stop();
  }
};

const resumeSwiper = () => {
  if (swiperInstance.value?.autoplay) {
    swiperInstance.value.autoplay.start();
  }
};

const images = ref([
  '/images/banner/banner1.jpg',
  '/images/banner/banner2.jpg',
  '/images/banner/banner5.jpg',
  '/images/banner/banner6.jpeg',
  '/images/banner/banner8.jpg',
  '/images/banner/banner9.jpg'
]);

const tagline = ref('Innovating Global Connectivity with Advanced SATCOM Solutions');
</script>

<style scoped>
.banner-container {
  overflow: hidden;
}

.overlay {
  background: linear-gradient(to right, rgba(0, 0, 0, 0.5), transparent);
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 2rem;
  pointer-events: none; /* Allows clicking through the overlay to trigger hover on image */
}

.overlay h2,
.overlay a {
  pointer-events: auto; /* Re-enable pointer events for text and button */
}

:deep(.swiper-slide) {
  opacity: 0;
  transition: opacity 0.3s ease;
}

:deep(.swiper-slide-active) {
  opacity: 1;
}

:deep(.swiper-fade .swiper-slide) {
  pointer-events: none;
  transition-property: opacity;
}

:deep(.swiper-fade .swiper-slide-active) {
  pointer-events: auto;
}

/* Smooth zoom transition */
:deep(.swiper-slide) img {
  transform-origin: center;
  backface-visibility: hidden;
  -webkit-font-smoothing: subpixel-antialiased;
}
</style>