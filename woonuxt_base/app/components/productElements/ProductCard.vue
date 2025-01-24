<script setup lang="ts">
import { PropType, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppConfig } from '#app'

const route = useRoute();
const { storeSettings } = useAppConfig();
const props = defineProps({
  node: { type: Object as PropType<Product>, required: true },
  index: { type: Number, default: 1 },
});

// example: ?filter=pa_color[green,blue],pa_size[large]
const filterQuery = ref(route.query?.filter as string);
const paColor = ref(filterQuery.value?.split('pa_color[')[1]?.split(']')[0]?.split(',') || []);

// watch filterQuery
watch(
  () => route.query,
  () => {
    filterQuery.value = route.query.filter;
    paColor.value = filterQuery.value?.split('pa_color[')[1]?.split(']')[0]?.split(',') || [];
  },
);

const mainImage = computed<string>(() => props.node?.image?.producCardSourceUrl || props.node?.image?.sourceUrl || '/images/placeholder.jpg');
const imagetoDisplay = computed<string>(() => {
  if (paColor.value.length) {
    const activeColorImage = props.node?.variations?.nodes.filter((variation) => {
      const hasMatchingAttributes = variation.attributes?.nodes.some((attribute) => paColor.value.some((color) => attribute.value.includes(color)));
      const hasMatchingSlug = paColor.value.some((color) => variation.slug?.includes(color));
      return hasMatchingAttributes || hasMatchingSlug;
    });
    if (activeColorImage?.length) return activeColorImage[0].image?.producCardSourceUrl || activeColorImage[0].image?.sourceUrl || mainImage.value;
  }
  return mainImage.value;
});

const imgWidth = 220;
const imgHeight = Math.round(imgWidth * 1); // Make it square 1:1 ratio
</script>

<template>
  <div class="relative group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
    <NuxtLink v-if="node.slug" :to="`/product/${decodeURIComponent(node.slug)}`" :title="node.name">
      <SaleBadge :node="node" class="absolute top-2 right-2 z-10" />
      <div class="relative pt-[100%] w-full overflow-hidden rounded-t-lg bg-gray-50">
        <NuxtImg
          v-if="imagetoDisplay"
          :width="imgWidth"
          :height="imgHeight"
          :src="imagetoDisplay"
          :alt="node.image?.altText || node.name || 'Product image'"
          :title="node.image?.title || node.name"
          :loading="index <= 3 ? 'eager' : 'lazy'"
          :sizes="`sm:${imgWidth / 2}px md:${imgWidth}px`"
          class="absolute inset-0 w-full h-full object-cover"
          placeholder
          placeholder-class="blur-xl"
        />
      </div>
      <div class="p-3">
        <h2 class="mb-2 text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary">{{ node.name }}</h2>
        <ProductPrice class="text-sm font-semibold" :sale-price="node.salePrice" :regular-price="node.regularPrice" />
      </div>
    </NuxtLink>
  </div>
</template>

<style lang="postcss" scoped>
@media (max-width: 768px) {
  .product-card {
    @apply shadow rounded-lg;
  }
}
</style>