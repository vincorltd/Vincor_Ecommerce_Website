/**
 * TypeScript types for WooCommerce REST API responses
 * 
 * These types match the WooCommerce REST API v3 response structure
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

// ============================================================================
// Common Types
// ============================================================================

export interface WooImage {
  id: number;
  src: string;
  name: string;
  alt: string;
}

export interface WooMetaData {
  id: number;
  key: string;
  value: string | number | boolean | any;
}

export interface WooLinks {
  self: Array<{ href: string }>;
  collection: Array<{ href: string }>;
}

// ============================================================================
// Product Types
// ============================================================================

export type ProductType = 'simple' | 'grouped' | 'external' | 'variable';
export type ProductStatus = 'draft' | 'pending' | 'private' | 'publish';
export type StockStatus = 'instock' | 'outofstock' | 'onbackorder';
export type TaxStatus = 'taxable' | 'shipping' | 'none';
export type BackordersStatus = 'no' | 'notify' | 'yes';

// ============================================================================
// Product Add-ons Types
// Documentation: https://woocommerce.com/document/product-add-ons-rest-api-reference/
// ============================================================================

export type ProductAddonType = 
  | 'multiple_choice'
  | 'checkbox'
  | 'custom_text'
  | 'custom_textarea'
  | 'file_upload'
  | 'custom_price'
  | 'input_multiplier'
  | 'heading'
  | 'datepicker';

export type ProductAddonDisplay = 'select' | 'radiobutton' | 'images';

export type ProductAddonPriceType = 
  | 'flat_fee'
  | 'quantity_based'
  | 'percentage_based';

export type ProductAddonTitleFormat = 'label' | 'heading' | 'hide';

export type ProductAddonRestrictionsType = 
  | 'any_text'
  | 'only_letters'
  | 'only_numbers'
  | 'only_letters_numbers'
  | 'email';

export interface ProductAddonOption {
  label: string;
  price: string;
  price_type: ProductAddonPriceType;
  image?: string;
}

export interface ProductAddon {
  // Core fields
  id?: number;
  name: string;
  title_format: ProductAddonTitleFormat;
  description_enable?: boolean;
  description?: string;
  type: ProductAddonType;
  display?: ProductAddonDisplay;
  position?: number;
  required?: boolean;
  
  // Price fields
  price?: string;
  price_type?: ProductAddonPriceType;
  
  // Multiple choice and checkbox options
  options?: ProductAddonOption[];
  
  // Text fields
  placeholder_enable?: boolean;
  placeholder?: string;
  restrictions_type?: ProductAddonRestrictionsType;
  min?: number;
  max?: number;
  
  // File upload fields
  restrictions?: number; // 0 = no restrictions
  adjust_price?: boolean;
  
  // Default value
  default?: string;
}

/**
 * Product Add-ons configuration for Store API cart requests
 * Used when adding products with add-ons to the cart
 */
export interface ProductAddonsCartConfiguration {
  [addonId: string]: 
    | number              // For multiple_choice (option index)
    | number[]            // For checkbox (array of option indexes)
    | string              // For custom_text, custom_textarea, datepicker (ISO8601 format), file_upload (URL)
    | number;             // For custom_price, input_multiplier
}

/**
 * Global Add-on Group
 * Used for managing global add-ons that apply to multiple products
 */
export interface WooGlobalAddonGroup {
  id: number;
  name: string;
  priority: number;
  restrict_to_categories: number[];
  fields: ProductAddon[];
}

export interface WooProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooProductTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooProductDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooProductDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooDownload {
  id: string;
  name: string;
  file: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: ProductType;
  status: ProductStatus;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooDownload[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: TaxStatus;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders: BackordersStatus;
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: WooProductDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooProductCategory[];
  tags: WooProductTag[];
  images: WooImage[];
  attributes: WooProductAttribute[];
  default_attributes: WooProductDefaultAttribute[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: WooMetaData[];
  
  // Product Add-ons extension fields
  exclude_global_add_ons?: boolean;
  addons?: ProductAddon[];
  
  _links?: WooLinks;
}

export interface WooProductVariation {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  on_sale: boolean;
  status: ProductStatus;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooDownload[];
  download_limit: number;
  download_expiry: number;
  tax_status: TaxStatus;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders: BackordersStatus;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: WooProductDimensions;
  shipping_class: string;
  shipping_class_id: number;
  image: WooImage;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  menu_order: number;
  meta_data: WooMetaData[];
  _links?: WooLinks;
}

// ============================================================================
// Cart Types (WooCommerce Store API)
// ============================================================================

export interface WooCartItemImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
}

export interface WooCartItemPrices {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: {
    min_amount: string;
    max_amount: string;
  } | null;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooCartItemTotals {
  line_subtotal: string;
  line_subtotal_tax: string;
  line_total: string;
  line_total_tax: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooCartItem {
  key: string;
  id: number;
  quantity: number;
  quantity_limits: {
    minimum: number;
    maximum: number;
    multiple_of: number;
    editable: boolean;
  };
  name: string;
  short_description: string;
  description: string;
  sku: string;
  low_stock_remaining: number | null;
  backorders_allowed: boolean;
  show_backorder_badge: boolean;
  sold_individually: boolean;
  permalink: string;
  images: WooCartItemImage[];
  variation: Array<{
    attribute: string;
    value: string;
  }>;
  item_data: Array<{
    name: string;
    value: string;
  }>;
  prices: WooCartItemPrices;
  totals: WooCartItemTotals;
  catalog_visibility: string;
  extensions: Record<string, any>;
}

export interface WooCartTotals {
  total_items: string;
  total_items_tax: string;
  total_fees: string;
  total_fees_tax: string;
  total_discount: string;
  total_discount_tax: string;
  total_shipping: string;
  total_shipping_tax: string;
  total_price: string;
  total_tax: string;
  tax_lines: Array<{
    name: string;
    price: string;
    rate: string;
  }>;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  taxes: string;
  instance_id: number;
  method_id: string;
  meta_data: Array<{
    key: string;
    value: string;
  }>;
  selected: boolean;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
}

export interface WooCoupon {
  code: string;
  discount_type: string;
  totals: {
    total_discount: string;
    total_discount_tax: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
}

export interface WooCart {
  coupons: WooCoupon[];
  shipping_address: WooShippingAddress;
  billing_address: WooShippingAddress;
  items: WooCartItem[];
  items_count: number;
  items_weight: number;
  cross_sells: Array<{
    id: number;
    name: string;
    permalink: string;
    images: WooCartItemImage[];
  }>;
  needs_payment: boolean;
  needs_shipping: boolean;
  has_calculated_shipping: boolean;
  shipping_rates: Array<{
    package_id: number;
    name: string;
    destination: {
      address_1: string;
      address_2: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
    items: Array<{
      key: string;
      name: string;
      quantity: number;
    }>;
    shipping_rates: WooShippingRate[];
  }>;
  totals: WooCartTotals;
  errors: Array<{
    code: string;
    message: string;
    additional_data: Record<string, any>;
  }>;
  payment_methods: string[];
  payment_requirements: string[];
  extensions: Record<string, any>;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus = 
  | 'pending' 
  | 'processing' 
  | 'on-hold' 
  | 'completed' 
  | 'cancelled' 
  | 'refunded' 
  | 'failed' 
  | 'trash';

export interface WooBillingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface WooOrderLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: WooMetaData[];
  sku: string;
  price: number;
  image: WooImage;
  parent_name: string | null;
}

export interface WooOrderShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
  }>;
  meta_data: WooMetaData[];
}

export interface WooOrderTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  rate_percent: number;
  meta_data: WooMetaData[];
}

export interface WooOrderFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  amount: string;
  total: string;
  total_tax: string;
  taxes: Array<{
    id: number;
    total: string;
    subtotal: string;
  }>;
  meta_data: WooMetaData[];
}

export interface WooOrderCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: WooMetaData[];
}

export interface WooOrder {
  id: number;
  parent_id: number;
  status: OrderStatus;
  currency: string;
  version: string;
  prices_include_tax: boolean;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  order_key: string;
  billing: WooBillingAddress;
  shipping: WooShippingAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  customer_ip_address: string;
  customer_user_agent: string;
  created_via: string;
  customer_note: string;
  date_completed: string | null;
  date_completed_gmt: string | null;
  date_paid: string | null;
  date_paid_gmt: string | null;
  cart_hash: string;
  number: string;
  meta_data: WooMetaData[];
  line_items: WooOrderLineItem[];
  tax_lines: WooOrderTaxLine[];
  shipping_lines: WooOrderShippingLine[];
  fee_lines: WooOrderFeeLine[];
  coupon_lines: WooOrderCouponLine[];
  refunds: Array<{
    id: number;
    reason: string;
    total: string;
  }>;
  payment_url: string;
  is_editable: boolean;
  needs_payment: boolean;
  needs_processing: boolean;
  date_created_formatted: string;
  _links?: WooLinks;
}

// ============================================================================
// Customer Types
// ============================================================================

export interface WooCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooBillingAddress;
  shipping: WooShippingAddress;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: WooMetaData[];
  _links?: WooLinks;
}

// ============================================================================
// Category Types
// ============================================================================

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: WooImage | null;
  menu_order: number;
  count: number;
  _links?: WooLinks;
}

// ============================================================================
// Payment Gateway Types
// ============================================================================

export interface WooPaymentGateway {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  method_title: string;
  method_description: string;
  method_supports: string[];
  settings: Record<string, any>;
  _links?: WooLinks;
}

// ============================================================================
// System Types
// ============================================================================

export interface WooCountry {
  code: string;
  name: string;
  states: Array<{
    code: string;
    name: string;
  }>;
}

export interface WooSystemStatus {
  environment: Record<string, any>;
  database: Record<string, any>;
  active_plugins: string[];
  theme: Record<string, any>;
  settings: Record<string, any>;
  security: Record<string, any>;
  pages: Record<string, any>;
}

// ============================================================================
// Review Types
// ============================================================================

export interface WooReview {
  id: number;
  date_created: string;
  date_created_gmt: string;
  product_id: number;
  product_name: string;
  product_permalink: string;
  status: string;
  reviewer: string;
  reviewer_email: string;
  review: string;
  rating: number;
  verified: boolean;
  reviewer_avatar_urls: Record<string, string>;
  _links?: WooLinks;
}

// ============================================================================
// Product Add-ons Cart Extension Types
// ============================================================================

/**
 * Product Add-on data in cart item extensions
 * This is how Store API returns add-ons in cart items
 */
export interface CartItemAddonExtension {
  id: string;
  name: string;
  value: string | string[];
  price: string;
  field_name: string;
}

/**
 * Cart item extensions field (Store API)
 */
export interface WooCartItemExtensions {
  'product-add-ons'?: {
    addons: CartItemAddonExtension[];
  };
  [key: string]: any;
}

// Override the extensions field in WooCartItem with proper typing
declare module './types' {
  interface WooCartItem {
    extensions: WooCartItemExtensions;
  }
}

// ============================================================================
// Transformation Types (GraphQL ↔ REST API)
// ============================================================================

/**
 * Selected add-on from product page (user selection)
 * Used before transforming to Store API format
 */
export interface SelectedAddon {
  fieldName: string;
  label: string;
  value: string | string[];
  price: number;
  fieldType: string;
  valueText?: string;
}

/**
 * Cart add-on data (compatible with both GraphQL and REST API)
 * This is the normalized format we use internally
 */
export interface CartAddonData {
  fieldName: string;
  value: string;
  price: number;
  label: string;
}

/**
 * Add-on for cart storage in extraData
 * Matches the format GraphQL expects
 */
export interface ExtraDataAddon {
  key: 'addons';
  value: string; // JSON stringified CartAddonData[]
}

// ============================================================================
// Input Types for Order Creation
// ============================================================================

/**
 * Line item for order creation
 * Used when posting to /wp-json/wc/v3/orders
 */
export interface WooOrderLineItemInput {
  product_id: number;
  variation_id?: number;
  quantity: number;
  subtotal?: string;  // Line item subtotal (before discounts)
  total?: string;     // Line item total (after discounts)
  meta_data?: Array<{
    key: string;
    value: string;
    display_key?: string;
    display_value?: string;
  }>;
}

/**
 * Order creation payload
 * Used for POST /wp-json/wc/v3/orders
 */
export interface WooOrderCreateInput {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: WooBillingAddress;
  shipping?: WooShippingAddress;
  line_items: WooOrderLineItemInput[];
  shipping_lines?: Array<{
    method_id: string;
    method_title: string;
    total?: string;
  }>;
  coupon_lines?: Array<{
    code: string;
  }>;
  customer_note?: string;
  customer_id?: number;
  status?: OrderStatus;
  meta_data?: WooMetaData[];
}

