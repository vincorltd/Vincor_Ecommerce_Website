# Product Add-ons Data Flow Documentation

## 📋 Overview

This document details how WooCommerce Product Add-ons flow through the system from Product → Cart → Order in both GraphQL (current) and REST API (target) implementations.

---

## 🔄 Current Implementation (GraphQL)

### **1. Product Page - Add-ons Structure**

**Source**: `queries/fragments/SimpleProduct.gql`

```graphql
addons {
  description
  fieldName         # "addon-1234567890"
  name             # "Gift Wrapping"
  price            # "10.00"
  priceType        # "FLAT_FEE" | "QUANTITY_BASED" | "PERCENTAGE_BASED"
  required         # true | false
  titleFormat      # "LABEL" | "HEADING" | "HIDE"
  type             # "MULTIPLE_CHOICE" | "CHECKBOX" | "CUSTOM_TEXT" | etc.
  
  ... on AddonMultipleChoice {
    description
    options {
      label        # "Gold"
      price        # "15.00"
      priceType    # "FLAT_FEE"
    }
  }
  
  ... on AddonCheckbox {
    description
    name
    options {
      label        # "Include card"
      price        # "5.00"
      priceType    # "FLAT_FEE"
    }
  }
}
```

**GraphQL Add-on Types**:
- `MULTIPLE_CHOICE` - Dropdown or radio buttons (single selection)
- `CHECKBOX` - Multiple checkboxes (multiple selections)
- `CUSTOM_TEXT` - Short text input
- `CUSTOM_TEXTAREA` - Long text input
- `FILE_UPLOAD` - File upload
- `CUSTOM_PRICE` - User enters price
- `INPUT_MULTIPLIER` - Quantity multiplier
- `DATEPICKER` - Date selection
- `HEADING` - Display only (no input)

### **2. Add to Cart - GraphQL Mutation**

**Source**: `pages/product/[slug].vue` (lines 327-331)

```javascript
// User's selected options
const selectedOptions = [
  {
    fieldName: "addon-1234567890",
    label: "Gold",
    price: 15,
    fieldType: "MULTIPLE_CHOICE",
    valueText: "Gold-1"
  }
];

// Transformation function (lines 135-146)
function convertData(inputData) {
  return inputData.reduce((accumulator, { fieldName, label, valueText }) => {
    const entry = accumulator.get(fieldName) || { 
      fieldName, 
      value: valueText ? '' : [] 
    };
    
    if (valueText) {
      entry.value = valueText;
    } else {
      entry.value.push(valueText ? valueText : label);
    }
    
    accumulator.set(fieldName, entry);
    return accumulator;
  }, new Map()).values();
}

// For checkbox type, merge array values (lines 159-166)
function mergeArrayValuesForCheckboxType(selectedAddons, allAddons) {
  return allAddons.map((addon) => ({
    fieldName: addon.fieldName,
    value: (selectedAddons.find((selectedAddon) => 
      selectedAddon.fieldName === addon.fieldName
    ) || { value: '' }).value,
  }));
}

// Final payload to GraphQL
const addons = [
  {
    fieldName: "addon-1234567890",
    value: "Gold-1"  // or array for checkbox
  }
];

// GraphQL mutation: addToCart({ productId, quantity, addons })
```

### **3. Cart - Add-ons Storage**

**Source**: `queries/fragments/CartFragment.gql` (lines 60-64)

```graphql
extraData {
  id
  key      # "addons"
  value    # JSON string
}
```

**Stored Format**:
```json
{
  "extraData": [
    {
      "id": "123",
      "key": "addons",
      "value": "[{\"fieldName\":\"addon-1234567890\",\"value\":\"Gold-1\",\"price\":15,\"label\":\"Gold\"}]"
    }
  ]
}
```

### **4. Cart Display - Parsing Add-ons**

**Source**: `components/cartElements/CartCard.vue` (lines 14-15)

```javascript
const extraData = JSON.parse(JSON.stringify(item.extraData));
const itemAddons = computed(() => 
  JSON.parse(extraData ? extraData.find(el => el.key === 'addons').value : [])
);

// Result:
// [{
//   fieldName: "addon-1234567890",
//   value: "Gold-1",
//   price: 15,
//   label: "Gold"
// }]
```

### **5. Cart Total Calculation - Client-Side**

**Source**: `components/shopElements/Cart.vue` (lines 4-22)

```javascript
const calculateCartTotal = computed(() => {
  return cart.value.contents.nodes.reduce((total, item) => {
    const productType = item.variation ? item.variation.node : item.product.node;
    const basePrice = parseFloat(productType?.rawRegularPrice || productType?.rawSalePrice || '0');
    
    let addonTotal = 0;
    try {
      const extraData = JSON.parse(JSON.stringify(item.extraData));
      const addons = JSON.parse(extraData ? extraData.find(el => el.key === 'addons')?.value || '[]' : '[]');
      addonTotal = addons.reduce((sum, addon) => sum + (parseFloat(addon.price) || 0), 0);
    } catch (e) {
      console.error('Error parsing addons:', e);
    }
    
    return total + ((basePrice + addonTotal) * item.quantity);
  }, 0);
});
```

### **6. Checkout - Order Creation**

**Source**: `queries/checkout.gql`

```graphql
mutation Checkout($billing, $shipping, $paymentMethod, ...) {
  checkout(input: {...}) {
    order {
      lineItems {
        nodes {
          quantity
          total
          # Add-ons are preserved in WooCommerce automatically
          # from the cart session
        }
      }
    }
  }
}
```

**Note**: GraphQL `checkout` mutation automatically transfers add-ons from cart to order line item meta data.

---

## 🎯 Target Implementation (REST API)

### **1. Product Page - Add-ons Structure**

**Endpoint**: `GET /wp-json/wc/v3/products?slug={slug}`

**REST API Response** (with Product Add-ons v6.9.0+):
```json
{
  "id": 123,
  "name": "Premium Gift Box",
  "slug": "premium-gift-box",
  "addons": [
    {
      "id": 1234567890,
      "name": "Gift Wrapping",
      "title_format": "label",
      "description": "Select wrapping paper color",
      "type": "multiple_choice",
      "display": "select",
      "required": true,
      "position": 0,
      "restrictions": 0,
      "restrictions_type": "any_text",
      "adjust_price": 1,
      "price_type": "flat_fee",
      "price": "0",
      "min": 0,
      "max": 0,
      "options": [
        {
          "label": "Silver",
          "price": "10",
          "price_type": "flat_fee"
        },
        {
          "label": "Gold",
          "price": "15",
          "price_type": "flat_fee"
        },
        {
          "label": "Platinum",
          "price": "20",
          "price_type": "flat_fee"
        }
      ]
    },
    {
      "id": 1234567891,
      "name": "Include extras",
      "type": "checkbox",
      "required": false,
      "options": [
        {
          "label": "Gift card",
          "price": "5",
          "price_type": "flat_fee"
        },
        {
          "label": "Ribbon",
          "price": "3",
          "price_type": "flat_fee"
        }
      ]
    },
    {
      "id": 1234567892,
      "name": "Personal message",
      "type": "custom_text",
      "required": false,
      "price": "0",
      "price_type": "flat_fee"
    }
  ]
}
```

**REST API Add-on Types** (lowercase, underscores):
- `multiple_choice` - Dropdown or radio (single selection)
- `checkbox` - Multiple checkboxes
- `custom_text` - Short text input
- `custom_textarea` - Long text input
- `file_upload` - File upload
- `custom_price` - User enters price
- `input_multiplier` - Quantity multiplier
- `datepicker` - Date selection
- `heading` - Display only

### **2. Add to Cart - Store API**

**Endpoint**: `POST /wp-json/wc/store/v1/cart/add-item`

**Request Body**:
```json
{
  "id": 123,
  "quantity": 1,
  "addons_configuration": {
    "1234567890": 1,              // multiple_choice: option index (0-based)
    "1234567891": [0, 1],         // checkbox: array of option indexes
    "1234567892": "Happy Birthday!" // custom_text: string value
  }
}
```

**Add-on Configuration Format by Type**:

| Type | Format | Example |
|------|--------|---------|
| `multiple_choice` | `number` (option index) | `"1234567890": 1` |
| `checkbox` | `number[]` (array of indexes) | `"1234567891": [0, 1]` |
| `custom_text` | `string` | `"1234567892": "Hello"` |
| `custom_textarea` | `string` | `"1234567893": "Long text..."` |
| `datepicker` | `string` (ISO8601) | `"1234567894": "2024-12-25T00:00:00"` |
| `file_upload` | `string` (URL) | `"1234567895": "https://example.com/file.jpg"` |
| `custom_price` | `number` | `"1234567896": 99.99` |
| `input_multiplier` | `number` | `"1234567897": 5` |

**Transformation Logic** (GraphQL → Store API):

```typescript
function formatAddonsForCart(
  selectedOptions: any[], 
  productAddons: any[]
): Record<string, any> {
  const config: Record<string, any> = {};
  
  selectedOptions.forEach((option, index) => {
    if (!option) return;
    
    const addon = productAddons[index];
    if (!addon) return;
    
    // Extract numeric ID from fieldName "addon-1234567890" → "1234567890"
    const addonId = addon.id || addon.fieldName?.replace('addon-', '');
    
    switch (addon.type.toLowerCase().replace('_', '')) {
      case 'multiplechoice':
      case 'multiple_choice':
        // Find index of selected option
        const optionIndex = addon.options?.findIndex(
          opt => opt.label === option.label
        );
        config[addonId] = optionIndex >= 0 ? optionIndex : 0;
        break;
        
      case 'checkbox':
        // Array of selected option indexes
        const selectedIndexes: number[] = [];
        addon.options?.forEach((opt: any, idx: number) => {
          if (selectedOptions.find(s => s?.label === opt.label)) {
            selectedIndexes.push(idx);
          }
        });
        config[addonId] = selectedIndexes;
        break;
        
      case 'customtext':
      case 'custom_text':
      case 'customtextarea':
      case 'custom_textarea':
        config[addonId] = option.valueText || option.value || '';
        break;
        
      case 'datepicker':
        // Convert to ISO8601
        const date = new Date(option.value);
        config[addonId] = date.toISOString();
        break;
        
      case 'customprice':
      case 'custom_price':
      case 'inputmultiplier':
      case 'input_multiplier':
        config[addonId] = parseFloat(option.value) || 0;
        break;
        
      case 'fileupload':
      case 'file_upload':
        config[addonId] = option.url || option.value || '';
        break;
    }
  });
  
  return config;
}
```

### **3. Cart - Add-ons Storage (Store API)**

**Endpoint**: `GET /wp-json/wc/store/v1/cart`

**Response**:
```json
{
  "items": [
    {
      "key": "abc123",
      "id": 123,
      "quantity": 1,
      "name": "Premium Gift Box",
      "totals": {
        "line_subtotal": "5000",
        "line_total": "5000"
      },
      "extensions": {
        "product-add-ons": {
          "addons": [
            {
              "id": "1234567890",
              "name": "Gift Wrapping",
              "value": "Gold",
              "price": "15.00",
              "field_name": "addon-1234567890"
            },
            {
              "id": "1234567891",
              "name": "Include extras",
              "value": ["Gift card", "Ribbon"],
              "price": "8.00",
              "field_name": "addon-1234567891"
            }
          ]
        }
      }
    }
  ],
  "totals": {
    "total_items": "3500",
    "total_items_tax": "0",
    "total_fees": "0",
    "total_fees_tax": "0",
    "total_discount": "0",
    "total_discount_tax": "0",
    "total_shipping": "0",
    "total_shipping_tax": "0",
    "total_tax": "0",
    "total_price": "5000"
  }
}
```

**Note**: Prices in Store API are in **cents** (5000 = $50.00)

### **4. Cart Display - Extracting Add-ons**

```typescript
function extractAddonsFromCartItem(item: any): Array<{ key: string; value: string }> {
  // Store API includes add-ons in extensions
  const addonsData = item.extensions?.['product-add-ons']?.addons || [];
  
  // Transform to match current extraData format for compatibility
  return [{
    key: 'addons',
    value: JSON.stringify(addonsData.map(addon => ({
      fieldName: addon.field_name || `addon-${addon.id}`,
      value: Array.isArray(addon.value) ? addon.value.join(', ') : addon.value,
      price: parseFloat(addon.price) || 0,
      label: addon.name,
    })))
  }];
}
```

### **5. Cart Total Calculation - Server-Side**

**Store API calculates totals server-side** (including add-ons):

```typescript
// No client-side calculation needed!
const cartTotal = computed(() => {
  // Store API returns total in cents
  return parseFloat(cart.value.totals.total_price) / 100;
});
```

**Advantages**:
- ✅ No client-side calculation errors
- ✅ Accurate pricing with add-ons
- ✅ Coupon discounts handled correctly
- ✅ Tax calculations included

### **6. Checkout - Order Creation (REST API)**

**Endpoint**: `POST /wp-json/wc/v3/orders`

**Request Body**:
```json
{
  "payment_method": "cod",
  "payment_method_title": "Request Quote",
  "set_paid": false,
  "billing": {...},
  "shipping": {...},
  "line_items": [
    {
      "product_id": 123,
      "quantity": 1,
      "meta_data": [
        {
          "key": "addon-1234567890",
          "value": "Gold",
          "display_key": "Gift Wrapping",
          "display_value": "Gold (+$15.00)"
        },
        {
          "key": "addon-1234567891",
          "value": "Gift card, Ribbon",
          "display_key": "Include extras",
          "display_value": "Gift card, Ribbon (+$8.00)"
        }
      ]
    }
  ]
}
```

**Building Line Items with Add-ons**:
```typescript
const lineItems = cart.value.contents.nodes.map(item => {
  const lineItem: any = {
    product_id: item.product.node.databaseId,
    quantity: item.quantity,
  };
  
  // Add variation ID if variable product
  if (item.variation) {
    lineItem.variation_id = item.variation.node.databaseId;
  }
  
  // Extract and add add-ons to meta_data
  const extraData = JSON.parse(JSON.stringify(item.extraData));
  const addons = JSON.parse(
    extraData?.find(el => el.key === 'addons')?.value || '[]'
  );
  
  if (addons.length > 0) {
    lineItem.meta_data = addons.map(addon => ({
      key: addon.fieldName,
      value: addon.value,
      display_key: addon.label || addon.fieldName,
      display_value: `${addon.value}${addon.price ? ` (+$${addon.price})` : ''}`,
    }));
  }
  
  return lineItem;
});
```

---

## 🔄 Type Mapping Summary

### GraphQL → REST API Type Conversion

| GraphQL Type | REST API Type | Value Format |
|--------------|---------------|--------------|
| `MULTIPLE_CHOICE` | `multiple_choice` | Number (index) |
| `CHECKBOX` | `checkbox` | Number[] (indexes) |
| `CUSTOM_TEXT` | `custom_text` | String |
| `CUSTOM_TEXTAREA` | `custom_textarea` | String |
| `FILE_UPLOAD` | `file_upload` | String (URL) |
| `CUSTOM_PRICE` | `custom_price` | Number |
| `INPUT_MULTIPLIER` | `input_multiplier` | Number |
| `DATEPICKER` | `datepicker` | String (ISO8601) |
| `HEADING` | `heading` | N/A (display only) |

### Price Type Mapping

| GraphQL | REST API |
|---------|----------|
| `FLAT_FEE` | `flat_fee` |
| `QUANTITY_BASED` | `quantity_based` |
| `PERCENTAGE_BASED` | `percentage_based` |

---

## ✅ Migration Checklist

### Data Flow Verification Points

- [ ] **Product Page**: Add-ons display correctly from REST API
- [ ] **Add to Cart**: Transformation function correctly converts to Store API format
- [ ] **Cart**: Add-ons appear in cart items from Store API response
- [ ] **Cart Totals**: Server-calculated totals include add-on prices
- [ ] **Checkout**: Line items include add-on meta_data
- [ ] **Order Confirmation**: Order shows add-ons
- [ ] **Order Email**: Email includes add-on information
- [ ] **WooCommerce Admin**: Order displays add-ons in line item meta

---

## 🐛 Common Issues & Solutions

### Issue 1: Add-on ID Mismatch
**Problem**: GraphQL uses `fieldName: "addon-123"`, REST API uses `id: 123`

**Solution**: Extract numeric ID when transforming:
```typescript
const addonId = addon.fieldName?.replace('addon-', '') || addon.id;
```

### Issue 2: Option Index vs Label
**Problem**: GraphQL uses labels, Store API uses indexes

**Solution**: Find option index before sending to Store API:
```typescript
const optionIndex = addon.options.findIndex(opt => opt.label === selectedLabel);
config[addonId] = optionIndex >= 0 ? optionIndex : 0;
```

### Issue 3: Price Format (Cents vs Dollars)
**Problem**: Store API returns prices in cents

**Solution**: Divide by 100 when displaying:
```typescript
const displayPrice = parseFloat(storeApiPrice) / 100;
```

### Issue 4: Checkbox Multiple Selections
**Problem**: Need to track multiple selected options

**Solution**: Build array of indexes:
```typescript
const selectedIndexes = addon.options
  .map((opt, idx) => isSelected(opt) ? idx : -1)
  .filter(idx => idx >= 0);
```

---

## 📚 References

- [WooCommerce Product Add-ons REST API](https://woocommerce.com/document/product-add-ons-rest-api-reference/)
- [WooCommerce REST API - Products](https://woocommerce.github.io/woocommerce-rest-api-docs/#products)
- [WooCommerce Store API - Cart](https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/src/StoreApi)
- [WooCommerce REST API - Orders](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)

---

**Last Updated**: November 14, 2024  
**Version**: 1.0






