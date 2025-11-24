# Product Page to Checkout REST API Migration Plan

## 🎯 **Executive Summary**

Migrate the product detail page (`[slug].vue`), cart system, and checkout process from GraphQL to WooCommerce REST API and Store API. This migration is critical to resolve CORS issues with GraphQL while maintaining full product add-ons functionality.

**Critical Requirement**: Product add-ons must work flawlessly through the entire flow: Product → Cart → Checkout → Order

---

## 📊 **Current System Analysis**

### Data Flow (GraphQL)
```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT PAGE (GraphQL)                        │
│  - Fetch product via getProduct.gql                              │
│  - Includes: product details, variations, add-ons, reviews       │
│  - Add-ons structure: { fieldName, name, type, options, price } │
└────────────────────────────┬────────────────────────────────────┘
                             │ User selects add-ons
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ADD TO CART (GraphQL)                          │
│  - Mutation: addToCart                                           │
│  - Sends: { productId, quantity, addons: [...] }                │
│  - Addons format: { fieldName, value }                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CART (GraphQL)                              │
│  - Query: getCart                                                │
│  - Returns cart with items                                       │
│  - Addons stored in: item.extraData[{key: 'addons', value}]    │
│  - Client-side calculates: basePrice + addonPrice               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CHECKOUT (GraphQL)                             │
│  - Mutation: checkout                                            │
│  - Creates order from cart automatically                         │
│  - No payment processing (just email)                           │
│  - Returns: order { databaseId, orderKey }                      │
└─────────────────────────────────────────────────────────────────┘
```

### Current Add-ons Implementation

**GraphQL Add-on Structure:**
```graphql
addons {
  fieldName      # "addon-123"
  name          # "Gift Wrapping"
  type          # MULTIPLE_CHOICE, CHECKBOX
  required      # boolean
  options {
    label     # "Gold"
    price     # "10.00"
    priceType # FLAT_FEE
  }
}
```

**Cart Add-on Storage (extraData):**
```json
{
  "extraData": [
    {
      "key": "addons",
      "value": "[{\"fieldName\":\"addon-123\",\"value\":\"Gold\",\"price\":10}]"
    }
  ]
}
```

---

## 🎯 **Target System (REST API)**

### Data Flow (REST API)
```
┌─────────────────────────────────────────────────────────────────┐
│                  PRODUCT PAGE (REST API)                         │
│  - GET /wp-json/wc/v3/products?slug={slug}                      │
│  - Product Add-ons automatically included in response           │
│  - Add-ons structure: WooCommerce Product Add-ons format        │
└────────────────────────────┬────────────────────────────────────┘
                             │ User selects add-ons
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 ADD TO CART (Store API)                          │
│  - POST /wp-json/wc/store/v1/cart/add-item                      │
│  - Body: { id, quantity, addons_configuration }                 │
│  - Format: { "addon-id": value }                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CART (Store API)                              │
│  - GET /wp-json/wc/store/v1/cart                                │
│  - Returns cart with items + extensions (add-ons)               │
│  - Totals calculated server-side (including add-ons)            │
└────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CHECKOUT (REST API)                             │
│  - POST /wp-json/wc/v3/orders                                    │
│  - Build order from cart data                                    │
│  - Add-ons preserved in line item meta                          │
│  - Returns: { id, order_key, status }                           │
└─────────────────────────────────────────────────────────────────┘
```

### WooCommerce Product Add-ons REST API Format

**Add-ons Configuration for Cart (Store API):**
```javascript
{
  "id": 123,                    // product ID
  "quantity": 1,
  "addons_configuration": {
    "123": 0,                   // multiple_choice: option index
    "124": [0, 1],              // checkbox: array of indexes
    "125": "Custom text",       // custom_text: string value
    "126": "2024-12-25",        // datepicker: ISO8601 date
    "127": 99.99,               // custom_price: number
    "128": 5                    // input_multiplier: quantity
  }
}
```

---

## 📋 **Migration Objectives**

### **Objective 1: Understand & Document Add-ons Data Flow** ⚙️

**Goal**: Create comprehensive documentation of how add-ons work in both systems

**Tasks**:
1. [ ] Document current GraphQL add-ons structure
2. [ ] Document WooCommerce REST API add-ons format
3. [ ] Map GraphQL add-on types to REST API add-on types
4. [ ] Document data transformation required at each step
5. [ ] Identify differences in pricing calculation

**Type Mapping**:
```
GraphQL                 → REST API
─────────────────────────────────────────────────────────
MULTIPLE_CHOICE        → multiple_choice
CHECKBOX               → checkbox  
CUSTOM_TEXT            → custom_text
CUSTOM_TEXTAREA        → custom_textarea
FILE_UPLOAD            → file_upload
CUSTOM_PRICE           → custom_price
INPUT_MULTIPLIER       → input_multiplier
DATEPICKER             → datepicker
HEADING                → heading
```

**Deliverable**: Complete add-ons mapping document

---

### **Objective 2: Create REST API Data Type Definitions** 📝

**Goal**: Define TypeScript interfaces for all REST API responses

**Tasks**:
1. [ ] Create `WooProduct` type with add-ons included
2. [ ] Create `WooProductAddon` type matching REST API structure
3. [ ] Create `WooCart` type matching Store API response
4. [ ] Create `WooCartItem` type with add-ons extensions
5. [ ] Create `WooOrder` type matching order creation response
6. [ ] Create transformation utility types (GraphQL → REST API format)

**File**: `woonuxt_base/app/types/woocommerce-rest-api.d.ts`

**Example Types**:
```typescript
export interface WooProductAddon {
  id: number;
  name: string;
  title_format: 'label' | 'heading' | 'hide';
  description: string;
  type: 'multiple_choice' | 'checkbox' | 'custom_text' | 'custom_textarea' | 'file_upload' | 'custom_price' | 'input_multiplier' | 'datepicker' | 'heading';
  display: 'select' | 'radiobutton' | 'images';
  required: boolean;
  price: string;
  price_type: 'flat_fee' | 'quantity_based' | 'percentage_based';
  options?: Array<{
    label: string;
    price: string;
    price_type: string;
  }>;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  type: 'simple' | 'variable' | 'external';
  price: string;
  regular_price: string;
  sale_price: string;
  description: string;
  short_description: string;
  sku: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; alt: string }>;
  attributes: Array<{ id: number; name: string; options: string[] }>;
  variations: number[];
  related_ids: number[];
  addons?: WooProductAddon[];  // Product Add-ons extension
  meta_data: Array<{ id: number; key: string; value: any }>;
}
```

**Deliverable**: Complete type definitions file

---

### **Objective 3: Update Product Detail Page** 🏗️

**Goal**: Replace GraphQL with REST API for product data fetching

**Files to Modify**:
- `woonuxt_base/app/pages/product/[slug].vue`

**Tasks**:
1. [ ] Replace `useAsyncGql('getProduct')` with REST API call
2. [ ] Use existing `ProductsService.getProductBySlug()`
3. [ ] Transform REST API response to match component expectations
4. [ ] Handle product variations via REST API
5. [ ] Fetch related products via REST API
6. [ ] Handle product reviews (keep GraphQL or migrate)
7. [ ] Update add-ons display logic for REST API format
8. [ ] Test variable products
9. [ ] Test simple products
10. [ ] Test products with and without add-ons

**Implementation Strategy**:
```vue
<script setup lang="ts">
import { productsService } from '~/services/woocommerce/products.service';

const route = useRoute();
const slug = route.params.slug as string;

// Replace GraphQL with REST API
const { data: product, pending, error } = await useAsyncData(
  `product-${slug}`,
  async () => {
    // Fetch product via REST API
    const restProduct = await productsService.getProductBySlug(slug);
    
    if (!restProduct) return null;
    
    // Transform REST API response to match GraphQL structure
    return transformProductData(restProduct);
  },
  {
    server: true,
    lazy: true,
  }
);

// Transform function to maintain compatibility
function transformProductData(restProduct: WooProduct): Product {
  return {
    id: restProduct.id,
    databaseId: restProduct.id,
    name: restProduct.name,
    slug: restProduct.slug,
    type: restProduct.type.toUpperCase() as ProductTypesEnum,
    price: restProduct.price,
    regularPrice: restProduct.regular_price,
    salePrice: restProduct.sale_price,
    description: restProduct.description,
    shortDescription: restProduct.short_description,
    sku: restProduct.sku,
    stockStatus: restProduct.stock_status.toUpperCase() as StockStatusEnum,
    stockQuantity: restProduct.stock_quantity,
    image: restProduct.images?.[0] ? {
      sourceUrl: restProduct.images[0].src,
      altText: restProduct.images[0].alt,
    } : null,
    galleryImages: {
      nodes: restProduct.images?.map(img => ({
        sourceUrl: img.src,
        altText: img.alt,
      })) || []
    },
    productCategories: {
      nodes: restProduct.categories?.map(cat => ({
        databaseId: cat.id,
        slug: cat.slug,
        name: cat.name,
      })) || []
    },
    productTags: {
      nodes: restProduct.tags?.map(tag => ({
        name: tag.name,
      })) || []
    },
    // Transform add-ons
    addons: restProduct.addons?.map(addon => ({
      fieldName: `addon-${addon.id}`,
      name: addon.name,
      type: addon.type.toUpperCase(),
      required: addon.required,
      price: addon.price,
      priceType: addon.price_type.toUpperCase(),
      description: addon.description,
      options: addon.options?.map(opt => ({
        label: opt.label,
        price: opt.price,
        priceType: opt.price_type.toUpperCase(),
      })) || []
    })) || [],
    // Handle variations
    variations: restProduct.variations ? {
      nodes: [] // Will be fetched separately if needed
    } : null,
  };
}
</script>
```

**Testing Checklist**:
- [ ] Product loads correctly
- [ ] Images display
- [ ] Prices display
- [ ] Add-ons render correctly
- [ ] Variations work (if variable product)
- [ ] Related products show
- [ ] Breadcrumbs work
- [ ] Add to cart button works

**Deliverable**: Fully functional product page using REST API

---

### **Objective 4: Convert Add to Cart Functionality** 🛒

**Goal**: Replace GraphQL addToCart mutation with Store API call

**Files to Modify**:
- `woonuxt_base/app/composables/useCart.ts`
- `woonuxt_base/app/pages/product/[slug].vue` (add to cart logic)

**Tasks**:
1. [ ] Create add-ons transformation function (form data → Store API format)
2. [ ] Update `addToCart()` in useCart composable
3. [ ] Replace `GqlAddToCart()` with Store API call
4. [ ] Transform selected add-ons to `addons_configuration` format
5. [ ] Handle multiple_choice add-ons (convert to index)
6. [ ] Handle checkbox add-ons (convert to index array)
7. [ ] Handle custom text/textarea add-ons
8. [ ] Handle datepicker add-ons (ISO8601 format)
9. [ ] Handle custom_price and input_multiplier add-ons
10. [ ] Test add to cart with various add-on types

**Add-ons Transformation Logic**:
```typescript
// In [slug].vue - Transform selected add-ons for Store API
function formatAddonsForCart(selectedOptions: any[], productAddons: any[]): Record<string, any> {
  const config: Record<string, any> = {};
  
  selectedOptions.forEach((option, index) => {
    if (!option) return;
    
    const addon = productAddons[index];
    if (!addon) return;
    
    const addonId = addon.fieldName.replace('addon-', ''); // Extract ID
    
    switch (addon.type) {
      case 'MULTIPLE_CHOICE':
        // Find the index of the selected option
        const optionIndex = addon.options.findIndex(opt => opt.label === option.label);
        config[addonId] = optionIndex >= 0 ? optionIndex : 0;
        break;
        
      case 'CHECKBOX':
        // Array of selected option indexes
        const selectedIndexes = addon.options
          .map((opt, idx) => selectedOptions.find(s => s.label === opt.label) ? idx : -1)
          .filter(idx => idx >= 0);
        config[addonId] = selectedIndexes;
        break;
        
      case 'CUSTOM_TEXT':
      case 'CUSTOM_TEXTAREA':
        config[addonId] = option.valueText || option.value || '';
        break;
        
      case 'DATEPICKER':
        // Convert to ISO8601 format
        config[addonId] = new Date(option.value).toISOString();
        break;
        
      case 'CUSTOM_PRICE':
      case 'INPUT_MULTIPLIER':
        config[addonId] = parseFloat(option.value) || 0;
        break;
    }
  });
  
  return config;
}

// Updated add to cart handler in [slug].vue
const handleAddToCart = () => {
  const addonsConfig = formatAddonsForCart(selectedOptions.value, product.value.addons);
  
  addToCart({
    productId: type.value?.databaseId,
    quantity: quantity.value,
    addons_configuration: addonsConfig
  });
};
```

**Update useCart.ts**:
```typescript
// In composables/useCart.ts
import { cartService } from '~/services/woocommerce/cart.service';

async function addToCart(input: AddToCartInput): Promise<void> {
  isUpdatingCart.value = true;
  try {
    // Transform to Store API format
    const payload = {
      id: input.productId,
      quantity: input.quantity,
      addons_configuration: input.addons_configuration,
    };
    
    // Use Store API instead of GraphQL
    const updatedCart = await cartService.addItem(payload);
    
    // Transform response to match current cart structure
    cart.value = transformCartResponse(updatedCart);
    
    if (storeSettings.autoOpenCart && !isShowingCart.value) {
      toggleCart(true);
    }
  } catch (error: any) {
    console.error('[Cart] Error adding item:', error);
    // Show user-friendly error
  } finally {
    isUpdatingCart.value = false;
  }
}
```

**Testing Checklist**:
- [ ] Add simple product without add-ons
- [ ] Add product with multiple_choice add-on
- [ ] Add product with checkbox add-ons
- [ ] Add product with custom text add-on
- [ ] Add product with custom price add-on
- [ ] Add variable product with add-ons
- [ ] Verify add-ons appear in cart
- [ ] Verify pricing is correct

**Deliverable**: Working add to cart with full add-ons support

---

### **Objective 5: Convert Cart System** 🛒

**Goal**: Replace GraphQL cart queries with Store API

**Files to Modify**:
- `woonuxt_base/app/composables/useCart.ts`
- `woonuxt_base/app/components/shopElements/Cart.vue`
- `woonuxt_base/app/components/cartElements/CartCard.vue`
- `woonuxt_base/app/components/cartElements/CartTrigger.vue`

**Tasks**:
1. [ ] Replace `GqlGetCart()` with Store API `/cart` endpoint
2. [ ] Replace `GqlUpDateCartQuantity()` with Store API update
3. [ ] Replace `GqlEmptyCart()` with Store API clear
4. [ ] Replace `GqlApplyCoupon()` with Store API coupon
5. [ ] Replace `GqlRemoveCoupons()` with Store API remove coupon
6. [ ] Replace `GqlChangeShippingMethod()` with Store API shipping
7. [ ] Transform Store API cart response to match current structure
8. [ ] Update cart item add-ons display
9. [ ] Update cart total calculation (use server-calculated totals)
10. [ ] Test all cart operations

**Cart Response Transformation**:
```typescript
function transformCartResponse(storeApiCart: any): Cart {
  return {
    total: storeApiCart.totals.total,
    rawTotal: (parseFloat(storeApiCart.totals.total) / 100).toFixed(2),
    subtotal: storeApiCart.totals.subtotal,
    totalTax: storeApiCart.totals.total_tax,
    discountTotal: storeApiCart.totals.total_discount,
    shippingTotal: storeApiCart.totals.total_shipping,
    isEmpty: storeApiCart.items.length === 0,
    contents: {
      itemCount: storeApiCart.items_count,
      productCount: storeApiCart.items.length,
      nodes: storeApiCart.items.map(item => ({
        key: item.key,
        quantity: item.quantity,
        subtotal: item.totals.line_subtotal,
        total: item.totals.line_total,
        product: {
          node: {
            databaseId: item.id,
            name: item.name,
            slug: item.slug,
            sku: item.sku,
            type: item.type,
            image: {
              sourceUrl: item.images?.[0]?.src,
              altText: item.images?.[0]?.alt,
            },
          }
        },
        // Extract add-ons from extensions or item_data
        extraData: extractAddonsFromCartItem(item),
      }))
    },
    appliedCoupons: storeApiCart.coupons.map(coupon => ({
      code: coupon.code,
      discountAmount: coupon.totals.total_discount,
    })),
    availableShippingMethods: transformShippingMethods(storeApiCart.shipping_rates),
  };
}

function extractAddonsFromCartItem(item: any): Array<{ key: string; value: string }> {
  // Store API includes add-ons in extensions or item_data
  const addons = item.extensions?.addons || item.item_data || [];
  
  return [{
    key: 'addons',
    value: JSON.stringify(addons.map(addon => ({
      fieldName: `addon-${addon.id}`,
      value: addon.value,
      price: addon.price ? parseFloat(addon.price) : 0,
      label: addon.name,
    })))
  }];
}
```

**Update useCart methods**:
```typescript
// Update cart operations
async function refreshCart(): Promise<boolean> {
  try {
    const storeApiCart = await cartService.getCart();
    cart.value = transformCartResponse(storeApiCart);
    return true;
  } catch (error: any) {
    console.error('[Cart] Error refreshing:', error);
    throw error;
  } finally {
    isUpdatingCart.value = false;
  }
}

async function updateItemQuantity(key: string, quantity: number): Promise<void> {
  isUpdatingCart.value = true;
  try {
    const updatedCart = await cartService.updateItem({ key, quantity });
    cart.value = transformCartResponse(updatedCart);
  } catch (error: any) {
    console.error('[Cart] Error updating quantity:', error);
  }
}

async function emptyCart(): Promise<void> {
  try {
    isUpdatingCart.value = true;
    await cartService.clear();
    cart.value = transformCartResponse({ items: [], totals: {} });
  } catch (error: any) {
    console.error('[Cart] Error emptying cart:', error);
  }
}
```

**Testing Checklist**:
- [ ] Cart displays items correctly
- [ ] Add-ons show in cart items
- [ ] Prices calculate correctly (including add-ons)
- [ ] Update quantity works
- [ ] Remove item works
- [ ] Empty cart works
- [ ] Apply coupon works
- [ ] Remove coupon works
- [ ] Shipping method selection works
- [ ] Cart persists across page refreshes

**Deliverable**: Fully functional cart using Store API

---

### **Objective 6: Convert Checkout & Order Creation** 💳

**Goal**: Replace GraphQL checkout mutation with REST API order creation

**Files to Modify**:
- `woonuxt_base/app/composables/useCheckout.ts`
- `woonuxt_base/app/pages/checkout.vue`
- `woonuxt_base/app/pages/order-summary.vue`

**Tasks**:
1. [ ] Analyze current checkout flow (no payment, just email)
2. [ ] Create order creation function using REST API
3. [ ] Build line items from cart data (including add-ons)
4. [ ] Handle billing/shipping address
5. [ ] Handle customer account creation (if checkbox checked)
6. [ ] Update `proccessCheckout()` function
7. [ ] Test order creation
8. [ ] Verify order email is sent
9. [ ] Test order confirmation page
10. [ ] Test with and without add-ons

**Checkout Flow**:
```typescript
// In composables/useCheckout.ts
import { ordersService } from '~/services/woocommerce/orders.service';

const proccessCheckout = async (isPaid = false) => {
  const { customer } = useAuth();
  const router = useRouter();
  const { cart, emptyCart, refreshCart } = useCart();

  isProcessingOrder.value = true;

  try {
    // Build line items from cart
    const lineItems = cart.value.contents.nodes.map(item => {
      const lineItem: any = {
        product_id: item.product.node.databaseId,
        quantity: item.quantity,
      };
      
      // Add variation ID if variable product
      if (item.variation) {
        lineItem.variation_id = item.variation.node.databaseId;
      }
      
      // Add add-ons to line item meta_data
      const extraData = JSON.parse(JSON.stringify(item.extraData));
      const addons = JSON.parse(extraData?.find(el => el.key === 'addons')?.value || '[]');
      
      if (addons.length > 0) {
        lineItem.meta_data = addons.map(addon => ({
          key: addon.fieldName,
          value: addon.value,
          display_key: addon.label || addon.fieldName,
          display_value: `${addon.value} (+$${addon.price})`,
        }));
      }
      
      return lineItem;
    });

    // Create order via REST API
    const orderPayload = {
      payment_method: orderInput.value.paymentMethod.id || 'cod',
      payment_method_title: orderInput.value.paymentMethod.title || 'Request Quote',
      set_paid: false, // No payment - just RFQ
      billing: {
        first_name: customer.value.billing.firstName,
        last_name: customer.value.billing.lastName,
        address_1: customer.value.billing.address1,
        address_2: customer.value.billing.address2,
        city: customer.value.billing.city,
        state: customer.value.billing.state,
        postcode: customer.value.billing.postcode,
        country: customer.value.billing.country,
        email: customer.value.billing.email,
        phone: customer.value.billing.phone,
      },
      shipping: orderInput.value.shipToDifferentAddress ? {
        first_name: customer.value.shipping.firstName,
        last_name: customer.value.shipping.lastName,
        address_1: customer.value.shipping.address1,
        address_2: customer.value.shipping.address2,
        city: customer.value.shipping.city,
        state: customer.value.shipping.state,
        postcode: customer.value.shipping.postcode,
        country: customer.value.shipping.country,
      } : undefined,
      line_items: lineItems,
      shipping_lines: cart.value.chosenShippingMethods?.map(method => ({
        method_id: method,
        method_title: method,
      })) || [],
      customer_note: orderInput.value.customerNote || '',
      meta_data: orderInput.value.metaData || [],
    };

    // Create order
    const order = await ordersService.create(orderPayload);

    // Handle account creation if requested
    if (orderInput.value.createAccount) {
      // Register customer via REST API
      await customersService.register({
        email: customer.value.billing.email,
        username: orderInput.value.username,
        password: orderInput.value.password,
        billing: customer.value.billing,
        shipping: customer.value.shipping,
      });
      
      // Login the user
      await loginUser({
        username: orderInput.value.username,
        password: orderInput.value.password,
      });
    }

    // Empty cart and redirect
    await emptyCart();
    await refreshCart();

    // Redirect to order confirmation
    router.push(`/checkout/order-received/${order.id}/?key=${order.order_key}`);

  } catch (error: any) {
    isProcessingOrder.value = false;
    console.error('[Checkout] Error:', error);
    alert(error.message || 'There was an error processing your order. Please try again.');
  }

  isProcessingOrder.value = false;
};
```

**Order Service Implementation**:
```typescript
// In services/woocommerce/orders.service.ts
export class OrdersService {
  private client = getApiClient();
  
  async create(orderData: any): Promise<any> {
    return this.client.post('/orders', orderData, {
      authenticated: true,
    });
  }
  
  async getById(orderId: number, orderKey?: string): Promise<any> {
    const params = orderKey ? { order_key: orderKey } : {};
    return this.client.get(`/orders/${orderId}`, params, {
      authenticated: true,
    });
  }
}
```

**Testing Checklist**:
- [ ] Checkout creates order successfully
- [ ] Order includes all products
- [ ] Add-ons appear in order line item meta
- [ ] Billing address saved correctly
- [ ] Shipping address saved correctly (if different)
- [ ] Customer note saved
- [ ] Order email sent
- [ ] Order confirmation page displays correctly
- [ ] Order shows in WooCommerce admin
- [ ] Account creation works (if selected)

**Deliverable**: Fully functional checkout and order creation

---

### **Objective 7: Handle Product Variations** 🎨

**Goal**: Properly fetch and display variable product variations

**Files to Modify**:
- `woonuxt_base/app/pages/product/[slug].vue`
- `woonuxt_base/app/components/productElements/AttributeSelections.vue`

**Tasks**:
1. [ ] Fetch variations via REST API `/products/{id}/variations`
2. [ ] Transform variation data to match GraphQL structure
3. [ ] Update attribute selection logic
4. [ ] Handle variation images
5. [ ] Handle variation pricing
6. [ ] Handle variation stock status
7. [ ] Test variable product with multiple attributes
8. [ ] Test add to cart with variation + add-ons

**Implementation**:
```typescript
// Fetch variations for variable products
if (restProduct.type === 'variable' && restProduct.variations?.length > 0) {
  const variations = await productsService.getVariations(restProduct.id);
  
  product.value.variations = {
    nodes: variations.map(variation => ({
      databaseId: variation.id,
      name: variation.name ||`${restProduct.name} - ${variation.attributes.map(a => a.option).join(', ')}`,
      slug: variation.slug,
      price: variation.price,
      regularPrice: variation.regular_price,
      salePrice: variation.sale_price,
      stockStatus: variation.stock_status.toUpperCase(),
      stockQuantity: variation.stock_quantity,
      image: variation.image ? {
        sourceUrl: variation.image.src,
        altText: variation.image.alt,
      } : null,
      attributes: {
        nodes: variation.attributes.map(attr => ({
          name: attr.name,
          value: attr.option,
        }))
      }
    }))
  };
}
```

**Testing Checklist**:
- [ ] Variations load correctly
- [ ] Attribute dropdowns populated
- [ ] Selecting attributes updates active variation
- [ ] Variation price displays
- [ ] Variation image displays
- [ ] Add to cart with variation works
- [ ] Add to cart with variation + add-ons works

**Deliverable**: Fully working variable products

---

### **Objective 8: Update Cart Components** 🎨

**Goal**: Update all cart-related components to work with REST API data structure

**Files to Modify**:
- `woonuxt_base/app/components/shopElements/Cart.vue`
- `woonuxt_base/app/components/cartElements/CartCard.vue`
- `woonuxt_base/app/components/cartElements/QuantityInput.vue`
- `woonuxt_base/app/components/shopElements/OrderSummary.vue`

**Tasks**:
1. [ ] Update data binding in Cart.vue
2. [ ] Update add-ons display in CartCard.vue
3. [ ] Update total calculation (use server totals)
4. [ ] Update QuantityInput.vue
5. [ ] Update OrderSummary.vue
6. [ ] Test all cart UI components
7. [ ] Verify add-ons display correctly
8. [ ] Verify totals calculate correctly

**CartCard Add-ons Display**:
```vue
<template>
  <!-- Add-ons section -->
  <div v-if="itemAddons && itemAddons.length" class="mt-2 space-y-1">
    <p class="text-xs font-semibold text-gray-600">Add-ons:</p>
    <ul class="space-y-1">
      <li v-for="(addon, index) in itemAddons" :key="index" class="text-xs text-gray-600 flex justify-between">
        <span>{{ addon.label || addon.fieldName }}: {{ addon.value }}</span>
        <span v-if="addon.price" class="text-red-500">+${{ addon.price }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
// Extract add-ons from extraData
const itemAddons = computed(() => {
  try {
    const extraData = JSON.parse(JSON.stringify(item.extraData));
    const addonsJson = extraData?.find(el => el.key === 'addons')?.value;
    return addonsJson ? JSON.parse(addonsJson) : [];
  } catch (e) {
    console.error('Error parsing add-ons:', e);
    return [];
  }
});
</script>
```

**Testing Checklist**:
- [ ] Cart items display correctly
- [ ] Add-ons show under each item
- [ ] Prices display correctly
- [ ] Quantity controls work
- [ ] Remove item works
- [ ] Empty cart button works
- [ ] Order summary totals correct

**Deliverable**: All cart components working with REST API

---

### **Objective 9: Testing & Quality Assurance** ✅

**Goal**: Comprehensive testing of the entire flow

**Test Cases**:

#### **Simple Product Tests**
- [ ] View simple product without add-ons
- [ ] Add simple product to cart
- [ ] Checkout with simple product

#### **Simple Product with Add-ons Tests**
- [ ] View product with multiple_choice add-on
- [ ] Select add-on and add to cart
- [ ] Verify add-on in cart
- [ ] Verify pricing includes add-on
- [ ] Checkout and verify order includes add-on

#### **Variable Product Tests**
- [ ] View variable product
- [ ] Select variation attributes
- [ ] Add variation to cart
- [ ] Checkout with variation

#### **Variable Product with Add-ons Tests**
- [ ] View variable product with add-ons
- [ ] Select variation + add-ons
- [ ] Add to cart
- [ ] Verify cart shows variation + add-ons
- [ ] Checkout and verify order

#### **Multiple Add-on Types Tests**
- [ ] Product with multiple_choice add-on
- [ ] Product with checkbox add-ons
- [ ] Product with custom_text add-on
- [ ] Product with custom_price add-on
- [ ] Product with multiple different add-on types

#### **Cart Operations Tests**
- [ ] Add multiple products
- [ ] Update quantities
- [ ] Remove items
- [ ] Empty cart
- [ ] Apply coupon
- [ ] Remove coupon
- [ ] Change shipping method

#### **Checkout Tests**
- [ ] Guest checkout
- [ ] Checkout with account creation
- [ ] Registered user checkout
- [ ] Verify order email sent
- [ ] Verify order in WooCommerce admin
- [ ] Verify add-ons in order meta

#### **Edge Cases**
- [ ] Product with required add-ons (validation)
- [ ] Product with conditional add-ons
- [ ] Large cart (20+ items)
- [ ] Very long add-on text values
- [ ] Special characters in add-ons
- [ ] Multiple add-ons with same name

**Testing Tools**:
- Browser DevTools (Network tab)
- Vue DevTools (state inspection)
- WooCommerce admin (verify orders)
- Email testing tool (verify emails)

**Deliverable**: Complete test report with all passing tests

---

### **Objective 10: Cleanup & Documentation** 🧹

**Goal**: Remove GraphQL dependencies and document changes

**Tasks**:
1. [ ] Remove GraphQL queries related to products, cart, checkout
2. [ ] Keep GraphQL for features still using it (if any)
3. [ ] Update environment variables documentation
4. [ ] Create migration notes document
5. [ ] Document any breaking changes
6. [ ] Update README with new setup instructions
7. [ ] Document known issues/limitations
8. [ ] Create troubleshooting guide

**Files to Remove/Update**:
```
❌ REMOVE (if fully migrated):
- woonuxt_base/app/queries/getProduct.gql
- woonuxt_base/app/queries/addToCart.gql
- woonuxt_base/app/queries/getCart.gql
- woonuxt_base/app/queries/updateCartQuantity.gql
- woonuxt_base/app/queries/emptyCart.gql
- woonuxt_base/app/queries/checkout.gql
- woonuxt_base/app/queries/applyCoupon.gql
- woonuxt_base/app/queries/removeCoupon.gql
- woonuxt_base/app/queries/changeShippingMethod.gql
- woonuxt_base/app/queries/fragments/SimpleProduct.gql (add-ons part)
- woonuxt_base/app/queries/fragments/VariableProduct.gql (add-ons part)
- woonuxt_base/app/queries/fragments/CartFragment.gql

✅ KEEP (still using GraphQL):
- Breadcrumb uses GraphQL product categories (as user requested)
- Any other features not migrated yet
```

**Environment Variables**:
```bash
# .env
# WooCommerce REST API
NUXT_PUBLIC_WC_API_URL=https://satchart.com/wp-json
NUXT_PUBLIC_WC_CONSUMER_KEY=ck_xxxxxxxxxxxxx
NUXT_PUBLIC_WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxx

# Still needed if using GraphQL for other features
GQL_HOST=https://satchart.com/graphql
```

**Deliverable**: Clean codebase with updated documentation

---

## ⚠️ **Critical Considerations**

### **1. Product Add-ons Plugin Version**
- Requires WooCommerce Product Add-ons **v6.9.0+** for REST API support
- Verify plugin version on server
- Test add-ons API endpoints before starting

### **2. Store API vs REST API**
- **Cart operations**: Use Store API (`/wc/store/v1/cart`)
- **Product operations**: Use REST API (`/wc/v3/products`)
- **Order creation**: Use REST API (`/wc/v3/orders`)
- Store API handles sessions automatically

### **3. Session Management**
- Store API uses `woocommerce-session` cookie
- Same cookie as GraphQL (should transfer seamlessly)
- May need `Woo-Session` header for some requests
- Test cross-domain session persistence

### **4. Add-ons Data Preservation**
- Add-ons must flow: Product → Cart → Order
- Verify add-ons stored in order line item meta
- Test that order emails show add-ons
- Verify WooCommerce admin displays add-ons correctly

### **5. Pricing Calculation**
- GraphQL: Client-side calculation
- REST API: Server-side calculation (preferred)
- Verify totals match between cart and checkout
- Test coupon discounts with add-ons

### **6. No Payment Processing**
- System is Request-for-Quote (RFQ)
- Orders created with `set_paid: false`
- Payment method can be "Cash on Delivery" or custom
- Verify email notifications work

### **7. CORS Configuration**
- If calling REST API from client-side, CORS must be configured
- Consider using Nuxt server middleware as proxy
- Store API should handle CORS better than GraphQL

### **8. Error Handling**
- REST API errors different from GraphQL
- Implement proper error messages for users
- Log errors for debugging
- Handle network failures gracefully

---

## 📅 **Timeline Estimate**

| Objective | Estimated Time | Priority |
|-----------|---------------|----------|
| 1. Document Add-ons Flow | 4-6 hours | HIGH |
| 2. Type Definitions | 4-6 hours | HIGH |
| 3. Product Detail Page | 8-12 hours | CRITICAL |
| 4. Add to Cart | 6-8 hours | CRITICAL |
| 5. Cart System | 8-12 hours | CRITICAL |
| 6. Checkout & Orders | 8-12 hours | CRITICAL |
| 7. Product Variations | 4-6 hours | HIGH |
| 8. Cart Components | 4-6 hours | MEDIUM |
| 9. Testing & QA | 12-16 hours | CRITICAL |
| 10. Cleanup & Docs | 4-6 hours | MEDIUM |

**Total: 62-90 hours (8-11 working days)**

**Realistic Timeline**: **2-3 weeks** with testing and bug fixes

---

## 🎯 **Success Criteria**

### **Functional Requirements**
- [ ] Product page loads via REST API
- [ ] All add-on types display correctly
- [ ] Add to cart works with add-ons
- [ ] Cart displays add-ons
- [ ] Cart calculates totals correctly
- [ ] Checkout creates order
- [ ] Order includes add-ons in meta
- [ ] Order email sent
- [ ] Order viewable in WooCommerce admin

### **Non-Functional Requirements**
- [ ] No CORS errors
- [ ] Page load time ≤ current
- [ ] No console errors
- [ ] TypeScript compiles without errors
- [ ] Mobile responsive maintained

### **Quality Requirements**
- [ ] All tests passing
- [ ] Error handling comprehensive
- [ ] User experience identical or better
- [ ] Code documented
- [ ] Migration documented

---

## 🚀 **Next Steps**

### **Before Starting**:
1. ✅ Review this plan with stakeholders
2. ⏸️ Verify WooCommerce Product Add-ons plugin version (need 6.9.0+)
3. ⏸️ Test Product Add-ons REST API endpoints manually
4. ⏸️ Backup production database
5. ⏸️ Setup development/staging environment
6. ⏸️ Install REST API testing tool (Postman/Insomnia)

### **Phase 1 - Start Here**:
1. Complete Objective 1 (Document Add-ons)
2. Complete Objective 2 (Type Definitions)
3. Start Objective 3 (Product Page)

### **Rollback Plan**:
- Keep GraphQL code in separate branch
- Feature flag to toggle between GraphQL/REST
- Can revert if critical issues found

---

**Document Version**: 1.0  
**Created**: November 14, 2024  
**Status**: Ready for Implementation  
**Estimated Completion**: 2-3 weeks






