import { randomUUID } from "node:crypto"
import { hashPassword } from "../src/security.js"
import { HttpError } from "../src/errors.js"
import type {
  CartView,
  CreateOrderInput,
  InventoryAdjustment,
  Order,
  OrderStatus,
  Product,
  Repository,
  UserRecord,
} from "../src/types.js"

const ids = {
  customer: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  product: "00000000-0000-4000-8000-000000000010",
  variantS: "00000000-0000-4000-8000-000000000011",
  variantM: "00000000-0000-4000-8000-000000000012",
}

export async function createMemoryRepository(): Promise<Repository> {
  const passwordHash = await hashPassword("movi2026")
  const users = new Map<string, UserRecord>([
    [
      ids.customer,
      {
        id: ids.customer,
        email: "customer@movi.in",
        passwordHash,
        name: "Aarav Sharma",
        role: "customer",
        phone: null,
        address: null,
        createdAt: new Date().toISOString(),
      },
    ],
    [
      ids.admin,
      {
        id: ids.admin,
        email: "admin@movi.in",
        passwordHash,
        name: "Studio Director",
        role: "admin",
        phone: null,
        address: null,
        createdAt: new Date().toISOString(),
      },
    ],
  ])
  const sessions = new Map<string, { userId: string; expiresAt: Date }>()
  const products: Product[] = [
    {
      id: ids.product,
      code: "01",
      slug: "essential-oversized-tee",
      name: "Essential Oversized Tee",
      category: "T-Shirts",
      description: "A relaxed MOVI silhouette.",
      priceMinor: 129900,
      imageUrl: "/movi/product-01.jpg",
      isActive: true,
      variants: [
        {
          id: ids.variantS,
          code: "01-S",
          size: "S",
          priceMinor: 129900,
          stockOnHand: 2,
          stockReserved: 0,
          isActive: true,
        },
        {
          id: ids.variantM,
          code: "01-M",
          size: "M",
          priceMinor: 129900,
          stockOnHand: 2,
          stockReserved: 0,
          isActive: true,
        },
      ],
    },
  ]
  const carts = new Map<string, Map<string, number>>()
  const orders: Order[] = []

  const getUser = (id: string) => users.get(id) ?? null
  const getVariant = (variantId: string) => {
    for (const product of products) {
      const variant = product.variants.find((item) => item.id === variantId)
      if (variant) return { product, variant }
    }
    return null
  }
  const getCart = async (userId: string): Promise<CartView> => {
    const lines = [...(carts.get(userId) ?? new Map())].map(
      ([variantId, quantity]) => {
        const found = getVariant(variantId)!
        return {
          variantId,
          productId: found.product.id,
          productCode: found.product.code,
          productName: found.product.name,
          size: found.variant.size,
          imageUrl: found.product.imageUrl,
          unitPriceMinor: found.variant.priceMinor,
          quantity,
          lineTotalMinor: found.variant.priceMinor * quantity,
        }
      },
    )
    return {
      id: userId,
      lines,
      subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0),
    }
  }
  const inventory = async () =>
    products.flatMap((product) =>
      product.variants.map((variant) => ({
        ...variant,
        productName: product.name,
        productCode: product.code,
      })),
    )

  return {
    findUserByEmail: async (email) =>
      [...users.values()].find((user) => user.email === email.toLowerCase()) ??
      null,
    getUserById: async (id) => getUser(id),
    createUser: async (input) => {
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: "customer",
        phone: null,
        address: null,
        createdAt: new Date().toISOString(),
      }
      users.set(user.id, user)
      return user
    },
    updateUser: async (id, input) => {
      const current = getUser(id)!
      const updated = {
        ...current,
        ...input,
        email: input.email ?? current.email,
      }
      users.set(id, updated)
      return updated
    },
    createSession: async (input) => {
      sessions.set(input.tokenHash, {
        userId: input.userId,
        expiresAt: input.expiresAt,
      })
    },
    getSession: async (tokenHash) => sessions.get(tokenHash) ?? null,
    revokeSession: async (tokenHash) => {
      sessions.delete(tokenHash)
    },
    listProducts: async ({ category, search }) =>
      products.filter(
        (product) =>
          (!category ||
            product.category.toLowerCase() === category.toLowerCase() ||
            product.category.toLowerCase().replace(" ", "-") ===
              category.toLowerCase()) &&
          (!search ||
            product.name.toLowerCase().includes(search.toLowerCase())),
      ),
    getProductBySlug: async (slug) =>
      products.find((product) => product.slug === slug) ?? null,
    getCart,
    addCartItem: async ({ userId, variantId, quantity }) => {
      const found = getVariant(variantId)
      if (!found)
        throw new HttpError(
          404,
          "VARIANT_NOT_FOUND",
          "That size is no longer available.",
        )
      const current = carts.get(userId) ?? new Map<string, number>()
      const next = (current.get(variantId) ?? 0) + quantity
      if (next > found.variant.stockOnHand - found.variant.stockReserved)
        throw new HttpError(
          409,
          "INSUFFICIENT_STOCK",
          "The requested quantity is not available.",
        )
      current.set(variantId, next)
      carts.set(userId, current)
      return getCart(userId)
    },
    updateCartItem: async ({ userId, variantId, quantity }) => {
      const current = carts.get(userId) ?? new Map<string, number>()
      const found = getVariant(variantId)
      if (!found || quantity > found.variant.stockOnHand - found.variant.stockReserved)
        throw new HttpError(409, "INSUFFICIENT_STOCK", "The requested quantity is not available.")
      if (!quantity) current.delete(variantId)
      else current.set(variantId, quantity)
      carts.set(userId, current)
      return getCart(userId)
    },
    removeCartItem: async ({ userId, variantId }) => {
      const current = carts.get(userId) ?? new Map<string, number>()
      current.delete(variantId)
      carts.set(userId, current)
      return getCart(userId)
    },
    createOrder: async ({
      userId,
      shippingAddress,
      paymentMethod,
    }: CreateOrderInput) => {
      const cart = await getCart(userId)
      if (!cart.lines.length)
        throw new HttpError(400, "EMPTY_CART", "Your bag is empty.")
      for (const line of cart.lines) {
        const found = getVariant(line.variantId)!
        if (line.quantity > found.variant.stockOnHand)
          throw new HttpError(
            409,
            "INSUFFICIENT_STOCK",
            "The requested quantity is not available.",
          )
        found.variant.stockOnHand -= line.quantity
      }
      const user = getUser(userId)!
      const order: Order = {
        id: randomUUID(),
        orderNumber: `MV-TEST-${orders.length + 1}`,
        userId,
        customerName: user.name,
        customerEmail: user.email,
        status: "processing",
        paymentStatus: "pending",
        fulfillmentStatus: "processing",
        currency: "INR",
        subtotalMinor: cart.subtotalMinor,
        shippingMinor: 0,
        discountMinor: 0,
        taxMinor: 0,
        totalMinor: cart.subtotalMinor,
        shippingAddress,
        items: cart.lines.map((line) => ({
          variantId: line.variantId,
          productCode: line.productCode,
          productName: line.productName,
          size: line.size,
          unitPriceMinor: line.unitPriceMinor,
          quantity: line.quantity,
          lineTotalMinor: line.lineTotalMinor,
        })),
        createdAt: new Date().toISOString(),
      }
      void paymentMethod
      orders.unshift(order)
      carts.set(userId, new Map())
      return order
    },
    listOrdersForUser: async (userId) =>
      orders.filter((order) => order.userId === userId),
    listOrdersForAdmin: async () => [...orders],
    updateOrderStatus: async (id, status: OrderStatus) => {
      const order = orders.find((item) => item.id === id)
      if (!order) return null
      const allowed: Record<OrderStatus, OrderStatus[]> = {
        processing: ["packed", "cancelled"],
        packed: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: [],
      }
      if (!allowed[order.status].includes(status))
        throw new HttpError(
          409,
          "INVALID_STATUS_TRANSITION",
          "Invalid transition.",
        )
      order.status = status
      order.fulfillmentStatus = status
      return order
    },
    inventorySummary: inventory,
    adjustInventory: async ({ variantId, delta }: InventoryAdjustment) => {
      const found = getVariant(variantId)
      if (!found || found.variant.stockOnHand + delta < 0)
        throw new HttpError(
          409,
          "INVALID_STOCK",
          "Stock cannot become negative.",
        )
      found.variant.stockOnHand += delta
      return inventory()
    },
    dashboardSummary: async () => ({
      revenueMinor: orders.reduce((sum, order) => sum + order.totalMinor, 0),
      orders: orders.length,
      customers: [...users.values()].filter((user) => user.role === "customer")
        .length,
      inventoryUnits: (await inventory()).reduce(
        (sum, variant) => sum + variant.stockOnHand - variant.stockReserved,
        0,
      ),
    }),
    adminProducts: async () => [...products],
    createProduct: async (input) => {
      const product: Product = {
        id: randomUUID(), code: input.code, slug: input.slug, name: input.name,
        category: input.category, description: input.description, priceMinor: input.priceMinor,
        imageUrl: input.imageUrl || (input.images && input.images[0]) || "/movi/product-01.jpg",
        images: (input.images && input.images.length > 0) ? input.images : [input.imageUrl || "/movi/product-01.jpg"],
        isActive: input.isActive ?? true,
        variants: input.variants.map((variant) => ({ id: randomUUID(), code: `${input.code}-${variant.size}`, size: variant.size, priceMinor: variant.priceMinor ?? input.priceMinor, stockOnHand: variant.stockOnHand, stockReserved: 0, isActive: true })),
      }
      products.push(product)
      return product
    },
    updateProduct: async (id, input) => {
      const product = products.find((item) => item.id === id)
      if (!product) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found.")
      Object.assign(product, { ...input, priceMinor: input.priceMinor ?? product.priceMinor })
      return product
    },
    deleteProduct: async (id) => {
      const idx = products.findIndex((p) => p.id === id)
      if (idx === -1) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found.")
      const hasOrders = orders.some((o) => o.items.some((i) => i.productCode === products[idx].code))
      if (hasOrders) {
        products[idx].isActive = false
        return { ok: true, archived: true }
      }
      products.splice(idx, 1)
      return { ok: true, archived: false }
    },
    listCustomers: async () =>
      [...users.values()]
        .filter((user) => user.role === "customer")
        .map((user) => {
          const userOrders = orders.filter((o) => o.userId === user.id)
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            role: user.role,
            createdAt: user.createdAt,
            ordersCount: userOrders.length,
            lifetimeSpendMinor: userOrders.reduce((sum, o) => sum + o.totalMinor, 0),
          }
        }),
    listCategories: async () => [
      { id: randomUUID(), name: "T-Shirts", slug: "t-shirts" },
      { id: randomUUID(), name: "Hoodies", slug: "hoodies" },
      { id: randomUUID(), name: "Bottoms", slug: "bottoms" },
      { id: randomUUID(), name: "Outerwear", slug: "outerwear" },
    ],
    createCategory: async (name: string) => {
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      return { id: randomUUID(), name: name.trim(), slug }
    },
  }
}

export { ids }
