<script setup>
const props = defineProps({
  label: { type: String, default: '' },
  hideEmpty: { type: Boolean, default: false },
  showCount: { type: Boolean, default: false },
  open: { type: Boolean, default: true },
});

const route = useRoute();
const isOpen = ref(props.open);
const categories = ref([]);

const filterProductsByCategory = (categoryId) => {
  console.log(`Filtering products by category: ${categoryId}`);
};

onMounted(async () => {
  try {
    const response = await $fetch('https://vincor.com/graphql', {
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

watch(selectedTerms, (newTerms) => {
  localStorage.setItem('selectedCategories', JSON.stringify(newTerms));
});

watch(categories, (newCategories) => {
  const visibilityStates = newCategories.reduce((acc, category) => {
    acc[category.id] = category.showChildren;
    return acc;
  }, {});
  localStorage.setItem('categoryVisibilityStates', JSON.stringify(visibilityStates));
}, { deep: true });

const categorySlug = route.params.categorySlug;
if (categorySlug) selectedTerms.value = [categorySlug];

watch(isFiltersActive, () => {
  if (!isFiltersActive.value) selectedTerms.value = [];
});

const checkboxChanged = (childSlug, parentSlug) => {
  console.log('Checkbox changed:', childSlug);
  const index = selectedTerms.value.indexOf(childSlug);
  if (index > -1) {
    selectedTerms.value.splice(index, 1);
  } else {
    selectedTerms.value.push(childSlug);

    const parentIndex = selectedTerms.value.indexOf(parentSlug);
    if (parentIndex > -1) {
      selectedTerms.value.splice(parentIndex, 1);
    }
  }
  console.log('Updated selected terms:', selectedTerms.value);
  setFilter('category', [...selectedTerms.value]);
  filterProductsByCategory(childSlug);
};

const toggleVisibility = (category) => {
  categories.value.forEach(cat => {
    if (cat.id !== category.id) {
      cat.showChildren = false;
    }
  });
  category.showChildren = !category.showChildren;
  console.log('Toggled visibility for category:', category.name, ', showChildren:', category.showChildren);
};

const parentCategorySelected = (category) => {
  selectedTerms.value = [category.slug];
  setFilter('category', selectedTerms.value);
  console.log('Parent category selected:', category.name);
};


const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => a.name.localeCompare(b.name));
});


</script>

<template>
  <div v-if="categories.length">
    <div class="  cursor-pointer flex font-semibold mt-8 justify-between items-center" @click="isOpen = !isOpen">
      <span>{{ label || $t('messages.shop.category', 2) }}</span>
      <Icon name="ion:chevron-down-outline" class="transform transition-transform duration-300" :class="isOpen ? 'rotate-180' : ''" />
    </div>
    <transition name="fade">
      <div v-show="isOpen" class="mt-3">
        <div v-for="category in sortedCategories" :key="category.id" class="category-block">
          <div @click="() => { parentCategorySelected(category); toggleVisibility(category); }" class="parent-category">
            {{ category.name }}
            <Icon name="ion:chevron-forward-outline" class="transform transition-transform duration-300" :class="category.showChildren ? 'rotate-90' : ''" />
          </div>
          <transition name="fade">
            <div v-show="category.showChildren" class="child-categories py-2 ">
              <div v-for="child in category.children" :key="child.id">
                <input  :id="child.slug" class="mr-2" 
                  :checked="selectedTerms.includes(child.slug)" 
                  type="checkbox" 
                  :value="child.slug" 
                  @change="() => { checkboxChanged(child.slug, category.slug); }">
                <label :for="child.slug" class="">{{ child.name }}
                  <span v-if="showCount">({{ child.count || 0 }})</span>
                </label>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
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
</style>
