/**
 * Cart Add-ons Store
 * 
 * Tracks product add-ons for cart items since Store API doesn't return them
 * Maps cart item key -> add-ons data
 * 
 * PERSISTENCE: Uses localStorage to persist across page refreshes
 */
import { defineStore } from 'pinia';

interface CartItemAddons {
  [itemKey: string]: Array<{
    fieldName: string;
    label: string;
    value: string;
    price: number;
  }>;
}

const STORAGE_KEY = 'woonuxt-cart-addons';

export const useCartAddonsStore = defineStore('cart-addons', {
  state: () => ({
    // Map of cart item key to add-ons data
    itemAddons: {} as CartItemAddons,
    _hydrated: false, // Track if we've loaded from localStorage
  }),
  
  actions: {
    /**
     * Load add-ons from localStorage (called on app init)
     */
    hydrate() {
      if (process.server) return; // Only run on client
      if (this._hydrated) return; // Already loaded
      
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.itemAddons = JSON.parse(stored);
          console.log('[Cart Addons Store] 💧 Hydrated from localStorage:', Object.keys(this.itemAddons).length, 'items');
        }
      } catch (error) {
        console.error('[Cart Addons Store] ❌ Error loading from localStorage:', error);
      }
      
      this._hydrated = true;
    },
    
    /**
     * Save current state to localStorage
     */
    persist() {
      if (process.server) return; // Only run on client
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.itemAddons));
        console.log('[Cart Addons Store] 💾 Persisted to localStorage');
      } catch (error) {
        console.error('[Cart Addons Store] ❌ Error saving to localStorage:', error);
      }
    },
    
    /**
     * Store add-ons for a cart item
     * Called after successfully adding item to cart
     */
    setItemAddons(itemKey: string, addons: any[]) {
      console.log('[Cart Addons Store] 💾 Storing add-ons for item:', itemKey, addons);
      this.itemAddons[itemKey] = addons;
      this.persist();
    },
    
    /**
     * Get add-ons for a cart item
     */
    getItemAddons(itemKey: string) {
      return this.itemAddons[itemKey] || [];
    },
    
    /**
     * Remove add-ons for a cart item
     */
    removeItemAddons(itemKey: string) {
      console.log('[Cart Addons Store] 🗑️ Removing add-ons for item:', itemKey);
      delete this.itemAddons[itemKey];
      this.persist();
    },
    
    /**
     * Clear all add-ons (when cart is emptied)
     */
    clearAll() {
      console.log('[Cart Addons Store] 🧹 Clearing all add-ons');
      this.itemAddons = {};
      this.persist();
    },
    
    /**
     * Sync add-ons with current cart items
     * Removes add-ons for items no longer in cart
     */
    syncWithCart(cartItemKeys: string[]) {
      const storedKeys = Object.keys(this.itemAddons);
      const removedKeys = storedKeys.filter(key => !cartItemKeys.includes(key));
      
      if (removedKeys.length > 0) {
        console.log('[Cart Addons Store] 🔄 Syncing: removing', removedKeys.length, 'orphaned items');
        removedKeys.forEach(key => delete this.itemAddons[key]);
        this.persist();
      }
    },
  },
});
