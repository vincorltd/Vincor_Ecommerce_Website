/**
 * Server API endpoint to add item to cart via WooCommerce Store API
 * Properly handles Nonce Token requirement for POST endpoints
 * 
 * Reference: https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart/
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const wooStoreApiUrl = config.public.wooStoreApiUrl || 'https://satchart.com/wp-json/wc/store/v1';

  console.log('[Cart API] 🛒 Adding item to cart via Store API with Nonce');

  try {
    // Get the request body
    const body = await readBody(event);
    console.log('[Cart API] 📦 Request body:', JSON.stringify(body, null, 2));
    
    // Get cookies from the request to maintain session
    const cookies = getHeader(event, 'cookie') || '';
    
    // Step 1: Fetch nonce from Store API
    // According to WooCommerce docs, nonce can be in response headers or body
    console.log('[Cart API] 🔐 Fetching nonce from Store API...');
    
    let nonce = '';
    
    try {
      // Use raw fetch to access response headers
      const response = await fetch(`${wooStoreApiUrl}/cart`, {
        method: 'GET',
        headers: {
          'Cookie': cookies,
        },
      });
      
      // Check response headers for nonce (common header names)
      const nonceHeaders = [
        'Nonce',
        'X-WC-Store-API-Nonce', 
        'X-WooCommerce-Nonce',
        'nonce'
      ];
      
      for (const header of nonceHeaders) {
        const value = response.headers.get(header);
        if (value) {
          nonce = value;
          console.log('[Cart API] ✅ Nonce found in header:', header);
          break;
        }
      }
      
      // Also check response body
      if (!nonce) {
        const cartData = await response.json();
        nonce = cartData?.extensions?.['woocommerce/store']?.nonce || 
                cartData?.extensions?.nonce || 
                '';
                
        if (nonce) {
          console.log('[Cart API] ✅ Nonce found in response body');
        }
      }
      
      if (!nonce) {
        console.warn('[Cart API] ⚠️ No nonce found in headers or body');
        console.warn('[Cart API] ℹ️ Proceeding without nonce (guest cart mode)');
      }
    } catch (error) {
      console.error('[Cart API] ⚠️ Error fetching nonce:', error);
      console.log('[Cart API] ℹ️ Proceeding without nonce');
    }

    // Step 2: Prepare Store API payload
    const storeApiPayload: any = {
      id: body.id,
      quantity: body.quantity || 1,
    };

    // Add variation ID if present
    if (body.variation_id) {
      storeApiPayload.variation = [{
        attribute: 'variation_id',
        value: body.variation_id.toString(),
      }];
    }

    // Add add-ons configuration for Product Add-Ons plugin
    // Reference: https://woocommerce.com/document/product-add-ons/store-api-integration/
    // Format: { "<addon_id>": option_index | [indexes] | "text" | date_string }
    let addonsDataRaw = null; // Store raw add-ons data for later
    
    if (body.extra_data && Array.isArray(body.extra_data)) {
      const addonsKey = body.extra_data.find((item: any) => item.key === 'addons');
      
      if (addonsKey) {
        try {
          addonsDataRaw = addonsKey.value; // Store for later
          const addons = JSON.parse(addonsKey.value);
          const addonsConfiguration: any = {};
          
          console.log('[Cart API] 🔍 Addons array received:', JSON.stringify(addons, null, 2));
          
          // Group checkboxes by addonId (they need to be arrays)
          const checkboxGroups: { [key: string]: number[] } = {};
          
          // Format as Store API expects: { "<addon_id>": option_index or [indexes] }
          addons.forEach((addon: any) => {
            console.log('[Cart API] 🔍 Processing addon:', {
              addonId: addon.addonId,
              fieldName: addon.fieldName,
              optionIndex: addon.optionIndex,
              label: addon.label
            });
            
            if (addon.addonId) {
              // Convert numeric ID to string (Store API requires string keys)
              const addonIdString = addon.addonId.toString();
              
              // Detect checkbox addon type from fieldName or check if we have multiple entries
              const isCheckbox = addon.fieldName && addons.filter((a: any) => a.addonId === addon.addonId).length > 1;
              
              if (isCheckbox) {
                // For checkboxes: collect all option indexes into an array
                if (!checkboxGroups[addonIdString]) {
                  checkboxGroups[addonIdString] = [];
                }
                if (addon.optionIndex !== undefined && addon.optionIndex !== null) {
                  checkboxGroups[addonIdString].push(addon.optionIndex);
                }
              } else {
                // For multiple choice/radio: use single option index
                if (addon.optionIndex !== undefined && addon.optionIndex !== null) {
                  addonsConfiguration[addonIdString] = addon.optionIndex;
                }
                // For text inputs: use the value/label
                else if (addon.value) {
                  addonsConfiguration[addonIdString] = addon.value;
                }
                else if (addon.label) {
                  addonsConfiguration[addonIdString] = addon.label;
                }
              }
            }
          });
          
          // Add grouped checkboxes as arrays
          Object.entries(checkboxGroups).forEach(([addonId, indexes]) => {
            addonsConfiguration[addonId] = indexes;
            console.log('[Cart API] ☑️ Checkbox group:', { addonId, indexes });
          });
          
          if (Object.keys(addonsConfiguration).length > 0) {
            storeApiPayload.addons_configuration = addonsConfiguration;
            console.log('[Cart API] 📦 Formatted addons_configuration:', JSON.stringify(addonsConfiguration, null, 2));
          }
        } catch (e) {
          console.error('[Cart API] ❌ Error parsing addons:', e);
        }
      }
    }

    console.log('[Cart API] 📤 Store API payload:', JSON.stringify(storeApiPayload, null, 2));
    console.log('[Cart API] 🧪 Payload has addons_configuration:', !!storeApiPayload.addons_configuration);

    // Step 3: Add item to cart via Store API
    const headers: any = {
      'Cookie': cookies,
      'Content-Type': 'application/json',
    };
    
    if (nonce) {
      headers['Nonce'] = nonce;
    }
    
    console.log('[Cart API] 📤 Sending to WooCommerce Store API:', {
      url: `${wooStoreApiUrl}/cart/add-item`,
      hasNonce: !!nonce,
      payloadKeys: Object.keys(storeApiPayload),
    });
    console.log('[Cart API] 🔍 FULL payload:', JSON.stringify(storeApiPayload, null, 2));
    
    // Use raw fetch to access response headers for cookie forwarding
    const response = await fetch(`${wooStoreApiUrl}/cart/add-item`, {
      method: 'POST',
      headers,
      body: JSON.stringify(storeApiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Cart API] ❌ Store API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.error('[Cart API] ❌ Could not parse error response as JSON');
      }
      
      throw createError({
        statusCode: response.status,
        message: errorData.message || errorText || 'Failed to add item to cart',
      });
    }

    // Forward Set-Cookie headers from WooCommerce to client
    const setCookieHeaders = response.headers.get('set-cookie');
    console.log('[Cart API] 🍪 Set-Cookie headers:', setCookieHeaders ? 'Present' : 'None');
    
    if (setCookieHeaders) {
      setHeader(event, 'set-cookie', setCookieHeaders);
      console.log('[Cart API] ✅ Cookies forwarded to client');
    }
    
    const result = await response.json();
    
    console.log('[Cart API] ✅ Item added to cart via Store API');
    console.log('[Cart API] 📊 Add-item response:', {
      hasItems: !!result.items,
      itemsCount: result.items?.length || 0,
      items_count_field: result.items_count,
      hasErrors: !!result.errors && result.errors.length > 0,
      errorsCount: result.errors?.length || 0,
    });
    
    // Log FULL response for debugging
    console.log('[Cart API] 🔍 FULL add-item response:', JSON.stringify(result, null, 2));
    
    // Check for errors in the response
    if (result.errors && result.errors.length > 0) {
      console.error('[Cart API] ⚠️ Store API returned errors:', result.errors);
    }
    
    // Check if item was actually added
    if (!result.items || result.items.length === 0) {
      console.error('[Cart API] ❌ WARNING: Add-item succeeded but cart is empty!');
      console.error('[Cart API] This usually means the Store API rejected the addons_configuration');
    } else {
      console.log('[Cart API] ✅ Item successfully added to cart!');
      
      // Return the cart WITH the add-ons data so frontend can track it
      // Find the newly added item (it should be the last one or match the product ID)
      const addedItem = result.items.find((item: any) => item.id === body.id);
      if (addedItem && addonsDataRaw) {
        console.log('[Cart API] 📦 Attaching add-ons data to response for item key:', addedItem.key);
        return {
          ...result,
          _addons_meta: {
            itemKey: addedItem.key,
            addons: addonsDataRaw,
          }
        };
      }
    }
    
    return result;
  } catch (error: any) {
    console.error('[Cart API] ❌ Error adding item:', error);
    console.error('[Cart API] ❌ Error details:', error?.data || error?.response);
    throw createError({
      statusCode: error?.response?.status || 500,
      message: error?.data?.message || error?.message || 'Failed to add item to cart',
    });
  }
});





