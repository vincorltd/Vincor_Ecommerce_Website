/**
 * WooCommerce Enums
 * These are runtime enums used throughout the application
 */

export enum StockStatusEnum {
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  ON_BACKORDER = 'ON_BACKORDER',
}

export enum ProductTypesEnum {
  SIMPLE = 'SIMPLE',
  VARIABLE = 'VARIABLE',
  EXTERNAL = 'EXTERNAL',
  GROUPED = 'GROUPED',
}

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum ProductsOrderByEnum {
  DATE = 'DATE',
  MODIFIED = 'MODIFIED',
  POPULARITY = 'POPULARITY',
  PRICE = 'PRICE',
  RATING = 'RATING',
  TITLE = 'TITLE',
}


