<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  product: Product
}>();

// Computed property for the PDF URL
const pdfUrl = computed(() => {
  const sku = props.product.sku;
  return `https://files.vincor.com/${sku}.pdf`;
});
</script>

<template>
  <!-- Only render the iframe if this component is used, which is controlled by ProductTabs.vue -->
  <iframe class="w-full min-h-[1000px]" :src="pdfUrl" />
</template>

<style scoped>
/* Add any styles specific to this component here */
</style>
