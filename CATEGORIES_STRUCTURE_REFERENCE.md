# Categories Data Structure Reference

This document defines the **structure patterns** for category data, regardless of specific categories.

## Category Interface (TypeScript)

```typescript
interface Category {
  id: string;           // Unique category ID
  name: string;         // Display name
  slug: string;         // URL-friendly slug for filtering
  count: number;        // Number of products in this category
  children: Category[]; // Nested subcategories (recursive structure)
  showChildren: boolean; // UI state for expanding/collapsing tree
}
```

## Data Structure Pattern

### REST API Response (After Transformation)
```typescript
{
  success: boolean;
  count: number;        // Total top-level categories
  categories: Category[] // Hierarchical tree
}
```

### Example Structure (Generic)
```json
{
  "id": "parent-id",
  "name": "Parent Category",
  "slug": "parent-category",
  "count": 15,
  "children": [
    {
      "id": "child-id",
      "name": "Child Category",
      "slug": "child-category",
      "count": 5,
      "children": [],        // Can be nested infinitely
      "showChildren": false
    }
  ],
  "showChildren": false
}
```

## Hierarchy Patterns

### Pattern 1: Parent with Multiple Children
```
Parent Category (15 products)
├── Child A (5 products)
├── Child B (7 products)
└── Child C (3 products)
```

### Pattern 2: Leaf Category (No Children)
```
Standalone Category (10 products)
└── (no children)
```

### Pattern 3: Deep Nesting (Recursive)
```
Grandparent (50 products)
└── Parent (30 products)
    └── Child (15 products)
        └── Grandchild (5 products)
```

## Data Sources & Transformation

### Source 1: WooCommerce REST API
**Endpoint**: `/wp-json/wc/v3/products/categories`

**Raw Response Structure**:
```typescript
interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;      // Parent category ID (0 = top-level)
  count: number;
  // ... other WooCommerce fields
}
```

**Transformation Flow**:
1. Fetch flat list of categories from WooCommerce
2. Build hierarchy using `parent` field
3. Convert to `Category` interface with `children` array
4. Add `showChildren: false` UI state

### Source 2: GraphQL (via Filters.vue)
**Query**: `getAllTerms` with `PRODUCTCATEGORY` taxonomy

**Expected Structure** (to be verified):
```typescript
interface GraphQLTerm {
  id: string;
  name: string;
  slug: string;
  count: number;
  taxonomyName: string;  // 'product_cat'
  parent?: {
    node?: {
      id: string;
    }
  }
}
```

**Transformation Needed**:
1. Filter terms where `taxonomyName === 'product_cat'`
2. Build hierarchy using `parent.node.id`
3. Convert to same `Category` interface
4. Match REST API structure exactly

## Hierarchy Building Algorithm

```typescript
// Pseudo-code for building category tree
function buildHierarchy(flatCategories: WooCategory[]): Category[] {
  const categoryMap = new Map<string, Category>();
  
  // Step 1: Create all category objects
  flatCategories.forEach(cat => {
    if (cat.count > 0) {  // Only show categories with products
      categoryMap.set(cat.id.toString(), {
        id: cat.id.toString(),
        name: cat.name,
        slug: cat.slug,
        count: cat.count,
        children: [],
        showChildren: false
      });
    }
  });
  
  // Step 2: Build parent-child relationships
  const topLevel: Category[] = [];
  
  flatCategories.forEach(cat => {
    const category = categoryMap.get(cat.id.toString());
    if (!category) return;
    
    if (cat.parent === 0) {
      // Top-level category
      topLevel.push(category);
    } else {
      // Child category - add to parent's children array
      const parent = categoryMap.get(cat.parent.toString());
      if (parent) {
        parent.children.push(category);
      }
    }
  });
  
  // Step 3: Sort alphabetically
  return sortCategoriesRecursively(topLevel);
}
```

## Key Requirements

### Structure Rules
1. **Recursive**: Categories can have unlimited nesting depth
2. **Count-based filtering**: Only show categories with `count > 0`
3. **Alphabetical sorting**: Sort at each level of hierarchy
4. **Preserve hierarchy**: Parent-child relationships must be maintained

### UI State
- `showChildren: boolean` - Controls collapse/expand of child categories
- Must persist through re-renders
- Should be toggleable independently per category

## Notes

### Data Flow

1. **Server API** (`/api/categories`) fetches from WooCommerce REST API
2. **CategoriesService** builds hierarchy from flat list
3. **useCategories** composable transforms to display format
4. **CategoryFilter** component renders the tree

### Performance Considerations

- Categories are fetched **client-side** on mount
- Data is cached in localStorage for faster subsequent loads
- Hierarchy building happens in `getCategoryHierarchy()`
- Transform happens in `transformCategory()`

### Reliability & Error Handling

**Automatic Retry Mechanism**: 
- Retries up to **5 times** if the initial fetch fails
- Uses **exponential backoff** to avoid overwhelming the server:
  - Attempt 1: Immediate
  - Attempt 2: Wait 1 second
  - Attempt 3: Wait 2 seconds
  - Attempt 4: Wait 4 seconds
  - Attempt 5: Wait 8 seconds
  - Attempt 6: Wait 10 seconds (max delay)
- Falls back to **cached data** if all retries fail
- Shows **retry button** in UI after exhausting all attempts
- Prevents infinite retry loops (max 5 attempts)

**Cache Fallback Strategy**:
1. Try fresh API fetch (with retries)
2. If all retries fail, load from localStorage cache
3. If no cache available, show error UI with manual retry button
4. User can click "Retry Loading" to attempt again

### SSR Optimization (IMPLEMENTED ✅)

**CategoryFilter now uses Server-Side Rendered data** - NO MORE STUTTER!

**How it works**:
1. **Filters.vue** fetches categories via GraphQL SSR (`await useAsyncGql('getAllTerms')`)
2. **productCategoryTerms** are ready BEFORE page renders (same as products)
3. **CategoryFilter** receives `ssrTerms` prop with pre-loaded data
4. **Instant transformation** - GraphQL terms → Category hierarchy (computed, synchronous)
5. **Zero async fetch** - no loading state, no stutter, no layout shift

**Data Flow**:
```
Filters.vue (SSR) 
  ↓ await useAsyncGql('getAllTerms')
  ↓ Filter: term.taxonomyName === 'product_cat'
  ↓ Pass as prop: :ssr-terms="productCategoryTerms"
CategoryFilter.vue
  ↓ transformGraphQLTermsToCategories() [instant, computed]
  ↓ Render immediately
```

**Fallback**: If no SSR terms provided, falls back to REST API with retry mechanism

**Skeleton Loader**: Only shows as fallback when SSR data is unavailable
- Smooth animated placeholder that mimics category structure
- Displays 8 skeleton items with varying widths
- Includes nested child category skeletons
- Prevents jarring "flash of empty content"

