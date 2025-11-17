# Static Data Directory

This directory contains pre-fetched, cached data that is imported statically by components.

## Categories (`categories.json`)

### Why Static?
Instead of fetching categories from the API on every page load (causing stuttering and loading states), categories are pre-fetched and saved to this JSON file. Components simply import this file - **instant, zero loading time**!

### Structure
```json
{
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "totalCategories": 72,
  "topLevelCategories": 19,
  "categories": [
    {
      "id": "29",
      "name": "LNB/LNA/BUCS/Filters",
      "slug": "filter",
      "count": 38,
      "children": [
        {
          "id": "117",
          "name": "Ku-Band LNB's",
          "slug": "ku-band-lnbs",
          "count": 24,
          "children": []
        }
      ]
    }
  ]
}
```

### Updating Categories

**When to update:**
- After adding/removing/editing categories in WooCommerce
- When product counts change significantly
- Recommended: Update during deployment or weekly

**How to update:**
```bash
npm run update-categories
```

This script:
1. Fetches categories from WooCommerce REST API
2. Builds the hierarchy (parent/child relationships)
3. Filters out categories with 0 products
4. Sorts alphabetically
5. Saves to `categories.json`

**Environment variables needed:**
```env
WOO_REST_API_URL=https://satchart.com/wp-json/wc/v3
WOO_REST_API_CONS_KEY=your_key
WOO_REST_API_CONS_SEC=your_secret
```

### Benefits

✅ **Instant loading** - No async fetches, no waiting  
✅ **Zero stutter** - Categories render immediately  
✅ **No loading states** - No skeleton loaders needed  
✅ **Reliable** - No API failures on page load  
✅ **Fast builds** - Data is pre-processed  
✅ **Git trackable** - See category changes in commits  

### Automatic Updates (Optional)

You can automate category updates:

**1. GitHub Actions (on every deployment):**
```yaml
- name: Update Categories
  run: npm run update-categories
  
- name: Commit changes
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add woonuxt_base/app/data/categories.json
    git commit -m "chore: update categories" || echo "No changes"
    git push
```

**2. Cron job on server:**
```bash
# Update every night at 2 AM
0 2 * * * cd /path/to/project && npm run update-categories && git add -u && git commit -m "chore: update categories" && git push
```

**3. Manual during development:**
```bash
npm run update-categories
git add woonuxt_base/app/data/categories.json
git commit -m "chore: update categories"
```

## Future Data

This pattern can be extended to other static/semi-static data:
- Product attributes
- Brands
- Shipping zones
- Featured products
- etc.

The key principle: **If data doesn't change often, pre-fetch it and serve it statically**.



