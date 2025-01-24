<script setup>
const { resetFilter } = useFiltering();
</script>

<template>
  <button 
    class="text-[14px] text-gray-500 hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline flex items-center justify-end" 
    @click="resetFilter"
  >
    {{ $t('messages.general.clearFilters') }}
  </button>
</template>
