/**
 * HTTP Client for WooCommerce REST API
 * 
 * This file provides a fetch-based HTTP client with error handling,
 * request/response interceptors, and retry logic.
 */

import type { WooApiConfig } from './config';
import { getApiConfig, buildAuthenticatedUrl } from './config';

export interface ApiError {
  message: string;
  code: string;
  status: number;
  data?: any;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  authenticated?: boolean;
  useStoreApi?: boolean;
  signal?: AbortSignal;
}

/**
 * Create a custom API error
 */
export function createApiError(
  message: string,
  code: string = 'api_error',
  status: number = 500,
  data?: any
): ApiError {
  return {
    message,
    code,
    status,
    data,
  };
}

/**
 * Parse error response from WooCommerce API
 */
function parseErrorResponse(response: any, status: number): ApiError {
  // WooCommerce REST API error format
  if (response?.code && response?.message) {
    return createApiError(response.message, response.code, status, response.data);
  }
  
  // Generic error
  if (response?.message) {
    return createApiError(response.message, 'api_error', status);
  }
  
  // Unknown error
  return createApiError('An unknown error occurred', 'unknown_error', status);
}

/**
 * Main API client for making HTTP requests
 */
export class ApiClient {
  private config: WooApiConfig | null = null;
  
  /**
   * Lazy load the config only when needed
   */
  private getConfig(): WooApiConfig {
    if (!this.config) {
      this.config = getApiConfig();
    }
    return this.config;
  }
  
  /**
   * Get the base URL for the request
   */
  private getBaseUrl(useStoreApi: boolean = false): string {
    const config = this.getConfig();
    return useStoreApi ? config.storeApiUrl : config.restApiUrl;
  }
  
  /**
   * Build the full URL for the request
   */
  private buildUrl(
    endpoint: string,
    options: RequestOptions
  ): string {
    const baseUrl = this.getBaseUrl(options.useStoreApi);
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    // For authenticated REST API requests, add OAuth parameters
    if (options.authenticated && !options.useStoreApi) {
      const config = this.getConfig();
      if (!config.consumerKey || !config.consumerSecret) {
        throw createApiError(
          'Consumer key and secret are required for authenticated requests',
          'missing_credentials',
          401
        );
      }
      
      return buildAuthenticatedUrl(
        url,
        config.consumerKey,
        config.consumerSecret,
        options.params
      );
    }
    
    // For Store API or non-authenticated requests, just add query params
    if (options.params) {
      const urlObj = new URL(url);
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      });
      return urlObj.toString();
    }
    
    return url;
  }
  
  /**
   * Get default headers for the request
   */
  private getHeaders(options: RequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };
    
    // Add session token if available (for cart operations)
    if (process.client) {
      const sessionCookie = useCookie('woocommerce-session');
      if (sessionCookie.value) {
        headers['X-WC-Session'] = sessionCookie.value;
      }
      
      // Add nonce for Store API
      const nonceCookie = useCookie('wc-store-api-nonce');
      if (nonceCookie.value && options.useStoreApi) {
        headers['X-WC-Store-API-Nonce'] = nonceCookie.value;
      }
    }
    
    return headers;
  }
  
  /**
   * Make an HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const method = options.method || 'GET';
    const url = this.buildUrl(endpoint, options);
    const headers = this.getHeaders(options);
    
    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: 'include', // Important for cookies
      signal: options.signal,
    };
    
    // Add body for POST, PUT, PATCH requests
    if (options.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    try {
      // Always log API requests for debugging
      console.log('[API Request] 🚀', {
        method,
        url,
        authenticated: options.authenticated,
        useStoreApi: options.useStoreApi,
        headers: Object.fromEntries(Object.entries(headers)),
        body: options.body,
      });
      
      console.log('[API Request] 📡 Sending request to:', url);
      const response = await fetch(url, fetchOptions);
      console.log('[API Response] ✅ Status:', response.status, response.statusText);
      
      // Handle session token from response (for cart operations)
      if (process.client && options.useStoreApi) {
        const sessionHeader = response.headers.get('X-WC-Session');
        if (sessionHeader) {
          const sessionCookie = useCookie('woocommerce-session', {
            maxAge: 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax',
            secure: true,
          });
          sessionCookie.value = sessionHeader;
        }
        
        // Handle nonce
        const nonceHeader = response.headers.get('X-WC-Store-API-Nonce');
        if (nonceHeader) {
          const nonceCookie = useCookie('wc-store-api-nonce', {
            maxAge: 60 * 60 * 24, // 24 hours
            sameSite: 'lax',
            secure: true,
          });
          nonceCookie.value = nonceHeader;
        }
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      console.log('[API Response] 📄 Content-Type:', contentType);
      
      const data = isJson ? await response.json() : await response.text();
      console.log('[API Response] 📦 Data:', {
        type: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A',
        sample: Array.isArray(data) ? data.slice(0, 2) : data,
      });
      
      // Handle errors
      if (!response.ok) {
        console.error('[API Error] ❌', {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        const error = isJson ? parseErrorResponse(data, response.status) : 
          createApiError(data || response.statusText, 'http_error', response.status);
        throw error;
      }
      
      return data as T;
    } catch (error: any) {
      console.error('[API Request] 💥 Request failed:', {
        name: error.name,
        message: error.message,
        status: error.status,
        code: error.code,
        error,
      });
      
      // Handle network errors
      if (error.name === 'AbortError') {
        throw createApiError('Request was cancelled', 'request_cancelled', 0);
      }
      
      if (error instanceof TypeError) {
        console.error('[API Request] 🌐 Network error - check CORS or connection');
        throw createApiError('Network error occurred', 'network_error', 0);
      }
      
      // Re-throw API errors
      if (error.status !== undefined) {
        throw error;
      }
      
      // Unknown error
      console.error('[API Request] ❓ Unknown error type');
      throw createApiError(error.message || 'Unknown error', 'unknown_error', 0);
    }
  }
  
  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: Omit<RequestOptions, 'method' | 'params'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
      params,
    });
  }
  
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }
  
  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }
  
  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
  
  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    });
  }
}

// Export a singleton instance
let apiClientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient();
  }
  return apiClientInstance;
}

