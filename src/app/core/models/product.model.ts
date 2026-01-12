export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  inventory: number;
  reservedInventory: number;
  images?: string[];
  attributes?: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  inventory: number;
  images?: string[];
  attributes?: Record<string, string>;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  inventory?: number;
  images?: string[];
  attributes?: Record<string, string>;
  isActive?: boolean;
}

export interface InventoryReservation {
  productId: string;
  quantity: number;
  orderId: string;
  expiresAt: Date;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductSearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
