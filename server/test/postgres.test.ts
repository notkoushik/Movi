import "dotenv/config"
import assert from "node:assert/strict"
import test from "node:test"
import { Pool } from "pg"
import { buildApp } from "../src/app.js"
import { PgRepository } from "../src/pg-repository.js"

const databaseUrl = process.env.DATABASE_URL

test(
  "PostgreSQL catalog, session, cart, checkout, and read-back flow",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl })
    const repository = new PgRepository(pool)
    const app = buildApp(repository, { secureCookies: false })
    const email = `qa-${Date.now()}@movi.test`
    let createdUserId: string | undefined
    let createdOrderId: string | undefined

    try {
      await app.ready()
      const catalog = await app.inject({ method: "GET", url: "/api/v1/products" })
      assert.equal(catalog.statusCode, 200)
      assert.equal(catalog.json().products.length, 4)

      const product = catalog.json().products.find((item: { code: string }) => item.code === "01")
      assert.ok(product)
      assert.ok(product.variants.length >= 4)

      const registration = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: { name: "Postgres QA", email, password: "password123" },
      })
      assert.equal(registration.statusCode, 201)
      const cookie = registration.headers["set-cookie"] as string
      createdUserId = registration.json().user.id
      await pool.query("UPDATE product_variants SET stock_on_hand = 50 WHERE stock_on_hand < 5")
      const variant = product.variants.find((item: { stockOnHand: number }) => item.stockOnHand > 0) ?? product.variants[0]
      const variantId = variant.id
      const addToCart = await app.inject({
        method: "POST",
        url: "/api/v1/cart/items",
        headers: { cookie },
        payload: { variantId, quantity: 1 },
      })
      assert.equal(addToCart.statusCode, 200)
      assert.equal(addToCart.json().cart.lines.length, 1)

      const checkout = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { cookie },
        payload: {
          shippingAddress: "Postgres QA, Mumbai, MH 400050",
          paymentMethod: "cod",
        },
      })
      assert.equal(checkout.statusCode, 201)
      createdOrderId = checkout.json().order.id
      assert.equal(checkout.json().order.items[0].variantId, variantId)

      const readBack = await app.inject({
        method: "GET",
        url: "/api/v1/me/orders",
        headers: { cookie },
      })
      assert.equal(readBack.statusCode, 200)
      assert.equal(readBack.json().orders[0].id, createdOrderId)
    } finally {
      if (createdOrderId) await pool.query("DELETE FROM orders WHERE id = $1", [createdOrderId])
      if (createdUserId) await pool.query("DELETE FROM users WHERE id = $1", [createdUserId])
      await app.close()
      await repository.close()
    }
  },
)

test(
  "PostgreSQL admin product publishing is visible to the public catalog",
  { skip: !databaseUrl },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl })
    const repository = new PgRepository(pool)
    const app = buildApp(repository, { secureCookies: false })
    const code = `QA${Date.now().toString().slice(-6)}`
    const slug = `qa-clothing-${Date.now()}`
    let productId: string | undefined
    try {
      await app.ready()
      const login = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { email: "admin@movi.in", password: "admin2026" } })
      assert.equal(login.statusCode, 200)
      const cookie = login.headers["set-cookie"] as string
      const testImages = ["/movi/product-01.jpg", "/movi/collection-tee.png", "/movi/movement-side.png"]
      const create = await app.inject({ method: "POST", url: "/api/v1/admin/products", headers: { cookie }, payload: { name: "QA Atelier Overshirt", slug, code, category: "Outerwear", description: "A QA garment with structured cotton and a relaxed studio fit.", priceMinor: 249900, imageUrl: testImages[0], images: testImages, variants: [{ size: "M", stockOnHand: 7 }] } })
      assert.equal(create.statusCode, 201)
      productId = create.json().product.id
      assert.equal(create.json().product.imageUrl, testImages[0])
      assert.equal(create.json().product.images.length, 3)
      const catalog = await app.inject({ method: "GET", url: `/api/v1/products/${slug}` })
      assert.equal(catalog.statusCode, 200)
      assert.equal(catalog.json().product.code, code)
      assert.equal(catalog.json().product.variants[0].stockOnHand, 7)
      assert.equal(catalog.json().product.images.length, 3)
      assert.equal(catalog.json().product.images[1], testImages[1])
    } finally {
      if (productId) await pool.query("DELETE FROM products WHERE id = $1", [productId])
      await app.close()
      await repository.close()
    }
  },
)
