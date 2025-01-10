<script setup>
const { getFilter, setFilter, isFiltersActive } = useFiltering();

const props = defineProps({
  terms: { type: Array, required: true },
  label: { type: String, default: '' },
  openByDefault: { type: Boolean, default: true },
  showCount: { type: Boolean, default: false },
});

const route = useRoute();
const isOpen = ref(props.open);
const categories = ref([]);
const emit = defineEmits(['collapse-others']);

const filterProductsByCategory = (categoryId) => {
  console.log(`Filtering products by category: ${categoryId}`);
};

onMounted(async () => {
  try {
    const response = await $fetch('https://satchart.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query getProductCategories($first: Int = 100) {
            productCategories(first: $first, where: { orderby: COUNT, order: DESC, hideEmpty: true }) {
              edges {
                node {
                  id
                  name
                  parent {
                    node {
                      id
                      name
                      slug
                    }
                  }
                  children {
                    edges {
                      node {
                        id
                        name
                        slug
                        count
                        parent {
                          node {
                            id
                            name
                            slug
                          }
                        }
                      }
                    }
                  }
                  slug
                  count
                  image {
                    sourceUrl(size: MEDIUM_LARGE)
                    altText
                    title
                  }
                }
              }
            }
          }
        `,
        variables: { first: 100 },
      }),
    });

    categories.value = processCategories(response.data.productCategories.edges);
    console.log('Processed categories for rendering:', categories.value);

    const storedSelectedTerms = localStorage.getItem('selectedCategories');
    if (storedSelectedTerms) {
      selectedTerms.value = JSON.parse(storedSelectedTerms);
    }

    const storedVisibilityStates = localStorage.getItem('categoryVisibilityStates');
    if (storedVisibilityStates) {
      const visibilityStates = JSON.parse(storedVisibilityStates);
      categories.value.forEach(category => {
        if (visibilityStates[category.id]) {
          category.showChildren = visibilityStates[category.id];
        }
      });
    }
  } catch (error) {
    console.error('Error fetching product categories:', error);
  }
});

function processCategories(edges) {
  const categoriesMap = new Map();

  edges.forEach(edge => {
    const parentCategory = edge.node;

    if (!parentCategory.parent && parentCategory.count > 0) {
      if (!categoriesMap.has(parentCategory.id)) {
        categoriesMap.set(parentCategory.id, { ...parentCategory, children: [], showChildren: false });
      }

      if (parentCategory.children && parentCategory.children.edges) {
        parentCategory.children.edges.forEach(childEdge => {
          const childNode = childEdge.node;
          if (childNode.count > 0) {
            if (!categoriesMap.has(childNode.id)) {
              categoriesMap.set(childNode.id, { ...childNode, children: [] });
            }
            categoriesMap.get(parentCategory.id).children.push(categoriesMap.get(childNode.id));
          }
        });
      }
    }
  });

  return Array.from(categoriesMap.values()).filter(category => !category.parent && category.count > 0);
}

const { getFilter, setFilter, isFiltersActive } = await useFiltering();
const selectedTerms = ref(getFilter('category') || []);

const route = useRoute();
const categorySlug = route.params.categorySlug;
if (categorySlug) selectedTerms.value = [categorySlug];

watch(isFiltersActive, () => {
  // uncheck all checkboxes when filters are cleared
  if (!isFiltersActive.value) selectedTerms.value = [];
});

// Update the URL when the checkbox is changed
const checkboxChanged = () => {
  setFilter('category', selectedTerms.value);
};

const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => a.name.localeCompare(b.name));
});

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
  <div v-if="categories.length" class="filter-content">
    <div
      class="cursor-pointer flex items-center justify-between font-semibold mt-8 text-gray-700 hover:text-gray-900 transition-colors duration-200"
      @click="isOpen = !isOpen"
    >
      <span>{{ label || $t('messages.shop.category', 2) }}</span>
      <Icon
        name="ion:chevron-down-outline"
        class="transform transition-transform duration-300 text-gray-500"
        :class="isOpen ? 'rotate-180' : ''"
      />
    </div>
    <transition name="fade">
      <div v-show="isOpen">
        <div 
          class="mt-3 category-container"
          :style="{
            maxHeight: containerHeight,
            overflow: isExpanded.value ? 'visible' : 'auto'
          }"
        >
          <div 
            class="category-items-wrapper"
            :class="{ 'items-expanded': isExpanded }"
          >
            <div
              v-for="category in sortedCategories"
              :key="category.id"
              class="category-block mb-2"
            >
              <div
                @click="() => { parentCategorySelected(category); toggleVisibility(category); }"
                class="parent-category cursor-pointer flex items-center justify-between font-medium text-gray-600 hover:text-gray-800 p-2 rounded-lg transition-all duration-200"
              >
                {{ category.name }}
                <Icon
                  name="ion:chevron-forward-outline"
                  class="transform transition-transform duration-300 text-gray-400"
                  :class="category.showChildren ? 'rotate-90' : ''"
                />
              </div>
              <transition name="fade">
                <div
                  v-show="category.showChildren"
                  class="child-categories py-2 pl-4 border-l border-gray-200"
                >
                  <div
                    v-for="child in category.children"
                    :key="child.id"
                    class="flex items-center text-sm text-gray-700 hover:text-gray-900 mb-1"
                  >
                    <input
                      :id="child.slug"
                      class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 transition ease-in-out"
                      :checked="selectedTerms.includes(child.slug)"
                      type="checkbox"
                      :value="child.slug"
                      @change="() => { checkboxChanged(child.slug, category.slug); }"
                    />
                    <label :for="child.slug" class="cursor-pointer">
                      {{ child.name }}
                      <span v-if="showCount" class="text-gray-500">({{ child.count || 0 }})</span>
                    </label>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
        
        <button
          v-if="categories.length > 5"
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
    </div>
  </div>
</template>

<style scoped>
.filter-content {
  display: flex;
  flex-direction: column;
}

.category-container {
  padding-right: 10px;
  transition: all 0.3s ease-in-out;
}

.category-container::-webkit-scrollbar {
  width: 6px;
}

.category-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.category-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.category-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.category-block {
  margin-bottom: 5px;
}

.parent-category {
  cursor: pointer;
  padding: 10px;
  background-color: #f9f9f9;
  border: 1px solid #ddd;
}

.child-categories {
  padding-left: 20px;
  background-color: #f0f0f0;
}

.chevron {
  transition: transform 0.3s ease;
}

.rotate-90 {
  transform: rotate(90deg);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter, .fade-leave-to {
  opacity: 0;
}

.category-items-wrapper {
  opacity: 1;
  transform: translateY(0);
  transition: all 0.3s ease-in-out;
}

.category-items-wrapper > div {
  transition: all 0.3s ease-in-out;
  transform-origin: top;
}

.category-items-wrapper:not(.items-expanded) > div:nth-child(n+8) {
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
/* ... and so on for as many items as needed */
</style>
