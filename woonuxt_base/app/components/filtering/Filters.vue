<script setup>
const { isFiltersActive } = useFiltering();
const { removeBodyClass } = useHelpers();
const runtimeConfig = useRuntimeConfig();
const isFiltersVisible = ref(true);

const globalProductAttributes = runtimeConfig?.public?.GLOBAL_PRODUCT_ATTRIBUTES || [];
// hide-categories prop is used to hide the category filter on the product category page
const { hideCategories } = defineProps({ hideCategories: { type: Boolean, default: false } });

const toggleFilters = () => {
  isFiltersVisible.value = !isFiltersVisible.value;
};

// Add scroll detection
onMounted(() => {
  const filters = document.getElementById('filters');
  let scrollTimeout;

  filters?.addEventListener('scroll', () => {
    filters.classList.add('scrolling');
    clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      filters.classList.remove('scrolling');
    }, 1000);
  });
});
</script>

<template>
  <div class="flex flex-col">
    <SelectedFilters />
    <aside id="filters" class="rounded-lg shadow-sm p-4 transition-all duration-300">
      <div class="flex justify-between items-center mb-4">
      </div>
      <div class="space-y-4 transition-all duration-300">
        <OrderByDropdown class="block w-full md:hidden mb-4" />
        <div class="relative space-y-4">
          <CategoryFilter v-if="!hideCategories" />
          <BrandFilter />
        </div>
      </div>
    </aside>
  </div>
  <div class="fixed inset-0 z-50 hidden bg-black/25 backdrop-blur-sm filter-overlay" @click="removeBodyClass('show-filters')"></div>
</template>

<style lang="postcss">
.show-filters .filter-overlay {
  @apply block;
}
.show-filters {
  overflow: hidden;
}

#filters {
  @apply w-[280px] border border-gray-100;
  max-height: calc(100vh - 200px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
    opacity: 0;
  }

  &:hover::-webkit-scrollbar {
    opacity: 0;
  }

  &::-webkit-scrollbar-thumb {
    @apply bg-gray-200;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::-webkit-scrollbar-thumb {
    opacity: 0;
  }

  &:hover::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-300;
  }

  /* Only show scrollbar when actively scrolling */
  &:active::-webkit-scrollbar-thumb,
  &.scrolling::-webkit-scrollbar-thumb {
    opacity: 1;
  }

  input[type='checkbox'],
  input[type='radio'] {
    @apply bg-white border rounded-lg cursor-pointer font-sans outline-none border-gray-300 w-full p-3 transition-all duration-150 appearance-none hover:border-primary;

    width: 1em;
    height: 1em;
    position: relative;
    cursor: pointer;
    border-radius: 4px;
    padding: 0;
  }

  input[type='radio'] {
    border-radius: 50%;
  }

  input[type='checkbox']:after,
  input[type='radio']:after {
    content: '';
    display: block;
    opacity: 0;
    transition: all 250ms cubic-bezier(0.65, -0.43, 0.4, 1.71);
  }

  input[type='checkbox']:after {
    width: 5px;
    height: 9px;
    border: 2px solid #fff;
    border-top: 0;
    border-left: 0;
    transform: rotate(0deg) translate(-1px, 1px) scale(0.75);
    position: absolute;
    top: 3px;
    left: 6.5px;
  }

  input[type='radio']:after {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transform: scale(0);
    position: absolute;
    background: #fff;
    top: 4px;
    left: 4px;
  }

  input[type='checkbox']:checked:after,
  input[type='checkbox'] + label,
  input[type='radio'] + label {
    @apply cursor-pointer text-blue-950 hover:text-gray-800;
  }

  input[type='checkbox']:checked + label,
  input[type='radio']:checked + label {
    @apply text-gray-800;
  }

  input[type='checkbox']:checked,
  input[type='radio']:checked {
    @apply bg-primary border-0;
  }

  input[type='checkbox']:checked:after {
    opacity: 1;
    transform: rotate(45deg) translate(-1px, 1px) scale(1);
  }

  input[type='radio']:checked:after {
    opacity: 1;
    transform: scale(1);
  }
}

.price-input {
  @apply border rounded-xl outline-none leading-tight w-full p-2 transition-all;

  &.active {
    @apply border-gray-400 pl-6;
  }
}

@media (max-width: 768px) {
  #filters {
    @apply bg-white h-full p-8 transform pl-2 transition-all ease-in-out bottom-0 left-4 -translate-x-[110vw] duration-300 overflow-auto fixed;

    box-shadow:
      -100px 0 0 white,
      -200px 0 0 white,
      -300px 0 0 white;
    z-index: 60;
  }

  .show-filters #filters {
    @apply transform-none;
  }
}
</style>
