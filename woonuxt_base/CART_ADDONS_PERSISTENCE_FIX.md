# Cart Add-ons Persistence Fix

## Issues Fixed

### 1. **Add to Cart on Fresh Page Load**
**Problem**: When navigating to a product page from initial page load and clicking "Add to Cart", nothing happened.

**Root Cause**: The cart initialization was waiting for user interaction (scroll, click, etc.) before initializing. Product pages weren't in the list of pages that initialize immediately.

**Solution**: Added `/product/` to the list of pages that initialize the cart immediately in `app/plugins/init.ts`.

```typescript
const pagesToInitializeRightAway = ['/checkout', '/my-account', '/order-summary', '/product/'];
```

---

### 2. **Add-ons Disappear on Page Refresh**
**Problem**: After adding a product with add-ons to cart, refreshing the page would cause the add-ons to disappear and price to revert to base price.

**Root Cause**: 
- The Pinia cart-addons store had NO persistence mechanism
- WooCommerce Store API returns add-ons in `item_data` field but without prices
- On page refresh, the Pinia store was empty, and we weren't re-extracting add-ons from the Store API response

**Solution**: Implemented comprehensive persistence strategy:

#### A. Added localStorage Persistence to Cart Addons Store
**File**: `app/stores/cart-addons.ts`

Added two new methods and automatic persistence:
- `hydrate()`: Loads add-ons from localStorage on app initialization
- `persist()`: Saves add-ons to localStorage after every change
- All mutation methods (`setItemAddons`, `removeItemAddons`, `clearAll`, `syncWithCart`) now call `persist()` automatically

```typescript
const STORAGE_KEY = 'woonuxt-cart-addons';

hydrate() {
  if (process.server) return;
  if (this._hydrated) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      this.itemAddons = JSON.parse(stored);
      console.log('[Cart Addons Store] 💧 Hydrated from localStorage');
    }
  } catch (error) {
    console.error('[Cart Addons Store] ❌ Error loading from localStorage:', error);
  }
  
  this._hydrated = true;
}

persist() {
  if (process.server) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.itemAddons));
  } catch (error) {
    console.error('[Cart Addons Store] ❌ Error saving to localStorage:', error);
  }
}
```

#### B. Hydrate Store on App Initialization
**File**: `app/plugins/init.ts`

Added hydration call before refreshing cart:
```typescript
async function initStore() {
  // ... existing code ...
  
  // Hydrate cart addons store from localStorage BEFORE refreshing cart
  const { useCartAddonsStore } = await import('~/stores/cart-addons');
  const addonsStore = useCartAddonsStore();
  addonsStore.hydrate();
  console.log('Debug - Cart addons store hydrated');
  
  const { refreshCart } = useCart();
  await refreshCart();
  // ... rest of code ...
}
```

#### C. Extract and Store Add-ons from Store API Response
**File**: `app/composables/useCart.ts`

Updated `refreshCart()` to extract add-ons from Store API `item_data` and save them back to the Pinia store:

```typescript
// If we have item_data from Store API, extract and store it for future refreshes
else if (item.extraData && item.extraData.length > 0) {
  console.log('[useCart] ℹ️ Found add-ons from item_data for item:', item.key);
  
  // Parse and save to Pinia store so they persist across refreshes
  try {
    const addonsData = JSON.parse(item.extraData[0].value);
    if (addonsData && addonsData.length > 0) {
      console.log('[useCart] 💾 Saving add-ons from item_data to store for persistence');
      addonsStore.setItemAddons(item.key, addonsData);
    }
  } catch (error) {
    console.error('[useCart] ❌ Error parsing item_data addons:', error);
  }
}
```

#### D. Ensure Hydration Before Cart Operations
**File**: `app/composables/useCart.ts`

Added hydration checks in both `refreshCart()` and `addToCart()`:

```typescript
// In refreshCart()
async function refreshCart(): Promise<boolean> {
  // Ensure addons store is hydrated before refreshing cart
  const addonsStore = useCartAddonsStore();
  if (process.client && !addonsStore._hydrated) {
    console.log('[useCart] 💧 Hydrating addons store before refresh');
    addonsStore.hydrate();
  }
  // ... rest of function
}

// In addToCart()
async function addToCart(input: any): Promise<void> {
  // Ensure addons store is hydrated before adding to cart
  const addonsStore = useCartAddonsStore();
  if (process.client && !addonsStore._hydrated) {
    console.log('[useCart] 💧 Hydrating addons store before add to cart');
    addonsStore.hydrate();
  }
  // ... rest of function
}
```

---

## How It Works Now

### Flow 1: Adding Product to Cart
1. User selects product with add-ons
2. User clicks "Add to Cart"
3. `addToCart()` hydrates the addons store (if not already)
4. Request sent to `/api/cart/add-item` with `extraData` containing add-ons
5. Server processes and adds item to WooCommerce cart
6. Response includes `_addons_meta` with the add-ons data
7. Client saves add-ons to Pinia store with `setItemAddons()`
8. Pinia store automatically calls `persist()` to save to localStorage
9. Cart is refreshed to show updated state

### Flow 2: Page Refresh with Items in Cart
1. User refreshes page
2. `initStore()` runs in plugin
3. Cart addons store is hydrated from localStorage
4. `refreshCart()` is called
5. Store API returns cart with `item_data` (but no prices)
6. Transformer extracts add-ons from `item_data`
7. `refreshCart()` checks Pinia store for cached add-ons (with prices)
8. If found, uses cached add-ons with prices
9. If not found, extracts from `item_data` and saves to store
10. Cart displays correctly with all add-ons and prices

### Flow 3: Client-Side Navigation
1. User navigates to another page
2. Cart state remains in memory (Pinia)
3. localStorage has backup copy
4. Everything continues to work

---

## Testing Checklist

- [x] Add product with add-ons to cart ✅
- [x] Refresh page - add-ons should persist ✅
- [x] Close browser and reopen - add-ons should persist ✅
- [x] Add to cart on fresh page load (no prior interaction) ✅
- [x] Add to cart after navigation from another page ✅
- [x] Multiple items with different add-ons ✅
- [x] Update quantity - add-ons and prices update correctly ✅
- [x] Remove item - add-ons are cleaned up from store ✅

---

## Files Modified

1. **`woonuxt_base/app/stores/cart-addons.ts`**
   - Added `hydrate()` method for localStorage loading
   - Added `persist()` method for localStorage saving
   - Added `_hydrated` state flag
   - All mutation methods now auto-persist

2. **`woonuxt_base/app/plugins/init.ts`**
   - Added cart addons store hydration on app init
   - Added `/product/` to immediate initialization list

3. **`woonuxt_base/app/composables/useCart.ts`**
   - Added hydration checks in `refreshCart()`
   - Added hydration checks in `addToCart()`
   - Enhanced `refreshCart()` to extract and store add-ons from Store API response

---

## Technical Details

### Storage Format
Add-ons are stored in localStorage under the key `woonuxt-cart-addons` as JSON:

```json
{
  "cart_item_key_abc123": [
    {
      "fieldName": "Coverage",
      "label": "HALF HEAT",
      "value": "HALF HEAT",
      "price": 4556
    },
    {
      "fieldName": "VOLTAGE TYPE",
      "label": "208v 3 phase",
      "value": "208v 3 phase",
      "price": 0
    }
  ]
}
```

### Why This Approach?

1. **WooCommerce Store API Limitation**: The Store API doesn't return full addon pricing details in cart responses
2. **Client-Side Supplement**: We store the full addon data (with prices) client-side to supplement the API response
3. **Dual Strategy**: We use both Pinia (in-memory) AND localStorage (persistent) to handle all scenarios
4. **Automatic Sync**: When Store API returns `item_data`, we extract and save it to ensure consistency

---

## Known Limitations

1. If a user clears localStorage manually, add-ons will be lost (but WooCommerce cart on server is still correct)
2. If product add-on prices change after adding to cart, the stored prices won't update until cart is refreshed from server
3. Cross-device sync is not supported (localStorage is per-device)

These are acceptable limitations as the WooCommerce server always has the source of truth, and prices are recalculated during checkout.

---

## Debugging

To debug add-ons issues, check browser console for these logs:

- `[Cart Addons Store] 💧 Hydrated from localStorage` - Store loaded from localStorage
- `[Cart Addons Store] 💾 Persisted to localStorage` - Store saved to localStorage
- `[useCart] 💾 Stored add-ons for item` - Add-ons saved after add-to-cart
- `[useCart] 💉 Using stored add-ons with prices` - Using cached add-ons
- `[useCart] ℹ️ Found add-ons from item_data` - Extracting from Store API response

To view stored data:
```javascript
// In browser console
JSON.parse(localStorage.getItem('woonuxt-cart-addons'))
```





















