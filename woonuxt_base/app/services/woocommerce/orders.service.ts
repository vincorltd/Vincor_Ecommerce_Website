/**
 * Orders Service
 * 
 * Handles order operations using WooCommerce REST API
 * Documentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#orders
 */

import { getApiClient } from '../api/client';
import type { WooOrder, WooOrderCreateInput } from '../api/types';

export class OrdersService {
  private client = getApiClient();
  
  /**
   * Create a new order
   * Used for checkout - creates order from cart data
   * Routes through server API to handle authentication
   */
  async create(orderData: WooOrderCreateInput): Promise<WooOrder> {
    console.log('[OrdersService] 📝 Creating order...');
    console.log('[OrdersService] Order data:', {
      billing: orderData.billing.email,
      lineItemsCount: orderData.line_items.length,
      paymentMethod: orderData.payment_method,
      hasAddons: orderData.line_items.some(item => item.meta_data && item.meta_data.length > 0),
    });
    
    // Use server API endpoint for authenticated order creation
    const order = await $fetch<WooOrder>('/api/orders/create', {
      method: 'POST',
      body: orderData,
    });
    
    console.log('[OrdersService] ✅ Order created:', order.id);
    return order;
  }
  
  /**
   * Get order by ID
   * Requires order key for security validation
   * Routes through server API to handle authentication
   */
  async getById(orderId: number, orderKey?: string): Promise<WooOrder> {
    console.log('[OrdersService] 🔍 Fetching order:', orderId);
    
    // Build query string with order_key if provided
    const queryString = orderKey ? `?order_key=${orderKey}` : '';
    
    // Use server API endpoint for authenticated order retrieval
    const order = await $fetch<WooOrder>(`/api/orders/${orderId}${queryString}`, {
      method: 'GET',
    });
    
    console.log('[OrdersService] ✅ Order fetched:', order.id);
    return order;
  }
  
  /**
   * Get orders for a customer
   */
  async getCustomerOrders(customerId: number, params: {
    page?: number;
    per_page?: number;
    status?: string;
  } = {}): Promise<WooOrder[]> {
    console.log('[OrdersService] 📋 Fetching customer orders:', customerId);
    
    return this.client.get<WooOrder[]>('/orders', {
      customer: customerId,
      ...params,
    }, {
      authenticated: true,
    });
  }
  
  /**
   * Update order status
   */
  async updateStatus(orderId: number, status: string): Promise<WooOrder> {
    console.log('[OrdersService] 🔄 Updating order status:', { orderId, status });
    
    return this.client.put<WooOrder>(`/orders/${orderId}`, {
      status,
    }, {
      authenticated: true,
    });
  }
}

// Export singleton instance
let ordersServiceInstance: OrdersService | null = null;

export function getOrdersService(): OrdersService {
  if (!ordersServiceInstance) {
    ordersServiceInstance = new OrdersService();
  }
  return ordersServiceInstance;
}

// Export default instance for convenient usage
export const ordersService = new OrdersService();
