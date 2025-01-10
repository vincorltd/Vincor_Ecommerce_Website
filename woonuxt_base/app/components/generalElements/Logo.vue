<script setup lang="ts">
const { siteName } = useAppConfig();
const runtimeConfig = useRuntimeConfig();
const img = useImage();

const logoUrl = runtimeConfig?.public?.LOGO ? img(runtimeConfig?.public?.LOGO) : null;
const faviconUrl = '/logo.svg';
</script>

<template>
  <NuxtLink to="/">
    <img src="https://files.vincor.com/vincor_logo.png" alt="Logo" class=" w-32 lg:w-full" />
  </NuxtLink>
</template>
