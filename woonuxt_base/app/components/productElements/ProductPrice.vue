<script setup lang="ts">
interface ProductPriceProps {
  regularPrice?: string | null;
  salePrice?: string | null;
}

const { regularPrice, salePrice } = defineProps<ProductPriceProps>();
</script>

<template>
  <div v-if="regularPrice || salePrice" class="flex font-bold items-center">
    <span :class="{ 'text-gray-400 line-through font-normal text-sm mr-1': salePrice }" v-html="regularPrice" />
    <span v-if="salePrice" class="text-red-600" v-html="salePrice" />
  </div>
  <div v-else class="text-primary font-medium text-sm hover:underline">
    View Product Details
  </div>
</template>
