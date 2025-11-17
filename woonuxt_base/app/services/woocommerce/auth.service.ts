/**
 * Authentication Service
 * 
 * Handles all authentication operations using server-side proxy endpoints
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar: string | null;
  roles: string[];
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  customer?: any;
  message?: string;
  error?: string;
}

export class AuthService {
  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('[Auth Service] 🔐 Logging in user:', credentials.username);
      
      // Try the alternative login endpoint first (more reliable)
      const response = await $fetch<AuthResponse>('/api/auth/login-alt', {
        method: 'POST',
        body: credentials,
        credentials: 'include', // Important for cookies
      });

      console.log('[Auth Service] ✅ Login successful');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Login failed:', error);
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<AuthResponse> {
    try {
      console.log('[Auth Service] 🚪 Logging out user');
      
      const response = await $fetch<AuthResponse>('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      console.log('[Auth Service] ✅ Logout successful');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Logout failed:', error);
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Logout failed',
      };
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      console.log('[Auth Service] 📝 Registering user:', data.username);
      
      const response = await $fetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: data,
      });

      console.log('[Auth Service] ✅ Registration successful');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Registration failed:', error);
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Registration failed',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      console.log('[Auth Service] 👤 Fetching current user');
      
      const response = await $fetch<AuthResponse>('/api/auth/me', {
        credentials: 'include',
      });

      console.log('[Auth Service] ✅ Current user retrieved');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Failed to get current user:', error);
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Not authenticated',
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<AuthResponse> {
    try {
      console.log('[Auth Service] 🔑 Sending password reset email');
      
      const response = await $fetch<AuthResponse>('/api/auth/reset-password', {
        method: 'POST',
        body: { email },
      });

      console.log('[Auth Service] ✅ Password reset email sent');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Failed to send reset email:', error);
      
      return {
        success: false,
        error: error.data?.message || error.message || 'Failed to send reset email',
      };
    }
  }

  /**
   * Get customer orders
   */
  async getOrders(): Promise<any> {
    try {
      console.log('[Auth Service] 📦 Fetching customer orders');
      
      const response = await $fetch('/api/customers/orders', {
        credentials: 'include',
      });

      console.log('[Auth Service] ✅ Orders retrieved:', response.orders?.length || 0);
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get customer data
   */
  async getCustomerData(): Promise<any> {
    try {
      console.log('[Auth Service] 👤 Fetching customer data');
      
      const response = await $fetch('/api/customers/me', {
        credentials: 'include',
      });

      console.log('[Auth Service] ✅ Customer data retrieved');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Failed to get customer data:', error);
      throw error;
    }
  }

  /**
   * Update customer data
   */
  async updateCustomerData(data: any): Promise<any> {
    try {
      console.log('[Auth Service] 📝 Updating customer data');
      
      const response = await $fetch('/api/customers/update', {
        method: 'PUT',
        body: data,
        credentials: 'include',
      });

      console.log('[Auth Service] ✅ Customer data updated');
      return response;
    } catch (error: any) {
      console.error('[Auth Service] ❌ Failed to update customer data:', error);
      throw error;
    }
  }
}

// Export singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

// Export default instance for convenient usage
export const authService = new AuthService();

