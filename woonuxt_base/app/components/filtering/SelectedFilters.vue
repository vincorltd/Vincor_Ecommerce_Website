<script setup>
const { getFilter, resetFilter } = useFiltering();
const selectedCategory = computed(() => getFilter('category'));
const selectedBrand = computed(() => getFilter('brand'));
const router = useRouter();

const hasActiveFilters = computed(() => {
  return selectedCategory.value.length > 0 || selectedBrand.value.length > 0;
});

// Use the same reset functionality as ResetFiltersButton
const handleResetFilters = () => {
  resetFilter();
  // This will trigger the watch in CategoryFilterBackup.vue (lines 141-143)
  // and the brand reset in BrandFilter.vue (lines 73-76)
};
</script>

<template>
  <div v-if="hasActiveFilters" class="sticky top-4 z-40 mb-4">
    <button 
      @click="handleResetFilters"
      class="w-full bg-white shadow-sm border border-gray-100 rounded-lg px-4 py-3 text-gray-600 hover:text-primary hover:border-primary transition-all duration-200 flex items-center justify-center gap-2"
    >
      <Icon name="heroicons:x-mark" class="w-4 h-4" />
      Clear All Filters
    </button>
  </div>
</template>
