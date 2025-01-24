<script setup>
const { toggleBodyClass, removeBodyClass } = useHelpers();
const { isFiltersActive } = useFiltering();

const handleFilterClick = (event) => {
  event.preventDefault();
  document.body.classList.add('show-filters');
};

onBeforeUnmount(() => {
  document.body.classList.remove('show-filters');
});
</script>

<template>
  <div class="fixed bottom-6 right-6 md:hidden z-[999]">
    <button
      class="flex items-center p-3 text-sm text-gray-500 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 focus:outline-none"
      aria-label="Show filters"
      @click="handleFilterClick"
      title="Show filters">
      <Icon name="ion:funnel-outline" size="20" />
    </button>
    <span class="absolute z-20 w-2.5 h-2.5 rounded-full bg-primary -top-1 -right-1" v-if="isFiltersActive" />
  </div>
</template>
