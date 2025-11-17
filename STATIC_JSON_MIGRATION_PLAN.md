# Static JSON Migration Plan - Products Page

## Overview
Convert the products page from GraphQL to static JSON files for instant loading and reliable filtering. This follows the same pattern successfully implemented for categories.

## Current Status
✅ Categories - COMPLETED (using static JSON)
🔄 Products - IN PROGRESS
🔄 Brands - IN PROGRESS

## Goal
- Products page loads instantly from static JSON
- All filters (Categories, Brands) work correctly
- Product detail pages ([slug].vue) remain unchanged (still use GraphQL)
- Single command to update all static data

---

## Phase 1: Data Fetching Scripts ⏳

### Task 1.1: Create Product Fetching Script ✅
**File**: `woonuxt_base/scripts/update-products.ts`
**Status**: CREATED (needs testing)
**What it does**:
- Fetches all products from WooCommerce REST API
- Extracts only essential fields: id, name, slug, price, image, categories, tags, stockStatus
- Saves to `woonuxt_base/app/data/products.json`
- Handles pagination (100 products per page)

**Fields extracted**:
```typescript
{
  id: number
  name: string
  slug: string  // CRITICAL - for linking to [slug].vue
  regularPrice: string
  salePrice: string
  price: string
  image: { sourceUrl, altText, title } | null
  categories: Array<{ id, name, slug }>
  tags: Array<{ id, name, slug }>  // For brand filtering
  stockStatus: string
}
```

### Task 1.2: Create Brands Fetching Script ✅
**File**: `woonuxt_base/scripts/update-brands.ts`
**Status**: CREATED (needs testing)
**What it does**:
- Fetches all product tags from WooCommerce REST API
- Filters to only brand tags (single word, alphabetic)
- Maps to display names (e.g., 'norsat' → 'Norsat')
- Saves to `woonuxt_base/app/data/brands.json`

### Task 1.3: Create Master Update Script ⏳
**File**: `woonuxt_base/scripts/update-all.ts`
**Status**: NOT STARTED
**What it does**:
- Runs all update scripts in sequence:
  1. update-categories.ts
  2. update-products.ts
  3. update-brands.ts
- Shows progress for each
- Reports final summary

**Command**: `npm run update-all`

### Task 1.4: Add NPM Scripts ⏳
**File**: `package.json`
**Status**: NOT STARTED
**Add these scripts**:
```json
{
  "update-products": "tsx woonuxt_base/scripts/update-products.ts",
  "update-brands": "tsx woonuxt_base/scripts/update-brands.ts",
  "update-all": "tsx woonuxt_base/scripts/update-all.ts"
}
```

---

## Phase 2: Update Products Page Components 🔄

### Task 2.1: Update products.vue ⏳
**File**: `woonuxt_base/app/pages/products.vue`
**Status**: NOT STARTED

**Current**:
```typescript
const { data } = await useAsyncGql('getProducts');
const allProducts = (data.value?.products?.nodes || []) as Product[];
setProducts(allProducts);
```

**Change to**:
```typescript
import productsData from '~/data/products.json';

// Load products from static JSON
const allProducts = ref(productsData.products);
setProducts(allProducts.value);
```

**Important**: 
- Remove GraphQL import
- Keep all filtering logic (it's handled by useProducts composable)
- Keep layout and UI exactly the same

### Task 2.2: Update CategoryFilterNew to Actually Filter ⏳
**File**: `woonuxt_base/app/components/filtering/CategoryFilterNew.vue`
**Status**: PARTIALLY COMPLETE (loads categories but doesn't filter products)

**Issue**: When checkbox is clicked, it calls `setFilter('category', ...)` but products don't update

**Fix**: Ensure the component properly:
1. Updates `selectedTerms` when checkbox clicked ✅
2. Calls `setFilter('category', selectedTerms)` ✅
3. Emits 'filter-selected' event ✅
4. Products composable receives filter update ❌ (needs verification)

**Test**:
- Click category checkbox
- Verify products filter correctly
- Verify URL updates with ?category=slug

### Task 2.3: Update BrandFilter to Use Static JSON ⏳
**File**: `woonuxt_base/app/components/filtering/BrandFilter.vue`
**Status**: NOT STARTED

**Current**:
```typescript
const brands = computed(() => {
  const brandMap = new Map<string, Brand>();
  products.value?.forEach(product => {
    product.productTags?.nodes?.forEach(tag => {
      // ... extracts brands from products
    });
  });
  return Array.from(brandMap.values());
});
```

**Change to**:
```typescript
import brandsData from '~/data/brands.json';

const brands = ref(brandsData.brands);
```

**Also ensure**:
- Filter logic works correctly
- Selected brand filters products
- URL updates with ?brand=slug

---

## Phase 3: Update useProducts Composable (if needed) 🔍

### Task 3.1: Verify Filtering Logic ⏳
**File**: `woonuxt_base/app/composables/useProducts.ts`
**Status**: NEEDS REVIEW

**Check**:
- Does it properly filter by category slug?
- Does it properly filter by brand slug?
- Does it handle multiple filters?
- Does it update `filteredProducts` correctly?

**Possible Issue**:
The composable might be expecting GraphQL structure (e.g., `product.productCategories.nodes`) but static JSON has different structure (`product.categories`)

**Fix if needed**:
```typescript
// OLD (GraphQL structure)
product.productCategories?.nodes?.some(cat => selectedCategories.includes(cat.slug))

// NEW (REST API structure)
product.categories?.some(cat => selectedCategories.includes(cat.slug))
```

---

## Phase 4: Testing 🧪

### Task 4.1: Test Product Loading ⏳
- Run `npm run update-products`
- Verify `products.json` created with all products
- Verify products page loads instantly
- Verify all product data displays correctly (name, price, image)

### Task 4.2: Test Category Filtering ⏳
- Click category checkbox
- Verify products filter immediately
- Verify only products in that category show
- Verify URL updates
- Verify "Clear Filters" works

### Task 4.3: Test Brand Filtering ⏳
- Run `npm run update-brands`
- Verify `brands.json` created
- Click brand checkbox
- Verify products filter immediately
- Verify only products with that tag show

### Task 4.4: Test Product Links ⏳
- Click on a product card
- Verify it navigates to `/product/[slug]`
- Verify product detail page loads correctly (with GraphQL)
- Verify slug is correctly passed

### Task 4.5: Test Master Update Command ⏳
- Run `npm run update-all`
- Verify all 3 JSON files update
- Verify console shows progress for each
- Verify all filters work after update

---

## Phase 5: Cleanup 🧹

### Task 5.1: Remove Old Code ⏳
- Remove unused GraphQL queries from products.vue
- Remove `DebugCategories` component (if still exists)
- Remove old `CategoryFilter.vue` (replaced by CategoryFilterNew)

### Task 5.2: Update Documentation ⏳
- Update README with new update commands
- Document the static JSON approach
- Add notes about when to run `npm run update-all`

---

## File Structure After Migration

```
woonuxt_base/
├── app/
│   ├── data/
│   │   ├── categories.json      ✅ (72 categories)
│   │   ├── products.json        ⏳ (all products)
│   │   └── brands.json          ⏳ (all brands/tags)
│   ├── pages/
│   │   ├── products.vue         ⏳ (uses static JSON)
│   │   └── product/
│   │       └── [slug].vue       ✅ (still uses GraphQL - don't touch)
│   └── components/
│       └── filtering/
│           ├── CategoryFilterNew.vue  ⏳ (needs filter fix)
│           └── BrandFilter.vue        ⏳ (needs static JSON)
└── scripts/
    ├── update-categories.ts     ✅ (working)
    ├── update-products.ts       ⏳ (created, needs testing)
    ├── update-brands.ts         ⏳ (created, needs testing)
    └── update-all.ts            ⏳ (to be created)
```

---

## Commands Summary

```bash
# Individual updates
npm run update-categories    # ✅ Working
npm run update-products      # ⏳ To be added
npm run update-brands        # ⏳ To be added

# Update everything at once
npm run update-all          # ⏳ To be created

# Development
npm run dev                 # Run dev server
```

---

## Critical Requirements ⚠️

1. **DO NOT touch product detail pages** (`product/[slug].vue`) - they stay on GraphQL
2. **MUST include slug** in products JSON for linking
3. **MUST maintain** exact same UI/UX on products page
4. **MUST test** that filters actually work before marking complete
5. **Categories must match** between products.json and categories.json (same slug format)

---

## Success Criteria ✅

- [ ] Products page loads instantly from static JSON
- [ ] Category filter works and products update immediately
- [ ] Brand filter works and products update immediately
- [ ] Product cards link correctly to detail pages
- [ ] Single command (`npm run update-all`) updates everything
- [ ] No console errors
- [ ] No breaking changes to product detail pages

---

## Next Immediate Steps

1. ✅ Create update-products.ts script
2. ✅ Create update-brands.ts script
3. ⏳ Create update-all.ts master script
4. ⏳ Add NPM scripts to package.json
5. ⏳ Test update-products script
6. ⏳ Update products.vue to use static JSON
7. ⏳ Fix CategoryFilterNew filtering
8. ⏳ Update BrandFilter to use static JSON
9. ⏳ Test all filtering
10. ⏳ Cleanup and documentation


