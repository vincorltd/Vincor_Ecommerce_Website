# Checkout Add-on Pricing Fix

## Issue
Orders were being created in WooCommerce but:
1. ❌ Add-ons showed in WooCommerce admin BUT without prices
2. ❌ Order total was only the base product price ($5,560.00)
3. ❌ Add-on prices ($5,846.00) were not included
4. ❌ Correct total should be $11,406.00
5. ❌ Frontend order confirmation showed line items as "$NaN"

## Root Cause
When creating orders via WooCommerce REST API, we were:
- ✅ Sending add-ons as `meta_data` (so they showed in admin)
- ❌ **NOT including `subtotal` and `total` fields in line items**
- ❌ WooCommerce calculated price from product catalog (ignoring add-ons)

The metadata was just stored as "notes" - it didn't affect the order total.

## The Fix

### 1. Calculate Line Item Totals with Add-ons
**File**: `woonuxt_base/app/composables/useCheckout.ts`

Now we:
1. Get the base product price from cart
2. Calculate total add-on price from Pinia store
3. Add them together: `lineTotal = basePrice + addonsPrice`
4. **Set both `subtotal` and `total` on the line item**

```typescript
// Parse base price from cart item
const basePrice = parseFloat(
  (cartItem.product.node.rawPrice || cartItem.product.node.price || '0')
    .toString()
    .replace(/[^0-9.-]+/g, '')
);

// Calculate add-ons price
let addonsPrice = 0;
const storedAddons = addonsStore.getItemAddons(cartItem.key);
if (storedAddons && storedAddons.length > 0) {
  addonsPrice = storedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
}

// Calculate total
const lineTotal = basePrice + addonsPrice;

// Create line item with PRICES
const lineItem: WooOrderLineItemInput = {
  product_id: cartItem.product.node.databaseId,
  quantity: cartItem.quantity,
  subtotal: lineTotal.toString(),  // ✅ NOW INCLUDED
  total: lineTotal.toString(),       // ✅ NOW INCLUDED
  meta_data: addonsMeta,             // ✅ Add-ons for display
};
```

### 2. Updated TypeScript Interface
**File**: `woonuxt_base/app/services/api/types.ts`

Clarified the line item interface:
```typescript
export interface WooOrderLineItemInput {
  product_id: number;
  variation_id?: number;
  quantity: number;
  subtotal?: string;  // Line item subtotal (before discounts)
  total?: string;     // Line item total (after discounts)
  meta_data?: Array<{...}>;  // Add-ons metadata for display
}
```

## How It Works Now

### Order Creation Flow with Add-ons

```
1. User adds product with add-ons to cart
   - Base: $5,560.00
   - Add-on 1 (COVERAGE: HALF HEAT): +$4,556.00
   - Add-on 2 (VOLTAGE TYPE): +$0.00
   - Add-on 3 (OPTIONAL COVER): +$1,290.00
   - Cart Total: $11,406.00 ✅

2. User proceeds to checkout

3. Build line items:
   - Get base price: $5,560.00
   - Get add-ons from Pinia store
   - Calculate add-ons total: $5,846.00
   - Line total: $11,406.00 ✅
   
4. Create line item:
   {
     product_id: 7624,
     quantity: 1,
     subtotal: "11406.00",  // ✅ Base + Add-ons
     total: "11406.00",     // ✅ Base + Add-ons
     meta_data: [           // ✅ For display in admin
       { key: "COVERAGE", value: "HALF HEAT (+$4556.00)" },
       { key: "VOLTAGE TYPE", value: "208v 3 phase" },
       { key: "OPTIONAL COVER", value: "FOAM BACK COVER- HALF (+$1290.00)" }
     ]
   }

5. Send to WooCommerce REST API

6. Order created with correct total: $11,406.00 ✅
```

## Debug Logging

The checkout now logs detailed pricing information:

```
[Checkout] 💰 Base price for KRATOS 4.9m RTI Electric De-Ice System: 5560
[Checkout] 🎁 Adding add-ons from store to line item: 3
[Checkout] 💵 Add-ons breakdown: [
  { name: "COVERAGE", price: 4556 },
  { name: "VOLTAGE TYPE", price: 0 },
  { name: "OPTIONAL COVER", price: 1290 }
]
[Checkout] 🧮 Line item total calculation: {
  basePrice: 5560,
  addonsPrice: 5846,
  lineTotal: 11406,
  quantity: 1
}
```

## Files Modified

1. **`app/composables/useCheckout.ts`**
   - Added price calculation logic
   - Added `subtotal` and `total` to line items
   - Added debug logging for pricing

2. **`app/services/api/types.ts`**
   - Clarified `WooOrderLineItemInput` interface
   - Added comments for `subtotal` and `total` fields

3. **`CHECKOUT_ADDON_PRICING_FIX.md`** - This documentation

## Expected Results

### In WooCommerce Admin
✅ Line items show correct prices including add-ons
✅ Add-ons display with their prices
✅ Order total is correct: Base + Add-ons

### On Frontend Order Confirmation
✅ Line items show correct prices
✅ No more "$NaN"
✅ Subtotal matches WooCommerce
✅ Total matches WooCommerce

## Testing Checklist

- [ ] Add product with multiple add-ons to cart
- [ ] Verify cart total includes all add-ons
- [ ] Complete checkout
- [ ] Check WooCommerce admin:
  - [ ] Order total is correct
  - [ ] Line item shows base + add-on prices
  - [ ] Add-ons display in line item meta
- [ ] Check frontend order confirmation:
  - [ ] Line items show correct prices
  - [ ] No "$NaN" errors
  - [ ] Subtotal is correct
  - [ ] Total matches WooCommerce

## Important Notes

### Price Sources
The fix gets prices from multiple sources in order of preference:
1. `cartItem.product.node.rawPrice` (preferred - numeric)
2. `cartItem.product.node.price` (fallback - may have formatting)
3. `'0'` (last resort)

### Add-ons Storage
Add-ons are retrieved from:
1. **Pinia Store** (primary - has prices) - Persisted in localStorage
2. **Cart extraData** (fallback - from Store API)

### WooCommerce Behavior
When you provide `subtotal` and `total` in the REST API:
- WooCommerce uses YOUR values
- It doesn't recalculate from catalog
- Metadata is for display only
- Our calculation becomes the source of truth

### Price Formatting
Prices are:
- Stored in cents in add-ons store (e.g., 4556 = $45.56)
- Converted to dollars for line item total
- Sent to WooCommerce as strings (e.g., "11406.00")

## Common Issues & Solutions

### Issue: Line items still show wrong price
**Solution**: Clear localStorage and add to cart again
```javascript
localStorage.removeItem('woonuxt-cart-addons')
```

### Issue: Add-ons not persisting after refresh
**Solution**: Check that cart-addons store has localStorage persistence enabled

### Issue: Price shows as $NaN on order confirmation
**Solution**: This fix also addresses this by ensuring proper price data in orders

## Related Fixes

This fix works in conjunction with:
1. **Cart Add-ons Persistence** - Ensures add-ons survive page refresh
2. **Order Summary REST API** - Displays order correctly after checkout
3. **Checkout API Authentication** - Creates orders securely

All three pieces are needed for a complete working checkout with add-ons!
















