// Import enums for type references
import type { 
  StockStatusEnum, 
  ProductTypesEnum, 
  OrderStatusEnum, 
  ProductsOrderByEnum 
} from './enums';

// Legacy GraphQL types (kept for compatibility during migration)
type Cart = any;
type Customer = any;
type Viewer = any;
type PaymentGateway = any;
type Order = any;
type ProductBase = any;
type SimpleProduct = any;
type VariableProduct = any;
type ExternalProduct = any;
type DownloadableItem = any;
type ProductCategory = any;
type Product = any;
type Address = any;
type Terms = any;
type VariationAttribute = any;
type Comment = any;
type ProductAttribute = any;

interface ProductAttributeInput {
  attributeName: string;
  attributeValue: string;
}

interface PaymentGateways {
  nodes: PaymentGateway[];
}

interface Variation {
  name?: string | null;
  databaseId?: number;
  price?: string | null;
  regularPrice?: string | null;
  salePrice?: string | null;
  slug?: string | null;
  stockQuantity?: number | null;
  stockStatus?: StockStatusEnum | null;
  hasAttributes?: boolean | null;
  image?: ProductImage | null;
  attributes?: { nodes?: VariationAttribute[] } | null;
  node?: SimpleProduct | VariableProduct;
}

interface ProductImage {
  sourceUrl?: string | null | undefined;
  cartSourceUrl?: string | null | undefined;
  altText?: string | null | undefined;
  title?: string | null | undefined;
}

interface AppliedCoupon {
  description?: string | null;
  discountTax: string;
  discountAmount: string;
  code: string;
}

interface ShippingMethodRate {
  cost?: string | null;
  id: string;
  label?: string | null;
}

interface GeoLocation {
  code: string;
  name: string;
}

interface LineItem {
  quantity?: number | null;
  total?: string | null;
  product?: Product | null;
  variation?: Variation | null;
}

interface WooNuxtSEOItem {
  provider: string;
  url?: string;
  handle?: string;
}

interface WooNuxtFilter {
  slug: string;
  label?: string;
  hideEmpty: boolean;
  showCount: boolean;
  openByDefault: boolean;
  terms: Terms;
}

// Product Tabs Types (Vincor Custom Plugin)
// Note: Shared types also exist in ~/types/product-tabs.ts for server-side use
interface TabSpec {
  category?: string;
  label: string;
  value: string;
}

interface TabImage {
  id: number;
  url: string;
  alt: string;
  caption?: string;
}

interface ProductTab {
  id: string;
  title: string;
  type: 'specifications' | 'content' | 'media_gallery';
  priority: number;
  specifications?: TabSpec[];
  content?: string;
  images?: TabImage[];
}

interface ProductTabsResponse {
  product_id: number | string;
  tabs: ProductTab[];
}
