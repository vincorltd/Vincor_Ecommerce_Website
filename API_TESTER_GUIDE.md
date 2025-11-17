# WooCommerce API Tester - Usage Guide

## Overview

A Vue-based API testing tool that lets you explore WooCommerce product addons via REST API. Uses server-side .env credentials for secure authentication.

## 🚀 Quick Start

1. **Start your Nuxt dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the API Tester:**
   ```
   http://localhost:3000/api-tester
   ```

## 🔑 Environment Variables

The tester uses your existing `.env` file credentials:

```env
# Required in your .env file
WOO_CONSUMER_KEY=ck_...
WOO_CONSUMER_SECRET=cs_...
WOO_REST_API_URL=https://satchart.com/wp-json
```

## 📡 Available Endpoints

### 1. **All Products**
- Gets all products with `context=view` to include addons
- Returns up to 100 products
- Endpoint: `/wc/v3/products?per_page=100&context=view`

### 2. **Single Product**
- Get one product by ID or slug
- Enter product ID (e.g., `6738`) or slug (e.g., `element-12w-ka-band-buc`)
- Endpoint: `/wc/v3/products/{id}?context=view`

### 3. **Global Addons**
- Gets all global addon groups
- Endpoint: `/wc-product-add-ons/v2/global-add-ons`

### 4. **Product Addons (v3)**
- Gets addons for a specific product
- Requires product ID
- Endpoint: `/wc/v3/products/{id}/addons`

### 5. **Product Addons (v1)**
- Alternative addons endpoint
- Requires product ID
- Endpoint: `/wc-product-add-ons/v1/product-add-ons/{id}`

## 🎯 Key Features

### 📦 Get All Products with Addons
This special button:
1. Fetches all products
2. Filters only products that have addons
3. Returns a simplified view with:
   - Product ID, name, slug
   - Addon count
   - Each addon's name, type, required status, and option count

### 📋 Copy JSON
Click the "Copy JSON" button to copy the entire API response to your clipboard for easy use in your code.

### 🔄 Clear Results
Clear the current results and start a new test.

## 🎨 What to Look For

### ✅ Successful Response
If addons are working, you should see:

```json
{
  "id": 6738,
  "name": "Product Name",
  "addons": [
    {
      "id": "1719406272",
      "name": "Gift Wrapping",
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

### ⚠️ No Addons Found
If you see 0 products with addons, check:
1. Are addons configured in WordPress?
2. Is the WooCommerce Product Add-ons plugin active?
3. Try reactivating the plugin
4. Flush permalinks in WordPress (Settings → Permalinks → Save)
5. Clear WordPress cache

## 🔧 Technical Details

### Server-Side Processing
- All API calls are made from the Nuxt server
- Credentials never exposed to the browser
- No CORS issues
- Automatic authentication using .env variables

### Server API Route
Location: `woonuxt_base/server/api/test-woo-api.ts`

Handles:
- Endpoint selection
- URL construction
- Authentication
- Error handling
- Response formatting

### Vue Page
Location: `woonuxt_base/app/pages/api-tester.vue`

Features:
- Clean, modern UI with Tailwind CSS
- Responsive design
- Loading states
- Error handling
- Success/warning messages
- JSON syntax highlighting
- Copy to clipboard

## 🐛 Troubleshooting

### "Missing WooCommerce API credentials"
- Check your `.env` file exists
- Verify `WOO_CONSUMER_KEY` and `WOO_CONSUMER_SECRET` are set
- Restart your dev server after editing .env

### "Product not found"
- Verify the product ID or slug is correct
- Check the product exists in WooCommerce
- Try using the ID instead of slug (or vice versa)

### "Failed to fetch data"
- Check your WordPress site is accessible
- Verify the API credentials are valid
- Check server logs for detailed error messages

## 📝 Notes

- This page is set to `noindex, nofollow` for SEO
- It's intended for development/testing only
- In production, consider password-protecting this route
- All API calls are logged to the server console for debugging

## 🎯 Next Steps

Once you confirm addons are returning in the API:
1. Copy the JSON structure
2. Update your product transformation code
3. Integrate addons into product pages
4. Add addons to cart functionality


