<script setup lang="ts">
interface ProductPriceProps {
  regularPrice?: string | null;
  salePrice?: string | null;
}

const { regularPrice, salePrice } = defineProps<ProductPriceProps>();
</script>

<template>
  <div v-if="regularPrice || salePrice" class="flex font-semibold">
    <span :class="{ 'text-gray-400 line-through font-normal': salePrice }" v-html="regularPrice" />
    <span v-if="salePrice" class="ml-2" v-html="salePrice" />
  </div>
  <div v-else class="flex font-semibold">
    View Product Details
  </div>
</template>
