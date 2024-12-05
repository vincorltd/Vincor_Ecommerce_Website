<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const img = useImage();

// Use runtime config logo if available, otherwise fallback to local image
const logoSrc = computed(() => 
  runtimeConfig?.public?.LOGO 
    ? img(runtimeConfig.public.LOGO) 
    : '/vincor_logo_dark.png'
);
</script>

<template>
  <NuxtLink to="/">
    <NuxtImg
      :src="logoSrc"
      alt="Logo"
      class="w-72 "
      loading="eager"
      format="webp"
    />
  </NuxtLink>
</template>
