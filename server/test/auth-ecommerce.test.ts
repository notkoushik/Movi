import "dotenv/config"
import assert from "node:assert/strict"
import test from "node:test"
import { Pool } from "pg"
import { buildApp } from "../src/app.js"
import { PgRepository } from "../src/pg-repository.js"

const databaseUrl = process.env.DATABASE_URL

test(
  "Professional Ecommerce Authentication & Registration Suite",
  { skip: !databaseUrl },
  async (t) => {
    const pool = new Pool({ connectionString: databaseUrl })
    const repository = new PgRepository(pool)
    const app = buildApp(repository, { secureCookies: false })
    await app.ready()

    const uniqueTimestamp = Date.now()
    const customerEmail = `ecom-client-${uniqueTimestamp}@atelier-test.in`
    const customerPassword = "MoviAtelierSecure2026!"
    const customerName = "Aaditya Singhania"
    const customerPhone = "+91 98200 99881"

    let customerCookie: string = ""
    let createdUserId: string = ""

    // 1. Professional Registration with Full Details
    await t.test("Customer Registration with name, email, secure password, and phone", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: customerName,
          email: customerEmail,
          password: customerPassword,
          phone: customerPhone,
        },
      })

      assert.equal(res.statusCode, 201, "Registration should return 201 Created")
      const data = res.json()
      assert.ok(data.user, "Safe user object should be returned")
      assert.equal(data.user.name, customerName)
      assert.equal(data.user.email, customerEmail.toLowerCase())
      assert.equal(data.user.phone, customerPhone)
      assert.equal(data.user.role, "customer")
      assert.equal(data.user.passwordHash, undefined, "Password hash must NEVER be exposed")

      // Verify Session Cookie was issued
      const cookieHeader = res.headers["set-cookie"]
      assert.ok(cookieHeader, "Session cookie should be set in header")
      customerCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string)
      createdUserId = data.user.id
    })

    // 2. Password Strength Validation (< 8 characters rejected)
    await t.test("Registration rejects short password (< 8 chars) with 400 VALIDATION_ERROR", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Invalid Password User",
          email: `short-pwd-${uniqueTimestamp}@atelier-test.in`,
          password: "short",
        },
      })

      assert.equal(res.statusCode, 400)
      const err = res.json()
      assert.equal(err.error?.code, "VALIDATION_ERROR")
      assert.ok(err.error?.fields?.password, "Field-level error for password must be present")
    })

    // 3. Email Format Validation
    await t.test("Registration rejects invalid email format with 400 VALIDATION_ERROR", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Bad Email User",
          email: "not-an-email",
          password: "ValidPassword2026!",
        },
      })

      assert.equal(res.statusCode, 400)
      const err = res.json()
      assert.equal(err.error?.code, "VALIDATION_ERROR")
      assert.ok(err.error?.fields?.email)
    })

    // 4. Duplicate Email Conflict
    await t.test("Registration rejects duplicate email with 409 EMAIL_IN_USE", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          name: "Duplicate Customer",
          email: customerEmail,
          password: "AnotherPassword123!",
        },
      })

      assert.equal(res.statusCode, 409)
      const err = res.json()
      assert.equal(err.error?.code, "EMAIL_IN_USE")
      assert.match(err.error?.message, /already exists/i)
    })

    // 5. Case-Insensitive Email Login
    await t.test("Sign in normalizes email case-insensitively and returns session", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: customerEmail.toUpperCase(),
          password: customerPassword,
        },
      })

      assert.equal(res.statusCode, 200)
      const data = res.json()
      assert.equal(data.user.email, customerEmail.toLowerCase())
      assert.equal(data.user.name, customerName)
    })

    // 6. Sign In with Invalid Password
    await t.test("Sign in rejects invalid password with 401 INVALID_CREDENTIALS", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: customerEmail,
          password: "WrongPassword999!",
        },
      })

      assert.equal(res.statusCode, 401)
      const err = res.json()
      assert.equal(err.error?.code, "INVALID_CREDENTIALS")
    })

    // 7. Sign In with Non-Existent Account
    await t.test("Sign in rejects unknown email with 401 INVALID_CREDENTIALS", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: `ghost-${uniqueTimestamp}@atelier-test.in`,
          password: "SomePassword123!",
        },
      })

      assert.equal(res.statusCode, 401)
      const err = res.json()
      assert.equal(err.error?.code, "INVALID_CREDENTIALS")
    })

    // 8. Session Inspection via /api/v1/auth/me
    await t.test("Authenticated session returns customer profile via /api/v1/auth/me", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: customerCookie },
      })

      assert.equal(res.statusCode, 200)
      const data = res.json()
      assert.equal(data.user.id, createdUserId)
      assert.equal(data.user.role, "customer")
    })

    // 9. Sign Out / Session Revocation
    await t.test("Sign out revokes session token and clears cookie", async () => {
      const logoutRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/logout",
        headers: { cookie: customerCookie },
      })

      assert.equal(logoutRes.statusCode, 200)

      // Post-logout check on /api/v1/auth/me
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: customerCookie },
      })

      assert.equal(meRes.statusCode, 401, "Revoked session must return 401")
    })

    // 10. Admin Authentication & Role Authorization Guard
    await t.test("Admin authentication verifies Studio Director role and RBAC guard", async () => {
      const adminLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "admin@movi.in",
          password: "admin2026",
        },
      })

      assert.equal(adminLogin.statusCode, 200)
      const adminData = adminLogin.json()
      assert.equal(adminData.user.role, "admin")

      const adminCookie = adminLogin.headers["set-cookie"] as string

      // Admin accesses summary dashboard: succeeds 200
      const adminDashboard = await app.inject({
        method: "GET",
        url: "/api/v1/admin/dashboard/summary",
        headers: { cookie: adminCookie },
      })
      assert.equal(adminDashboard.statusCode, 200)

      // Customer attempts admin dashboard: rejected with 403 FORBIDDEN
      // Re-sign in customer
      const custLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: customerEmail,
          password: customerPassword,
        },
      })
      const freshCustomerCookie = custLogin.headers["set-cookie"] as string

      const customerForbidden = await app.inject({
        method: "GET",
        url: "/api/v1/admin/dashboard/summary",
        headers: { cookie: freshCustomerCookie },
      })
      assert.equal(customerForbidden.statusCode, 403, "Customer must be forbidden from admin dashboard")
      assert.equal(customerForbidden.json().error?.code, "FORBIDDEN")
    })

    // Cleanup test user
    try {
      if (createdUserId) {
        await pool.query("DELETE FROM sessions WHERE user_id = $1", [createdUserId])
        await pool.query("DELETE FROM users WHERE id = $1", [createdUserId])
      }
      await pool.end()
    } catch {
      // Cleanup completed
    }
  },
)
