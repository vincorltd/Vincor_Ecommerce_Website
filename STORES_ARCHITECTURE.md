# Pinia Stores Architecture

## Separation of Concerns ✨

We use **two separate stores** for better organization:

### 1. **`products.ts`** (Plural) - Products Listing
**Purpose:** Manages the `/products` listing page

**Location:** `woonuxt_base/app/stores/products.ts`

**Responsibilities:**
- Fetches ALL products from `/api/products`
- Caches entire products list for 5 minutes
- Transforms REST → GraphQL structure
- Used by: `pages/products.vue`

**Usage:**
```typescript
const productsStore = useProductsStore();

// Fetch all products (with caching)
const products = await productsStore.fetchAll();

// Force refresh (bypass cache)
const freshProducts = await productsStore.fetchAll(true);

// Check cache status
console.log('Cache age:', productsStore.cacheAge, 'seconds');
console.log('Is fresh?', productsStore.isCacheFresh);
console.log('Total products:', productsStore.productCount);

// Clear cache
productsStore.clearCache();
```

---

### 2. **`product.ts`** (Singular) - Individual Product
**Purpose:** Manages individual product detail pages

**Location:** `woonuxt_base/app/stores/product.ts`

**Responsibilities:**
- Fetches SINGLE product by slug from `/api/products/{slug}`
- Caches each product individually (by slug) for 5 minutes
- Handles product variations
- Transforms REST → GraphQL structure
- Used by: `pages/product/[slug].vue`

**Usage:**
```typescript
const productStore = useProductStore();

// Fetch product by slug (with caching)
const product = await productStore.fetchProduct('my-product-slug');

// Force refresh (bypass cache)
const freshProduct = await productStore.fetchProduct('my-product-slug', true);

// Check cache status
console.log('Is cached?', productStore.isProductCached('my-product-slug'));
console.log('Cache age:', productStore.getCacheAge('my-product-slug'), 'seconds');
console.log('Total cached:', productStore.cachedProductCount);

// Get from cache only (no API call)
const cached = productStore.getCachedProduct('my-product-slug');

// Clear specific product
productStore.clearProduct('my-product-slug');

// Clear all
productStore.clearAllCache();
```

---

## Why Separate Stores?

### ❌ **Before** (One Big Store):
```typescript
// products.ts handling EVERYTHING
- fetchAllProducts()
- getProductBySlug()
- productCache Map
- allProducts array
- isLoadingProducts
- isLoadingProduct
- productsLastFetched
// Confusing! Hard to maintain!
```

### ✅ **After** (Two Focused Stores):
```typescript
// products.ts (listing)
- fetchAll()
- allProducts
- isLoading
- lastFetched

// product.ts (detail)
- fetchProduct()
- productCache Map
- currentProduct
- isLoading
```

**Benefits:**
- **Single Responsibility** - Each store has ONE job
- **Easier to Understand** - Clear separation
- **Better Performance** - Smaller state objects
- **Independent Caching** - List and details cache separately
- **Easier to Test** - Focused functionality

---

## File Structure

```
woonuxt_base/app/
├── stores/
│   ├── products.ts    ← Products listing (plural)
│   └── product.ts     ← Individual product (singular)
│
├── pages/
│   ├── products.vue   → Uses useProductsStore()
│   └── product/
│       └── [slug].vue → Uses useProductStore()
```

---

## Cache Behavior

### Products Store (Listing)
```
First visit to /products:
  → API call to /api/products
  → Cache all products
  → Display list

Return within 5 min:
  → Use cached list (instant!)

After 5 min:
  → API call (fresh data)
  → Update cache
```

### Product Store (Detail)
```
First visit to /product/my-item:
  → API call to /api/products/my-item
  → Cache THIS product
  → Display details

Visit another product /product/other-item:
  → API call to /api/products/other-item
  → Cache THIS product too

Return to /product/my-item (within 5 min):
  → Use cached data (instant!)

After 5 min:
  → Cache expired
  → Fresh API call
```

---

## Configuration

Both stores share the same TTL configuration:

```typescript
// In both stores:
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// To change:
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_TTL = 1 * 60 * 1000;  // 1 minute
```

---

## Auto-Imports

Pinia automatically imports these stores:

```typescript
// No import needed! Just use:
const productsStore = useProductsStore();
const productStore = useProductStore();
```

**How it works:**
- Nuxt scans `stores/` folder
- Auto-imports all stores
- Available everywhere in your app

---

## Cache Management

### When to Clear Cache

**Products Store:**
```typescript
const productsStore = useProductsStore();

// After bulk product update in WP admin
productsStore.clearCache();

// Force refresh on demand
await productsStore.fetchAll(true);
```

**Product Store:**
```typescript
const productStore = useProductStore();

// After editing a specific product
productStore.clearProduct('product-slug');

// Clear all product cache
productStore.clearAllCache();

// Clean up expired entries
productStore.clearExpiredCache();
```

### Automatic Cache Expiry

- ✅ **TTL-based:** Cache expires after 5 minutes
- ✅ **No manual cleanup needed** (usually)
- ✅ **Always relatively fresh data**

---

## Best Practices

### ✅ DO:
- Use `useProductsStore()` for listing pages
- Use `useProductStore()` for detail pages
- Let cache handle performance
- Force refresh when needed

### ❌ DON'T:
- Mix the stores (products for details)
- Rely on cache for real-time data
- Forget about cache expiry
- Fetch products list in product detail page

---

## Future Improvements

### Phase 1: Current (Technical Debt)
- ✅ Separate stores
- ✅ REST API fetching
- ⚠️ Transform REST → GraphQL

### Phase 2: Remove GraphQL Dependency
- 🔄 Refactor components to use REST directly
- 🔄 Remove `transformProductToGraphQL()` methods
- 🔄 Use native REST structure throughout

### Phase 3: Advanced Caching
- 🔮 Add cache tags for selective invalidation
- 🔮 Implement optimistic updates
- 🔮 Background refresh strategy
- 🔮 IndexedDB persistence

---

## Debugging

### Console Logs

**Products Store:**
```
[Products Store] ⚡ Using cached products list (45s old)
[Products Store] 🔄 Fetching all products from API...
[Products Store] ✅ Loaded 150 products
[Products Store] 🗑️ Products cache cleared
```

**Product Store:**
```
[Product Store] ⚡ Using cached product: my-slug (23s old)
[Product Store] 🔄 Fetching product from API: my-slug
[Product Store] ✅ Product fetched: Product Name
[Product Store] 🎁 Add-ons: 3
[Product Store] 📦 Fetching variations: 5
[Product Store] 💾 Product cached: my-slug
```

### Vue Devtools

Open Vue Devtools → Pinia tab:

- See live store state
- Inspect cache contents
- Monitor actions
- Time-travel debugging

---

## Summary

| Feature | Products Store | Product Store |
|---------|---------------|---------------|
| **Purpose** | Listing page | Detail pages |
| **Fetches** | All products | Single product |
| **Cache Key** | One list | By slug |
| **Used By** | `products.vue` | `[slug].vue` |
| **Cache Type** | Single list | Map of products |
| **Method** | `fetchAll()` | `fetchProduct(slug)` |

**Result:** Clean, maintainable, performant! ✨









