let allProducts = [] as Product[];

export function useProducts() {
  // Declare the state variables and the setter functions
  const products = useState<Product[]>('products');
  
  // Product cache by slug (persists across navigation)
  const productCache = useState<Map<string, Product>>('productCache', () => new Map());

  /**
   * Sets the products state variable and the allProducts variable.
   * @param {Product[]} newProducts - The new products to set.
   */
  function setProducts(newProducts: Product[]): void {
    if (!Array.isArray(newProducts)) throw new Error('Products must be an array.');
    products.value = newProducts ?? [];
    allProducts = JSON.parse(JSON.stringify(newProducts));
  }

  /**
   * Cache a single product for fast subsequent lookups
   * @param {Product} product - The product to cache
   */
  function cacheProduct(product: Product): void {
    if (product?.slug) {
      productCache.value.set(product.slug, product);
      console.log('[Product Cache] ✅ Cached product:', product.slug);
    }
  }

  /**
   * Get a cached product by slug
   * @param {string} slug - The product slug to retrieve
   * @returns {Product | undefined} - The cached product or undefined
   */
  function getCachedProduct(slug: string): Product | undefined {
    return productCache.value.get(slug);
  }

  /**
   * Check if a product is cached
   * @param {string} slug - The product slug to check
   * @returns {boolean} - True if product is in cache
   */
  function isProductCached(slug: string): boolean {
    return productCache.value.has(slug);
  }

  /**
   * Clear the product cache
   */
  function clearProductCache(): void {
    productCache.value.clear();
    console.log('[Product Cache] 🗑️ Cache cleared');
  }

  const updateProductList = async (): Promise<void> => {
    const { scrollToTop } = useHelpers();
    const { isSortingActive, sortProducts } = useSorting();
    const { isFiltersActive, filterProducts } = useFiltering();
    const { isSearchActive, searchProducts } = useSearching();

    // scroll to top of page
    scrollToTop();

    // return all products if no filters are active
    if (!isFiltersActive.value && !isSearchActive.value && !isSortingActive.value) {
      products.value = allProducts;
      return;
    }

    // otherwise, apply filter, search and sorting in that order
    try {
      let newProducts = [...allProducts];
      if (isFiltersActive.value) newProducts = filterProducts(newProducts);
      if (isSearchActive.value) newProducts = searchProducts(newProducts);
      if (isSortingActive.value) newProducts = sortProducts(newProducts);

      products.value = newProducts;
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Get a single product by slug from the stored products
   * @param {string} slug - The product slug to find
   * @returns {Product | null} - The found product or null
   */
  function getProductBySlug(slug: string): Product | null {
    if (!slug || !allProducts.length) return null;
    
    const product = allProducts.find((p: Product) => p.slug === slug);
    return product || null;
  }

  /**
   * Get a single product by ID from the stored products
   * @param {number} id - The product databaseId to find
   * @returns {Product | null} - The found product or null
   */
  function getProductById(id: number): Product | null {
    if (!id || !allProducts.length) return null;
    
    const product = allProducts.find((p: Product) => p.databaseId === id);
    return product || null;
  }

  return { 
    products, 
    allProducts, 
    setProducts, 
    updateProductList, 
    getProductBySlug, 
    getProductById,
    cacheProduct,
    getCachedProduct,
    isProductCached,
    clearProductCache
  };
}
