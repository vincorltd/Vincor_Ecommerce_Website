<script setup lang="ts">
import brandsData from '~/data/brands.json';
import { onMounted, onUnmounted } from 'vue';

interface Brand {
  id: number;
  name: string;
  slug: string;
  displayName: string;
  count: number;
}

const props = defineProps({
  label: { type: String, default: '' },
  open: { type: Boolean, default: false },
});

const isOpen = ref(props.open);
const { getFilter, setFilter } = useFiltering();
const { updateProductList } = useProducts(); // Add for immediate filtering
const selectedBrand = ref(getFilter('brand')[0] || '');
const emit = defineEmits(['collapse-others', 'filter-selected']);

// Load brands from static JSON (instant load)
const brands = ref<Brand[]>(brandsData.brands as Brand[]);

const selectBrand = (brandSlug: string) => {
  selectedBrand.value = selectedBrand.value === brandSlug ? '' : brandSlug;
  setFilter('brand', selectedBrand.value ? [selectedBrand.value] : []);
  emit('filter-selected');
  
  // Trigger product list update immediately
  updateProductList();
};

const isExpanded = ref(false);

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
  return isExpanded.value ? brands.value : brands.value.slice(0, 5);
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
    <button 
      @click="isOpen = !isOpen"
      class="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold text-gray-900 uppercase tracking-wide">Brands</h3>
        <span v-if="brands.length > 5" class="text-sm text-gray-500">
          ({{ brands.length }})
        </span>
      </div>
      <Icon 
        :name="isOpen ? 'heroicons:chevron-up-20-solid' : 'heroicons:chevron-down-20-solid'" 
        class="w-5 h-5 text-gray-400 transition-transform" 
      />
    </button>

    <div v-show="isOpen" class="px-4 pb-4">
      <div class="mb-3 pt-2">
        <input
          v-model="brandSearch"
          type="search"
          placeholder="Search brands..."
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      <div class="brand-container">
        <div class="brand-items-wrapper space-y-0.5">
          <label 
            v-for="brand in filteredBrands" 
            :key="brand.slug" 
            class="brand-item flex items-center gap-3 py-2.5 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
            :class="{ 'bg-blue-50': selectedBrand === brand.slug }"
          >
            <input
              type="checkbox"
              :checked="selectedBrand === brand.slug"
              @change="selectBrand(brand.slug)"
              class="form-checkbox h-4 w-4 text-primary rounded border-gray-300 flex-shrink-0"
            />
            <img 
              :src="`/images/brands/${brand.slug}.png`" 
              :alt="brand.displayName"
              class="h-5 w-auto object-contain flex-shrink-0"
              @error="$event.target.style.display='none'"
            />
            <span class="text-base text-gray-700 truncate" 
                  :class="{ 'text-primary font-medium': selectedBrand === brand.slug }">
              {{ brand.displayName }}
            </span>
          </label>
        </div>

        <button 
          v-if="brands.length > 5"
          @click="toggleExpand"
          class="w-full mt-2 py-2 text-sm text-gray-700 hover:text-primary transition-colors font-medium"
        >
          {{ isExpanded ? '− Show Less' : `+ Show ${brands.length - 5} More` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.brand-container {
  @apply transition-all duration-200;
}

.brand-items-wrapper {
  /* No max-height or overflow - let the main filters container handle scrolling */
}

.brand-item img {
  max-height: 20px;
  min-width: 20px;
}
</style>