export const useCategories = () => {
    const categories = useState<any>('categories', () => []);
    const loading = ref(true);
    const error = ref(null);
  
    const fetchCategories = async () => {
      if (categories.value.length) {
        loading.value = false;
        return categories.value;
      }
  
      try {
        const { data } = await useAsyncGql('getProductCategories');
        
        if (data.value?.productCategories?.edges) {
          const processedCategories = processCategories(data.value.productCategories.edges);
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
      
      edges.forEach(({ node }) => {
        if (!node.parent && node.count > 0) {
          if (!categoriesMap.has(node.id)) {
            categoriesMap.set(node.id, {
              id: node.id,
              name: node.name,
              slug: node.slug,
              count: node.count,
              children: [],
              showChildren: false
            });

            // Process children if they exist
            if (node.children?.edges) {
              const parentCategory = categoriesMap.get(node.id);
              node.children.edges.forEach(({ node: child }) => {
                if (child.count > 0) {
                  parentCategory.children.push({
                    id: child.id,
                    name: child.name,
                    slug: child.slug,
                    count: child.count,
                    children: [],
                    showChildren: false
                  });
                }
              });
            }
          }
        }
      });

      return Array.from(categoriesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    };
  
    // Only fetch on client-side
    if (process.client) {
      fetchCategories();
    }
  
    return {
      categories: computed(() => categories.value),
      loading,
      error,
      fetchCategories
    };
  };