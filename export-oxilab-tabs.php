<?php
/**
 * Export OxiLab Tabs to JSON
 * 
 * INSTRUCTIONS:
 * 1. Upload this file to your WordPress root directory (same level as wp-config.php)
 * 2. Make sure you're logged in as an administrator
 * 3. Visit: https://satchart.com/export-oxilab-tabs.php
 * 4. The browser will download a JSON file automatically
 * 5. Save this file as backup - you'll need it for import
 * 6. Delete this PHP file after successful export
 * 
 * SECURITY: This file requires admin access and should be deleted after use
 */

require_once('wp-load.php');

// Security check - must be logged in as admin
if (!current_user_can('manage_options')) {
    die('<h1>Access Denied</h1><p>You must be logged in as an administrator to run this export.</p>');
}

// Set headers for JSON download
header('Content-Type: application/json');
header('Content-Disposition: attachment; filename="oxilab-tabs-export-' . date('Y-m-d-His') . '.json"');

// Initialize export data structure
$export_data = [
    'exported_at' => current_time('mysql'),
    'wordpress_version' => get_bloginfo('version'),
    'woocommerce_version' => defined('WC_VERSION') ? WC_VERSION : 'unknown',
    'site_url' => get_site_url(),
    'products' => []
];

global $wpdb;

// Get all products (published, draft, private - everything)
$products = get_posts([
    'post_type' => 'product',
    'posts_per_page' => -1,
    'post_status' => 'any',
    'orderby' => 'ID',
    'order' => 'ASC'
]);

// Loop through each product
foreach ($products as $product) {
    $product_id = $product->ID;
    $product_data = [
        'id' => $product_id,
        'name' => $product->post_title,
        'sku' => get_post_meta($product_id, '_sku', true),
        'status' => $product->post_status,
        'tabs' => []
    ];
    
    // Try various OxiLab meta key patterns
    // OxiLab may store data under different meta keys
    $possible_keys = [
        '_oxilab_tabs',
        'oxilab_tabs',
        '_product_tabs',
        'product_tabs',
        '_custom_tabs',
        'custom_tabs',
        '_oxilab_product_tabs',
        'oxilab_product_tabs',
        'tabs_data',
        '_tabs_data',
        'yikes_woo_products_tabs',
        '_yikes_woo_products_tabs'
    ];
    
    foreach ($possible_keys as $meta_key) {
        $value = get_post_meta($product_id, $meta_key, true);
        if (!empty($value)) {
            $product_data['tabs'][$meta_key] = $value;
        }
    }
    
    // Check for OxiLab's custom database table (if they use one)
    $table_name = $wpdb->prefix . 'oxilab_tabs';
    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") === $table_name) {
        $custom_table_data = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table_name WHERE product_id = %d",
                $product_id
            ),
            ARRAY_A
        );
        
        if (!empty($custom_table_data)) {
            $product_data['tabs']['_oxilab_custom_table'] = $custom_table_data;
        }
    }
    
    // Also check YIKES custom table (common tab plugin)
    $yikes_table = $wpdb->prefix . 'yikes_woo_products_tabs';
    if ($wpdb->get_var("SHOW TABLES LIKE '$yikes_table'") === $yikes_table) {
        $yikes_data = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $yikes_table WHERE product_id = %d",
                $product_id
            ),
            ARRAY_A
        );
        
        if (!empty($yikes_data)) {
            $product_data['tabs']['_yikes_custom_table'] = $yikes_data;
        }
    }
    
    // Get ALL meta keys containing 'tab' or 'oxilab' for this product
    // This catches any custom or unusual meta key names
    $all_meta = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT meta_key, meta_value 
             FROM {$wpdb->postmeta} 
             WHERE post_id = %d 
             AND (
                meta_key LIKE %s 
                OR meta_key LIKE %s
                OR meta_key LIKE %s
             )",
            $product_id,
            '%tab%',
            '%oxilab%',
            '%yikes%'
        ),
        ARRAY_A
    );
    
    foreach ($all_meta as $meta) {
        // Skip internal WordPress meta keys
        if (in_array($meta['meta_key'], ['_edit_last', '_edit_lock'])) {
            continue;
        }
        
        // Add if not already captured
        if (!isset($product_data['tabs'][$meta['meta_key']])) {
            $product_data['tabs'][$meta['meta_key']] = maybe_unserialize($meta['meta_value']);
        }
    }
    
    // Only include products that have tab data
    if (!empty($product_data['tabs'])) {
        $export_data['products'][] = $product_data;
    }
}

// Add summary statistics
$export_data['total_products'] = count($products);
$export_data['products_with_tabs'] = count($export_data['products']);

// Output JSON with pretty printing for readability
echo json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
exit;

