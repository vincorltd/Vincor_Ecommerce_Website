/**
 * WooCommerce REST API Configuration
 * 
 * This file contains the configuration for the WooCommerce REST API client.
 * It handles API endpoints, authentication, and default settings.
 */

export interface WooApiConfig {
  storeApiUrl: string;
  restApiUrl: string;
  consumerKey?: string;
  consumerSecret?: string;
  timeout: number;
  version: string;
}

/**
 * Get the API configuration from Nuxt runtime config
 */
export function getApiConfig(): WooApiConfig {
  const config = useRuntimeConfig();
  
  const apiConfig = {
    storeApiUrl: config.public.wooStoreApiUrl as string,
    restApiUrl: config.public.wooRestApiUrl as string,
    consumerKey: config.wooConsumerKey as string | undefined,
    consumerSecret: config.wooConsumerSecret as string | undefined,
    timeout: 30000, // 30 seconds
    version: 'v3',
  };
  
  console.log('[API Config] 🔧 Configuration loaded:', {
    storeApiUrl: apiConfig.storeApiUrl,
    restApiUrl: apiConfig.restApiUrl,
    hasConsumerKey: !!apiConfig.consumerKey,
    hasConsumerSecret: !!apiConfig.consumerSecret,
    timeout: apiConfig.timeout,
    version: apiConfig.version,
  });
  
  return apiConfig;
}

/**
 * OAuth 1.0a signature generation for WooCommerce REST API
 * Required for authenticated requests (products, orders, customers, etc.)
 */
export function generateOAuthSignature(
  url: string,
  method: string,
  consumerKey: string,
  consumerSecret: string
): Record<string, string> {
  // For simplicity, we'll add OAuth parameters to the URL
  // In production, you might want to use a proper OAuth library
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  
  return {
    oauth_consumer_key: consumerKey,
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_version: '1.0',
  };
}

/**
 * Build authenticated URL with OAuth parameters for WooCommerce REST API
 */
export function buildAuthenticatedUrl(
  baseUrl: string,
  consumerKey: string,
  consumerSecret: string,
  queryParams?: Record<string, any>
): string {
  const url = new URL(baseUrl);
  
  // Add consumer key and secret as query parameters (simpler than OAuth 1.0a)
  url.searchParams.append('consumer_key', consumerKey);
  url.searchParams.append('consumer_secret', consumerSecret);
  
  // Add additional query parameters
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  
  return url.toString();
}

