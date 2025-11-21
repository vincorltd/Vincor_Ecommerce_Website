/**
 * Product Tabs Type Definitions
 * Shared between client and server
 */

export interface TabSpec {
  category?: string;
  label: string;
  value: string;
}

export interface TabImage {
  id: number;
  url: string;
  alt: string;
  caption?: string;
}

export interface ProductTab {
  id: string;
  title: string;
  type: 'specifications' | 'content' | 'media_gallery';
  priority: number;
  specifications?: TabSpec[];
  content?: string;
  images?: TabImage[];
}

export interface ProductTabsResponse {
  product_id: number | string;
  tabs: ProductTab[];
}







