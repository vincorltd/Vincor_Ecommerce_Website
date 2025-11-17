/**
 * System Service
 * 
 * Handles system-related operations (countries, payment gateways, etc.)
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#data
 */

import { getApiClient } from '../api/client';
import type { WooCountry, WooPaymentGateway } from '../api/types';

export class SystemService {
  private client = getApiClient();
  
  /**
   * Get all countries
   */
  async getCountries(): Promise<WooCountry[]> {
    const data = await this.client.get<Record<string, WooCountry>>('/data/countries', undefined, {
      authenticated: true,
    });
    
    // Convert object to array
    return Object.values(data);
  }
  
  /**
   * Get a single country
   */
  async getCountry(countryCode: string): Promise<WooCountry> {
    return this.client.get<WooCountry>(`/data/countries/${countryCode}`, undefined, {
      authenticated: true,
    });
  }
  
  /**
   * Get states for a country
   */
  async getStates(countryCode: string): Promise<Array<{ code: string; name: string }>> {
    const country = await this.getCountry(countryCode);
    return country.states || [];
  }
  
  /**
   * Get all payment gateways
   */
  async getPaymentGateways(): Promise<WooPaymentGateway[]> {
    return this.client.get<WooPaymentGateway[]>('/payment_gateways', undefined, {
      authenticated: true,
    });
  }
  
  /**
   * Get a single payment gateway
   */
  async getPaymentGateway(id: string): Promise<WooPaymentGateway> {
    return this.client.get<WooPaymentGateway>(`/payment_gateways/${id}`, undefined, {
      authenticated: true,
    });
  }
  
  /**
   * Get enabled payment gateways
   */
  async getEnabledPaymentGateways(): Promise<WooPaymentGateway[]> {
    const gateways = await this.getPaymentGateways();
    return gateways.filter(g => g.enabled);
  }
}

// Export singleton instance
let systemServiceInstance: SystemService | null = null;

export function getSystemService(): SystemService {
  if (!systemServiceInstance) {
    systemServiceInstance = new SystemService();
  }
  return systemServiceInstance;
}

// Export default instance for convenient usage
export const systemService = new SystemService();

