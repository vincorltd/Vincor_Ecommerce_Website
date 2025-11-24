# 🔍 Product Add-ons Debugging Guide

## Current Setup Status

### ✅ What's Already Configured

1. **Server Proxy** (`/api/products/[slug]`):
   - ✅ Uses `context=view` to get all add-ons (product-specific + global)
   - ✅ Properly authenticated with your API keys
   - ✅ Returns product with add-ons included

2. **Product Page** (`[slug].vue`):
   - ✅ Using REST API (not GraphQL)
   - ✅ Imports transformation functions
   - ✅ Has add-ons display logic in template
   - ✅ No variations logic (since you don't use them)

3. **Enhanced Logging**:
   - Shows raw product data from API
   - Shows transformed add-ons
   - Shows final add-ons count

---

## Console Logs You'll See Now

### Product WITH Add-ons:
```
[Products API] 🔍 Fetching product: element-12w-ka-band-buc
[Products API] 🔐 Calling authenticated REST API with context=view
[Products API] ✅ Product fetched: ELEMENT 12W Ka-Band BUC
[Products API] 🎁 Add-ons included: 2

[Product Page] ✅ Product fetched: ELEMENT 12W Ka-Band BUC
[Product Page] 📋 Raw product data: {
  id: 12345,
  name: "ELEMENT 12W Ka-Band BUC",
  type: "simple",
  addons: [
    {
      id: "1234567890",
      name: "Gift Wrapping",
      type: "multiple_choice",
      ...
    }
  ],
  exclude_global_add_ons: false
}
[Product Page] 🔄 Transformed addons: [Array of transformed add-ons]
[Product Page] 🎯 Product ready with add-ons: 2
```

### Product WITHOUT Add-ons (Current Issue):
```
[Products API] ✅ Product fetched: ELEMENT 12W Ka-Band BUC
[Products API] 🎁 Add-ons included: 0

[Product Page] 📋 Raw product data: {
  addons: [] or undefined
}
[Product Page] 🎯 Product ready with add-ons: 0
```

---

## Why Add-ons Might Show as 0

Based on the [WooCommerce Product Add-ons REST API documentation](https://woocommerce.com/document/product-add-ons-rest-api-reference/), here are the possible reasons:

### 1. **Product Has No Add-ons Assigned**
- Check in WP Admin → Products → Edit Product
- Scroll down to "Product Add-Ons" section
- Are there any add-ons configured for this specific product?

### 2. **Global Add-ons Not Applying**
- Check if `exclude_global_add_ons` is `true` in the console log
- If true, this product explicitly excludes global add-ons
- Go to WP Admin → Products → Product Add-ons → Global Add-ons
- Check if there are global add-ons configured
- Check the "Apply to Categories" settings

### 3. **WooCommerce Product Add-ons Plugin Issues**
- **Version**: Must be 6.9.0 or higher (REST API support added in 6.9.0)
- **REST API**: Must be enabled in plugin settings
- Check: WP Admin → Products → Product Add-ons → Settings

### 4. **Category Restrictions**
Global add-ons can be restricted to specific categories:
- If your product is in category "Amplifiers"
- But global add-ons only apply to "Accessories"
- They won't show up

---

## How to Test Add-ons

### Method 1: Check in WordPress Admin
1. Go to: WP Admin → Products → All Products
2. Edit: "ELEMENT 12W Ka-Band BUC"
3. Scroll to: "Product Add-Ons" section
4. Screenshot what you see and share

### Method 2: Test API Directly
Run this in your browser console or terminal:

```bash
# Get product with add-ons
curl "https://satchart.com/wp-json/wc/v3/products?slug=element-12w-ka-band-buc&context=view&consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"
```

Look for the `addons` array in the response.

### Method 3: Check Global Add-ons
```bash
# Get all global add-on groups
curl "https://satchart.com/wp-json/wc-product-add-ons/v2/global-add-ons?consumer_key=YOUR_KEY&consumer_secret=YOUR_SECRET"
```

---

## Quick Fixes to Try

### Fix 1: Create a Test Product with Add-ons
1. WP Admin → Products → Add New
2. Name it "Test Product with Add-ons"
3. Set price: $10
4. Scroll to "Product Add-Ons" section
5. Click "Add Field"
6. Add a simple text field
7. Publish
8. Visit the product page

### Fix 2: Create a Global Add-on
1. WP Admin → Products → Product Add-ons
2. Click "Add Add-On Group"
3. Name: "Global Gift Options"
4. Add a Multiple Choice field
5. Leave "Apply to Categories" empty (applies to all)
6. Save
7. Visit any product page

### Fix 3: Check Plugin Version
1. WP Admin → Plugins
2. Find "WooCommerce Product Add-Ons"
3. Check version (must be 6.9.0+)
4. Update if needed

---

## What the REST API Returns

According to the [official documentation](https://woocommerce.com/document/product-add-ons-rest-api-reference/):

### With `context=view` (what we're using):
```json
{
  "id": 123,
  "name": "Product Name",
  "exclude_global_add_ons": false,
  "addons": [
    {
      "id": "1719406272",
      "name": "Gift Wrapping",
      "title_format": "label",
      "type": "multiple_choice",
      "display": "select",
      "required": true,
      "options": [
        {
          "label": "Gold",
          "price": "15.00",
          "price_type": "flat_fee"
        }
      ]
    }
  ]
}
```

### With `context=edit`:
Only returns product-specific add-ons (not global ones).

---

## Next Steps

1. **Refresh the product page** and check the new console logs
2. **Look for the "📋 Raw product data:" log** - this shows exactly what the API returned
3. **Check if `addons` is an empty array `[]` or `undefined`**
4. **If empty/undefined**: The product genuinely has no add-ons configured in WooCommerce
5. **If has data**: Check the transformation step

---

## Server Proxy Code Reference

Current `server/api/products/[slug].get.ts`:
```typescript
url.searchParams.append('context', 'view'); // Gets product + global add-ons
```

This is correct according to [WooCommerce docs](https://woocommerce.com/document/product-add-ons-rest-api-reference/#h-product-add-ons):
> `context=view` — retrieve product-specific **and** global add-ons applicable to this product (as you'd see it on the single product page)

---

## Summary

✅ **Code is correct** - using REST API with `context=view`  
✅ **Server proxy is working** - authentication successful  
✅ **Logging added** - will show raw API response  
❓ **Issue**: Product likely has no add-ons configured in WooCommerce

**Most Likely Cause**: The product doesn't have add-ons assigned, OR global add-ons aren't configured/applying.

**Action Required**: Check WordPress Admin to see if add-ons are actually configured for this product.

---

**Last Updated**: November 14, 2024  
**Status**: ✅ Code Ready - Awaiting WooCommerce Add-ons Configuration Check




