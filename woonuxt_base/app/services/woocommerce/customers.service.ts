/**
 * Customers Service
 * 
 * Handles all customer operations using WooCommerce REST API
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#customers
 */

import { getApiClient } from '../api/client';
import type { WooCustomer, WooBillingAddress, WooShippingAddress, WooMetaData } from '../api/types';

export interface CreateCustomerPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  username: string;
  password: string;
  billing?: Partial<WooBillingAddress>;
  shipping?: Partial<WooShippingAddress>;
  meta_data?: WooMetaData[];
}

export interface UpdateCustomerPayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  password?: string;
  billing?: Partial<WooBillingAddress>;
  shipping?: Partial<WooShippingAddress>;
  meta_data?: WooMetaData[];
}

export interface GetCustomersParams {
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'id' | 'include' | 'name' | 'registered_date';
  email?: string;
  role?: string;
}

export class CustomersService {
  private client = getApiClient();
  
  /**
   * Create a new customer (register)
   */
  async createCustomer(payload: CreateCustomerPayload): Promise<WooCustomer> {
    return this.client.post<WooCustomer>('/customers', payload, {
      authenticated: true,
    });
  }
  
  /**
   * Get all customers
   */
  async getCustomers(params: GetCustomersParams = {}): Promise<WooCustomer[]> {
    return this.client.get<WooCustomer[]>('/customers', params, {
      authenticated: true,
    });
  }
  
  /**
   * Get a single customer by ID
   */
  async getCustomer(id: number): Promise<WooCustomer> {
    return this.client.get<WooCustomer>(`/customers/${id}`, undefined, {
      authenticated: true,
    });
  }
  
  /**
   * Get customer by email
   */
  async getCustomerByEmail(email: string): Promise<WooCustomer | null> {
    const customers = await this.getCustomers({ email, per_page: 1 });
    return customers.length > 0 ? customers[0] : null;
  }
  
  /**
   * Update a customer
   */
  async updateCustomer(id: number, payload: UpdateCustomerPayload): Promise<WooCustomer> {
    return this.client.put<WooCustomer>(`/customers/${id}`, payload, {
      authenticated: true,
    });
  }
  
  /**
   * Delete a customer
   */
  async deleteCustomer(id: number, reassign?: number): Promise<WooCustomer> {
    return this.client.delete<WooCustomer>(`/customers/${id}`, {
      authenticated: true,
      params: { force: true, reassign },
    });
  }
  
  /**
   * Get current logged-in customer
   * Note: This requires a custom endpoint or WordPress REST API integration
   */
  async getCurrentCustomer(): Promise<WooCustomer | null> {
    // This would typically use WordPress REST API /wp/v2/users/me
    // Or a custom endpoint that validates the session
    // For now, return null - this needs JWT or session validation
    return null;
  }
  
  /**
   * Update customer billing address
   */
  async updateBillingAddress(
    customerId: number,
    billing: Partial<WooBillingAddress>
  ): Promise<WooCustomer> {
    return this.updateCustomer(customerId, { billing });
  }
  
  /**
   * Update customer shipping address
   */
  async updateShippingAddress(
    customerId: number,
    shipping: Partial<WooShippingAddress>
  ): Promise<WooCustomer> {
    return this.updateCustomer(customerId, { shipping });
  }
}

// Export singleton instance
let customersServiceInstance: CustomersService | null = null;

export function getCustomersService(): CustomersService {
  if (!customersServiceInstance) {
    customersServiceInstance = new CustomersService();
  }
  return customersServiceInstance;
}

// Export default instance for convenient usage
export const customersService = new CustomersService();

