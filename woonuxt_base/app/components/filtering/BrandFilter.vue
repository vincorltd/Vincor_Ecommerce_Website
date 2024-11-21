<script setup lang="ts">
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
const emit = defineEmits(['collapse-others']);

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
</script>

<template>
  <div v-if="brands.length" class="filter-content">
    <div
      class="cursor-pointer flex items-center justify-between font-semibold mt-8 text-gray-700 hover:text-gray-900 transition-colors duration-200"
      @click="isOpen = !isOpen"
    >
      <span>{{ label || 'Brands' }}</span>
      <Icon
        name="ion:chevron-down-outline"
        class="transform transition-transform duration-300 text-gray-500"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </div>
    <transition name="fade">
      <div v-show="isOpen">
        <div 
          class="mt-3 brand-container"
          :style="{
            maxHeight: containerHeight,
            overflow: isExpanded.value ? 'visible' : 'auto'
          }"
        >
          <div 
            class="brand-items-wrapper"
            :class="{ 'items-expanded': isExpanded }"
          >
            <div
              v-for="brand in brands"
              :key="brand.slug"
              class="brand-block mb-2"
            >
              <div
                @click="selectBrand(brand.slug)"
                class="brand-item cursor-pointer flex items-center justify-between font-medium text-gray-600 hover:text-gray-800 p-2 rounded-lg transition-all duration-200"
                :class="{
                  'bg-primary/5 text-primary': selectedBrand === brand.slug,
                  'bg-gray-50': selectedBrand !== brand.slug
                }"
              >
                {{ brand.displayName }}
              </div>
            </div>
          </div>
        </div>
        
        <button
          v-if="brands.length > 5"
          @click="toggleExpand"
          class="w-full mt-2 py-2 px-4 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1"
        >
          <span>{{ isExpanded ? 'Show Less' : 'Show More' }}</span>
          <Icon
            :name="isExpanded ? 'ion:chevron-up-outline' : 'ion:chevron-down-outline'"
            class="w-4 h-4"
          />
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.filter-content {
  display: flex;
  flex-direction: column;
}

.brand-container {
  padding-right: 10px;
  transition: all 0.3s ease-in-out;
}

.brand-container::-webkit-scrollbar {
  width: 6px;
}

.brand-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.brand-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.brand-container::-webkit-scrollbar-thumb:hover {
  background: #555;
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
</style>