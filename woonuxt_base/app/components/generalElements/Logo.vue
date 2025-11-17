<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const img = useImage();

const logoUrl = runtimeConfig?.public?.LOGO ? img(runtimeConfig?.public?.LOGO) : 'https://satchart.com/wp-content/uploads/vincor_media/Artboard-1-copy-2.png';
</script>

<template>
  <NuxtLink to="/">
    <img :src="logoUrl" alt="Vincor Logo" class="w-32 lg:w-full" />
  </NuxtLink>
</template>
