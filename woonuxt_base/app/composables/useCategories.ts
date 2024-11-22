export const useCategories = () => {
    const categories = useState<any>('categories', () => []);
    const loading = ref(false);
    const error = ref(null);
  
    const fetchCategories = async () => {
      if (categories.value.length) return categories.value;
  
      loading.value = true;
      try {
        console.log('Fetching categories...');
        const { data } = await useAsyncGql('getProductCategories');
        console.log('Raw GraphQL response:', data.value);
        
        if (data.value?.productCategories?.edges) {
          const processedCategories = processCategories(data.value.productCategories.edges);
          console.log('Processed categories:', processedCategories);
          categories.value = processedCategories;
        } else {
          console.warn('No categories data found in response');
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
        error.value = e;
      } finally {
        loading.value = false;
      }
    };
  
    const processCategories = (edges: any[]) => {
      const categoriesMap = new Map();
  
      edges.forEach(edge => {
        const parentCategory = edge.node;
        console.log('Processing category:', parentCategory);
  
        if (!parentCategory.parent?.node && parentCategory.count > 0) {
          if (!categoriesMap.has(parentCategory.id)) {
            categoriesMap.set(parentCategory.id, { 
              ...parentCategory, 
              children: [], 
              showChildren: false 
            });
          }
  
          if (parentCategory.children?.edges) {
            parentCategory.children.edges.forEach(childEdge => {
              const childNode = childEdge.node;
              if (childNode.count > 0) {
                const currentParent = categoriesMap.get(parentCategory.id);
                currentParent.children.push({
                  ...childNode,
                  children: [],
                  showChildren: false
                });
              }
            });
          }
        }
      });
  
      const result = Array.from(categoriesMap.values());
      console.log('Final processed categories:', result);
      return result;
    };
  
    // Fetch categories immediately and when the composable is used
    onMounted(() => {
      fetchCategories();
    });
  
    return {
      categories: computed(() => categories.value),
      loading,
      error,
      fetchCategories
    };
  };