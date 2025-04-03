import { ref, computed } from 'vue';
import { useState } from '#app';
import type { Ref } from 'vue';
import { GqlGetProductCategories } from '#gql';

interface CategoryNode {
  id: string;
  databaseId: number;
  name?: string | null;
  slug?: string | null;
  count?: number | null;
  parent?: {
    node: {
      id: string;
      name?: string | null;
      slug?: string | null;
    }
  } | null;
  children?: {
    edges: Array<{
      node: CategoryNode;
    }>;
  } | null;
}

interface ProcessedCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: ProcessedCategory[];
  showChildren: boolean;
}

export const useCategories = () => {
    const categories = useState<any[]>('categories', () => []);
    const loading = ref(true);
    const error = ref<Error | null>(null);
  
    const fetchCategories = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const { productCategories } = await GqlGetProductCategories({
          first: 100
        });
        
        if (productCategories?.edges) {
          const processedCategories = processCategories(productCategories.edges);
          categories.value = processedCategories;
        } else {
          console.warn('No categories data found in response');
          categories.value = [];
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
        error.value = e instanceof Error ? e : new Error('Failed to fetch categories');
        categories.value = [];
      } finally {
        loading.value = false;
      }
    };
  
    const processCategories = (edges: any[]): any[] => {
      const categoriesMap = new Map<string, any>();
      
      edges.forEach(({ node }) => {
        if (!node.parent && node.count && node.name && node.slug) {
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
              if (parentCategory) {
                node.children.edges.forEach(({ node: child }) => {
                  if (child.count && child.name && child.slug) {
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
        }
      });

      return Array.from(categoriesMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    };
  
    // Fetch categories immediately on client-side
    if (process.client) {
      fetchCategories();
    }
  
    return {
      categories: computed(() => categories.value || []),
      loading: computed(() => loading.value),
      error: computed(() => error.value),
      fetchCategories
    };
  };