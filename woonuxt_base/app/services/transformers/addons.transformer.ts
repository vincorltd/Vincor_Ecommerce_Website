/**
 * Add-ons Transformation Utilities
 * 
 * Handles transformation of product add-ons data between:
 * - User selections (product page)
 * - Store API format (add to cart)
 * - Cart display format (extraData)
 * - Order line item meta
 */

import type {
  ProductAddon,
  ProductAddonsCartConfiguration,
  SelectedAddon,
  CartAddonData,
  CartItemAddonExtension,
} from '../api/types';

/**
 * Format user-selected add-ons for Store API cart request
 * Converts from product page selections to Store API addons_configuration format
 * 
 * @param selectedOptions - Array of user selections from product page
 * @param productAddons - Product add-ons from REST API
 * @returns Object with addon IDs as keys and formatted values
 */
export function formatAddonsForCart(
  selectedOptions: SelectedAddon[],
  productAddons: any[]
): ProductAddonsCartConfiguration {
  const config: ProductAddonsCartConfiguration = {};
  
  selectedOptions.forEach((option, index) => {
    if (!option) return;
    
    const addon = productAddons[index];
    if (!addon) return;
    
    // Extract numeric ID from fieldName "addon-1234567890" → "1234567890"
    // Or use addon.id directly if available
    const addonId = addon.id?.toString() || addon.fieldName?.replace('addon-', '');
    if (!addonId) return;
    
    // Normalize type (handle both GraphQL and REST API formats)
    const normalizedType = normalizeAddonType(addon.type);
    
    switch (normalizedType) {
      case 'multiple_choice':
        // Store API expects: option index (0-based)
        const optionIndex = findOptionIndex(addon.options, option.label);
        config[addonId] = optionIndex;
        break;
        
      case 'checkbox':
        // Store API expects: array of option indexes (0-based)
        const selectedIndexes = findSelectedCheckboxIndexes(
          addon.options,
          selectedOptions
        );
        config[addonId] = selectedIndexes;
        break;
        
      case 'custom_text':
      case 'custom_textarea':
        // Store API expects: string value
        config[addonId] = option.valueText || option.value?.toString() || '';
        break;
        
      case 'datepicker':
        // Store API expects: ISO8601 date string
        try {
          const date = new Date(option.value as string);
          config[addonId] = date.toISOString();
        } catch (e) {
          console.error('[Addons] Invalid date for datepicker:', option.value);
          config[addonId] = new Date().toISOString();
        }
        break;
        
      case 'custom_price':
      case 'input_multiplier':
        // Store API expects: number
        config[addonId] = parseFloat(option.value as string) || 0;
        break;
        
      case 'file_upload':
        // Store API expects: complete URL to uploaded file
        config[addonId] = option.value?.toString() || '';
        break;
        
      default:
        console.warn('[Addons] Unknown addon type:', addon.type);
    }
  });
  
  return config;
}

/**
 * Find the index of a selected option in the options array
 */
function findOptionIndex(options: any[], selectedLabel: string): number {
  if (!options || options.length === 0) return 0;
  
  const index = options.findIndex(opt => 
    opt.label === selectedLabel || opt.label?.toLowerCase() === selectedLabel?.toLowerCase()
  );
  
  return index >= 0 ? index : 0;
}

/**
 * Find indexes of all selected checkbox options
 */
function findSelectedCheckboxIndexes(
  options: any[],
  selectedOptions: SelectedAddon[]
): number[] {
  if (!options || options.length === 0) return [];
  
  const selectedIndexes: number[] = [];
  
  options.forEach((opt, idx) => {
    const isSelected = selectedOptions.some(selected =>
      selected?.label === opt.label || selected?.value === opt.label
    );
    
    if (isSelected) {
      selectedIndexes.push(idx);
    }
  });
  
  return selectedIndexes;
}

/**
 * Normalize addon type to lowercase with underscores
 * Handles both GraphQL (MULTIPLE_CHOICE) and REST API (multiple_choice) formats
 */
function normalizeAddonType(type: string): string {
  if (!type) return 'custom_text';
  
  // Convert to lowercase and replace any format to snake_case
  const normalized = type
    .toLowerCase()
    .replace(/[^a-z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  return normalized;
}

/**
 * Extract add-ons from Store API cart item
 * Transforms cart item extensions to extraData format for compatibility
 * 
 * @param cartItem - Cart item from Store API
 * @returns Array with single extraData object containing add-ons
 */
export function extractAddonsFromCartItem(cartItem: any): Array<{ key: string; value: string }> {
  console.log('[Addons Transformer] 🔍 Extracting add-ons from cart item:', cartItem.name);
  console.log('[Addons Transformer] 🔍 Cart item structure:', {
    hasExtensions: !!cartItem.extensions,
    extensionKeys: cartItem.extensions ? Object.keys(cartItem.extensions) : [],
    hasItemData: !!cartItem.item_data,
    itemDataLength: cartItem.item_data?.length || 0,
  });
  
  let addonsData: any[] = [];
  
  // Method 1: Check item_data FIRST (most reliable - contains actual addon selections)
  // item_data format: [{ name: "Dish Size", value: "3.7 (+ $585.00)" }, ...]
  if (cartItem.item_data && Array.isArray(cartItem.item_data) && cartItem.item_data.length > 0) {
    console.log('[Addons Transformer] ✅ Found add-ons in item_data (source of truth)');
    addonsData = cartItem.item_data;
  }
  // Method 2: Check extensions.addons (but only if it's an array of addons, not metadata)
  else if (cartItem.extensions?.addons) {
    // Check if it's actually an array of addons or just metadata
    if (Array.isArray(cartItem.extensions.addons)) {
      console.log('[Addons Transformer] ✅ Found add-ons array in extensions.addons');
      addonsData = cartItem.extensions.addons;
    } else if (cartItem.extensions.addons.addons_data) {
      // This is just metadata, not actual addons - skip it
      console.log('[Addons Transformer] ⚠️ extensions.addons contains only metadata, not addon data');
      console.log('[Addons Transformer] ℹ️ Falling back to item_data or skipping');
    }
  }
  // Method 3: Check extensions['product-add-ons'] (alternative structure)
  else if (cartItem.extensions?.['product-add-ons']) {
    if (Array.isArray(cartItem.extensions['product-add-ons'])) {
      console.log('[Addons Transformer] ✅ Found add-ons in extensions[product-add-ons]');
      addonsData = cartItem.extensions['product-add-ons'];
    }
  }
  // No add-ons found
  if (addonsData.length === 0) {
    console.log('[Addons Transformer] ℹ️ No add-ons found for:', cartItem.name);
    return [];
  }
  
  console.log('[Addons Transformer] 📦 Raw add-ons data:', JSON.stringify(addonsData, null, 2));
  
  // Normalize the addons data structure
  // Store API can return different formats:
  // Format 1: [{ name: "Coverage", value: "HALF HEAT", price: "1290.00" }, ...]
  // Format 2: [{ field_name: "Coverage", field_value: "HALF HEAT", price_amount: 1290 }, ...]
  // Format 3: { "coverage": { name: "Coverage", value: "HALF HEAT" }, ... }
  
  let normalizedAddons: CartAddonData[] = [];
  
  if (Array.isArray(addonsData)) {
    // Use Set to track processed addons and prevent duplicates
    const processedAddons = new Set<string>();
    
    normalizedAddons = addonsData.map((item: any) => {
      // Extract field name (various possible keys)
      const fieldName = item.name || item.field_name || item.label || item.key || 'Unknown';
      
      // Extract raw value (may contain price in format like "3.7 (+ $585.00)")
      const rawValue = item.value || item.field_value || item.option || item.selected || '';
      
      // Parse value and price from strings like "3.7 (+ $585.00)" or "Center Zipper (+ $60.00)"
      let value = rawValue;
      let price = 0;
      
      // Try to extract price from value string (format: "Label (+ $Price)" or "Label (+ &#36;Price)")
      // Handle both regular $ and HTML entity &#36;
      const priceMatch = rawValue.match(/\(\+\s*(?:&#36;|\$)?\s*([0-9,.]+)\s*\)/);
      if (priceMatch) {
        // Extract the clean value (remove price part)
        // Handle both regular $ and HTML entity &#36;
        value = rawValue.replace(/\s*\(\+\s*(?:&#36;|\$)?[0-9,.]+\)\s*$/i, '').trim();
        // Extract and parse price
        const priceStr = priceMatch[1].replace(/,/g, '');
        price = parseFloat(priceStr) || 0;
        
        console.log('[Addons Transformer] 💰 Extracted price from value:', {
          rawValue,
          extractedValue: value,
          extractedPrice: price,
        });
      }
      
      // If price not found in value string, check other price fields
      if (!price) {
        if (item.price) {
          price = typeof item.price === 'string' 
            ? parseFloat(item.price.replace(/[^0-9.-]+/g, '')) || 0
            : parseFloat(item.price) || 0;
        } else if (item.price_amount) {
          price = typeof item.price_amount === 'string'
            ? parseFloat(item.price_amount.replace(/[^0-9.-]+/g, '')) || 0
            : parseFloat(item.price_amount) || 0;
        } else if (item.addon_price) {
          price = typeof item.addon_price === 'string'
            ? parseFloat(item.addon_price.replace(/[^0-9.-]+/g, '')) || 0
            : parseFloat(item.addon_price) || 0;
        }
      }
      
      // Create unique key to prevent duplicates
      const uniqueKey = `${fieldName}-${value}`;
      
      // Skip if we've already processed this addon
      if (processedAddons.has(uniqueKey)) {
        console.log('[Addons Transformer] ⚠️ Skipping duplicate addon:', uniqueKey);
        return null;
      }
      
      processedAddons.add(uniqueKey);
      
      console.log('[Addons Transformer] ✅ Parsed addon:', {
        fieldName,
        rawValue,
        parsedValue: value,
        price,
      });
      
      return {
        fieldName,
        value,
        price,
        label: value || fieldName, // Use the actual value as label (e.g., "3.7" or "Center Zipper")
      };
    }).filter((addon): addon is CartAddonData => addon !== null); // Remove null entries
  } else if (typeof addonsData === 'object' && !Array.isArray(addonsData)) {
    // Handle object format { "coverage": {...}, "voltage": {...} }
    // BUT skip if it's just metadata (like { "addons_data": {...} })
    if (addonsData.addons_data && Object.keys(addonsData).length === 1) {
      // This is just metadata, not actual addons
      console.log('[Addons Transformer] ⚠️ Object is metadata only, not addon data');
      return [];
    }
    
    normalizedAddons = Object.values(addonsData)
      .filter((item: any) => item && typeof item === 'object' && (item.name || item.field_name || item.value))
      .map((item: any) => {
        const fieldName = item.name || item.field_name || 'Unknown';
        const rawValue = item.value || item.field_value || '';
        
        // Parse value and price (same logic as array format)
        let value = rawValue;
        let price = 0;
        
        const priceMatch = rawValue.match(/\(\+\s*(?:&#36;|\$)?\s*([0-9,.]+)\s*\)/);
        if (priceMatch) {
          value = rawValue.replace(/\s*\(\+\s*(?:&#36;|\$)?[0-9,.]+\)\s*$/i, '').trim();
          const priceStr = priceMatch[1].replace(/,/g, '');
          price = parseFloat(priceStr) || 0;
        }
        
        if (!price) {
          price = typeof item.price === 'string' 
            ? parseFloat(item.price.replace(/[^0-9.-]+/g, '')) || 0
            : parseFloat(item.price || item.price_amount || '0') || 0;
        }
        
        return {
          fieldName,
          value,
          price,
          label: value || fieldName, // Use the actual value as label
        };
      });
  }
  
  console.log('[Addons Transformer] ✅ Normalized add-ons:', normalizedAddons);
  
  // Return in extraData format (compatible with current cart components)
  return [{
    key: 'addons',
    value: JSON.stringify(normalizedAddons),
  }];
}

/**
 * Parse add-ons from cart item extraData
 * Used by cart components to display add-ons
 * 
 * @param extraData - Cart item extraData array
 * @returns Parsed add-ons array
 */
export function parseAddonsFromExtraData(extraData: any[]): CartAddonData[] {
  try {
    if (!extraData || extraData.length === 0) return [];
    
    const addonsEntry = extraData.find(entry => entry.key === 'addons');
    if (!addonsEntry?.value) return [];
    
    const parsed = JSON.parse(addonsEntry.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Addons] Error parsing extraData:', e);
    return [];
  }
}

/**
 * Build order line item meta_data from cart add-ons
 * Formats add-ons for order creation via REST API
 * 
 * @param cartAddons - Parsed add-ons from cart extraData
 * @returns Array of meta_data objects for order line item
 */
export function buildOrderLineItemMeta(cartAddons: CartAddonData[]): Array<{
  key: string;
  value: string;
  display_key?: string;
  display_value?: string;
}> {
  return cartAddons.map(addon => {
    // Format price with thousand separators
    const formattedPrice = addon.price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    return {
      key: addon.fieldName,
      value: addon.value,
      display_key: addon.label || addon.fieldName,
      display_value: addon.price > 0 
        ? `${addon.value} (+$${formattedPrice})` 
        : `${addon.value} (Included)`,
    };
  });
}

/**
 * Calculate total add-ons price for a cart item
 * 
 * @param cartAddons - Parsed add-ons from cart
 * @returns Total price of all add-ons
 */
export function calculateAddonsTotalPrice(cartAddons: CartAddonData[]): number {
  return cartAddons.reduce((total, addon) => total + (addon.price || 0), 0);
}

/**
 * Validate add-ons before adding to cart
 * Checks if required add-ons are selected
 * 
 * @param productAddons - Product add-ons configuration
 * @param selectedOptions - User's selected options
 * @returns Object with isValid flag and error message
 */
export function validateAddonsSelection(
  productAddons: any[],
  selectedOptions: SelectedAddon[]
): { isValid: boolean; error?: string } {
  for (let i = 0; i < productAddons.length; i++) {
    const addon = productAddons[i];
    
    if (addon.required) {
      const selection = selectedOptions[i];
      
      if (!selection || !selection.value || selection.value === '') {
        return {
          isValid: false,
          error: `"${addon.name}" is required. Please make a selection.`,
        };
      }
      
      // For multiple choice, check if a valid option is selected
      if (normalizeAddonType(addon.type) === 'multiple_choice') {
        if (selection.label === addon.name || selection.label === '') {
          return {
            isValid: false,
            error: `Please select an option for "${addon.name}".`,
          };
        }
      }
    }
  }
  
  return { isValid: true };
}

/**
 * Get addon display name for cart/order
 * Formats addon name and value for display
 * 
 * @param addon - Cart addon data
 * @returns Formatted display string
 */
export function getAddonDisplayName(addon: CartAddonData): string {
  const price = addon.price > 0 ? ` (+$${addon.price.toFixed(2)})` : '';
  return `${addon.label}: ${addon.value}${price}`;
}

/**
 * Type guard: Check if addon has options (multiple_choice or checkbox)
 */
export function hasOptions(addon: ProductAddon): boolean {
  return Boolean(addon.options && addon.options.length > 0);
}

/**
 * Get default/placeholder text for addon based on type
 */
export function getAddonPlaceholder(addon: ProductAddon): string {
  if (addon.placeholder) return addon.placeholder;
  
  const normalizedType = normalizeAddonType(addon.type);
  
  switch (normalizedType) {
    case 'custom_text':
      return 'Enter text...';
    case 'custom_textarea':
      return 'Enter your message...';
    case 'custom_price':
      return 'Enter amount...';
    case 'input_multiplier':
      return 'Enter quantity...';
    case 'file_upload':
      return 'Choose file...';
    case 'datepicker':
      return 'Select date...';
    default:
      return `Select ${addon.name}...`;
  }
}






