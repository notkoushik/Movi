export type ApiProduct = {
  id: string
  code: string
  slug: string
  name: string
  category: string
  description: string
  priceMinor: number
  imageUrl: string
  images?: string[]
  variants: Array<{
    id: string
    code: string
    size: string
    priceMinor: number
    stockOnHand: number
    stockReserved: number
    isActive: boolean
  }>
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api/v1"

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public status?: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) }
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    ...init,
    headers,
  })
  const body = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string; fields?: Record<string, string> } }
  if (!response.ok) throw new ApiError(body.error?.code ?? "API_ERROR", body.error?.message ?? "Request failed.", body.error?.fields, response.status)
  return body as T
}

export const api = {
  me: () => request<{ user: any }>("/auth/me"),
  login: (payload: { email: string; password: string }) => request<{ user: any }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload: { name: string; email: string; password: string; phone?: string }) => request<{ user: any }>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  profile: (payload: Record<string, string>) => request<{ user: any }>("/me", { method: "PATCH", body: JSON.stringify(payload) }),
  products: () => request<{ products: ApiProduct[] }>("/products"),
  cart: () => request<{ cart: any }>("/cart"),
  addCart: (variantId: string, quantity: number) => request<{ cart: any }>("/cart/items", { method: "POST", body: JSON.stringify({ variantId, quantity }) }),
  updateCart: (variantId: string, quantity: number) => request<{ cart: any }>(`/cart/items/${variantId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
  removeCart: (variantId: string) => request<{ cart: any }>(`/cart/items/${variantId}`, { method: "DELETE" }),
  orders: () => request<{ orders: any[] }>("/me/orders"),
  createOrder: (payload: { shippingAddress: string; paymentMethod: "cod" }) => request<{ order: any }>("/orders", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(payload) }),
  adminOrders: () => request<{ orders: any[] }>("/admin/orders"),
  adminSummary: () => request<any>("/admin/dashboard/summary"),
  inventory: () => request<{ inventory: any[] }>("/admin/inventory"),
  adminProducts: () => request<{ products: ApiProduct[] }>("/admin/products"),
  createProduct: (payload: any) => request<{ product: ApiProduct }>("/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id: string, payload: any) => request<{ product: ApiProduct }>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProduct: (id: string) => request<{ ok: boolean; archived: boolean }>(`/admin/products/${id}`, { method: "DELETE" }),
  customers: () => request<{ customers: any[] }>("/admin/customers"),
  updateStatus: (id: string, status: string) => request<{ order: any }>(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  categories: () => request<{ categories: Array<{ id: string; name: string; slug: string }> }>("/categories"),
  createCategory: (name: string) => request<{ category: { id: string; name: string; slug: string } }>("/admin/categories", { method: "POST", body: JSON.stringify({ name }) }),
  adjustInventory: (variantId: string, delta: number) => request<{ inventory: any[] }>(`/admin/inventory/${variantId}/adjust`, { method: "POST", body: JSON.stringify({ delta, reason: "Admin dashboard adjustment" }) }),
  uploadImage: (data: string, filename?: string) => request<{ url: string }>("/admin/upload", { method: "POST", body: JSON.stringify({ data, filename }) }),
}
