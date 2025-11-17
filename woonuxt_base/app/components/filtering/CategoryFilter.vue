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
  ssrTerms: { type: Array as PropType<any[]>, default: () => [] }, // SSR-loaded GraphQL terms
});

const isOpen = ref(props.open);
const { getFilter, setFilter } = useFiltering();
const selectedCategory = ref(getFilter('category')[0] || '');
const selectedTerms = ref(getFilter('category') || []);
const emit = defineEmits(['collapse-others', 'filter-selected']);
const isExpanded = ref(false);

const { categories: restCategories, loading: restLoading, fetchCategories } = useCategories();
const { updateProductList, products } = useProducts();

// Transform GraphQL SSR terms to Category structure (instant, no async!)
const transformGraphQLTermsToCategories = (terms: any[]): Category[] => {
  if (!terms || terms.length === 0) return [];
  
  console.log('✨ [CategoryFilter] Transforming SSR GraphQL terms:', terms.length);
  
  const categoryMap = new Map<string, Category>();
  
  // First pass: create all categories
  terms.forEach((term: any) => {
    if (term.count && term.count > 0) {
      categoryMap.set(term.id, {
        id: term.id,
        name: term.name,
        slug: term.slug,
        count: term.count,
        children: [],
        showChildren: false,
      });
    }
  });
  
  // Second pass: build hierarchy
  const topLevel: Category[] = [];
  
  terms.forEach((term: any) => {
    const category = categoryMap.get(term.id);
    if (!category) return;
    
    if (term.parent?.node?.id) {
      // Has a parent - add to parent's children
      const parent = categoryMap.get(term.parent.node.id);
      if (parent) {
        parent.children.push(category);
      } else {
        // Parent not found, treat as top-level
        topLevel.push(category);
      }
    } else {
      // No parent - top-level category
      topLevel.push(category);
    }
  });
  
  // Sort recursively
  const sortCategories = (cats: Category[]): Category[] => {
    return cats.sort((a, b) => a.name.localeCompare(b.name)).map(cat => ({
      ...cat,
      children: sortCategories(cat.children),
    }));
  };
  
  return sortCategories(topLevel);
};

// Use SSR terms if available (INSTANT), otherwise fall back to REST API (async)
const categories = computed(() => {
  if (props.ssrTerms && props.ssrTerms.length > 0) {
    console.log('⚡ [CategoryFilter] Using SSR terms (INSTANT, NO STUTTER!)');
    return transformGraphQLTermsToCategories(props.ssrTerms);
  }
  console.log('🔄 [CategoryFilter] Falling back to REST API categories');
  return restCategories.value || [];
});

const loading = computed(() => {
  // Only show loading if we don't have SSR terms and REST API is loading
  return props.ssrTerms.length === 0 && restLoading.value;
});

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
  let filtered = filteredCategories.value;
  
  // Filter by search term if it exists
  if (categorySearch.value) {
    const searchTerm = categorySearch.value.toLowerCase();
    filtered = filtered.filter(category => {
      const matchesCategory = category.name.toLowerCase().includes(searchTerm);
      const matchesChildren = category.children.some(child => 
        child.name.toLowerCase().includes(searchTerm)
      );
      
      // If a child matches the search, expand the parent category
      if (matchesChildren) {
        category.showChildren = true;
      }
      
      return matchesCategory || matchesChildren;
    });
  } else {
    // When search is cleared, collapse all categories
    filtered.forEach(category => {
      category.showChildren = false;
    });
  }

  // Apply expansion limit - show only 5 initially
  return isExpanded.value ? filtered : filtered?.slice(0, 5);
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
  emit('filter-selected');
};

const parentCategorySelected = (category: Category) => {
  selectedCategory.value = category.slug;
  selectedTerms.value = [category.slug];
  setFilter('category', [category.slug]);
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
    <button 
      @click="isOpen = !isOpen"
      class="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <h3 class="text-base font-semibold text-gray-900 uppercase tracking-wide">Categories</h3>
      <Icon 
        :name="isOpen ? 'heroicons:chevron-up-20-solid' : 'heroicons:chevron-down-20-solid'" 
        class="w-5 h-5 text-gray-400 transition-transform" 
      />
    </button>

    <div v-show="isOpen" class="px-4 pb-4">
      <div class="mb-3 pt-2">
        <input
          v-model="categorySearch"
          type="search"
          placeholder="Search categories..."
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      <!-- Skeleton Loader -->
      <div v-if="loading && !categories.length" class="space-y-1 animate-pulse">
        <div v-for="i in 5" :key="`skeleton-${i}`" class="flex items-center gap-2 py-2">
          <div class="w-3 h-3 bg-gray-200 rounded"></div>
          <div class="h-3 bg-gray-200 rounded flex-1"></div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="!loading && !categories.length" class="py-4 text-center">
        <p class="text-xs text-gray-500 mb-2">Failed to load</p>
        <button 
          @click="fetchCategories()"
          class="text-xs text-primary hover:text-primary-dark"
        >
          Retry
        </button>
      </div>

      <div v-else class="category-container">
        <div class="category-items-wrapper space-y-0.5">
          <div v-for="category in visibleCategories" 
               :key="category.id" 
               class="category-block">
            <button 
              @click="() => { parentCategorySelected(category); toggleVisibility(category); }"
              class="w-full text-left flex items-center justify-between py-2.5 px-2 rounded hover:bg-gray-50 transition-colors group"
              :class="{ 'bg-blue-50': selectedCategory === category.slug }"
            >
              <span class="text-base text-gray-700 group-hover:text-gray-900" 
                    :class="{ 'text-primary font-medium': selectedCategory === category.slug }">
                {{ category.name }}
              </span>
              <Icon 
                v-if="category.children.length"
                name="heroicons:chevron-right-20-solid"
                class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0"
                :class="{ 'rotate-90 text-primary': category.showChildren }"
              />
            </button>
            
            <div v-if="category.children.length && category.showChildren" 
                 class="ml-3 mt-0.5 space-y-0.5 mb-1">
              <label v-for="child in category.children"
                     :key="child.id"
                     class="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  :checked="selectedTerms.includes(child.slug)"
                  @change="() => checkboxChanged(child.slug, category.slug)"
                  class="form-checkbox h-3.5 w-3.5 text-primary rounded border-gray-300"
                />
                <span class="text-sm text-gray-600">{{ child.name }}</span>
              </label>
            </div>
          </div>
        </div>
        
        <button 
          v-if="categories.length > 5"
          @click="toggleExpand"
          class="w-full mt-2 py-2 text-sm text-gray-700 hover:text-primary transition-colors font-medium"
        >
          {{ isExpanded ? '− Show Less' : `+ Show ${categories.length - 5} More` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-container {
  @apply transition-all duration-200;
}

.category-items-wrapper {
  /* No max-height or overflow - let the main filters container handle scrolling */
}

.animate-pulse {
  animation: skeleton-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>