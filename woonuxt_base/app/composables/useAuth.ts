/**
 * Authentication Composable - REST API Version
 * 
 * Handles all authentication operations using WooCommerce REST API
 */

import { authService } from '#services/woocommerce/auth.service';
import type { AuthUser } from '#services/woocommerce/auth.service';

interface Customer {
  id?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  billing?: any;
  shipping?: any;
  [key: string]: any;
}

interface Viewer extends AuthUser {
  [key: string]: any;
}

interface Order {
  id?: number;
  orderNumber?: string;
  number?: string;
  date?: string;
  date_created?: string;
  status?: string;
  total?: string;
  [key: string]: any;
}

interface DownloadableItem {
  [key: string]: any;
}

interface CreateAccountInput {
  username: string;
  password: string;
  email?: string;
}

interface RegisterCustomerInput {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const useAuth = () => {
  const { refreshCart } = useCart();
  const { clearAllCookies } = useHelpers();
  const router = useRouter();

  const customer = useState<Customer>('customer', () => ({ billing: {}, shipping: {} }));
  const viewer = useState<Viewer | null>('viewer', () => null);
  const isPending = useState<boolean>('isPending', () => false);
  const orders = useState<Order[] | null>('orders', () => null);
  const downloads = useState<DownloadableItem[] | null>('downloads', () => null);

  // Transform WooCommerce order to app format
  const transformOrder = (wooOrder: any): Order => {
    return {
      id: wooOrder.id,
      orderNumber: wooOrder.number?.toString() || wooOrder.id?.toString(),
      number: wooOrder.number?.toString() || wooOrder.id?.toString(),
      date: wooOrder.date_created || wooOrder.date,
      date_created: wooOrder.date_created,
      status: wooOrder.status,
      total: wooOrder.total,
      currency: wooOrder.currency,
      lineItems: wooOrder.line_items,
      billing: wooOrder.billing,
      shipping: wooOrder.shipping,
      paymentMethod: wooOrder.payment_method_title,
      ...wooOrder,
    };
  };

  // Transform auth user to viewer format
  const transformUserToViewer = (user: AuthUser): Viewer => {
    return {
      ...user,
      databaseId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar ? { url: user.avatar } : null,
    };
  };

  // Transform WooCommerce address format to app format
  const transformAddress = (address: any) => {
    if (!address) return {};
    
    return {
      firstName: address.first_name || '',
      lastName: address.last_name || '',
      company: address.company || '',
      address1: address.address_1 || '',
      address2: address.address_2 || '',
      city: address.city || '',
      state: address.state || '',
      postcode: address.postcode || '',
      country: address.country || '',
      email: address.email || '',
      phone: address.phone || '',
    };
  };

  // Transform WooCommerce customer
  const transformCustomer = (wooCustomer: any): Customer => {
    if (!wooCustomer) return { billing: {}, shipping: {} };

    return {
      id: wooCustomer.id,
      email: wooCustomer.email,
      firstName: wooCustomer.first_name,
      lastName: wooCustomer.last_name,
      username: wooCustomer.username,
      billing: transformAddress(wooCustomer.billing),
      shipping: transformAddress(wooCustomer.shipping),
      ...wooCustomer,
    };
  };

  /**
   * Log in the user
   */
  const loginUser = async (credentials: CreateAccountInput): Promise<{ success: boolean; error: any }> => {
    isPending.value = true;

    try {
      console.log('[useAuth] 🔐 Attempting login');
      
      const response = await authService.login({
        username: credentials.username,
        password: credentials.password,
      });

      if (!response.success) {
        isPending.value = false;
        return {
          success: false,
          error: response.error || 'Login failed',
        };
      }

      // Set viewer and customer state
      if (response.user) {
        viewer.value = transformUserToViewer(response.user);
        console.log('[useAuth] 👤 Viewer set:', {
          id: viewer.value.id,
          username: viewer.value.username,
          roles: viewer.value.roles,
        });
      }
      
      if (response.customer) {
        customer.value = transformCustomer(response.customer);
      }

      // Refresh cart to associate with logged-in user
      await refreshCart();

      isPending.value = false;

      console.log('[useAuth] ✅ Login successful');

      // Redirect to my account
      setTimeout(() => {
        router.push('/my-account');
      }, 500);

      return {
        success: true,
        error: null,
      };
    } catch (error: any) {
      console.error('[useAuth] ❌ Login error:', error);
      isPending.value = false;

      return {
        success: false,
        error: error.message || 'An error occurred during login',
      };
    }
  };

  /**
   * Log out the user
   */
  const logoutUser = async (): Promise<{ success: boolean; error: any }> => {
    isPending.value = true;

    try {
      console.log('[useAuth] 🚪 Logging out');
      
      const response = await authService.logout();

      // Clear state
      viewer.value = null;
      customer.value = { billing: {}, shipping: {} };
      orders.value = null;
      downloads.value = null;

      // Clear cookies
      clearAllCookies();

      // Refresh cart (will create new guest cart)
      await refreshCart();

      isPending.value = false;

      console.log('[useAuth] ✅ Logout successful');

      // Redirect to home
      router.push('/');

      return { 
        success: true, 
        error: null 
      };
    } catch (error: any) {
      console.error('[useAuth] ❌ Logout error:', error);
      isPending.value = false;

      return { 
        success: false, 
        error: error.message || 'Logout failed' 
      };
    }
  };

  /**
   * Register the user
   */
  const registerUser = async (userInfo: RegisterCustomerInput): Promise<{ success: boolean; error: any }> => {
    isPending.value = true;

    try {
      console.log('[useAuth] 📝 Registering user');
      
      const response = await authService.register({
        email: userInfo.email,
        username: userInfo.username,
        password: userInfo.password,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
      });

      isPending.value = false;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Registration failed',
        };
      }

      console.log('[useAuth] ✅ Registration successful');

      return { 
        success: true, 
        error: null 
      };
    } catch (error: any) {
      console.error('[useAuth] ❌ Registration error:', error);
      isPending.value = false;

      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  };

  /**
   * Update the customer state
   */
  const updateCustomer = (payload: Customer): void => {
    customer.value = payload;
    isPending.value = false;
  };

  /**
   * Update the viewer state
   */
  const updateViewer = (payload: Viewer | null): void => {
    viewer.value = payload;
    isPending.value = false;
  };

  /**
   * Send password reset email
   */
  const sendResetPasswordEmail = async (email: string): Promise<{ success: boolean; error: any }> => {
    try {
      isPending.value = true;
      
      console.log('[useAuth] 🔑 Sending password reset email');
      
      const response = await authService.sendPasswordResetEmail(email);

      isPending.value = false;

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Failed to send reset email',
        };
      }

      console.log('[useAuth] ✅ Reset email sent');

      return { 
        success: true, 
        error: null 
      };
    } catch (error: any) {
      console.error('[useAuth] ❌ Reset email error:', error);
      isPending.value = false;

      return {
        success: false,
        error: error.message || 'Failed to send reset email',
      };
    }
  };

  /**
   * Reset password with key (not implemented yet)
   */
  const resetPasswordWithKey = async ({
    key,
    login,
    password,
  }: {
    key: string;
    login: string;
    password: string;
  }): Promise<{ success: boolean; error: any }> => {
    // This would require a custom WordPress endpoint
    // For now, return not implemented
    console.warn('[useAuth] ⚠️ resetPasswordWithKey not implemented');
    
    return {
      success: false,
      error: 'Password reset with key is not implemented yet. Please use the email link.',
    };
  };

  /**
   * Get customer orders
   */
  const getOrders = async (): Promise<{ success: boolean; error: any }> => {
    try {
      console.log('[useAuth] 📦 Fetching orders');
      
      const response = await authService.getOrders();

      if (response.success && response.orders) {
        // Transform orders to app format
        orders.value = response.orders.map(transformOrder);
        
        console.log('[useAuth] ✅ Retrieved', orders.value.length, 'orders');
        
        return { 
          success: true, 
          error: null 
        };
      }

      return {
        success: false,
        error: 'Failed to retrieve orders',
      };
    } catch (error: any) {
      console.error('[useAuth] ❌ Get orders error:', error);

      return {
        success: false,
        error: error.message || 'Failed to retrieve orders',
      };
    }
  };

  /**
   * Get downloadable items (not implemented yet)
   */
  const getDownloads = async (): Promise<{ success: boolean; error: any }> => {
    // This would require querying customer downloadable products
    // Not commonly used, so leaving as placeholder
    console.warn('[useAuth] ⚠️ getDownloads not implemented');
    
    downloads.value = [];
    
    return {
      success: true,
      error: null,
    };
  };

  /**
   * Initialize user session (check if logged in)
   */
  const initSession = async (): Promise<void> => {
    try {
      console.log('[useAuth] 🔄 Initializing session');
      
      const response = await authService.getCurrentUser();

      if (response.success && response.user) {
        viewer.value = transformUserToViewer(response.user);
        
        if (response.customer) {
          customer.value = transformCustomer(response.customer);
        }
        
        console.log('[useAuth] ✅ Session initialized for user:', response.user.id, 'Roles:', response.user.roles);
        console.log('[useAuth] 👤 Viewer state:', {
          id: viewer.value.id,
          username: viewer.value.username,
          roles: viewer.value.roles,
        });
      } else {
        console.log('[useAuth] ℹ️ No active session');
        viewer.value = null;
        customer.value = { billing: {}, shipping: {} };
      }
    } catch (error) {
      console.log('[useAuth] ℹ️ Not authenticated');
      viewer.value = null;
      customer.value = { billing: {}, shipping: {} };
    }
  };

  // Computed properties
  const avatar = computed(() => {
    if (viewer.value?.avatar) {
      if (typeof viewer.value.avatar === 'string') {
        return viewer.value.avatar;
      }
      if (viewer.value.avatar.url) {
        return viewer.value.avatar.url;
      }
    }
    return null;
  });

  const wishlistLink = computed<string>(() => 
    viewer.value ? '/my-account?tab=wishlist' : '/wishlist'
  );

  return {
    viewer,
    customer,
    isPending,
    orders,
    downloads,
    avatar,
    wishlistLink,
    loginUser,
    updateCustomer,
    updateViewer,
    logoutUser,
    registerUser,
    sendResetPasswordEmail,
    resetPasswordWithKey,
    getOrders,
    getDownloads,
    initSession,
  };
};
