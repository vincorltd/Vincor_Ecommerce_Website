<script setup>
const props = defineProps({
  products: { type: Array, default: null },
});
</script>

<template>
  <div v-if="products" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
    <ProductCard
      v-for="(node, i) in products"
      :key="node.databaseId"
      :node="node"
      :index="i"
      :class="{
        'hidden': i === products.length - 1,
        'lg:block': i === products.length - 1,
      }" />
  </div>
</template>
