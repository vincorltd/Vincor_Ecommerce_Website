<script setup lang="ts">
import { useProductsStore } from '~/stores/products';

const { isFiltersActive } = useFiltering();
const { removeBodyClass } = useHelpers();
const runtimeConfig = useRuntimeConfig();
const { storeSettings } = useAppConfig();

const { hideCategories } = defineProps({ hideCategories: { type: Boolean, default: false } });

const productsStore = useProductsStore();
const globalProductAttributes = (runtimeConfig?.public?.GLOBAL_PRODUCT_ATTRIBUTES as WooNuxtFilter[]) || [];

// Extract terms from products instead of using GraphQL
const { data } = await useAsyncData(
  'filter-terms',
  async () => {
    const allProducts = await productsStore.fetchAll();
    const termsMap = new Map();
    
    // Extract unique terms from all products for each attribute
    allProducts.forEach((product: any) => {
      // Check if product has attributes
      if (product.attributes?.nodes) {
        product.attributes.nodes.forEach((attr: any) => {
          const attrSlug = attr.name?.toLowerCase().replace(/\s+/g, '-') || '';
          
          // Check if this is one of our global attributes
          const isGlobalAttr = globalProductAttributes.some(
            globalAttr => globalAttr.slug === attrSlug
          );
          
          if (isGlobalAttr && attr.options) {
            attr.options.forEach((option: string) => {
              const termKey = `${attrSlug}-${option}`;
              if (!termsMap.has(termKey)) {
                termsMap.set(termKey, {
                  id: termKey,
                  name: option,
                  slug: option.toLowerCase().replace(/\s+/g, '-'),
                  taxonomyName: attrSlug,
                  count: 1
                });
              } else {
                // Increment count
                const term = termsMap.get(termKey);
                term.count++;
              }
            });
          }
        });
      }
    });
    
    return Array.from(termsMap.values());
  },
  { 
    server: false,  // Client-side only to reduce build memory
    lazy: true,     // Non-blocking load
    getCachedData: (key) => {
      if (process.client && productsStore.isCacheFresh && productsStore.allProducts.length > 0) {
        const allProducts = productsStore.allProducts;
        const termsMap = new Map();
        
        allProducts.forEach((product: any) => {
          if (product.attributes?.nodes) {
            product.attributes.nodes.forEach((attr: any) => {
              const attrSlug = attr.name?.toLowerCase().replace(/\s+/g, '-') || '';
              const isGlobalAttr = globalProductAttributes.some(
                globalAttr => globalAttr.slug === attrSlug
              );
              
              if (isGlobalAttr && attr.options) {
                attr.options.forEach((option: string) => {
                  const termKey = `${attrSlug}-${option}`;
                  if (!termsMap.has(termKey)) {
                    termsMap.set(termKey, {
                      id: termKey,
                      name: option,
                      slug: option.toLowerCase().replace(/\s+/g, '-'),
                      taxonomyName: attrSlug,
                      count: 1
                    });
                  } else {
                    const term = termsMap.get(termKey);
                    term.count++;
                  }
                });
              }
            });
          }
        });
        
        return Array.from(termsMap.values());
      }
      return undefined;
    }
  }
);

const terms = computed(() => data.value || []);

const attributesWithTerms = computed(() => 
  globalProductAttributes.map((attr) => ({ 
    ...attr, 
    terms: terms.value.filter((term) => term.taxonomyName === attr.slug) 
  }))
);

const closeFilterMenu = () => {
  if (window.innerWidth <= 768) {
    removeBodyClass('show-filters');
  }
};

onMounted(() => {
  const filters = document.getElementById('filters');
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  filters?.addEventListener('scroll', () => {
    filters.classList.add('scrolling');
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    scrollTimeout = setTimeout(() => {
      filters.classList.remove('scrolling');
    }, 1000);
  });
});
</script>

<template>
  <div class="flex flex-col">
    <aside id="filters" class="transition-all duration-300">
      <!-- Mobile header -->
      <div class="lg:hidden p-4 border-b border-gray-200 flex items-center justify-between bg-white/95 backdrop-blur-sm">
        <h2 class="text-lg font-bold text-gray-900">Filters</h2>
        <button @click="removeBodyClass('show-filters')" class="p-2 hover:bg-gray-100 rounded-lg">
          <Icon name="heroicons:x-mark" class="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      <!-- Clear filters - inside the filter bar -->
      <div class="px-4 pt-4">
        <SelectedFilters />
      </div>
      
      <OrderByDropdown class="block w-full lg:hidden px-4 pb-4" />
      
      <div class="space-y-2">
        <CategoryFilterNew 
          v-if="!hideCategories"
          @filter-selected="closeFilterMenu" />
        <BrandFilter @filter-selected="closeFilterMenu" />
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
  @apply w-[280px];
  border-right: 1px solid #e5e7eb; /* Only right border */
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding-right: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    @apply bg-gray-300 rounded-full;
  }

  &::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-400;
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
    @apply fixed inset-y-0 left-0 w-[280px] z-[60] transform -translate-x-full transition-transform duration-300 ease-in-out;
    height: 100vh;
    max-height: none;
    overflow-y: auto;
    box-shadow: 5px 0 15px rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    border-right: none; /* No border on mobile */
  }

  .show-filters #filters {
    @apply translate-x-0;
  }

  .filter-overlay {
    @apply z-50;
  }

  .show-filters .filter-overlay {
    @apply block;
  }

  .show-filters {
    @apply overflow-hidden;
    position: fixed;
    width: 100%;
  }
}
</style>
