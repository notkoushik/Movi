import assert from "node:assert/strict";

const baseUrl = "http://localhost:8787/api/v1";

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

function getCookie(headers) {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

async function run() {
  console.log("▶ [1/8] Admin Authentication & Session Setup");
  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@movi.in", password: "admin2026" }),
  });
  assert.equal(adminLogin.status, 200, "Admin login must succeed");
  assert.equal(adminLogin.data.user.role, "admin");
  const adminCookie = getCookie(adminLogin.headers);
  console.log("  ✔ Admin authenticated as Studio Director:", adminLogin.data.user.name);

  console.log("\n▶ [2/8] Admin Dashboard Metrics & Customers Fetch");
  const summary = await req("/admin/dashboard/summary", {
    headers: { Cookie: adminCookie },
  });
  assert.equal(summary.status, 200);
  console.log(`  ✔ Summary: Gross ₹${summary.data.revenueMinor / 100}, Orders: ${summary.data.orders}, Stock Units: ${summary.data.inventoryUnits}`);

  const customers = await req("/admin/customers", {
    headers: { Cookie: adminCookie },
  });
  assert.equal(customers.status, 200);
  console.log(`  ✔ Clientele registry returned ${customers.data.customers.length} registered customers`);

  console.log("\n▶ [3/8] Admin Publishing a Brand-New Clothing Model Online");
  const testSku = "E2E-" + Math.floor(100 + Math.random() * 900);
  const testSlug = `e2e-oversized-structured-trench-${Date.now()}`;
  const newProductPayload = {
    name: `FW26 Oversized Structured Trench (${testSku})`,
    slug: testSlug,
    code: testSku,
    category: "Outerwear",
    description: "Double-faced cotton gabardine trench coat with storm flap and architectural deep welt pockets.",
    priceMinor: 349900, // ₹ 3,499
    imageUrl: "/movi/product-02.jpg",
    variants: [
      { size: "S", stockOnHand: 20 },
      { size: "M", stockOnHand: 25 },
      { size: "L", stockOnHand: 25 },
      { size: "XL", stockOnHand: 15 },
    ],
  };

  const createRes = await req("/admin/products", {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify(newProductPayload),
  });
  assert.equal(createRes.status, 201, "Product creation must succeed");
  const createdProduct = createRes.data.product;
  assert.equal(createdProduct.name, newProductPayload.name);
  assert.equal(createdProduct.variants.length, 4);
  console.log(`  ✔ Product "${createdProduct.name}" created with ID: ${createdProduct.id}`);

  console.log("\n▶ [4/8] Public Customer Storefront Visibility Verification");
  const publicList = await req("/products");
  assert.equal(publicList.status, 200);
  const found = publicList.data.products.find((p) => p.slug === testSlug);
  assert.ok(found, "Newly published garment must be visible in public catalog");
  assert.equal(found.priceMinor, 349900);
  console.log(`  ✔ Storefront confirmed garment "${found.name}" available with ${found.variants.length} sizes`);

  console.log("\n▶ [5/8] Customer Purchase & Bag Flow");
  const testEmail = `shopper-${Date.now()}@movi.in`;
  const registerRes = await req("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Devika Roy",
      email: testEmail,
      password: "password123",
    }),
  });
  assert.equal(registerRes.status, 201);
  const customerCookie = getCookie(registerRes.headers);
  console.log("  ✔ Customer registered and logged in:", testEmail);

  const sizeMVariant = found.variants.find((v) => v.size === "M");
  assert.ok(sizeMVariant, "Variant M must exist");

  const addCartRes = await req("/cart/items", {
    method: "POST",
    headers: { Cookie: customerCookie },
    body: JSON.stringify({ variantId: sizeMVariant.id, quantity: 1 }),
  });
  assert.equal(addCartRes.status, 200);
  console.log("  ✔ Added Size M to shopping bag. Cart total:", addCartRes.data.cart.subtotalMinor / 100);

  const checkoutRes = await req("/orders", {
    method: "POST",
    headers: {
      Cookie: customerCookie,
      "Idempotency-Key": `idemp-${Date.now()}`,
    },
    body: JSON.stringify({
      shippingAddress: "Penthouse 14B, Altamount Road, Mumbai, MH — 400026",
      paymentMethod: "cod",
    }),
  });
  assert.equal(checkoutRes.status, 201, "Order placement must succeed");
  const placedOrder = checkoutRes.data.order;
  console.log(`  ✔ Order placed successfully: ${placedOrder.orderNumber || placedOrder.id} (₹ ${placedOrder.totalMinor / 100})`);

  console.log("\n▶ [6/8] Admin Fulfillment & Status Transition");
  const adminOrdersRes = await req("/admin/orders", {
    headers: { Cookie: adminCookie },
  });
  assert.equal(adminOrdersRes.status, 200);
  const matchingOrder = adminOrdersRes.data.orders.find((o) => o.id === placedOrder.id);
  assert.ok(matchingOrder, "Admin must see newly placed order");
  assert.equal(matchingOrder.status, "processing");

  // Status transition: processing -> packed
  const packedRes = await req(`/admin/orders/${placedOrder.id}/status`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: "packed" }),
  });
  assert.equal(packedRes.status, 200);
  assert.equal(packedRes.data.order.status, "packed");
  console.log("  ✔ Order transition: processing → packed");

  // Status transition: packed -> shipped
  const shippedRes = await req(`/admin/orders/${placedOrder.id}/status`, {
    method: "PATCH",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ status: "shipped" }),
  });
  assert.equal(shippedRes.status, 200);
  assert.equal(shippedRes.data.order.status, "shipped");
  console.log("  ✔ Order transition: packed → shipped");

  console.log("\n▶ [7/8] Admin Real-Time Stock Adjustment Stepper");
  const sizeLVariant = found.variants.find((v) => v.size === "L");
  const adjustRes = await req(`/admin/inventory/${sizeLVariant.id}/adjust`, {
    method: "POST",
    headers: { Cookie: adminCookie },
    body: JSON.stringify({ delta: 10, reason: "Studio batch restock" }),
  });
  assert.equal(adjustRes.status, 200);
  const updatedVariant = adjustRes.data.inventory.find((i) => i.id === sizeLVariant.id);
  assert.equal(updatedVariant.stockOnHand, 35); // 25 + 10
  console.log(`  ✔ Size L stock successfully adjusted: 25 → ${updatedVariant.stockOnHand} (+10 units)`);

  console.log("\n▶ [8/8] Admin Safe Archive / Soft Deletion");
  const deleteRes = await req(`/admin/products/${createdProduct.id}`, {
    method: "DELETE",
    headers: { Cookie: adminCookie },
  });
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.data.archived, true, "Product with active order must be safely archived");
  console.log("  ✔ Garment successfully archived from customer catalog with order history intact!");

  console.log("\n✨ ALL 8/8 END-TO-END ATELIER FLOWS VERIFIED SUCCESSFULLY! ✨\n");
}

run().catch((err) => {
  console.error("\n❌ E2E Verification failed:", err);
  process.exit(1);
});
