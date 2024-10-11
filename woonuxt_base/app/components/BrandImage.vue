<script setup lang="ts">
const props = defineProps<{
  product: Product
}>()

const brandTag = computed(() => {
  const tag = props.product.productTags?.nodes.find(tag => /^[a-zA-Z]+$/.test(tag.name))?.name || '';
  return tag;
})

const brandImageUrl = computed(() => {
  return `/images/brands/${brandTag.value.toLowerCase()}.png`
})
</script>

<template>
  <div v-if="brandTag" class="brand-image-container">
    <span class="flex flex-col gap-2 text-gray-400" v-if="brandImageUrl">
      Manufacture: <img :src="brandImageUrl" :alt="brandTag" class="brand-image" />
    </span>
    <span v-else>
      Manufacture: {{ brandTag }}
    </span>
    
  </div>
</template>

<style scoped>
.brand-image-container {
  max-width: 120px;
  margin-top: 8px;
}
.brand-image {
  width: 100%;
  height: auto;
}
</style>
