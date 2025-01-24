<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

interface Brand {
  name: string;
  slug: string;
  displayName: string;
}

const props = defineProps({
  label: { type: String, default: '' },
  open: { type: Boolean, default: true },
});

const { products } = useProducts();
const isOpen = ref(props.open);
const { getFilter, setFilter } = useFiltering();
const selectedBrand = ref(getFilter('brand')[0] || '');
const emit = defineEmits(['collapse-others', 'filter-selected']);

// Brand name mapping with proper display names
const brandDisplayNames: Record<string, string> = {
  'adl': 'ADL',
  'ai': 'AI',
  'andrew': 'Andrew',
  'ast': 'AST',
  'atci': 'ATCI',
  'avcom': 'Avcom',
  'belden': 'Belden',
  'blondertongue': 'Blonder Tongue',
  'clearsat': 'ClearSat',
  'commscope': 'CommScope',
  'comtech': 'Comtech',
  'cytex': 'Cytex',
  'dh': 'DH',
  'digisat': 'DigiSat',
  'eti': 'ETI',
  'kratos': 'Kratos',
  'norsat': 'Norsat',
  'polyphaser': 'PolyPhaser',
  'prodelin': 'Prodelin',
  'quintech': 'Quintech',
  'rci': 'RCI',
  'seavey': 'Seavey',
  'thompson': 'Thompson',
  'thor': 'Thor',
  'times': 'Times',
  'venture': 'Venture',
  'vincor': 'Vincor',
  'walton': 'Walton'
};

const brands = computed(() => {
  const brandMap = new Map<string, Brand>();
  
  products.value?.forEach(product => {
    product.productTags?.nodes?.forEach(tag => {
      if (tag?.name && /^[a-zA-Z]+$/.test(tag.name)) {
        const slug = tag.name.toLowerCase();
        if (!brandMap.has(slug)) {
          brandMap.set(slug, {
            name: tag.name,
            slug: slug,
            displayName: brandDisplayNames[slug] || tag.name
          });
        }
      }
    });
  });

  return Array.from(brandMap.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
});

const selectBrand = (brandSlug: string) => {
  selectedBrand.value = selectedBrand.value === brandSlug ? '' : brandSlug;
  setFilter('brand', selectedBrand.value ? [selectedBrand.value] : []);
  emit('filter-selected');
};

const isExpanded = ref(false);
const containerHeight = computed(() => {
  return isExpanded.value ? 'none' : '300px';
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    emit('collapse-others');
  }
};

// Add method to collapse this filter
const collapse = () => {
  isExpanded.value = false;
};

// Expose collapse method to parent
defineExpose({ collapse });

const visibleBrands = computed(() => {
  return isExpanded.value ? brands.value : brands.value.slice(0, 7);
});

const brandSearch = ref('');

const filteredBrands = computed(() => {
  if (!brandSearch.value) return visibleBrands.value;
  
  return brands.value.filter(brand => 
    brand.displayName.toLowerCase().includes(brandSearch.value.toLowerCase())
  );
});

const resetBrandFilter = () => {
  selectedBrand.value = '';
  isExpanded.value = false;
  // Close the brand section
  isOpen.value = false;
};

// Listen for reset event
onMounted(() => {
  window.addEventListener('reset-filters', resetBrandFilter);
});

onUnmounted(() => {
  window.removeEventListener('reset-filters', resetBrandFilter);
});

const handleBrandSelect = (brand) => {
  // Existing brand selection logic
  selectedBrand.value = brand.slug;
  setFilter('brand', [selectedBrand.value]);
  emit('filter-selected');
};
</script>

<template>
  <div class="filter-section">
    <div 
      @click="isOpen = !isOpen"
      class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 rounded-lg group border-b border-gray-100"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-[17px] font-bold text-gray-900 group-hover:text-primary-dark transition-colors tracking-wide">
          Brands
        </h3>
        <span v-if="brands.length > 7" class="text-sm text-gray-500">
          ({{ brands.length }})
        </span>
      </div>
      <Icon 
        :name="isOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" 
        class="w-5 h-5 text-gray-500 group-hover:text-primary-dark transition-colors" 
      />
    </div>

    <div v-show="isOpen" class="pt-3">
      <div class="mb-3">
        <input
          v-model="brandSearch"
          type="search"
          placeholder="Search brands..."
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
        />
      </div>

      <div class="brand-container">
        <div 
          class="brand-items-wrapper" 
          :class="{ 'items-expanded': isExpanded }"
          :style="{ maxHeight: isExpanded ? 'none' : '300px', overflow: isExpanded ? 'visible' : 'auto' }"
        >
          <div v-for="brand in filteredBrands" :key="brand.slug" class="brand-block">
            <button 
              @click="selectBrand(brand.slug)"
              class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50/90 transition-all duration-200"
              :class="{ 'bg-primary-50/90': selectedBrand === brand.slug }"
            >
              <input
                type="checkbox"
                :checked="selectedBrand === brand.slug"
                class="form-checkbox h-4 w-4 text-primary rounded border-gray-300"
              />
              <div class="flex items-center gap-2">
                <img 
                  :src="`/images/brands/${brand.slug}.png`" 
                  :alt="brand.displayName"
                  class="h-6 w-auto object-contain"
                  @error="$event.target.style.display='none'"
                />
                <span class="text-[16px] font-semibold text-gray-800 hover:text-primary-dark">
                  {{ brand.displayName }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div 
          v-if="brands.length > 7 && !isExpanded" 
          class="scroll-indicator"
        ></div>

        <button 
          v-if="brands.length > 7"
          @click="toggleExpand"
          class="w-full mt-2 py-2 px-4 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
        >
          <span>{{ isExpanded ? 'Show Less' : `See All ${brands.length} Brands` }}</span>
          <Icon
            :name="isExpanded ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
            class="w-4 h-4"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-content {
  display: flex;
  flex-direction: column;
}

.brand-container {
  position: relative;
}

.brand-items-wrapper {
  transition: max-height 0.3s ease;
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
  &:active::-webkit-scrollbar-thumb {
    opacity: 1;
  }
}

.brand-block {
  margin-bottom: 5px;
}

.brand-item {
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

/* Add smooth transition for height changes */
.brand-container {
  transition: max-height 0.3s ease-in-out;
}

.brand-items-wrapper {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease-in-out;
}

.brand-items-wrapper > div {
  transition: all 0.3s ease-in-out;
  transform-origin: top;
}

.brand-items-wrapper:not(.items-expanded) > div:nth-child(n+8) {
  opacity: 0;
  transform: translateY(-10px);
}

.items-expanded > div {
  opacity: 1;
  transform: translateY(0);
}

/* Add transition delay for each item */
.items-expanded > div:nth-child(1) { transition-delay: 0.05s; }
.items-expanded > div:nth-child(2) { transition-delay: 0.1s; }
.items-expanded > div:nth-child(3) { transition-delay: 0.15s; }
.items-expanded > div:nth-child(4) { transition-delay: 0.2s; }
.items-expanded > div:nth-child(5) { transition-delay: 0.25s; }
.items-expanded > div:nth-child(6) { transition-delay: 0.3s; }
.items-expanded > div:nth-child(7) { transition-delay: 0.35s; }
.items-expanded > div:nth-child(8) { transition-delay: 0.4s; }
.items-expanded > div:nth-child(9) { transition-delay: 0.45s; }
.items-expanded > div:nth-child(10) { transition-delay: 0.5s; }
/* Add more if needed */

.brand-container {
  @apply transition-all duration-300;
}

.brand-block {
  @apply mb-1;
}

img {
  max-height: 24px;
  min-width: 24px;
}

.scroll-indicator {
  position: absolute;
  bottom: 40px; /* Adjusted to account for button height */
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to bottom, transparent, white);
  pointer-events: none;
  z-index: 10;
}

.items-expanded {
  max-height: none !important;
}

/* Update the button styling to be more visible */
button.see-all-brands {
  @apply w-full mt-2 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 
         rounded-lg transition-all duration-200 flex items-center justify-center gap-2 
         shadow-sm hover:shadow border border-gray-200 hover:border-gray-300;
}
</style>