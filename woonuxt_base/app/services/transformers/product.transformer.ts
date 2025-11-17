/**
 * Product Transformation Utilities
 * 
 * Transforms WooCommerce REST API product responses to match GraphQL structure
 * This maintains compatibility with existing components while using REST API
 */

import type { 
  WooProduct, 
  WooProductVariation, 
  ProductAddon,
  WooProductAttribute,
} from '../api/types';
import type { Product, Variation, StockStatusEnum, ProductTypesEnum } from '#gql';

/**
 * Transform WooCommerce REST API product to GraphQL Product structure
 * This maintains full compatibility with existing components
 */
export function transformProductToGraphQL(restProduct: WooProduct): Product {
  return {
    // Basic fields
    id: `product-${restProduct.id}`,
    databaseId: restProduct.id,
    name: restProduct.name,
    slug: restProduct.slug,
    type: restProduct.type.toUpperCase() as ProductTypesEnum,
    sku: restProduct.sku || '',
    
    // Descriptions
    description: restProduct.description || '',
    shortDescription: restProduct.short_description || '',
    
    // Pricing
    price: restProduct.price || '',
    regularPrice: restProduct.regular_price || '',
    salePrice: restProduct.sale_price || '',
    rawPrice: restProduct.price || '',
    rawRegularPrice: restProduct.regular_price || '',
    rawSalePrice: restProduct.sale_price || '',
    onSale: restProduct.on_sale || false,
    
    // Stock
    stockStatus: (restProduct.stock_status?.toUpperCase() || 'INSTOCK') as StockStatusEnum,
    stockQuantity: restProduct.stock_quantity,
    lowStockAmount: restProduct.low_stock_amount,
    
    // Product attributes
    averageRating: parseFloat(restProduct.average_rating || '0'),
    reviewCount: restProduct.rating_count || 0,
    weight: restProduct.weight || '',
    length: restProduct.dimensions?.length || '',
    width: restProduct.dimensions?.width || '',
    height: restProduct.dimensions?.height || '',
    virtual: restProduct.virtual || false,
    
    // Images
    image: restProduct.images?.[0] ? {
      sourceUrl: restProduct.images[0].src,
      altText: restProduct.images[0].alt || restProduct.name,
      title: restProduct.images[0].name || restProduct.name,
      cartSourceUrl: restProduct.images[0].src,
      producCardSourceUrl: restProduct.images[0].src,
    } : null,
    
    galleryImages: {
      nodes: restProduct.images?.map(img => ({
        sourceUrl: img.src,
        altText: img.alt || restProduct.name,
        title: img.name || restProduct.name,
      })) || []
    },
    
    // Categories
    productCategories: {
      nodes: restProduct.categories?.map(cat => ({
        databaseId: cat.id,
        slug: cat.slug,
        name: cat.name,
        count: 0, // Count not included in basic product response
      })) || []
    },
    
    // Tags
    productTags: {
      nodes: restProduct.tags?.map(tag => ({
        databaseId: tag.id,
        name: tag.name,
        slug: tag.slug,
      })) || []
    },
    
    // Attributes (for variable products)
    attributes: restProduct.attributes ? {
      nodes: restProduct.attributes.map(attr => transformAttributeToGraphQL(attr))
    } : null,
    
    // Default attributes (for variable products)
    defaultAttributes: restProduct.default_attributes?.map(attr => ({
      attributeId: attr.id,
      name: attr.name,
      value: attr.option,
    })) || [],
    
    // Add-ons transformation
    addons: transformAddonsToGraphQL(restProduct.addons || []),
    
    // Variations (IDs only, actual variations fetched separately if needed)
    variations: restProduct.variations && restProduct.variations.length > 0 ? {
      nodes: [] // Populated separately via getVariations()
    } : null,
    
    // Related products (IDs only)
    related: restProduct.related_ids ? {
      nodes: [] // Can be populated with actual products if needed
    } : null,
    
    // Meta data
    metaData: restProduct.meta_data?.map(meta => ({
      id: meta.id?.toString() || '',
      key: meta.key,
      value: meta.value?.toString() || '',
    })) || [],
    
    // External product fields
    externalUrl: restProduct.external_url || '',
    buttonText: restProduct.button_text || '',
    
    // Reviews (placeholder - can be populated separately)
    reviews: {
      averageRating: parseFloat(restProduct.average_rating || '0'),
      edges: []
    },
    
    // Date
    date: restProduct.date_created || '',
  } as Product;
}

/**
 * Transform product attribute to GraphQL format
 */
function transformAttributeToGraphQL(attr: WooProductAttribute): any {
  return {
    id: `attribute-${attr.id}`,
    attributeId: attr.id,
    name: attr.name,
    label: attr.name,
    options: attr.options || [],
    visible: attr.visible,
    variation: attr.variation,
    position: attr.position,
    
    // For global attributes, terms would need to be fetched separately
    terms: attr.variation ? {
      nodes: attr.options?.map((option, index) => ({
        name: option,
        slug: option.toLowerCase().replace(/\s+/g, '-'),
        taxonomyName: attr.name,
        databaseId: index,
      })) || []
    } : null,
  };
}

/**
 * Transform REST API add-ons to GraphQL format
 * Maps REST API snake_case to GraphQL SCREAMING_SNAKE_CASE
 */
export function transformAddonsToGraphQL(restAddons: ProductAddon[]): any[] {
  return restAddons.map(addon => {
    const baseAddon = {
      fieldName: `addon-${addon.id}`,
      name: addon.name,
      description: addon.description || '',
      price: addon.price || '0',
      priceType: (addon.price_type?.toUpperCase().replace('_', '') || 'FLATFEE') as string,
      required: addon.required || false,
      titleFormat: (addon.title_format?.toUpperCase() || 'LABEL') as string,
      type: (addon.type?.toUpperCase().replace('_', '') || 'MULTIPLECHOICE') as string,
    };
    
    // Add type-specific fields
    if (addon.type === 'multiple_choice' || addon.type === 'checkbox') {
      return {
        ...baseAddon,
        options: addon.options?.map(opt => ({
          label: opt.label,
          price: opt.price || '0',
          priceType: (opt.price_type?.toUpperCase().replace('_', '') || 'FLATFEE') as string,
        })) || []
      };
    }
    
    if (addon.type === 'custom_text' || addon.type === 'custom_textarea') {
      return {
        ...baseAddon,
        placeholder: addon.placeholder || '',
        restrictionsType: addon.restrictions_type || 'any_text',
        min: addon.min || 0,
        max: addon.max || 0,
      };
    }
    
    if (addon.type === 'file_upload') {
      return {
        ...baseAddon,
        restrictions: addon.restrictions || 0,
      };
    }
    
    return baseAddon;
  });
}

/**
 * Transform WooCommerce variation to GraphQL format
 */
export function transformVariationToGraphQL(
  restVariation: WooProductVariation,
  parentProduct: WooProduct
): Variation {
  return {
    id: `variation-${restVariation.id}`,
    databaseId: restVariation.id,
    name: restVariation.sku || `${parentProduct.name} - Variation`,
    slug: restVariation.permalink?.split('/').pop() || '',
    sku: restVariation.sku || '',
    
    // Pricing
    price: restVariation.price || '',
    regularPrice: restVariation.regular_price || '',
    salePrice: restVariation.sale_price || '',
    rawPrice: restVariation.price || '',
    rawRegularPrice: restVariation.regular_price || '',
    rawSalePrice: restVariation.sale_price || '',
    onSale: restVariation.on_sale || false,
    
    // Stock
    stockStatus: (restVariation.stock_status?.toUpperCase() || 'INSTOCK') as StockStatusEnum,
    stockQuantity: restVariation.stock_quantity,
    
    // Image
    image: restVariation.image ? {
      sourceUrl: restVariation.image.src,
      altText: restVariation.image.alt || parentProduct.name,
      title: restVariation.image.name || parentProduct.name,
      cartSourceUrl: restVariation.image.src,
    } : null,
    
    // Attributes
    attributes: {
      nodes: restVariation.attributes?.map(attr => ({
        id: `variation-attribute-${attr.id}`,
        attributeId: attr.id,
        name: attr.name,
        value: attr.option,
      })) || []
    },
    
    // Other fields
    weight: restVariation.weight || '',
    length: restVariation.dimensions?.length || '',
    width: restVariation.dimensions?.width || '',
    height: restVariation.dimensions?.height || '',
    virtual: restVariation.virtual || false,
    downloadable: restVariation.downloadable || false,
    
    // Meta data
    metaData: restVariation.meta_data?.map(meta => ({
      id: meta.id?.toString() || '',
      key: meta.key,
      value: meta.value?.toString() || '',
    })) || [],
  } as Variation;
}

/**
 * Check if an addon type is a choice type (multiple_choice or checkbox)
 */
export function isChoiceAddonType(type: string): boolean {
  const normalizedType = type.toLowerCase().replace('_', '');
  return normalizedType === 'multiplechoice' || normalizedType === 'checkbox';
}

/**
 * Check if an addon type requires text input
 */
export function isTextAddonType(type: string): boolean {
  const normalizedType = type.toLowerCase().replace('_', '');
  return normalizedType === 'customtext' || normalizedType === 'customtextarea';
}

/**
 * Check if an addon type requires numeric input
 */
export function isNumericAddonType(type: string): boolean {
  const normalizedType = type.toLowerCase().replace('_', '');
  return normalizedType === 'customprice' || normalizedType === 'inputmultiplier';
}






