<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const img = useImage();

const logoUrl = runtimeConfig?.public?.LOGO ? img(runtimeConfig?.public?.LOGO) : null;
</script>

<template>
  <NuxtLink to="/">
    <img src="https://files.vincor.com/vincor_logo.png" alt="Logo" class=" h-20 w-56" />
  </NuxtLink>
</template>
