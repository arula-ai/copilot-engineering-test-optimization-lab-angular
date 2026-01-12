import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, tap, catchError, delay } from 'rxjs/operators';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  InventoryReservation,
  ProductSearchParams,
  ProductSearchResult
} from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = '/api/inventory';

  // Signal-based state
  private productsSignal = signal<Product[]>([]);
  private reservationsSignal = signal<InventoryReservation[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals
  public readonly products = computed(() => this.productsSignal());
  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());

  public readonly activeProducts = computed(() =>
    this.productsSignal().filter(p => p.isActive)
  );

  public readonly lowStockProducts = computed(() =>
    this.productsSignal().filter(p => p.inventory - p.reservedInventory < 10)
  );

  public readonly outOfStockProducts = computed(() =>
    this.productsSignal().filter(p => p.inventory - p.reservedInventory <= 0)
  );

  constructor(private readonly http: HttpClient) {}

  /**
   * Get all products
   */
  getProducts(): Observable<Product[]> {
    this.loadingSignal.set(true);

    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      tap(products => {
        this.productsSignal.set(products);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Search products with filters
   */
  searchProducts(params: ProductSearchParams): Observable<ProductSearchResult> {
    this.loadingSignal.set(true);

    return this.http.get<ProductSearchResult>(`${this.apiUrl}/products/search`, {
      params: params as Record<string, string>
    }).pipe(
      tap(() => this.loadingSignal.set(false)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get product by ID
   */
  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get product by SKU
   */
  getProductBySku(sku: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/sku/${sku}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Create a new product
   */
  createProduct(dto: CreateProductDTO): Observable<Product> {
    if (!dto.sku || dto.sku.length < 3) {
      return throwError(() => new Error('SKU must be at least 3 characters'));
    }

    if (!dto.name || dto.name.length < 2) {
      return throwError(() => new Error('Product name must be at least 2 characters'));
    }

    if (dto.price < 0) {
      return throwError(() => new Error('Price cannot be negative'));
    }

    if (dto.inventory < 0) {
      return throwError(() => new Error('Inventory cannot be negative'));
    }

    this.loadingSignal.set(true);

    return this.http.post<Product>(`${this.apiUrl}/products`, dto).pipe(
      tap(product => {
        this.productsSignal.update(products => [...products, product]);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update a product
   */
  updateProduct(id: string, dto: UpdateProductDTO): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}`, dto).pipe(
      tap(product => {
        this.productsSignal.update(products =>
          products.map(p => p.id === id ? product : p)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete a product
   */
  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`).pipe(
      tap(() => {
        this.productsSignal.update(products =>
          products.filter(p => p.id !== id)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Reserve inventory for an order
   */
  reserveInventory(productId: string, quantity: number, orderId: string): Observable<InventoryReservation> {
    if (quantity <= 0) {
      return throwError(() => new Error('Quantity must be positive'));
    }

    const product = this.productsSignal().find(p => p.id === productId);
    if (product) {
      const available = product.inventory - product.reservedInventory;
      if (quantity > available) {
        return throwError(() => new Error(`Only ${available} units available`));
      }
    }

    return this.http.post<InventoryReservation>(`${this.apiUrl}/reserve`, {
      productId,
      quantity,
      orderId
    }).pipe(
      tap(reservation => {
        this.reservationsSignal.update(reservations => [...reservations, reservation]);
        // Update product reserved inventory
        this.productsSignal.update(products =>
          products.map(p => p.id === productId
            ? { ...p, reservedInventory: p.reservedInventory + quantity }
            : p
          )
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Release inventory reservation
   */
  releaseReservation(productId: string, quantity: number, orderId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/release`, {
      productId,
      quantity,
      orderId
    }).pipe(
      tap(() => {
        this.reservationsSignal.update(reservations =>
          reservations.filter(r => r.orderId !== orderId || r.productId !== productId)
        );
        // Update product reserved inventory
        this.productsSignal.update(products =>
          products.map(p => p.id === productId
            ? { ...p, reservedInventory: Math.max(0, p.reservedInventory - quantity) }
            : p
          )
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Confirm inventory (convert reservation to actual deduction)
   */
  confirmInventory(productId: string, quantity: number, orderId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/confirm`, {
      productId,
      quantity,
      orderId
    }).pipe(
      tap(() => {
        this.reservationsSignal.update(reservations =>
          reservations.filter(r => r.orderId !== orderId || r.productId !== productId)
        );
        // Update product inventory
        this.productsSignal.update(products =>
          products.map(p => p.id === productId
            ? {
                ...p,
                inventory: p.inventory - quantity,
                reservedInventory: Math.max(0, p.reservedInventory - quantity)
              }
            : p
          )
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Check availability for multiple products
   */
  checkAvailability(items: Array<{ productId: string; quantity: number }>): Observable<Map<string, boolean>> {
    return this.http.post<Record<string, boolean>>(`${this.apiUrl}/check-availability`, { items }).pipe(
      map(result => new Map(Object.entries(result))),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get available quantity for a product
   */
  getAvailableQuantity(productId: string): number {
    const product = this.productsSignal().find(p => p.id === productId);
    if (!product) return 0;
    return Math.max(0, product.inventory - product.reservedInventory);
  }

  /**
   * Restock a product
   */
  restockProduct(productId: string, quantity: number): Observable<Product> {
    if (quantity <= 0) {
      return throwError(() => new Error('Restock quantity must be positive'));
    }

    return this.http.post<Product>(`${this.apiUrl}/products/${productId}/restock`, { quantity }).pipe(
      tap(product => {
        this.productsSignal.update(products =>
          products.map(p => p.id === productId ? product : p)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get inventory report
   */
  getInventoryReport(): Observable<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    return this.http.get<{
      totalProducts: number;
      totalValue: number;
      lowStockCount: number;
      outOfStockCount: number;
    }>(`${this.apiUrl}/report`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.loadingSignal.set(false);

    let message = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      message = error.error.message;
    } else if (error.status === 400) {
      message = error.error?.message || 'Invalid request';
    } else if (error.status === 404) {
      message = 'Product not found';
    } else if (error.status === 409) {
      message = 'Inventory conflict';
    } else if (error.status === 500) {
      message = 'Server error. Please try again later.';
    }

    this.errorSignal.set(message);
    return throwError(() => new Error(message));
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
