// Example: ?search=shirt
export function useSearching() {
  const route = useRoute();
  const router = useRouter();

  const isShowingSearch = useState<boolean>('isShowingSearch', () => false);
  const searchQuery = useState<string>('searchQuery', () => '');
  const isSearchActive = computed<boolean>(() => !!searchQuery.value);

  searchQuery.value = route.query.search as string;

  function getSearchQuery(): string {
    return route.query.search as string;
  }

  function setSearchQuery(search: string): void {
    const { updateProductList } = useProducts();
    searchQuery.value = search;
    
    // If not on products page, navigate to products page first
    if (route.name !== 'products' && route.name !== 'product-category-slug') {
      // Navigate to products page with search query
      router.push({ name: 'products', query: { search: search || undefined } }).then(() => {
        // After navigation, update product list on the products page
        setTimeout(() => {
          updateProductList();
        }, 100);
      });
    } else {
      // Already on products/category page, just update query
      router.push({ query: { ...route.query, search: search || undefined } });
      setTimeout(() => {
        updateProductList();
      }, 50);
    }
  }

  function clearSearchQuery(): void {
    setSearchQuery('');
  }

  const toggleSearch = (): void => {
    isShowingSearch.value = !isShowingSearch.value;
  };

  function searchProducts(products: Product[]): Product[] {
    // Use searchQuery state value directly instead of route.query to avoid timing issues
    // The state is updated immediately in setSearchQuery(), while route.query might lag
    const search = searchQuery.value || getSearchQuery();

    // This function should ONLY filter products, not handle navigation
    // Navigation is handled by setSearchQuery() before this is called

    if (!search) {
      return products;
    }

    const query = search.toLowerCase();

    return products.filter((product: Product) => {
      // Search in product name
      const name = product.name?.toLowerCase() || '';
      if (name.includes(query)) return true;

      // Search in description
      const description = product.description ? product.description.toLowerCase() : '';
      if (description.includes(query)) return true;

      // Search in short description
      const shortDescription = product.shortDescription ? product.shortDescription.toLowerCase() : '';
      if (shortDescription.includes(query)) return true;

      // Search in SKU
      const sku = product.sku?.toLowerCase() || '';
      if (sku.includes(query)) return true;

      // Search in category names
      const categories = product.productCategories?.nodes || [];
      const categoryMatch = categories.some((cat: any) => {
        const catName = cat.name?.toLowerCase() || '';
        const catSlug = cat.slug?.toLowerCase() || '';
        return catName.includes(query) || catSlug.includes(query);
      });
      if (categoryMatch) return true;

      // Search in brand/tag names
      const tags = product.productTags?.nodes || [];
      const tagMatch = tags.some((tag: any) => {
        const tagName = tag.name?.toLowerCase() || '';
        const tagSlug = tag.slug?.toLowerCase() || '';
        return tagName.includes(query) || tagSlug.includes(query);
      });
      if (tagMatch) return true;

      return false;
    });
  }

  return { getSearchQuery, setSearchQuery, clearSearchQuery, searchProducts, isSearchActive, isShowingSearch, toggleSearch };
}
