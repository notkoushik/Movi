import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify"
import cookie from "@fastify/cookie"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import { z } from "zod"
import { HttpError, validationError } from "./errors.js"
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  toSafeUser,
  verifyPassword,
} from "./security.js"
import type { OrderStatus, ProductAdminInput, Repository, SafeUser } from "./types.js"

const SESSION_COOKIE = "movi_session"
const sessionTtlMs = 1000 * 60 * 60 * 24 * 14

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phone: z.string().trim().max(30).optional(),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
})

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
})

const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
})

const orderSchema = z.object({
  shippingAddress: z.string().trim().min(10).max(500),
  paymentMethod: z.literal("cod"),
})

const orderStatusSchema = z.object({
  status: z.enum(["processing", "packed", "shipped", "delivered", "cancelled"]),
})

const inventorySchema = z.object({
  delta: z
    .number()
    .int()
    .min(-10000)
    .max(10000)
    .refine((value) => value !== 0, "delta cannot be zero"),
  reason: z.string().trim().min(3).max(200),
})

const baseProductAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  code: z.string().trim().regex(/^[A-Z0-9-]{2,30}$/),
  category: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(2000),
  priceMinor: z.number().int().positive().max(100000000),
  imageUrl: z.string().trim().min(1).max(2000000).optional(),
  images: z.array(z.string().trim().min(1).max(2000000)).min(1).max(30).optional(),
  variants: z.array(z.object({ size: z.string().trim().min(1).max(12), stockOnHand: z.number().int().min(0).max(100000), priceMinor: z.number().int().positive().optional() })).min(1).max(20),
  isActive: z.boolean().optional(),
})

const productAdminSchema = baseProductAdminSchema.transform((data) => {
  const images = (data.images && data.images.length > 0) ? data.images : (data.imageUrl ? [data.imageUrl] : ["/movi/product-01.jpg"])
  const imageUrl = data.imageUrl || images[0] || "/movi/product-01.jpg"
  return {
    ...data,
    imageUrl,
    images,
  }
})

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const fields: Record<string, string> = {}
    for (const issue of result.error.issues)
      fields[String(issue.path[0] ?? "form")] = issue.message
    throw validationError(fields)
  }
  return result.data
}

function publicProduct(product: import("./types.js").Product) {
  return {
    ...product,
    price: product.priceMinor / 100,
    variants: product.variants.map((variant) => ({
      ...variant,
      price: variant.priceMinor / 100,
    })),
  }
}

function requireUser(request: FastifyRequest): SafeUser {
  const user = request.user
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Sign in is required.")
  return user
}

function requireAdmin(request: FastifyRequest) {
  const user = requireUser(request)
  if (user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Administrator access is required.")
  return user
}

declare module "fastify" {
  interface FastifyRequest {
    user?: SafeUser
    sessionTokenHash?: string
  }
}

export function buildApp(
  repository: Repository,
  options: { secureCookies?: boolean } = {},
): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    bodyLimit: 25 * 1024 * 1024,
  })

  app.register(cookie)
  app.register(cors, { origin: true, credentials: true })
  app.register(helmet)
  app.register(rateLimit, { max: 300, timeWindow: "1 minute" })

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string", bodyLimit: 25 * 1024 * 1024 },
    (_req, body, done) => {
      if (!body || (typeof body === "string" && !body.trim())) {
        return done(null, {})
      }
      try {
        done(null, JSON.parse(body as string))
      } catch (err) {
        done(err as Error, undefined)
      }
    },
  )

  app.addHook("preHandler", async (request) => {
    const token = request.cookies[SESSION_COOKIE]
    if (!token) return
    const tokenHash = hashSessionToken(token)
    const session = await repository.getSession(tokenHash)
    if (!session || session.expiresAt.getTime() <= Date.now()) return
    const user = await repository.getUserById(session.userId)
    if (!user) return
    request.user = toSafeUser(user)
    request.sessionTokenHash = tokenHash
  })

  app.get("/health", async () => ({ ok: true, service: "movi-api" }))

  app.post("/api/v1/auth/register", async (request, reply) => {
    const input = parse(registerSchema, request.body)
    if (await repository.findUserByEmail(input.email))
      throw new HttpError(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists.",
      )
    let user = await repository.createUser({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    })
    if (input.phone) {
      user = await repository.updateUser(user.id, { phone: input.phone })
    }
    const { token, tokenHash } = createSessionToken()
    await repository.createSession({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + sessionTtlMs),
    })
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: options.secureCookies ?? false,
      path: "/",
      maxAge: sessionTtlMs / 1000,
    })
    return reply.code(201).send({ user: toSafeUser(user) })
  })

  app.post("/api/v1/auth/login", async (request, reply) => {
    const input = parse(loginSchema, request.body)
    const user = await repository.findUserByEmail(input.email)
    if (!user || !(await verifyPassword(input.password, user.passwordHash)))
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      )
    const { token, tokenHash } = createSessionToken()
    await repository.createSession({
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + sessionTtlMs),
    })
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: options.secureCookies ?? false,
      path: "/",
      maxAge: sessionTtlMs / 1000,
    })
    return { user: toSafeUser(user) }
  })

  app.post("/api/v1/auth/logout", async (request, reply) => {
    if (request.sessionTokenHash)
      await repository.revokeSession(request.sessionTokenHash)
    reply.clearCookie(SESSION_COOKIE, { path: "/" })
    return { ok: true }
  })

  app.get("/api/v1/auth/me", async (request) => ({
    user: requireUser(request),
  }))

  app.get("/api/v1/categories", async () => ({
    categories: await repository.listCategories(),
  }))

  app.post("/api/v1/admin/categories", async (request, reply) => {
    requireAdmin(request)
    const { name } = parse(z.object({ name: z.string().trim().min(2).max(60) }), request.body)
    const category = await repository.createCategory(name)
    return reply.code(201).send({ category })
  })

  app.post("/api/v1/admin/upload", async (request, reply) => {
    requireAdmin(request)
    const schema = z.object({
      data: z.string().min(10),
      filename: z.string().max(255).optional(),
    })
    const body = parse(schema, request.body)

    const matches = body.data.match(/^data:([A-Za-z-+/0-9]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return reply.send({ url: body.data })
    }

    const mimeType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, "base64")

    let ext = "jpg"
    if (mimeType.includes("png")) ext = "png"
    else if (mimeType.includes("webp")) ext = "webp"
    else if (mimeType.includes("gif")) ext = "gif"

    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const cleanName = (body.filename || "garment").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40)
    const fileName = `upload_${Date.now()}_${randomSuffix}_${cleanName}.${ext}`

    try {
      const fs = await import("fs")
      const path = await import("path")
      const uploadDir = path.resolve(process.cwd(), "public", "uploads")
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      const filePath = path.join(uploadDir, fileName)
      fs.writeFileSync(filePath, buffer)
      return reply.status(201).send({ url: `/uploads/${fileName}` })
    } catch {
      return reply.status(201).send({ url: body.data })
    }
  })

  app.get("/api/v1/products", async (request) => {
    const query = request.query as { category?: string; search?: string }
    return {
      products: (await repository.listProducts(query)).map(publicProduct),
    }
  })

  app.get("/api/v1/products/:slug", async (request) => {
    const { slug } = request.params as { slug: string }
    const product = await repository.getProductBySlug(slug)
    if (!product)
      throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product not found.")
    return { product: publicProduct(product) }
  })

  app.patch("/api/v1/me", async (request) => {
    const user = requireUser(request)
    const input = parse(profileSchema, request.body)
    if (
      input.email &&
      input.email !== user.email &&
      (await repository.findUserByEmail(input.email))
    )
      throw new HttpError(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists.",
      )
    return { user: toSafeUser(await repository.updateUser(user.id, input)) }
  })

  app.get("/api/v1/cart", async (request) => ({
    cart: await repository.getCart(requireUser(request).id),
  }))
  app.post("/api/v1/cart/items", async (request) => {
    const user = requireUser(request)
    const input = parse(cartItemSchema, request.body)
    return { cart: await repository.addCartItem({ userId: user.id, ...input }) }
  })
  app.patch("/api/v1/cart/items/:variantId", async (request) => {
    const user = requireUser(request)
    const { variantId } = parse(
      z.object({ variantId: z.string().uuid() }),
      request.params,
    )
    const input = parse(
      z.object({ quantity: z.number().int().min(0).max(20) }),
      request.body,
    )
    return {
      cart: await repository.updateCartItem({
        userId: user.id,
        variantId,
        quantity: input.quantity,
      }),
    }
  })
  app.delete("/api/v1/cart/items/:variantId", async (request) => {
    const user = requireUser(request)
    const { variantId } = parse(
      z.object({ variantId: z.string().uuid() }),
      request.params,
    )
    return {
      cart: await repository.removeCartItem({ userId: user.id, variantId }),
    }
  })

  app.get("/api/v1/me/orders", async (request) => ({
    orders: await repository.listOrdersForUser(requireUser(request).id),
  }))
  app.post("/api/v1/orders", async (request, reply) => {
    const input = parse(orderSchema, request.body)
    const order = await repository.createOrder({
      userId: requireUser(request).id,
      ...input,
    })
    return reply.code(201).send({ order })
  })

  app.get("/api/v1/admin/dashboard/summary", async (request) => {
    requireAdmin(request)
    return repository.dashboardSummary()
  })
  app.get("/api/v1/admin/orders", async (request) => {
    requireAdmin(request)
    return { orders: await repository.listOrdersForAdmin() }
  })
  app.patch("/api/v1/admin/orders/:id/status", async (request) => {
    requireAdmin(request)
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params)
    const { status } = parse(orderStatusSchema, request.body) as {
      status: OrderStatus
    }
    const order = await repository.updateOrderStatus(id, status)
    if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found.")
    return { order }
  })
  app.get("/api/v1/admin/inventory", async (request) => {
    requireAdmin(request)
    return { inventory: await repository.inventorySummary() }
  })
  app.get("/api/v1/admin/products", async (request) => {
    requireAdmin(request)
    return { products: (await repository.adminProducts()).map(publicProduct) }
  })
  app.post("/api/v1/admin/products", async (request, reply) => {
    requireAdmin(request)
    const input = parse(productAdminSchema, request.body) as ProductAdminInput
    return reply.code(201).send({ product: publicProduct(await repository.createProduct(input)) })
  })
  app.patch("/api/v1/admin/products/:id", async (request) => {
    requireAdmin(request)
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params)
    const input = parse(baseProductAdminSchema.partial(), request.body) as Partial<ProductAdminInput>
    return { product: publicProduct(await repository.updateProduct(id, input)) }
  })
  app.delete("/api/v1/admin/products/:id", async (request) => {
    requireAdmin(request)
    const { id } = parse(z.object({ id: z.string().uuid() }), request.params)
    return repository.deleteProduct(id)
  })
  app.get("/api/v1/admin/customers", async (request) => {
    requireAdmin(request)
    return { customers: await repository.listCustomers() }
  })
  app.post("/api/v1/admin/inventory/:variantId/adjust", async (request) => {
    const user = requireAdmin(request)
    const { variantId } = parse(
      z.object({ variantId: z.string().uuid() }),
      request.params,
    )
    const input = parse(inventorySchema, request.body)
    return {
      inventory: await repository.adjustInventory({
        ...input,
        variantId,
        actorUserId: user.id,
      }),
    }
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError)
      return reply
        .code(error.statusCode)
        .send({
          error: {
            code: error.code,
            message: error.message,
            fields: error.fields,
          },
        })
    app.log.error(error)
    return reply
      .code(500)
      .send({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
      })
  })

  return app
}
