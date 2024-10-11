<script setup lang="ts">
const { toggleMobileMenu } = useHelpers();
</script>

<template>
  <div>
    <Icon name="ion:menu-outline" size="28" class="mr-4 cursor-pointer text-white" @click="toggleMobileMenu" />
  </div>
</template>
