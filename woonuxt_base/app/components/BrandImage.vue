<script setup lang="ts">

const props = defineProps<{
  product: Product
}>()

const brandTag = computed(() => {
  const tag = props.product.productTags?.nodes.find(tag => /^[a-zA-Z]+$/.test(tag.name))?.name || '';
  return tag.toLowerCase();
})

const brandImageUrl = computed(() => brandTag.value ? `/images/brands/${brandTag.value}.png` : '')

/**
 * Link to products page with brand filter active
 * Uses filter format: /products?filter=brand[norsat]
 */
const brandFilterLink = computed(() => `/products?filter=brand[${brandTag.value}]`)

</script>

<template>
  <div v-if="brandTag" class="brand-image-container">
    <span class="flex flex-col gap-2 text-gray-400">
      Manufacture: 
      <NuxtLink 
        :to="brandFilterLink" 
        class="brand-link hover:opacity-80 transition-opacity"
        :title="`View all ${brandTag} products`"
      >
        <img v-if="brandImageUrl" :src="brandImageUrl" :alt="brandTag" class="brand-image" />
        <span v-else class="brand-text hover:text-primary">{{ brandTag }}</span>
      </NuxtLink>
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
  cursor: pointer;
}
.brand-link {
  display: inline-block;
}
.brand-text {
  cursor: pointer;
  text-decoration: underline;
}
</style>
