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
</script>

<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden product-card">
    <NuxtLink :to="`/product/${decodeURIComponent(node.slug)}`" :title="node.name">
      <SaleBadge :node="node" class="absolute top-2 right-2" />
      <NuxtImg
        v-if="imagetoDisplay"
        :src="imagetoDisplay"
        :alt="node.image?.altText || node.name || 'Product image'"
        :title="node.image?.title || node.name"
        :loading="index <= 3 ? 'eager' : 'lazy'"
        placeholder
        placeholder-class="blur-xl"
        class="w-full h-48 object-cover product-image"
      />
    </NuxtLink>
    <div class="p-4">
      <NuxtLink :to="`/product/${decodeURIComponent(node.slug)}`" :title="node.name">
        <h2 class="text-base font-semibold mb-2">{{ node.name }}</h2>
      </NuxtLink>
      <div class="flex justify-between items-center">
        <ProductPrice class="text-lg font-bold" :sale-price="node.salePrice" :regular-price="node.regularPrice" />
      </div>
    </div>
  </div>
</template>