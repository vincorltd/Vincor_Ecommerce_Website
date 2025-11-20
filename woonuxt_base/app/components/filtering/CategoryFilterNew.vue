<script setup lang="ts">
import categoriesData from '~/data/categories.json';
import { useRouter } from 'vue-router';

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: Category[];
}

import { useProductsStore } from '~/stores/products';

const props = defineProps({
  open: { type: Boolean, default: true },
});

const emit = defineEmits(['filter-selected']);

const isOpen = ref(props.open);
const { getFilter, setFilter } = useFiltering();
const { updateProductList } = useProducts(); 
const selectedTerms = ref<string[]>(getFilter('category') || []);
const categorySearch = ref('');
const isExpanded = ref(false);
const router = useRouter();

const { isSearchActive, searchProducts } = useSearching();
const runtimeConfig = useRuntimeConfig();
const productsStore = useProductsStore();

// Import categories from static JSON file
const staticCategories = ref<Category[]>(categoriesData.categories || []);
const lastUpdated = categoriesData.lastUpdated || '';

console.log('⚡ [CategoryFilterNew] Loaded from static JSON:', staticCategories.value.length, 'categories');

// Dynamically calculate counts based on loaded products to match search results
const allCategories = computed(() => {
  // Use the static categories as base structure
  const cats = staticCategories.value;
  // Use all products (unfiltered) to calculate global category counts
  let allProds = productsStore.allProducts;
  
  if (!allProds.length || !cats.length) return cats;

  // 1. Apply Search
  if (isSearchActive.value) {
    allProds = searchProducts(allProds);
  }

  // 2. Apply Filters (Except Category)
  allProds = allProds.filter(product => {
      // Price Filter
      const priceRange = getFilter('price') || [];
      const productPrice = product.rawPrice ? parseFloat([...product.rawPrice.split(',')].reduce((a, b) => String(Math.max(Number(a), Number(b))))) : 0;
      const priceCondition = priceRange.length
        ? productPrice >= parseFloat(priceRange[0] as string) && productPrice <= parseFloat(priceRange[1] as string)
        : true;

      // Rating Filter
      const starRating = getFilter('rating') || [];
      const ratingCondition = starRating.length ? (product?.averageRating || 0) >= parseFloat(starRating[0] as string) : true;

      // Attributes Filter
      const globalProductAttributes = runtimeConfig?.public?.GLOBAL_PRODUCT_ATTRIBUTES?.map((attribute: any) => attribute.slug) || [];
      const attributeCondition = globalProductAttributes
        .map((attribute: string) => {
          const attributeValues = getFilter(attribute) || [];
          if (!attributeValues.length) return true;
          return product.terms?.nodes?.find((node: any) => node.taxonomyName === attribute && attributeValues.includes(node.slug));
        })
        .every((condition: any) => condition);

      // OnSale Filter
      const onSale = getFilter('sale');
      const saleItemsOnlyCondition = onSale.length ? product.onSale : true;

      // Brand Filter
      const brand = getFilter('brand') || [];
      const brandCondition = brand.length
        ? product.productTags?.nodes?.some(tag => 
            brand.includes(tag.name.toLowerCase())
          )
        : true;

      return ratingCondition && 
             priceCondition && 
             attributeCondition && 
             saleItemsOnlyCondition && 
             brandCondition;
  });
  
  // Count products per category slug
  const counts = new Map<string, number>();
  
  allProds.forEach(p => {
    // Check if product is visible
    p.productCategories?.nodes?.forEach(c => {
       if(c.slug) counts.set(c.slug, (counts.get(c.slug) || 0) + 1);
    });
  });
  
  // Helper to map categories recursively
  const mapCategory = (category: Category): Category => {
     // Use calculated count if available, otherwise fallback to API count
     const realCount = counts.get(category.slug);
     
     return {
        ...category,
        count: realCount !== undefined ? realCount : 0,
        children: category.children?.map(mapCategory) || []
     };
  };
  
  return cats.map(mapCategory);
});

// Search filtering
const filteredCategories = computed(() => {
  if (!categorySearch.value) return allCategories.value;
  
  const search = categorySearch.value.toLowerCase();
  
  const filterRecursive = (cats: Category[]): Category[] => {
    return cats.filter(cat => {
      const nameMatches = cat.name.toLowerCase().includes(search);
      const hasMatchingChildren = cat.children.some(child => 
        child.name.toLowerCase().includes(search)
      );
      return nameMatches || hasMatchingChildren;
    }).map(cat => ({
      ...cat,
      children: filterRecursive(cat.children),
    }));
  };
  
  return filterRecursive(allCategories.value);
});

// Show limited or all categories
const MAX_VISIBLE = 5;
const visibleCategories = computed(() => {
  return isExpanded.value
    ? filteredCategories.value
    : filteredCategories.value.slice(0, MAX_VISIBLE);
});

const hasMore = computed(() => filteredCategories.value.length > MAX_VISIBLE);

// Toggle category selection
const toggleCategory = (slug: string) => {
  const currentTerms = [...selectedTerms.value];
  const index = currentTerms.indexOf(slug);
  
  if (index > -1) {
    currentTerms.splice(index, 1);
  } else {
    currentTerms.push(slug);
  }
  
  selectedTerms.value = currentTerms;
  setFilter('category', currentTerms);
  
  // Emit event for parent component
  emit('filter-selected');
  
  // Trigger product list update immediately
  updateProductList();
};

// Check if category is selected
const isSelected = (slug: string) => selectedTerms.value.includes(slug);

// Reset on filter clear
const resetCategoryFilter = () => {
  selectedTerms.value = [];
};

if (process.client) {
  window.addEventListener('reset-filters', resetCategoryFilter);
}

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener('reset-filters', resetCategoryFilter);
  }
});
</script>

<template>
  <div class="filter-section">
    <button 
      @click="isOpen = !isOpen"
      class="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <h3 class="text-base font-semibold text-gray-900 uppercase tracking-wide">
        Categories
      </h3>
      <Icon 
        :name="isOpen ? 'heroicons:chevron-up-20-solid' : 'heroicons:chevron-down-20-solid'" 
        class="w-5 h-5 text-gray-400 transition-transform" 
      />
    </button>

    <div v-show="isOpen" class="px-4 pb-4">
      <!-- Search Box -->
      <div class="mb-3 pt-2">
        <input
          v-model="categorySearch"
          type="search"
          placeholder="Search categories..."
          class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
      </div>

      <!-- Categories List -->
      <div v-if="allCategories.length > 0" class="category-container">
        <div class="category-items-wrapper space-y-0.5">
          <!-- Parent Categories -->
          <div v-for="category in visibleCategories" :key="category.id" class="category-block">
            <!-- Parent Checkbox -->
            <label class="flex items-center gap-2.5 py-2.5 px-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                   :class="{ 'bg-blue-50': isSelected(category.slug) }">
              <input
                type="checkbox"
                :checked="isSelected(category.slug)"
                @change="toggleCategory(category.slug)"
                class="form-checkbox h-4 w-4 text-primary rounded border-gray-300 flex-shrink-0"
              />
              <span class="flex-1 text-base text-gray-700 truncate" 
                    :class="{ 'text-primary font-medium': isSelected(category.slug) }">
                {{ category.name }}
              </span>
              <span class="text-sm text-gray-500 font-medium flex-shrink-0">{{ category.count }}</span>
            </label>

            <!-- Child Categories -->
            <div v-if="category.children.length > 0" class="ml-5 mt-0.5 space-y-0.5 mb-1">
              <label 
                v-for="child in category.children" 
                :key="child.id"
                class="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                :class="{ 'bg-blue-50': isSelected(child.slug) }"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(child.slug)"
                  @change="toggleCategory(child.slug)"
                  class="form-checkbox h-3.5 w-3.5 text-primary rounded border-gray-300 flex-shrink-0"
                />
                <span class="flex-1 text-sm text-gray-600 truncate"
                      :class="{ 'text-primary font-medium': isSelected(child.slug) }">
                  {{ child.name }}
                </span>
                <span class="text-sm text-gray-500 flex-shrink-0">{{ child.count }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Show More/Less Button -->
        <button
          v-if="hasMore"
          @click="isExpanded = !isExpanded"
          class="w-full mt-2 py-2 text-sm text-gray-700 hover:text-primary transition-colors font-medium"
        >
          {{ isExpanded ? '− Show Less' : `+ Show ${filteredCategories.length - MAX_VISIBLE} More` }}
        </button>
      </div>

      <!-- Empty State -->
      <div v-else class="py-4 text-center">
        <p class="text-xs text-gray-500">No categories available</p>
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
</style>


