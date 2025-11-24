# WordPress Product Tabs Plugin - Complete Build Instructions

## 🎯 Mission Brief

You are building a **WordPress plugin** for managing WooCommerce product tabs. This plugin will replace the old OxiLab plugin and must integrate seamlessly with a Nuxt 3 frontend via REST API.

**Key Requirements:**
- ✅ Multiple tab types (Specifications, Content, Media Gallery)
- ✅ Newegg-style specifications interface
- ✅ WordPress content editor for rich content
- ✅ Media library integration for image galleries
- ✅ REST API endpoint exposure
- ✅ Mass import tool from OxiLab JSON export
- ❌ IGNORE PDF/Datasheet tabs (handled elsewhere)

---

## 📊 Data Structure You're Working With

The OxiLab export JSON looks like this:

```json
{
  "exported_at": "2025-11-20 13:41:11",
  "total_products": 1243,
  "products_with_tabs": 856,
  "products": [
    {
      "id": 16,
      "name": "Product Name",
      "sku": "PRODUCT-SKU",
      "tabs": {
        "_oxilab_tabs_woo_data": [
          {
            "title": "Features",
            "priority": "2",
            "content": "<ul><li>Feature 1</li></ul>"
          },
          {
            "title": "Additional Specs",
            "priority": "0",
            "content": "<ul><li>OD = 1/4</li></ul>"
          }
        ]
      }
    }
  ]
}
```

---

## 🏗️ Plugin Architecture

### Plugin Structure
```
wp-content/plugins/vincor-product-tabs/
├── vincor-product-tabs.php              (Main plugin file)
├── includes/
│   ├── class-admin-interface.php        (Admin UI)
│   ├── class-rest-api.php               (REST API endpoints)
│   ├── class-tab-manager.php            (Tab CRUD operations)
│   └── class-importer.php               (OxiLab JSON importer)
├── admin/
│   ├── css/
│   │   └── admin-styles.css
│   ├── js/
│   │   ├── admin-tabs.js                (Tab management UI)
│   │   ├── spec-builder.js              (Specifications builder)
│   │   └── importer.js                  (Import UI)
│   └── views/
│       ├── meta-box.php                 (Product edit metabox)
│       └── importer-page.php            (Import tool page)
└── README.md
```

---

## 🎨 Tab Types to Implement

### 1. **Specifications Tab** (Newegg-style)
**Purpose:** Structured product specifications with categories

**Data Structure:**
```json
{
  "type": "specifications",
  "title": "Specifications",
  "priority": 10,
  "specifications": [
    {
      "category": "General",
      "label": "Brand",
      "value": "Samsung"
    },
    {
      "category": "Physical",
      "label": "Weight",
      "value": "2.5 lbs"
    }
  ]
}
```

**Admin UI Features:**
- ✅ Add/remove specification rows
- ✅ Category grouping (dropdown)
- ✅ Label + Value inputs
- ✅ Drag-to-reorder specs
- ✅ Bulk add (paste from Excel/CSV format)

### 2. **Content Tab** (WordPress Editor)
**Purpose:** Rich HTML content using WordPress editor

**Data Structure:**
```json
{
  "type": "content",
  "title": "Features",
  "priority": 20,
  "content": "<p>Rich HTML content...</p>"
}
```

**Admin UI Features:**
- ✅ Full WordPress editor (TinyMCE)
- ✅ Visual + Text/HTML modes
- ✅ Media upload button
- ✅ Standard WordPress formatting toolbar

### 3. **Media Gallery Tab**
**Purpose:** Product image galleries

**Data Structure:**
```json
{
  "type": "media_gallery",
  "title": "Gallery",
  "priority": 30,
  "images": [
    {
      "id": 123,
      "url": "https://example.com/image.jpg",
      "alt": "Alt text",
      "caption": "Optional caption"
    }
  ]
}
```

**Admin UI Features:**
- ✅ WordPress Media Library integration
- ✅ Select multiple images
- ✅ Drag-to-reorder images
- ✅ Edit captions inline
- ✅ Remove images

---

## 💾 Database Schema

Store tabs in post meta as JSON array:

**Meta Key:** `_vincor_product_tabs`

**Meta Value (JSON):**
```json
[
  {
    "id": "tab-123456789",
    "type": "specifications",
    "title": "Specifications",
    "priority": 10,
    "specifications": [...]
  },
  {
    "id": "tab-987654321",
    "type": "content",
    "title": "Features",
    "priority": 20,
    "content": "<p>Content here</p>"
  }
]
```

**Note:** Always sort tabs by `priority` (ascending) before saving and displaying.

---

## 🔧 Part 1: Main Plugin File

**File:** `vincor-product-tabs.php`

```php
<?php
/**
 * Plugin Name: Vincor Product Tabs Manager
 * Plugin URI: https://vincor.com
 * Description: Advanced product tabs with specifications, content, and media galleries. Exposes tabs via REST API.
 * Version: 1.0.0
 * Author: Vincor
 * Author URI: https://vincor.com
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: vincor-tabs
 * Domain Path: /languages
 * WC requires at least: 6.0
 * WC tested up to: 10.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('VINCOR_TABS_VERSION', '1.0.0');
define('VINCOR_TABS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VINCOR_TABS_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VINCOR_TABS_BASENAME', plugin_basename(__FILE__));

/**
 * Main Plugin Class
 */
class Vincor_Product_Tabs {
    
    private static $instance = null;
    
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->includes();
        $this->init_hooks();
    }
    
    private function includes() {
        require_once VINCOR_TABS_PLUGIN_DIR . 'includes/class-admin-interface.php';
        require_once VINCOR_TABS_PLUGIN_DIR . 'includes/class-rest-api.php';
        require_once VINCOR_TABS_PLUGIN_DIR . 'includes/class-tab-manager.php';
        require_once VINCOR_TABS_PLUGIN_DIR . 'includes/class-importer.php';
    }
    
    private function init_hooks() {
        add_action('admin_init', [$this, 'check_woocommerce']);
        add_action('init', [$this, 'load_textdomain']);
        
        // Initialize components
        Vincor_Tabs_Admin::instance();
        Vincor_Tabs_REST_API::instance();
        Vincor_Tabs_Importer::instance();
    }
    
    public function check_woocommerce() {
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>';
                echo '<strong>Vincor Product Tabs:</strong> This plugin requires WooCommerce to be installed and active.';
                echo '</p></div>';
            });
            deactivate_plugins(VINCOR_TABS_BASENAME);
        }
    }
    
    public function load_textdomain() {
        load_plugin_textdomain('vincor-tabs', false, dirname(VINCOR_TABS_BASENAME) . '/languages');
    }
}

// Initialize the plugin
function vincor_tabs_init() {
    return Vincor_Product_Tabs::instance();
}

add_action('plugins_loaded', 'vincor_tabs_init');

// Activation hook
register_activation_hook(__FILE__, function() {
    // Set default options
    add_option('vincor_tabs_version', VINCOR_TABS_VERSION);
    
    // Flush rewrite rules for REST API
    flush_rewrite_rules();
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});
```

---

## 🎨 Part 2: Admin Interface (Meta Box)

**File:** `includes/class-admin-interface.php`

This class creates the product edit page meta box.

**Key Features:**
- Tabbed interface for managing multiple tabs
- Add/edit/delete tabs
- Type-specific editors (specs, content, media)
- Priority ordering
- Save/validation

**Implementation Notes:**
```php
<?php
class Vincor_Tabs_Admin {
    
    private static $instance = null;
    
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('add_meta_boxes', [$this, 'add_meta_box']);
        add_action('save_post_product', [$this, 'save_meta_box'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_assets']);
        
        // Add admin menu for importer
        add_action('admin_menu', [$this, 'add_admin_menu']);
    }
    
    public function add_meta_box() {
        add_meta_box(
            'vincor_product_tabs',
            '<span class="dashicons dashicons-editor-table"></span> Product Tabs',
            [$this, 'render_meta_box'],
            'product',
            'normal',
            'high'
        );
    }
    
    public function render_meta_box($post) {
        wp_nonce_field('vincor_save_tabs', 'vincor_tabs_nonce');
        
        $tabs = get_post_meta($post->ID, '_vincor_product_tabs', true);
        if (!is_array($tabs)) {
            $tabs = [];
        }
        
        include VINCOR_TABS_PLUGIN_DIR . 'admin/views/meta-box.php';
    }
    
    public function save_meta_box($post_id, $post) {
        // Security checks
        if (!isset($_POST['vincor_tabs_nonce']) || !wp_verify_nonce($_POST['vincor_tabs_nonce'], 'vincor_save_tabs')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Get and sanitize tabs data
        $tabs_json = isset($_POST['vincor_tabs_data']) ? wp_unslash($_POST['vincor_tabs_data']) : '[]';
        $tabs = json_decode($tabs_json, true);
        
        if (!is_array($tabs)) {
            $tabs = [];
        }
        
        // Validate and sanitize each tab
        $sanitized_tabs = [];
        foreach ($tabs as $tab) {
            $sanitized_tab = Vincor_Tab_Manager::sanitize_tab($tab);
            if ($sanitized_tab) {
                $sanitized_tabs[] = $sanitized_tab;
            }
        }
        
        // Sort by priority
        usort($sanitized_tabs, function($a, $b) {
            return ($a['priority'] ?? 10) - ($b['priority'] ?? 10);
        });
        
        // Save
        if (!empty($sanitized_tabs)) {
            update_post_meta($post_id, '_vincor_product_tabs', $sanitized_tabs);
        } else {
            delete_post_meta($post_id, '_vincor_product_tabs');
        }
    }
    
    public function enqueue_assets($hook) {
        if (!in_array($hook, ['post.php', 'post-new.php'])) {
            return;
        }
        
        global $post;
        if (empty($post) || $post->post_type !== 'product') {
            return;
        }
        
        // Enqueue styles
        wp_enqueue_style(
            'vincor-tabs-admin',
            VINCOR_TABS_PLUGIN_URL . 'admin/css/admin-styles.css',
            [],
            VINCOR_TABS_VERSION
        );
        
        // Enqueue scripts
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
        
        wp_enqueue_script(
            'vincor-tabs-admin',
            VINCOR_TABS_PLUGIN_URL . 'admin/js/admin-tabs.js',
            ['jquery', 'jquery-ui-sortable', 'wp-editor'],
            VINCOR_TABS_VERSION,
            true
        );
        
        wp_enqueue_script(
            'vincor-spec-builder',
            VINCOR_TABS_PLUGIN_URL . 'admin/js/spec-builder.js',
            ['jquery'],
            VINCOR_TABS_VERSION,
            true
        );
        
        wp_localize_script('vincor-tabs-admin', 'vincorTabsData', [
            'nonce' => wp_create_nonce('vincor_tabs_ajax'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
        ]);
    }
    
    public function add_admin_menu() {
        add_submenu_page(
            'tools.php',
            'Import Product Tabs',
            'Import Product Tabs',
            'manage_options',
            'vincor-tabs-importer',
            [$this, 'render_importer_page']
        );
    }
    
    public function render_importer_page() {
        include VINCOR_TABS_PLUGIN_DIR . 'admin/views/importer-page.php';
    }
}
```

---

## 📡 Part 3: REST API Endpoint

**File:** `includes/class-rest-api.php`

**Endpoint:** `/wp-json/vincor/v1/product-tabs/{product_id}`

```php
<?php
class Vincor_Tabs_REST_API {
    
    private static $instance = null;
    
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
        add_filter('woocommerce_rest_prepare_product_object', [$this, 'add_tabs_to_product'], 10, 3);
    }
    
    public function register_routes() {
        // Get tabs by product ID or SKU
        register_rest_route('vincor/v1', '/product-tabs/(?P<identifier>[a-zA-Z0-9-_]+)', [
            'methods' => 'GET',
            'callback' => [$this, 'get_product_tabs'],
            'permission_callback' => '__return_true',
            'args' => [
                'identifier' => [
                    'required' => true,
                    'validate_callback' => function($param) {
                        return is_string($param);
                    }
                ]
            ]
        ]);
    }
    
    public function get_product_tabs($request) {
        $identifier = $request->get_param('identifier');
        
        // Try to find product by ID first
        if (is_numeric($identifier)) {
            $product_id = intval($identifier);
        } else {
            // Find by SKU
            $product_id = wc_get_product_id_by_sku($identifier);
        }
        
        if (!$product_id) {
            return new WP_Error('product_not_found', 'Product not found', ['status' => 404]);
        }
        
        $tabs = get_post_meta($product_id, '_vincor_product_tabs', true);
        
        if (!is_array($tabs)) {
            $tabs = [];
        }
        
        return rest_ensure_response([
            'product_id' => $product_id,
            'tabs' => $tabs
        ]);
    }
    
    /**
     * Add tabs to WooCommerce REST API product response
     */
    public function add_tabs_to_product($response, $product, $request) {
        $product_id = $product->get_id();
        $tabs = get_post_meta($product_id, '_vincor_product_tabs', true);
        
        if (!is_array($tabs)) {
            $tabs = [];
        }
        
        $response->data['custom_tabs'] = $tabs;
        
        return $response;
    }
}
```

---

## 📥 Part 4: OxiLab JSON Importer

**File:** `includes/class-importer.php`

**This is CRITICAL - imports the OxiLab JSON data**

```php
<?php
class Vincor_Tabs_Importer {
    
    private static $instance = null;
    
    public static function instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('wp_ajax_vincor_import_tabs', [$this, 'ajax_import']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_importer_assets']);
    }
    
    public function enqueue_importer_assets($hook) {
        if ($hook !== 'tools_page_vincor-tabs-importer') {
            return;
        }
        
        wp_enqueue_script(
            'vincor-importer',
            VINCOR_TABS_PLUGIN_URL . 'admin/js/importer.js',
            ['jquery'],
            VINCOR_TABS_VERSION,
            true
        );
        
        wp_localize_script('vincor-importer', 'vincorImporterData', [
            'nonce' => wp_create_nonce('vincor_import_tabs'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
        ]);
    }
    
    public function ajax_import() {
        check_ajax_referer('vincor_import_tabs', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Permission denied']);
        }
        
        // Get JSON data from request
        $json_data = isset($_POST['json_data']) ? wp_unslash($_POST['json_data']) : '';
        
        if (empty($json_data)) {
            wp_send_json_error(['message' => 'No data provided']);
        }
        
        $data = json_decode($json_data, true);
        
        if (!$data || !isset($data['products']) || !is_array($data['products'])) {
            wp_send_json_error(['message' => 'Invalid JSON format']);
        }
        
        // Process import
        $results = $this->process_import($data['products']);
        
        wp_send_json_success($results);
    }
    
    /**
     * Process the import of OxiLab tabs
     */
    private function process_import($products) {
        $results = [
            'total' => 0,
            'success' => 0,
            'skipped' => 0,
            'errors' => 0,
            'details' => []
        ];
        
        foreach ($products as $product_data) {
            $results['total']++;
            
            $product_id = $product_data['id'];
            $product_name = $product_data['name'] ?? "Product #{$product_id}";
            
            // Skip if product doesn't exist
            if (!get_post($product_id)) {
                $results['skipped']++;
                $results['details'][] = [
                    'product' => $product_name,
                    'status' => 'skipped',
                    'message' => 'Product not found'
                ];
                continue;
            }
            
            // Create backup
            $existing_tabs = get_post_meta($product_id, '_vincor_product_tabs', true);
            if ($existing_tabs) {
                update_post_meta($product_id, '_vincor_product_tabs_backup_' . time(), $existing_tabs);
            }
            
            // Transform OxiLab data
            $new_tabs = $this->transform_oxilab_tabs($product_data['tabs']);
            
            if (empty($new_tabs)) {
                $results['skipped']++;
                $results['details'][] = [
                    'product' => $product_name,
                    'status' => 'skipped',
                    'message' => 'No valid tabs found'
                ];
                continue;
            }
            
            // Save tabs
            $updated = update_post_meta($product_id, '_vincor_product_tabs', $new_tabs);
            
            if ($updated !== false) {
                $results['success']++;
                $results['details'][] = [
                    'product' => $product_name,
                    'status' => 'success',
                    'message' => count($new_tabs) . ' tabs imported'
                ];
            } else {
                $results['errors']++;
                $results['details'][] = [
                    'product' => $product_name,
                    'status' => 'error',
                    'message' => 'Failed to save tabs'
                ];
            }
        }
        
        return $results;
    }
    
    /**
     * Transform OxiLab tabs to new format
     */
    private function transform_oxilab_tabs($oxilab_tabs) {
        $new_tabs = [];
        
        // OxiLab stores tabs in _oxilab_tabs_woo_data
        if (!isset($oxilab_tabs['_oxilab_tabs_woo_data']) || !is_array($oxilab_tabs['_oxilab_tabs_woo_data'])) {
            return [];
        }
        
        foreach ($oxilab_tabs['_oxilab_tabs_woo_data'] as $index => $tab) {
            $title = $tab['title'] ?? 'Untitled Tab';
            $content = $tab['content'] ?? '';
            $priority = isset($tab['priority']) ? intval($tab['priority']) * 10 : ($index + 1) * 10;
            
            // Skip PDF/datasheet tabs (iframe detection)
            if (stripos($content, '<iframe') !== false && stripos($content, '.pdf') !== false) {
                continue; // IGNORE PDF tabs as requested
            }
            
            // Determine tab type and transform
            $new_tab = $this->determine_tab_type($title, $content, $priority);
            
            if ($new_tab) {
                $new_tabs[] = $new_tab;
            }
        }
        
        return $new_tabs;
    }
    
    /**
     * Determine tab type from content
     */
    private function determine_tab_type($title, $content, $priority) {
        $title_lower = strtolower($title);
        
        // Check if it's a specifications tab
        if (stripos($title_lower, 'spec') !== false || stripos($title_lower, 'additional') !== false) {
            return $this->transform_to_specifications($title, $content, $priority);
        }
        
        // Otherwise, it's a content tab
        return [
            'id' => 'tab-' . uniqid(),
            'type' => 'content',
            'title' => sanitize_text_field($title),
            'priority' => $priority,
            'content' => wp_kses_post($content)
        ];
    }
    
    /**
     * Try to parse content into specifications format
     */
    private function transform_to_specifications($title, $content, $priority) {
        $specifications = [];
        
        // Try to extract specs from HTML lists
        if (preg_match_all('/<li[^>]*>([^<]+)<\/li>/i', $content, $matches)) {
            foreach ($matches[1] as $item) {
                $item = strip_tags($item);
                
                // Try to split on = or :
                if (preg_match('/^([^=:]+)[=:](.+)$/i', $item, $parts)) {
                    $specifications[] = [
                        'category' => 'General',
                        'label' => trim($parts[1]),
                        'value' => trim($parts[2])
                    ];
                } else {
                    // Can't parse, just add as single value
                    $specifications[] = [
                        'category' => 'General',
                        'label' => '',
                        'value' => trim($item)
                    ];
                }
            }
        }
        
        // If we successfully parsed specs, return specifications tab
        if (!empty($specifications)) {
            return [
                'id' => 'tab-' . uniqid(),
                'type' => 'specifications',
                'title' => sanitize_text_field($title),
                'priority' => $priority,
                'specifications' => $specifications
            ];
        }
        
        // Fallback to content tab
        return [
            'id' => 'tab-' . uniqid(),
            'type' => 'content',
            'title' => sanitize_text_field($title),
            'priority' => $priority,
            'content' => wp_kses_post($content)
        ];
    }
}
```

---

## 🎯 Part 5: Tab Manager (Helper Class)

**File:** `includes/class-tab-manager.php`

```php
<?php
class Vincor_Tab_Manager {
    
    /**
     * Sanitize a tab object
     */
    public static function sanitize_tab($tab) {
        if (!is_array($tab) || empty($tab['type'])) {
            return null;
        }
        
        $sanitized = [
            'id' => sanitize_text_field($tab['id'] ?? 'tab-' . uniqid()),
            'type' => sanitize_text_field($tab['type']),
            'title' => sanitize_text_field($tab['title'] ?? 'Untitled'),
            'priority' => intval($tab['priority'] ?? 10)
        ];
        
        // Type-specific sanitization
        switch ($sanitized['type']) {
            case 'specifications':
                $sanitized['specifications'] = self::sanitize_specifications($tab['specifications'] ?? []);
                break;
                
            case 'content':
                $sanitized['content'] = wp_kses_post($tab['content'] ?? '');
                break;
                
            case 'media_gallery':
                $sanitized['images'] = self::sanitize_images($tab['images'] ?? []);
                break;
                
            default:
                return null;
        }
        
        return $sanitized;
    }
    
    private static function sanitize_specifications($specs) {
        if (!is_array($specs)) {
            return [];
        }
        
        $sanitized = [];
        foreach ($specs as $spec) {
            if (!is_array($spec)) {
                continue;
            }
            
            $sanitized[] = [
                'category' => sanitize_text_field($spec['category'] ?? 'General'),
                'label' => sanitize_text_field($spec['label'] ?? ''),
                'value' => sanitize_text_field($spec['value'] ?? '')
            ];
        }
        
        return $sanitized;
    }
    
    private static function sanitize_images($images) {
        if (!is_array($images)) {
            return [];
        }
        
        $sanitized = [];
        foreach ($images as $image) {
            if (!is_array($image) || empty($image['id'])) {
                continue;
            }
            
            $sanitized[] = [
                'id' => intval($image['id']),
                'url' => esc_url_raw($image['url'] ?? ''),
                'alt' => sanitize_text_field($image['alt'] ?? ''),
                'caption' => sanitize_text_field($image['caption'] ?? '')
            ];
        }
        
        return $sanitized;
    }
}
```

---

## 🎨 Part 6: Admin UI Views

### Meta Box View
**File:** `admin/views/meta-box.php`

```php
<div id="vincor-tabs-container" class="vincor-tabs-admin">
    <div class="vincor-tabs-header">
        <h3>Manage Product Tabs</h3>
        <button type="button" class="button button-primary" id="vincor-add-tab">
            <span class="dashicons dashicons-plus-alt"></span> Add New Tab
        </button>
    </div>
    
    <div id="vincor-tabs-list" class="vincor-tabs-list">
        <!-- Tabs will be rendered here by JavaScript -->
    </div>
    
    <!-- Hidden field to store JSON data -->
    <input type="hidden" id="vincor-tabs-data" name="vincor_tabs_data" value="<?php echo esc_attr(json_encode($tabs)); ?>">
</div>

<!-- Tab Type Selection Modal -->
<div id="vincor-tab-type-modal" class="vincor-modal" style="display: none;">
    <div class="vincor-modal-content">
        <h2>Select Tab Type</h2>
        <div class="tab-type-options">
            <button class="tab-type-option" data-type="specifications">
                <span class="dashicons dashicons-list-view"></span>
                <strong>Specifications</strong>
                <p>Structured specs table (Newegg-style)</p>
            </button>
            <button class="tab-type-option" data-type="content">
                <span class="dashicons dashicons-edit"></span>
                <strong>Content</strong>
                <p>Rich HTML content editor</p>
            </button>
            <button class="tab-type-option" data-type="media_gallery">
                <span class="dashicons dashicons-format-gallery"></span>
                <strong>Media Gallery</strong>
                <p>Image gallery from media library</p>
            </button>
        </div>
        <button class="button" id="vincor-cancel-tab-type">Cancel</button>
    </div>
</div>
```

### Importer Page View
**File:** `admin/views/importer-page.php`

```php
<div class="wrap vincor-importer-page">
    <h1>Import Product Tabs from OxiLab</h1>
    
    <div class="vincor-import-instructions">
        <h2>Instructions:</h2>
        <ol>
            <li>Upload your <code>oxilab-tabs-export-XXXXX.json</code> file below</li>
            <li>Preview the data to be imported</li>
            <li>Click "Start Import" to begin</li>
            <li>PDF/Datasheet tabs will be automatically skipped</li>
        </ol>
        
        <div class="notice notice-warning">
            <p><strong>Important:</strong> This will create backups of existing tabs before importing. Backups are saved as <code>_vincor_product_tabs_backup_[timestamp]</code>.</p>
        </div>
    </div>
    
    <div class="vincor-import-form">
        <h3>Step 1: Upload JSON File</h3>
        <input type="file" id="vincor-import-file" accept=".json" />
        <button type="button" class="button button-primary" id="vincor-preview-import" disabled>
            Preview Import
        </button>
    </div>
    
    <div id="vincor-import-preview" class="vincor-import-preview" style="display: none;">
        <h3>Step 2: Preview</h3>
        <div id="vincor-preview-content"></div>
        <button type="button" class="button button-primary button-large" id="vincor-start-import">
            Start Import
        </button>
    </div>
    
    <div id="vincor-import-progress" class="vincor-import-progress" style="display: none;">
        <h3>Importing...</h3>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%;"></div>
        </div>
        <div id="vincor-progress-text">0%</div>
    </div>
    
    <div id="vincor-import-results" class="vincor-import-results" style="display: none;">
        <h3>Import Complete!</h3>
        <div id="vincor-results-content"></div>
    </div>
</div>
```

---

## 📝 Part 7: JavaScript Implementation

### Main Admin JavaScript
**File:** `admin/js/admin-tabs.js`

**Key Functions:**
- `initTabs()` - Initialize tab management interface
- `addTab(type)` - Add new tab with specific type
- `renderTab(tab)` - Render tab UI based on type
- `removeTab(id)` - Remove tab
- `saveTabsData()` - Collect all tab data and save to hidden field
- `initSortable()` - Enable drag-to-reorder

### Specifications Builder
**File:** `admin/js/spec-builder.js`

**Key Functions:**
- `addSpecRow()` - Add specification row
- `removeSpecRow()` - Remove specification row
- `bulkAddSpecs()` - Paste from Excel/CSV
- `groupByCategory()` - Organize specs by category

### Importer JavaScript
**File:** `admin/js/importer.js`

**Key Functions:**
- `handleFileUpload()` - Read JSON file
- `previewImport()` - Show import preview
- `startImport()` - Begin import via AJAX
- `updateProgress()` - Show progress bar

---

## 🎨 Part 8: CSS Styling

**File:** `admin/css/admin-styles.css`

**Style Requirements:**
- Clean, professional WordPress admin styling
- Color scheme: WordPress blue (#2271b1)
- Responsive design for mobile/tablet
- Hover states for interactive elements
- Loading spinners
- Modal dialogs
- Sortable drag handles
- Tab type icons

---

## ✅ Implementation Checklist

### Phase 1: Core Plugin (Days 1-2)
- [ ] Create plugin file structure
- [ ] Implement main plugin class
- [ ] Add meta box to product edit page
- [ ] Create basic admin UI (empty state)
- [ ] Enqueue scripts and styles

### Phase 2: Tab Types (Days 3-5)
- [ ] Implement Specifications tab type
  - [ ] Admin UI (add/edit/delete rows)
  - [ ] Category grouping
  - [ ] Bulk import from paste
  - [ ] Drag-to-reorder
- [ ] Implement Content tab type
  - [ ] WordPress editor integration
  - [ ] Visual/HTML mode switching
- [ ] Implement Media Gallery tab type
  - [ ] Media library picker
  - [ ] Image reordering
  - [ ] Caption editing

### Phase 3: Save & Validation (Day 6)
- [ ] JavaScript to collect tab data
- [ ] Save to hidden field as JSON
- [ ] PHP validation and sanitization
- [ ] Save to post meta
- [ ] Test all tab types

### Phase 4: REST API (Day 7)
- [ ] Register REST endpoint
- [ ] Return tabs for product
- [ ] Add tabs to WooCommerce product API
- [ ] Test with frontend component

### Phase 5: Importer (Days 8-9)
- [ ] Create importer admin page
- [ ] File upload UI
- [ ] JSON parsing
- [ ] Preview functionality
- [ ] Import processing (AJAX)
- [ ] Progress tracking
- [ ] Results display
- [ ] Test with actual OxiLab export

### Phase 6: Polish (Day 10)
- [ ] Add help text and tooltips
- [ ] Improve error handling
- [ ] Add confirmation dialogs
- [ ] Test on different screen sizes
- [ ] Performance optimization
- [ ] Create README.md

---

## 🧪 Testing Requirements

### Manual Testing
1. **Create tabs of each type** on a product
2. **Save and verify** data persists
3. **Reorder tabs** via drag-and-drop
4. **Edit existing tabs** and save
5. **Delete tabs** and verify removal
6. **Import OxiLab JSON** with provided export file
7. **Verify REST API** returns correct data
8. **Test frontend component** displays tabs correctly

### Edge Cases
- Product with no tabs
- Very long specification lists (100+ items)
- HTML content with special characters
- Large image galleries (20+ images)
- Import file with 1000+ products
- Invalid JSON data
- Missing product IDs in import

---

## 📚 API Documentation for Frontend

### REST Endpoint

```
GET /wp-json/vincor/v1/product-tabs/{product_id_or_sku}
```

**Response:**
```json
{
  "product_id": 123,
  "tabs": [
    {
      "id": "tab-abc123",
      "type": "specifications",
      "title": "Specifications",
      "priority": 10,
      "specifications": [
        {
          "category": "General",
          "label": "Brand",
          "value": "Samsung"
        }
      ]
    }
  ]
}
```

### WooCommerce Products API

Tabs are automatically added to:
```
GET /wp-json/wc/v3/products/{id}
```

Look for `custom_tabs` field in response.

---

## 🚀 Deployment

1. **Zip the plugin folder**
2. **Upload to WordPress** → Plugins → Add New → Upload
3. **Activate plugin**
4. **Go to Tools → Import Product Tabs**
5. **Upload OxiLab JSON file**
6. **Import all tabs**
7. **Test a few products**
8. **Update frontend** to use ProductTabsNew.vue component

---

## 🎯 Success Criteria

✅ Plugin installs and activates without errors
✅ Meta box appears on product edit page
✅ Can create all 3 tab types
✅ Tabs save correctly to database
✅ REST API returns tab data
✅ OxiLab JSON imports successfully
✅ PDF tabs are automatically skipped
✅ Frontend component displays tabs correctly
✅ Specifications display in Newegg-style table
✅ Content tabs show rich HTML
✅ Media galleries show images

---

## 📞 Support

If you encounter issues:
- Check WordPress debug.log for PHP errors
- Check browser console for JavaScript errors
- Verify WooCommerce is active
- Test REST API endpoint directly with curl/Postman
- Check that product IDs in import match actual products

---

**Good luck building! The frontend component is already created and waiting at:**
`woonuxt_base/app/components/productElements/ProductTabsNew.vue`

