import { Pool, type PoolClient } from "pg"
import { HttpError } from "./errors.js"
import type {
  CartView,
  CreateOrderInput,
  CustomerSummary,
  InventoryAdjustment,
  Order,
  OrderStatus,
  Product,
  ProductAdminInput,
  ProductVariant,
  Repository,
  UserRecord,
} from "./types.js"

type ProductRow = {
  product_id: string
  product_code: string
  slug: string
  name: string
  category: string
  description: string
  price_minor: number
  image_url: string
  is_active: boolean
  variant_id: string | null
  variant_code: string | null
  size: string | null
  variant_price_minor: number | null
  stock_on_hand: number | null
  stock_reserved: number | null
  variant_active: boolean | null
}

function productFromRows(rows: ProductRow[]): Product[] {
  const products = new Map<string, Product>()
  for (const row of rows) {
    let product = products.get(row.product_id)
    if (!product) {
      product = {
        id: row.product_id,
        code: row.product_code,
        slug: row.slug,
        name: row.name,
        category: row.category,
        description: row.description,
        priceMinor: Number(row.price_minor),
        imageUrl: row.image_url,
        isActive: row.is_active,
        variants: [],
      }
      products.set(product.id, product)
    }
    if (row.variant_id)
      product.variants.push({
        id: row.variant_id,
        code: row.variant_code!,
        size: row.size!,
        priceMinor: Number(row.variant_price_minor ?? row.price_minor),
        stockOnHand: Number(row.stock_on_hand),
        stockReserved: Number(row.stock_reserved),
        isActive: Boolean(row.variant_active),
      })
  }
  return [...products.values()]
}

function mapUser(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at.toISOString(),
  }
}

function mapOrder(row: any, items: any[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    currency: row.currency,
    subtotalMinor: Number(row.subtotal_minor),
    shippingMinor: Number(row.shipping_minor),
    discountMinor: Number(row.discount_minor),
    taxMinor: Number(row.tax_minor),
    totalMinor: Number(row.total_minor),
    shippingAddress: row.shipping_address,
    items: items.map((item) => ({
      variantId: item.variant_id,
      productCode: item.product_code,
      productName: item.product_name_snapshot,
      size: item.size_snapshot,
      unitPriceMinor: Number(item.unit_price_minor),
      quantity: Number(item.quantity),
      lineTotalMinor: Number(item.line_total_minor),
    })),
    createdAt: row.created_at.toISOString(),
  }
}

export class PgRepository implements Repository {
  constructor(public readonly pool: Pool) {}

  async close() {
    await this.pool.end()
  }

  async findUserByEmail(email: string) {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()],
    )
    return result.rows[0] ? mapUser(result.rows[0]) : null
  }

  async getUserById(id: string) {
    const result = await this.pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ])
    return result.rows[0] ? mapUser(result.rows[0]) : null
  }

  async createUser(input: { email: string; passwordHash: string; name: string }) {
    const result = await this.pool.query(
      "INSERT INTO users(email, password_hash, name, role) VALUES ($1, $2, $3, 'customer') RETURNING *",
      [input.email.toLowerCase(), input.passwordHash, input.name],
    )
    return mapUser(result.rows[0])
  }

  async updateUser(
    id: string,
    input: { name?: string; email?: string; phone?: string; address?: string },
  ) {
    const result = await this.pool.query(
      "UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address), updated_at = now() WHERE id = $1 RETURNING *",
      [
        id,
        input.name ?? null,
        input.email?.toLowerCase() ?? null,
        input.phone ?? null,
        input.address ?? null,
      ],
    )
    if (!result.rows[0])
      throw new HttpError(404, "USER_NOT_FOUND", "Account not found.")
    return mapUser(result.rows[0])
  }

  async createSession(input: {
    tokenHash: string
    userId: string
    expiresAt: Date
  }) {
    await this.pool.query(
      "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [input.tokenHash, input.userId, input.expiresAt],
    )
  }

  async getSession(tokenHash: string) {
    const result = await this.pool.query(
      "SELECT user_id, expires_at FROM sessions WHERE token_hash = $1 AND revoked_at IS NULL",
      [tokenHash],
    )
    return result.rows[0]
      ? {
          userId: result.rows[0].user_id,
          expiresAt: new Date(result.rows[0].expires_at),
        }
      : null
  }

  async revokeSession(tokenHash: string) {
    await this.pool.query(
      "UPDATE sessions SET revoked_at = now() WHERE token_hash = $1",
      [tokenHash],
    )
  }

  private async attachProductImages(products: Product[]) {
    if (products.length === 0) return products
    const ids = products.map((p) => p.id)
    const imgRes = await this.pool.query(
      "SELECT product_id, image_url, sort_order, is_primary FROM product_images WHERE product_id = ANY($1) ORDER BY sort_order ASC, created_at ASC",
      [ids],
    )
    const imgMap = new Map<string, string[]>()
    for (const row of imgRes.rows) {
      const list = imgMap.get(row.product_id) || []
      if (!list.includes(row.image_url)) list.push(row.image_url)
      imgMap.set(row.product_id, list)
    }
    for (const p of products) {
      const imgs = imgMap.get(p.id)
      p.images = (imgs && imgs.length > 0) ? imgs : (p.imageUrl ? [p.imageUrl] : [])
    }
    return products
  }

  private async productsQuery(extra: string, params: unknown[]) {
    const result = await this.pool.query<ProductRow>(
      `SELECT p.id product_id, p.code product_code, p.slug, p.name, c.name category, p.description, p.base_price_minor price_minor, p.image_url, p.is_active, v.id variant_id, v.code variant_code, v.size, v.price_minor variant_price_minor, v.stock_on_hand, v.stock_reserved, v.is_active variant_active FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN product_variants v ON v.product_id = p.id AND v.is_active = true WHERE p.is_active = true ${extra} ORDER BY p.created_at DESC, v.size`,
      params,
    )
    return this.attachProductImages(productFromRows(result.rows))
  }

  async listProducts(input: { category?: string; search?: string }) {
    const clauses: string[] = []
    const params: unknown[] = []
    if (input.category) {
      params.push(input.category)
      clauses.push(`AND c.slug = $${params.length}`)
    }
    if (input.search) {
      params.push(`%${input.search}%`)
      clauses.push(
        `AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`,
      )
    }
    return this.productsQuery(clauses.join(" "), params)
  }

  async getProductBySlug(slug: string) {
    const products = await this.productsQuery("AND p.slug = $1", [slug])
    return products[0] ?? null
  }

  async adminProducts() {
    const result = await this.pool.query<ProductRow>(
      `SELECT p.id product_id, p.code product_code, p.slug, p.name, c.name category, p.description, p.base_price_minor price_minor, p.image_url, p.is_active, v.id variant_id, v.code variant_code, v.size, v.price_minor variant_price_minor, v.stock_on_hand, v.stock_reserved, v.is_active variant_active FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN product_variants v ON v.product_id = p.id ORDER BY p.created_at DESC, v.size`,
    )
    return this.attachProductImages(productFromRows(result.rows))
  }

  async listCategories(): Promise<Array<{ id: string; name: string; slug: string }>> {
    const result = await this.pool.query(
      "SELECT id, name, slug FROM categories ORDER BY name ASC",
    )
    return result.rows
  }

  async createCategory(name: string): Promise<{ id: string; name: string; slug: string }> {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const result = await this.pool.query(
      "INSERT INTO categories(name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, slug",
      [name.trim(), slug],
    )
    return result.rows[0]
  }

  private async categoryId(client: PoolClient, category: string) {
    const result = await client.query("INSERT INTO categories(name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id", [category, category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")])
    return result.rows[0].id as string
  }

  async createProduct(input: ProductAdminInput) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const categoryId = await this.categoryId(client, input.category)
      const primaryImage = input.imageUrl || (input.images && input.images[0]) || "/movi/product-01.jpg"
      const productResult = await client.query("INSERT INTO products(category_id, code, slug, name, description, base_price_minor, image_url, is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id", [categoryId, input.code, input.slug, input.name, input.description, input.priceMinor, primaryImage, input.isActive ?? true])
      const productId = productResult.rows[0].id as string
      for (const variant of input.variants) await client.query("INSERT INTO product_variants(product_id, code, size, price_minor, stock_on_hand) VALUES ($1,$2,$3,$4,$5)", [productId, `${input.code}-${variant.size.toUpperCase()}`, variant.size.toUpperCase(), variant.priceMinor ?? input.priceMinor, variant.stockOnHand])
      
      const imagesToInsert = (input.images && input.images.length > 0) ? input.images : [primaryImage]
      for (let i = 0; i < imagesToInsert.length; i++) {
        await client.query(
          "INSERT INTO product_images(product_id, image_url, alt_text, sort_order, is_primary) VALUES ($1,$2,$3,$4,$5)",
          [productId, imagesToInsert[i], `${input.name} - View ${i + 1}`, i, i === 0],
        )
      }
      await client.query("COMMIT")
      const product = await this.getProductBySlug(input.slug)
      if (!product) throw new HttpError(500, "PRODUCT_CREATE_FAILED", "Product was created but could not be read back.")
      return product
    } catch (error) { await client.query("ROLLBACK"); throw error } finally { client.release() }
  }

  async updateProduct(id: string, input: Partial<ProductAdminInput>) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      let categoryId: string | undefined
      if (input.category) categoryId = await this.categoryId(client, input.category)
      const primaryImage = input.imageUrl ?? (input.images && input.images[0]) ?? null
      const result = await client.query("UPDATE products SET category_id = COALESCE($2, category_id), code = COALESCE($3, code), slug = COALESCE($4, slug), name = COALESCE($5, name), description = COALESCE($6, description), base_price_minor = COALESCE($7, base_price_minor), image_url = COALESCE($8, image_url), is_active = COALESCE($9, is_active), updated_at = now() WHERE id = $1 RETURNING slug", [id, categoryId ?? null, input.code ?? null, input.slug ?? null, input.name ?? null, input.description ?? null, input.priceMinor ?? null, primaryImage, input.isActive ?? null])
      if (!result.rows[0]) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found.")
      
      if (input.images && input.images.length > 0) {
        await client.query("DELETE FROM product_images WHERE product_id = $1", [id])
        for (let i = 0; i < input.images.length; i++) {
          await client.query(
            "INSERT INTO product_images(product_id, image_url, alt_text, sort_order, is_primary) VALUES ($1,$2,$3,$4,$5)",
            [id, input.images[i], `${input.name ?? "MOVI product"} - View ${i + 1}`, i, i === 0],
          )
        }
      } else if (input.imageUrl) {
        await client.query("INSERT INTO product_images(product_id, image_url, alt_text, is_primary) VALUES ($1,$2,$3,true)", [id, input.imageUrl, input.name ?? "MOVI product"])
      }

      if (input.variants) for (const variant of input.variants) await client.query("INSERT INTO product_variants(product_id, code, size, price_minor, stock_on_hand) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO UPDATE SET size = EXCLUDED.size, price_minor = EXCLUDED.price_minor, stock_on_hand = EXCLUDED.stock_on_hand, updated_at = now()", [id, `${input.code ?? "SKU"}-${variant.size.toUpperCase()}`, variant.size.toUpperCase(), variant.priceMinor ?? input.priceMinor ?? 0, variant.stockOnHand])
      await client.query("COMMIT")
      const product = await this.getProductBySlug(result.rows[0].slug)
      if (!product) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found.")
      return product
    } catch (error) { await client.query("ROLLBACK"); throw error } finally { client.release() }
  }

  private async ensureCart(
    userId: string,
    client: Pool | PoolClient = this.pool,
  ) {
    const result = await client.query(
      "INSERT INTO carts(user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = now() RETURNING id",
      [userId],
    )
    return result.rows[0].id as string
  }

  async getCart(userId: string): Promise<CartView> {
    const cartId = await this.ensureCart(userId)
    const result = await this.pool.query(
      "SELECT ci.variant_id, p.id product_id, p.code product_code, p.name product_name, v.size, p.image_url, COALESCE(v.price_minor, p.base_price_minor) unit_price_minor, ci.quantity FROM cart_items ci JOIN carts ca ON ca.id = ci.cart_id JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id WHERE ca.id = $1 ORDER BY ci.created_at",
      [cartId],
    )
    const lines = result.rows.map((row) => ({
      variantId: row.variant_id,
      productId: row.product_id,
      productCode: row.product_code,
      productName: row.product_name,
      size: row.size,
      imageUrl: row.image_url,
      unitPriceMinor: Number(row.unit_price_minor),
      quantity: Number(row.quantity),
      lineTotalMinor: Number(row.unit_price_minor) * Number(row.quantity),
    }))
    return {
      id: cartId,
      lines,
      subtotalMinor: lines.reduce((sum, line) => sum + line.lineTotalMinor, 0),
    }
  }

  async addCartItem(input: {
    userId: string
    variantId: string
    quantity: number
  }) {
    const cartId = await this.ensureCart(input.userId)
    const variant = await this.pool.query(
      "SELECT v.stock_on_hand - v.stock_reserved available, v.is_active, COALESCE(ci.quantity, 0) current_quantity FROM product_variants v LEFT JOIN cart_items ci ON ci.variant_id = v.id AND ci.cart_id = $2 WHERE v.id = $1",
      [input.variantId, cartId],
    )
    if (!variant.rows[0] || !variant.rows[0].is_active)
      throw new HttpError(
        404,
        "VARIANT_NOT_FOUND",
        "That size is no longer available.",
      )
    if (
      input.quantity + Number(variant.rows[0].current_quantity) >
      Number(variant.rows[0].available)
    )
      throw new HttpError(
        409,
        "INSUFFICIENT_STOCK",
        "The requested quantity is not available.",
      )
    await this.pool.query(
      "INSERT INTO cart_items(cart_id, variant_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = now()",
      [cartId, input.variantId, input.quantity],
    )
    return this.getCart(input.userId)
  }

  async updateCartItem(input: {
    userId: string
    variantId: string
    quantity: number
  }) {
    const cartId = await this.ensureCart(input.userId)
    if (input.quantity === 0)
      await this.pool.query(
        "DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
        [cartId, input.variantId],
      )
    else {
      const variant = await this.pool.query(
        "SELECT stock_on_hand - stock_reserved available, is_active FROM product_variants WHERE id = $1",
        [input.variantId],
      )
      if (!variant.rows[0] || !variant.rows[0].is_active)
        throw new HttpError(
          404,
          "VARIANT_NOT_FOUND",
          "That size is no longer available.",
        )
      if (input.quantity > Number(variant.rows[0].available))
        throw new HttpError(
          409,
          "INSUFFICIENT_STOCK",
          "The requested quantity is not available.",
        )
      await this.pool.query(
        "UPDATE cart_items SET quantity = $3, updated_at = now() WHERE cart_id = $1 AND variant_id = $2",
        [cartId, input.variantId, input.quantity],
      )
    }
    return this.getCart(input.userId)
  }

  async removeCartItem(input: { userId: string; variantId: string }) {
    const cartId = await this.ensureCart(input.userId)
    await this.pool.query(
      "DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2",
      [cartId, input.variantId],
    )
    return this.getCart(input.userId)
  }

  private async orderWithItems(orderRow: any): Promise<Order> {
    const items = await this.pool.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at",
      [orderRow.id],
    )
    return mapOrder(orderRow, items.rows)
  }

  async createOrder(input: CreateOrderInput) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const cart = await client.query(
        "SELECT ca.id cart_id, ci.variant_id, ci.quantity, p.id product_id, p.code product_code, p.name product_name, v.size, COALESCE(v.price_minor, p.base_price_minor) unit_price_minor, v.stock_on_hand, v.stock_reserved FROM carts ca JOIN cart_items ci ON ci.cart_id = ca.id JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id WHERE ca.user_id = $1 FOR UPDATE OF v",
        [input.userId],
      )
      if (!cart.rows.length)
        throw new HttpError(400, "EMPTY_CART", "Your bag is empty.")
      for (const row of cart.rows)
        if (
          Number(row.quantity) >
          Number(row.stock_on_hand) - Number(row.stock_reserved)
        )
          throw new HttpError(
            409,
            "INSUFFICIENT_STOCK",
            `${row.product_name} (${row.size}) is not available in that quantity.`,
          )
      const userResult = await client.query(
        "SELECT name, email FROM users WHERE id = $1",
        [input.userId],
      )
      const user = userResult.rows[0]
      const subtotal = cart.rows.reduce(
        (sum, row) => sum + Number(row.unit_price_minor) * Number(row.quantity),
        0,
      )
      const shipping = 0
      const orderResult = await client.query(
        "INSERT INTO orders(order_number, user_id, status, payment_status, fulfillment_status, subtotal_minor, shipping_minor, discount_minor, tax_minor, total_minor, shipping_address) VALUES ('MV-' || to_char(now(), 'YYMMDDHH24MISSMS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4), $1, 'processing', 'pending', 'processing', $2, $3, 0, 0, $4, $5) RETURNING *",
        [
          input.userId,
          subtotal,
          shipping,
          subtotal + shipping,
          input.shippingAddress,
        ],
      )
      const orderRow = orderResult.rows[0]
      for (const row of cart.rows) {
        const lineTotal = Number(row.unit_price_minor) * Number(row.quantity)
        await client.query(
          "INSERT INTO order_items(order_id, variant_id, product_id, product_code, product_name_snapshot, size_snapshot, unit_price_minor, quantity, line_total_minor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          [
            orderRow.id,
            row.variant_id,
            row.product_id,
            row.product_code,
            row.product_name,
            row.size,
            row.unit_price_minor,
            row.quantity,
            lineTotal,
          ],
        )
        await client.query(
          "UPDATE product_variants SET stock_on_hand = stock_on_hand - $2, updated_at = now() WHERE id = $1",
          [row.variant_id, row.quantity],
        )
        await client.query(
          "INSERT INTO inventory_movements(variant_id, quantity_delta, movement_type, reason, reference_type, reference_id, created_by) VALUES ($1,$2,'sale','Order checkout','order',$3,$4)",
          [row.variant_id, -Number(row.quantity), orderRow.id, input.userId],
        )
      }
      await client.query(
        "INSERT INTO payments(order_id, provider, method, status, amount_minor, currency) VALUES ($1, 'manual', $2, $3, $4, 'INR')",
        [
          orderRow.id,
          input.paymentMethod,
          input.paymentMethod === "cod" ? "pending" : "pending",
          subtotal,
        ],
      )
      await client.query("DELETE FROM cart_items WHERE cart_id = $1", [
        cart.rows[0].cart_id,
      ])
      await client.query("COMMIT")
      return mapOrder(
        { ...orderRow, customer_name: user.name, customer_email: user.email },
        cart.rows.map((row) => ({
          variant_id: row.variant_id,
          product_code: row.product_code,
          product_name_snapshot: row.product_name,
          size_snapshot: row.size,
          unit_price_minor: row.unit_price_minor,
          quantity: row.quantity,
          line_total_minor: Number(row.unit_price_minor) * Number(row.quantity),
        })),
      )
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  async listOrdersForUser(userId: string) {
    const result = await this.pool.query(
      "SELECT o.*, u.name customer_name, u.email customer_email FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = $1 ORDER BY o.created_at DESC",
      [userId],
    )
    return Promise.all(result.rows.map((row) => this.orderWithItems(row)))
  }

  async listOrdersForAdmin() {
    const result = await this.pool.query(
      "SELECT o.*, u.name customer_name, u.email customer_email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC",
    )
    return Promise.all(result.rows.map((row) => this.orderWithItems(row)))
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const current = await this.pool.query(
      "SELECT status FROM orders WHERE id = $1",
      [id],
    )
    if (!current.rows[0]) return null
    const allowed: Record<string, string[]> = {
      processing: ["packed", "cancelled"],
      packed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    }
    if (!allowed[current.rows[0].status]?.includes(status))
      throw new HttpError(
        409,
        "INVALID_STATUS_TRANSITION",
        `Cannot move an order from ${current.rows[0].status} to ${status}.`,
      )
    const result = await this.pool.query(
      "UPDATE orders SET status = $2, fulfillment_status = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [id, status],
    )
    const user = await this.pool.query(
      "SELECT name customer_name, email customer_email FROM users WHERE id = $1",
      [result.rows[0].user_id],
    )
    return this.orderWithItems({ ...result.rows[0], ...user.rows[0] })
  }

  async inventorySummary() {
    const result = await this.pool.query(
      `SELECT v.id, v.code, v.size, COALESCE(v.price_minor, p.base_price_minor) price_minor, 
              v.stock_on_hand, v.stock_reserved, v.is_active, 
              p.id product_id, p.name product_name, p.code product_code, 
              p.image_url product_image, c.name category 
       FROM product_variants v 
       JOIN products p ON p.id = v.product_id 
       LEFT JOIN categories c ON c.id = p.category_id 
       ORDER BY p.name, v.size`,
    )
    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      size: row.size,
      priceMinor: Number(row.price_minor),
      stockOnHand: Number(row.stock_on_hand),
      stockReserved: Number(row.stock_reserved),
      isActive: row.is_active,
      productId: row.product_id,
      productName: row.product_name,
      productCode: row.product_code,
      productImage: row.product_image || "/movi/product-01.jpg",
      category: row.category || "General",
    }))
  }

  async adjustInventory(input: InventoryAdjustment) {
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await client.query(
        "UPDATE product_variants SET stock_on_hand = stock_on_hand + $2, updated_at = now() WHERE id = $1 AND stock_on_hand + $2 >= 0 RETURNING id",
        [input.variantId, input.delta],
      )
      if (!result.rows[0])
        throw new HttpError(
          409,
          "INVALID_STOCK",
          "Stock cannot become negative.",
        )
      await client.query(
        "INSERT INTO inventory_movements(variant_id, quantity_delta, movement_type, reason, created_by) VALUES ($1,$2,'manual_adjustment',$3,$4)",
        [input.variantId, input.delta, input.reason, input.actorUserId],
      )
      await client.query("COMMIT")
      return this.inventorySummary()
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
    }
  }

  async dashboardSummary() {
    const result = await this.pool.query(
      "SELECT COALESCE((SELECT SUM(total_minor) FROM orders WHERE payment_status = 'paid'),0) revenue_minor, (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM users WHERE role = 'customer') customers, (SELECT COALESCE(SUM(stock_on_hand - stock_reserved),0) FROM product_variants) inventory_units",
    )
    const row = result.rows[0]
    return {
      revenueMinor: Number(row.revenue_minor),
      orders: Number(row.orders),
      customers: Number(row.customers),
      inventoryUnits: Number(row.inventory_units),
    }
  }

  async deleteProduct(id: string) {
    const orderCheck = await this.pool.query(
      "SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1",
      [id],
    )
    if (orderCheck.rows.length > 0) {
      await this.pool.query(
        "UPDATE products SET is_active = false, updated_at = now() WHERE id = $1",
        [id],
      )
      return { ok: true, archived: true }
    }
    await this.pool.query("DELETE FROM products WHERE id = $1", [id])
    return { ok: true, archived: false }
  }

  async listCustomers(): Promise<CustomerSummary[]> {
    const result = await this.pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.address, u.role, u.created_at,
              COUNT(o.id)::int as orders_count,
              COALESCE(SUM(o.total_minor), 0)::bigint as lifetime_spend_minor
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer'
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
    )
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      role: row.role,
      createdAt: row.created_at?.toISOString ? row.created_at.toISOString() : String(row.created_at),
      ordersCount: Number(row.orders_count),
      lifetimeSpendMinor: Number(row.lifetime_spend_minor),
    }))
  }
}
