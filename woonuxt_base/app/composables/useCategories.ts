import { categoriesService } from '#services';
import type { WooCategory } from '#services';

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: Category[];
  showChildren: boolean;
}

export const useCategories = () => {
  // Use global state for categories so they're shared across the app
  const categories = useState<Category[]>('categories', () => []);
  const loading = ref(false);
  const error = ref<any>(null);
  
  /**
   * Transform REST API category structure to component format
   */
  const transformCategory = (cat: WooCategory & { children?: WooCategory[] }): Category => {
    return {
      id: cat.id.toString(),
      name: cat.name,
      slug: cat.slug,
      count: cat.count,
      children: cat.children 
        ? cat.children
            .filter(child => child.count > 0)
            .map(child => transformCategory(child))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
      showChildren: false,
    };
  };
  
  /**
   * Fetch categories from REST API with automatic retry logic
   * Retries up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 10s)
   */
  const fetchCategories = async (retryCount = 0, maxRetries = 5) => {
    // Return cached categories if available (only on first attempt)
    if (categories.value.length && retryCount === 0) {
      return categories.value;
    }
    
    loading.value = true;
    if (retryCount === 0) {
      error.value = null;
    }
    
    try {
      if (retryCount > 0) {
        console.log(`[Categories] 🔄 Retry attempt ${retryCount}/${maxRetries}...`);
      } else {
        console.log('[Categories] 🔍 Fetching from REST API...');
      }
      
      // Fetch category hierarchy from REST API
      const hierarchy = await categoriesService.getCategoryHierarchy();
      
      // Transform to component format
      const transformed = hierarchy
        .filter(cat => cat.count > 0)
        .map(cat => transformCategory(cat))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('[Categories] ✅ Fetched and transformed:', transformed.length, 'categories');
      
      categories.value = transformed;
      
      // Cache in localStorage for instant loading on next visit
      if (process.client) {
        try {
          localStorage.setItem('categories_cache', JSON.stringify({
            data: transformed,
            timestamp: Date.now(),
          }));
          console.log('[Categories] 💾 Cached successfully');
        } catch (e) {
          console.warn('[Categories] Failed to cache categories:', e);
        }
      }
      
      // Success - clear any previous errors
      error.value = null;
      
      return transformed;
      
    } catch (e: any) {
      console.error('[Categories] ❌ Error fetching categories:', {
        message: e.message,
        code: e.code,
        status: e.status,
        data: e.data,
        retryCount,
        maxRetries,
      });
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s, 10s (max)
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`[Categories] ⏳ Retrying in ${delayMs / 1000}s... (attempt ${retryCount + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Keep loading state true during retry
        // Recursive retry
        return await fetchCategories(retryCount + 1, maxRetries);
      }
      
      // All retries exhausted
      console.error(`[Categories] 💥 Failed after ${maxRetries} retry attempts`);
      
      error.value = {
        message: e.message || `Failed to fetch categories after ${maxRetries} attempts`,
        code: e.code,
        status: e.status,
        data: e.data,
        retriesExhausted: true,
        retryCount: maxRetries,
      };
      
      // Try to load from cache as last resort
      if (process.client) {
        try {
          console.log('[Categories] 💾 Attempting to load from cache as fallback...');
          const cached = localStorage.getItem('categories_cache');
          if (cached) {
            const { data } = JSON.parse(cached);
            categories.value = data;
            console.log('[Categories] ✅ Loaded from cache:', data.length, 'categories (stale data)');
            return data;
          } else {
            console.warn('[Categories] ⚠️ No cache available');
          }
        } catch (cacheError) {
          console.error('[Categories] ❌ Failed to load from cache:', cacheError);
        }
      }
      
      return [];
    } finally {
      loading.value = false;
      console.log('[Categories] 🏁 Fetch completed. Total categories:', categories.value.length);
    }
  };
  
  /**
   * Refresh categories (force fetch from REST API)
   */
  const refreshCategories = async () => {
    categories.value = [];
    if (process.client) {
      localStorage.removeItem('categories_cache');
    }
    return fetchCategories();
  };
  
  /**
   * Load categories from cache immediately (for instant display)
   * Then fetch fresh data in background
   */
  const loadCategoriesWithCache = async () => {
    // If already loaded, return
    if (categories.value.length) {
      return;
    }
    
    // Try to load from localStorage immediately for instant display
    if (process.client) {
      try {
        const cached = localStorage.getItem('categories_cache');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          const maxAge = 1000 * 60 * 60 * 24; // 24 hours
          
          // Use cache if less than 24 hours old
          if (age < maxAge) {
            categories.value = data;
            console.log('Loaded categories from cache (instant)');
            
            // Still fetch fresh data in background if cache is older than 1 hour
            if (age > 1000 * 60 * 60) {
              fetchCategories().catch(console.error);
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load from cache:', e);
      }
    }
    
    // No cache or expired - fetch from API
    await fetchCategories();
  };
  
  // Auto-load categories when component mounts (client-side only)
  onMounted(() => {
    console.log('[Categories] 🚀 onMounted - Starting client-side initialization...');
    console.log('[Categories] 📊 Current state:', {
      categoriesCount: categories.value.length,
      loading: loading.value,
    });
    
    // Load categories with cache on client side
    if (categories.value.length === 0) {
      console.log('[Categories] ⚡ No categories loaded, fetching...');
      // Set loading immediately so skeleton shows instantly
      loading.value = true;
      loadCategoriesWithCache();
    } else {
      console.log('[Categories] ✅ Categories already loaded from SSR/cache');
    }
  });
  
  return {
    categories: computed(() => categories.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchCategories,
    refreshCategories,
  };
};