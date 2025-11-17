/**
 * Services Index
 * 
 * Central export for all application services
 */

// Export API utilities
export * from './api/config';
export * from './api/client';
export * from './api/types';

// Export WooCommerce services
export * from './woocommerce';

// Default export for convenience
export { getApiClient } from './api/client';
export { getApiConfig } from './api/config';

