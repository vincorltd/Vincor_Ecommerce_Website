<script setup lang="ts">
import { useRouter } from 'vue-router';

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: Category[];
  showChildren: boolean;
}

const props = defineProps({
  label: { type: String, default: '' },
  hideEmpty: { type: Boolean, default: false },
  showCount: { type: Boolean, default: false },
  open: { type: Boolean, default: true },
});

const isOpen = ref(props.open);
const { getFilter, setFilter } = useFiltering();
const selectedCategory = ref(getFilter('category')[0] || '');
const selectedTerms = ref(getFilter('category') || []);
const emit = defineEmits(['collapse-others']);
const isExpanded = ref(false);

const { categories: categoryData, loading } = useCategories();
const { updateProductList, products } = useProducts();

const categories = computed(() => categoryData.value || []);

const selectedBrand = computed(() => getFilter('brand')[0] || '');

const filteredCategories = computed(() => {
  if (!selectedBrand.value || !products.value) return categories.value;

  // Get all products with the selected brand
  const brandProducts = products.value.filter(product => 
    product.productTags?.nodes?.some(tag => 
      tag?.name?.toLowerCase() === selectedBrand.value
    )
  );

  if (!brandProducts?.length) return categories.value;

  // Get all category slugs from these products
  const categoryIds = new Set();
  const categoryParentIds = new Set();

  brandProducts.forEach(product => {
    product.productCategories?.nodes?.forEach(category => {
      if (category?.slug) {
        categoryIds.add(category.slug);
        // Add parent category if it exists
        if (category.parent?.node?.slug) {
          categoryParentIds.add(category.parent.node.slug);
        }
      }
    });
  });

  // Filter categories to only show those that have products with the selected brand
  return categories.value?.filter(category => {
    // Include if category is a parent of matching products
    const isParentCategory = categoryParentIds.has(category.slug);
    
    // Include if category directly has matching products
    const hasMatchingProducts = categoryIds.has(category.slug);
    
    // Include if any children have matching products
    const hasMatchingChildren = category.children?.some(child => 
      categoryIds.has(child.slug)
    );

    return isParentCategory || hasMatchingProducts || hasMatchingChildren;
  }) || [];
});

const visibleCategories = computed(() => {
  return isExpanded.value ? filteredCategories.value : filteredCategories.value?.slice(0, 7);
});

const router = useRouter();

const categorySearch = ref('');

const checkboxChanged = (childSlug: string, parentSlug: string) => {
  const index = selectedTerms.value.indexOf(childSlug);
  if (index > -1) {
    selectedTerms.value.splice(index, 1);
  } else {
    selectedTerms.value.push(childSlug);
    
    // Remove parent if it was selected
    const parentIndex = selectedTerms.value.indexOf(parentSlug);
    if (parentIndex > -1) {
      selectedTerms.value.splice(parentIndex, 1);
    }
  }
  setFilter('category', selectedTerms.value);
};

const parentCategorySelected = (category: Category) => {
  selectedCategory.value = selectedCategory.value === category.slug ? '' : category.slug;
  setFilter('category', selectedCategory.value ? [selectedCategory.value] : []);
};

const toggleVisibility = (category: Category) => {
  category.showChildren = !category.showChildren;
  
  // Reset filters and return to main products page when closing the dropdown
  if (!category.showChildren) {
    selectedCategory.value = '';
    selectedTerms.value = [];
    setFilter('category', []);
    router.push('/products');
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    emit('collapse-others');
  }
};

const collapse = () => {
  isExpanded.value = false;
};

const resetCategoryFilter = () => {
  selectedCategory.value = '';
  selectedTerms.value = [];
  // Close all parent categories
  categories.value?.forEach(category => {
    category.showChildren = false;
  });
  // Clear all stored states
  localStorage.removeItem('categoryVisibilityStates');
  localStorage.removeItem('selectedCategories');
  // Reset filter and close parent
  setFilter('category', []);
  isOpen.value = false;
};

// Listen for reset event
onMounted(() => {
  window.addEventListener('reset-filters', resetCategoryFilter);
});

// Update localStorage when visibility changes
watch(categories, (newCategories) => {
  if (!newCategories) return;
  const visibilityStates = newCategories.reduce((acc, category) => {
    acc[category.id] = category.showChildren;
    return acc;
  }, {});
  localStorage.setItem('categoryVisibilityStates', JSON.stringify(visibilityStates));
}, { deep: true });

// Watch for changes in selectedTerms
watch(selectedTerms, (newTerms) => {
  localStorage.setItem('selectedCategories', JSON.stringify(newTerms));
});

onUnmounted(() => {
  window.removeEventListener('reset-filters', resetCategoryFilter);
});

defineExpose({ collapse });
</script>

<template>
  <div class="filter-section">
    <div 
      @click="isOpen = !isOpen"
      class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/80 rounded-lg group"
    >
      <h3 class="text-[17px] font-bold text-gray-900 group-hover:text-primary-dark transition-colors tracking-wide">Categories</h3>
      <Icon 
        :name="isOpen ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" 
        class="w-5 h-5 text-gray-500 group-hover:text-primary-dark transition-colors" 
      />
    </div>

    <div v-show="isOpen" class="pt-3">
      <div class="mb-3">
        <input
          v-model="categorySearch"
          type="search"
          placeholder="Search categories..."
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
        />
      </div>

      <div class="category-container">
        <div class="category-items-wrapper">
          <div v-for="category in visibleCategories" 
               :key="category.id" 
               class="category-block mb-2">
            <div 
              @click="() => { parentCategorySelected(category); toggleVisibility(category); }"
              class="parent-category cursor-pointer flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/90 transition-all duration-200"
              :class="{ 'bg-primary-50/90 text-primary-dark': selectedCategory === category.slug }"
            >
              <span class="text-[16px] font-semibold text-gray-800">{{ category.name }}</span>
              <Icon 
                v-if="category.children.length"
                name="heroicons:chevron-right"
                class="w-5 h-5 transition-transform text-gray-500"
                :class="{ 'rotate-90 text-primary-dark': category.showChildren }"
              />
            </div>
            
            <div v-if="category.children.length && category.showChildren" 
                 class="ml-4 mt-2 space-y-2">
              <div v-for="child in category.children"
                   :key="child.id"
                   class="flex items-center">
                <label class="flex items-center gap-3 cursor-pointer p-2.5 hover:bg-gray-50/90 rounded-lg w-full transition-colors duration-200">
                  <input
                    type="checkbox"
                    :checked="selectedTerms.includes(child.slug)"
                    @change="() => checkboxChanged(child.slug, category.slug)"
                    class="form-checkbox h-4 w-4 text-primary rounded border-gray-300"
                  />
                  <span class="text-[15px] font-medium text-gray-700 hover:text-primary-dark">{{ child.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          v-if="categories.length > 7"
          @click="toggleExpand"
          class="w-full mt-2 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          {{ isExpanded ? 'Show Less' : 'See All Categories' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-container {
  @apply transition-all duration-300;
}

.category-block {
  @apply mb-1;
}

.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-200;
}

.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}
</style>