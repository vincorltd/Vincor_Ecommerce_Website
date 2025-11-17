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
  <div v-if="hasActiveFilters" class="mb-3">
    <button 
      @click="handleResetFilters"
      class="text-sm text-primary hover:text-primary-dark font-medium underline underline-offset-2 transition-colors flex items-center gap-2"
    >
      <Icon name="heroicons:arrow-path-20-solid" class="w-4 h-4" />
      Clear all filters
    </button>
  </div>
</template>
