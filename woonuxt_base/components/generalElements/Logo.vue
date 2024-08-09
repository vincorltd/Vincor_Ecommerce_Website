<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const img = useImage();

const logoUrl = runtimeConfig?.public?.LOGO ? img(runtimeConfig?.public?.LOGO) : null;
</script>

<template>
  <NuxtLink to="/">
    <img src="https://vincor.com/wp-content/uploads/vincor_media/Artboard-1-copy-2.png" alt="Logo" class=" h-20 w-56" />
  </NuxtLink>
</template>
