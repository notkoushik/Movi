import assert from "node:assert/strict"
import test from "node:test"
import { buildApp } from "../src/app.js"
import { createMemoryRepository, ids } from "./memory-repository.js"

async function setup() {
  const app = buildApp(await createMemoryRepository())
  await app.ready()
  return app
}

async function login(
  app: Awaited<ReturnType<typeof setup>>,
  email = "customer@movi.in",
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password: "movi2026" },
  })
  assert.equal(response.statusCode, 200)
  return response.headers["set-cookie"] as string
}

test("health endpoint is live", async () => {
  const app = await setup()
  const response = await app.inject("/health")
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), { ok: true, service: "movi-api" })
  await app.close()
})

test("protected routes reject guests and logout invalidates the session", async () => {
  const app = await setup()
  const guest = await app.inject({ method: "GET", url: "/api/v1/me/orders" })
  assert.equal(guest.statusCode, 401)
  const cookie = await login(app)
  const logout = await app.inject({
    method: "POST",
    url: "/api/v1/auth/logout",
    headers: { cookie },
  })
  assert.equal(logout.statusCode, 200)
  const afterLogout = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: { cookie },
  })
  assert.equal(afterLogout.statusCode, 401)
  await app.close()
})

test("customer can register, read session, and update profile", async () => {
  const app = await setup()
  const register = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      name: "New Customer",
      email: "new@movi.in",
      password: "password123",
    },
  })
  assert.equal(register.statusCode, 201)
  const cookie = register.headers["set-cookie"] as string
  const me = await app.inject({
    method: "GET",
    url: "/api/v1/auth/me",
    headers: { cookie },
  })
  assert.equal(me.statusCode, 200)
  assert.equal(me.json().user.email, "new@movi.in")
  const update = await app.inject({
    method: "PATCH",
    url: "/api/v1/me",
    headers: { cookie },
    payload: { phone: "+919820144820" },
  })
  assert.equal(update.statusCode, 200)
  assert.equal(update.json().user.phone, "+919820144820")
  await app.close()
})

test("invalid credentials and invalid input are rejected without leaking account data", async () => {
  const app = await setup()
  const wrong = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email: "customer@movi.in", password: "wrong" },
  })
  assert.equal(wrong.statusCode, 401)
  assert.equal(wrong.json().error.code, "INVALID_CREDENTIALS")
  const invalid = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { name: "x", email: "bad", password: "123" },
  })
  assert.equal(invalid.statusCode, 400)
  assert.equal(invalid.json().error.code, "VALIDATION_ERROR")
  await app.close()
})

test("registration is case-insensitive and duplicate accounts are rejected", async () => {
  const app = await setup()
  const first = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { name: "First Customer", email: "Case@Test.com", password: "password123" },
  })
  assert.equal(first.statusCode, 201)
  const duplicate = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { name: "Second Customer", email: "case@test.com", password: "password123" },
  })
  assert.equal(duplicate.statusCode, 409)
  assert.equal(duplicate.json().error.code, "EMAIL_IN_USE")
  await app.close()
})

test("online payment methods are rejected until a verified gateway is configured", async () => {
  const app = await setup()
  const cookie = await login(app)
  await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie },
    payload: { variantId: ids.variantS, quantity: 1 },
  })
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie },
    payload: { shippingAddress: "Bandra West, Mumbai, MH 400050", paymentMethod: "upi" },
  })
  assert.equal(response.statusCode, 400)
  assert.equal(response.json().error.code, "VALIDATION_ERROR")
  await app.close()
})

test("catalog and cart enforce stock boundaries", async () => {
  const app = await setup()
  const catalog = await app.inject("/api/v1/products")
  assert.equal(catalog.statusCode, 200)
  assert.equal(catalog.json().products[0].variants.length, 2)
  const cookie = await login(app)
  const added = await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie },
    payload: { variantId: ids.variantS, quantity: 2 },
  })
  assert.equal(added.statusCode, 200)
  assert.equal(added.json().cart.subtotalMinor, 259800)
  const oversell = await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie },
    payload: { variantId: ids.variantS, quantity: 1 },
  })
  assert.equal(oversell.statusCode, 409)
  assert.equal(oversell.json().error.code, "INSUFFICIENT_STOCK")
  await app.close()
})

test("cart quantity updates cannot exceed stock and invalid variant paths are rejected", async () => {
  const app = await setup()
  const cookie = await login(app)
  const invalidPath = await app.inject({
    method: "PATCH",
    url: "/api/v1/cart/items/not-a-uuid",
    headers: { cookie },
    payload: { quantity: 1 },
  })
  assert.equal(invalidPath.statusCode, 400)
  const added = await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie },
    payload: { variantId: ids.variantM, quantity: 1 },
  })
  assert.equal(added.statusCode, 200)
  const tooMany = await app.inject({
    method: "PATCH",
    url: `/api/v1/cart/items/${ids.variantM}`,
    headers: { cookie },
    payload: { quantity: 3 },
  })
  assert.equal(tooMany.statusCode, 409)
  assert.equal(tooMany.json().error.code, "INSUFFICIENT_STOCK")
  await app.close()
})

test("customer checkout persists an order, decrements stock, and prevents double checkout", async () => {
  const app = await setup()
  const cookie = await login(app)
  await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie },
    payload: { variantId: ids.variantM, quantity: 1 },
  })
  const checkout = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie },
    payload: {
      shippingAddress: "Bandra West, Mumbai, MH 400050",
      paymentMethod: "cod",
    },
  })
  assert.equal(checkout.statusCode, 201)
  assert.equal(checkout.json().order.totalMinor, 129900)
  const orders = await app.inject({
    method: "GET",
    url: "/api/v1/me/orders",
    headers: { cookie },
  })
  assert.equal(orders.json().orders.length, 1)
  const second = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie },
    payload: {
      shippingAddress: "Bandra West, Mumbai, MH 400050",
      paymentMethod: "cod",
    },
  })
  assert.equal(second.statusCode, 400)
  await app.close()
})

test("customer order history is isolated from another customer session", async () => {
  const app = await setup()
  const customerCookie = await login(app)
  await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie: customerCookie },
    payload: { variantId: ids.variantM, quantity: 1 },
  })
  await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie: customerCookie },
    payload: {
      shippingAddress: "Bandra West, Mumbai, MH 400050",
      paymentMethod: "cod",
    },
  })
  const other = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: {
      name: "Other Customer",
      email: "other@movi.in",
      password: "password123",
    },
  })
  const otherCookie = other.headers["set-cookie"] as string
  const otherOrders = await app.inject({
    method: "GET",
    url: "/api/v1/me/orders",
    headers: { cookie: otherCookie },
  })
  assert.equal(otherOrders.statusCode, 200)
  assert.equal(otherOrders.json().orders.length, 0)
  await app.close()
})

test("admin authorization, status transitions, and inventory adjustments are enforced", async () => {
  const app = await setup()
  const customerCookie = await login(app)
  const forbidden = await app.inject({
    method: "GET",
    url: "/api/v1/admin/dashboard/summary",
    headers: { cookie: customerCookie },
  })
  assert.equal(forbidden.statusCode, 403)
  const adminCookie = await login(app, "admin@movi.in")
  await app.inject({
    method: "POST",
    url: "/api/v1/cart/items",
    headers: { cookie: adminCookie },
    payload: { variantId: ids.variantS, quantity: 1 },
  })
  const order = await app.inject({
    method: "POST",
    url: "/api/v1/orders",
    headers: { cookie: adminCookie },
    payload: {
      shippingAddress: "Atelier, Lower Parel, Mumbai 400013",
      paymentMethod: "cod",
    },
  })
  const orderId = order.json().order.id
  const packed = await app.inject({
    method: "PATCH",
    url: `/api/v1/admin/orders/${orderId}/status`,
    headers: { cookie: adminCookie },
    payload: { status: "packed" },
  })
  assert.equal(packed.statusCode, 200)
  const invalid = await app.inject({
    method: "PATCH",
    url: `/api/v1/admin/orders/${orderId}/status`,
    headers: { cookie: adminCookie },
    payload: { status: "delivered" },
  })
  assert.equal(invalid.statusCode, 409)
  const negative = await app.inject({
    method: "POST",
    url: `/api/v1/admin/inventory/${ids.variantS}/adjust`,
    headers: { cookie: adminCookie },
    payload: { delta: -99, reason: "bad adjustment" },
  })
  assert.equal(negative.statusCode, 409)
  await app.close()
})

test("admin dashboard exposes consistent inventory and revenue metrics", async () => {
  const app = await setup()
  const adminCookie = await login(app, "admin@movi.in")
  const before = await app.inject({ method: "GET", url: "/api/v1/admin/dashboard/summary", headers: { cookie: adminCookie } })
  assert.equal(before.statusCode, 200)
  const summary = before.json()
  assert.equal(typeof summary.revenueMinor, "number")
  assert.equal(typeof summary.orders, "number")
  assert.equal(typeof summary.customers, "number")
  assert.equal(typeof summary.inventoryUnits, "number")
  const inventory = await app.inject({ method: "GET", url: "/api/v1/admin/inventory", headers: { cookie: adminCookie } })
  assert.equal(inventory.statusCode, 200)
  assert.ok(inventory.json().inventory.length >= 2)
  await app.close()
})

test("admin can publish a clothing product and the public catalog reads it back", async () => {
  const app = await setup()
  const customerCookie = await login(app)
  const customerAttempt = await app.inject({ method: "POST", url: "/api/v1/admin/products", headers: { cookie: customerCookie }, payload: { name: "Unauthorized Tee", slug: "unauthorized-tee", code: "99", category: "T-Shirts", description: "Should not publish.", priceMinor: 99900, imageUrl: "/movi/nope.jpg", variants: [{ size: "M", stockOnHand: 2 }] } })
  assert.equal(customerAttempt.statusCode, 403)
  const adminCookie = await login(app, "admin@movi.in")
  const created = await app.inject({ method: "POST", url: "/api/v1/admin/products", headers: { cookie: adminCookie }, payload: { name: "Movement Heavyweight Tee", slug: "movement-heavyweight-tee", code: "05", category: "T-Shirts", description: "280 GSM washed cotton with a relaxed unisex fit.", priceMinor: 159900, imageUrl: "/movi/product-01.jpg", variants: [{ size: "S", stockOnHand: 10 }, { size: "M", stockOnHand: 12 }] } })
  assert.equal(created.statusCode, 201)
  assert.equal(created.json().product.name, "Movement Heavyweight Tee")
  assert.equal(created.json().product.variants.length, 2)
  const catalog = await app.inject({ method: "GET", url: "/api/v1/products" })
  assert.equal(catalog.statusCode, 200)
  assert.ok(catalog.json().products.some((product: { slug: string }) => product.slug === "movement-heavyweight-tee"))
  await app.close()
})
