export type UserRole = "customer" | "admin"

export type UserRecord = {
  id: string
  email: string
  passwordHash: string
  name: string
  role: UserRole
  phone: string | null
  address: string | null
  createdAt: string
}

export type SafeUser = Omit<UserRecord, "passwordHash">

export type ProductVariant = {
  id: string
  code: string
  size: string
  priceMinor: number
  stockOnHand: number
  stockReserved: number
  isActive: boolean
}

export type Product = {
  id: string
  code: string
  slug: string
  name: string
  category: string
  description: string
  priceMinor: number
  imageUrl: string
  images?: string[]
  isActive: boolean
  variants: ProductVariant[]
}

export type CartLine = {
  variantId: string
  productId: string
  productCode: string
  productName: string
  size: string
  imageUrl: string
  unitPriceMinor: number
  quantity: number
  lineTotalMinor: number
}

export type CartView = {
  id: string
  lines: CartLine[]
  subtotalMinor: number
}

export type OrderStatus = "processing" | "packed" | "shipped" | "delivered" | "cancelled"

export type Order = {
  id: string
  orderNumber: string
  userId: string
  customerName: string
  customerEmail: string
  status: OrderStatus
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
  fulfillmentStatus: OrderStatus
  currency: "INR"
  subtotalMinor: number
  shippingMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  shippingAddress: string
  items: Array<{
    variantId: string
    productCode: string
    productName: string
    size: string
    unitPriceMinor: number
    quantity: number
    lineTotalMinor: number
  }>
  createdAt: string
}

export type CreateOrderInput = {
  userId: string
  shippingAddress: string
  paymentMethod: "upi" | "card" | "cod"
}

export type InventoryAdjustment = {
  variantId: string
  delta: number
  reason: string
  actorUserId: string
}

export type ProductAdminInput = {
  name: string
  slug: string
  code: string
  category: string
  description: string
  priceMinor: number
  imageUrl?: string
  images?: string[]
  variants: Array<{ size: string; stockOnHand: number; priceMinor?: number }>
  isActive?: boolean
}

export type Repository = {
  findUserByEmail(email: string): Promise<UserRecord | null>
  getUserById(id: string): Promise<UserRecord | null>
  createUser(input: {
    email: string
    passwordHash: string
    name: string
  }): Promise<UserRecord>
  updateUser(
    id: string,
    input: { name?: string; email?: string; phone?: string; address?: string },
  ): Promise<UserRecord>
  createSession(input: {
    tokenHash: string
    userId: string
    expiresAt: Date
  }): Promise<void>
  getSession(tokenHash: string): Promise<{
    userId: string
    expiresAt: Date
  } | null>
  revokeSession(tokenHash: string): Promise<void>
  listProducts(input: { category?: string; search?: string }): Promise<Product[]>
  getProductBySlug(slug: string): Promise<Product | null>
  getCart(userId: string): Promise<CartView>
  addCartItem(input: {
    userId: string
    variantId: string
    quantity: number
  }): Promise<CartView>
  updateCartItem(input: {
    userId: string
    variantId: string
    quantity: number
  }): Promise<CartView>
  removeCartItem(input: { userId: string; variantId: string }): Promise<CartView>
  createOrder(input: CreateOrderInput): Promise<Order>
  listOrdersForUser(userId: string): Promise<Order[]>
  listOrdersForAdmin(): Promise<Order[]>
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>
  inventorySummary(): Promise<Array<ProductVariant & {
    productId?: string
    productName: string
    productCode: string
    productImage?: string
    category?: string
  }>>
  adjustInventory(input: InventoryAdjustment): Promise<Array<ProductVariant & {
    productId?: string
    productName: string
    productCode: string
    productImage?: string
    category?: string
  }>>
  dashboardSummary(): Promise<{
    revenueMinor: number
    orders: number
    customers: number
    inventoryUnits: number
  }>
  adminProducts(): Promise<Product[]>
  createProduct(input: ProductAdminInput): Promise<Product>
  updateProduct(id: string, input: Partial<ProductAdminInput>): Promise<Product>
  deleteProduct(id: string): Promise<{ ok: boolean; archived: boolean }>
  listCustomers(): Promise<CustomerSummary[]>
  listCategories(): Promise<Array<{ id: string; name: string; slug: string }>>
  createCategory(name: string): Promise<{ id: string; name: string; slug: string }>
}

export type CustomerSummary = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  role: UserRole
  createdAt: string
  ordersCount: number
  lifetimeSpendMinor: number
}
