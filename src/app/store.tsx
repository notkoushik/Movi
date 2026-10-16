import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, type ApiProduct } from "./api";

export type Customer = {
  id?: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  tier?: string;
  phone?: string;
  address?: string;
};

export type CartLine = {
  code: string;
  quantity: number;
  size: string;
  variantId?: string;
  name?: string;
  unitPrice?: number;
  lineTotal?: number;
  image?: string;
};

export type Order = {
  id: string;
  orderNumber?: string;
  date: string;
  total: number;
  status: "Processing" | "Packed" | "Shipped" | "Delivered" | "Cancelled";
  items: CartLine[];
  customerName?: string;
  customerEmail?: string;
  shippingAddress?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  paymentMethod?: string;
  trackingNumber?: string;
};

export type StoreProduct = {
  id?: string;
  code: string;
  slug?: string;
  name: string;
  price: string;
  priceNumber: number;
  image: string;
  images?: string[];
  category: string;
  description?: string;
  variants?: Array<{
    id: string;
    code: string;
    size: string;
    priceMinor?: number;
    stockOnHand: number;
    stockReserved: number;
    isActive: boolean;
  }>;
};

const DEFAULT_PRODUCTS: StoreProduct[] = [
  { code: "01", name: "Essential Oversized Tee", price: "₹ 1,299", priceNumber: 1299, image: "/movi/product-01.jpg", category: "T-Shirts", description: "A relaxed MOVI silhouette cut for everyday movement." },
  { code: "02", name: "Signature Hoodie", price: "₹ 1,999", priceNumber: 1999, image: "/movi/product-02.jpg", category: "Hoodies", description: "A heavyweight structured fleece layer for everyday movement." },
  { code: "03", name: "Vintage Graphic Tee", price: "₹ 1,499", priceNumber: 1499, image: "/movi/product-03.jpg", category: "T-Shirts", description: "A washed graphic tee with a relaxed unisex fit." },
  { code: "04", name: "Tech Cargo Pant", price: "₹ 1,899", priceNumber: 1899, image: "/movi/product-04.jpg", category: "Bottoms", description: "A utility silhouette built for everywhere." },
];

export const DEMO_ACCOUNTS = {
  customer: {
    name: "Aarav Sharma",
    email: "customer@movi.in",
    password: "movi2026",
    role: "customer" as const,
    tier: "VIP Member",
    phone: "+91 98201 44820",
    address: "Bandra West, Mumbai, MH — 400050",
  },
  admin: {
    name: "Koushik (Studio Director)",
    email: "admin@movi.in",
    password: "admin2026",
    role: "admin" as const,
    tier: "Studio Director",
    phone: "+91 99880 12026",
    address: "MOVI Atelier, Lower Parel, Mumbai, MH",
  },
};

export type ToastInfo = {
  id: string;
  name: string;
  code: string;
  size: string;
  price?: string;
  image?: string;
};

type StoreValue = {
  user: Customer | null;
  cart: CartLine[];
  orders: Order[];
  stocks: Record<string, number>;
  products: StoreProduct[];
  refreshProducts: () => Promise<void>;
  signIn: (customer: Customer & { password?: string }) => Promise<void>;
  register: (customer: Customer & { password?: string }) => Promise<void>;
  signOut: () => void;
  updateProfile: (customer: Partial<Customer>) => void;
  addToCart: (code: string, size: string) => void;
  updateQuantity: (code: string, quantity: number, size?: string) => void;
  removeFromCart: (code: string, size?: string) => void;
  placeOrder: (total: number, shippingAddress?: string, paymentMethod?: "cod") => Promise<Order>;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  updateStock: (code: string, delta: number) => void;
  toast: ToastInfo | null;
  triggerToast: (toast: ToastInfo) => void;
  dismissToast: () => void;
  error: string | null;
  clearError: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const read = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const fromApiCart = (cart: any): CartLine[] =>
  (cart?.lines || []).map((line: any) => ({
    code: line.productCode,
    quantity: line.quantity,
    size: line.size,
    variantId: line.variantId,
  }));

const mapApiOrder = (order: any): Order => ({
  id: order.id,
  orderNumber: order.orderNumber || order.id,
  date: new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
  total: Number(order.totalMinor) / 100,
  status: String(order.status).replace(/^./, (char) => char.toUpperCase()) as Order["status"],
  items: (order.items || []).map((item: any) => ({
    code: item.productCode,
    quantity: item.quantity,
    size: item.size,
    variantId: item.variantId,
    name: item.productName,
    unitPrice: item.unitPriceMinor ? Number(item.unitPriceMinor) / 100 : undefined,
    lineTotal: item.lineTotalMinor ? Number(item.lineTotalMinor) / 100 : undefined,
  })),
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  shippingAddress: order.shippingAddress,
  paymentStatus: order.paymentStatus,
  fulfillmentStatus: order.fulfillmentStatus,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(() => read("movi-user", null));
  const [cart, setCart] = useState<CartLine[]>(() => read("movi-cart", []));
  const [orders, setOrders] = useState<Order[]>(() => read("movi-orders", []));
  const [stocks, setStocks] = useState<Record<string, number>>(() =>
    read("movi-stocks", { "01": 100, "02": 100, "03": 100, "04": 100 }),
  );
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerToast = (nextToast: ToastInfo) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(nextToast);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3800);
  };

  const dismissToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };
  const backendEnabled = true;

  const fail = (reason: unknown) => {
    const msg = reason instanceof ApiError ? reason.message : "We could not complete that request. Please try again.";
    setError(msg);
  };

  useEffect(() => {
    localStorage.setItem("movi-user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem("movi-cart", JSON.stringify(cart));
  }, [cart]);

  const refreshProducts = async () => {
    if (!backendEnabled) return;
    try {
      const { products } = await api.products();
      setApiProducts(products);
      const stockMap: Record<string, number> = {};
      for (const p of products) {
        stockMap[p.code] = p.variants.reduce(
          (sum, v) => sum + Math.max(0, v.stockOnHand - v.stockReserved),
          0,
        );
      }
      setStocks(stockMap);
    } catch {
      // Backend unavailable; static fallback remains intact
    }
  };

  useEffect(() => {
    void refreshProducts();
    if (backendEnabled) {
      void api
        .me()
        .then(({ user: next }) => {
          if (next) setUser(next);
        })
        .catch(() => {
          // If session expired or offline, keep or clear local user gracefully
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (!backendEnabled || !user) return;
    if (user.role === "admin") {
      void api
        .adminOrders()
        .then(({ orders: next }) => setOrders(next.map(mapApiOrder)))
        .catch(fail);
    } else {
      void api
        .cart()
        .then(({ cart: next }) => setCart(fromApiCart(next)))
        .catch(fail);
      void api
        .orders()
        .then(({ orders: next }) => setOrders(next.map(mapApiOrder)))
        .catch(fail);
    }
  }, [user?.email, user?.role]);

  const variantFor = (code: string, size: string) =>
    apiProducts.find((p) => p.code === code)?.variants.find((v) => v.size === size);

  const formattedProducts = useMemo<StoreProduct[]>(() => {
    if (!apiProducts.length) return DEFAULT_PRODUCTS;
    return apiProducts.map((p) => ({
      id: p.id,
      code: p.code,
      slug: p.slug,
      name: p.name,
      price: `₹ ${(p.priceMinor / 100).toLocaleString("en-IN")}`,
      priceNumber: p.priceMinor / 100,
      image: p.imageUrl || "/movi/product-01.jpg",
      images: p.images && p.images.length > 0 ? p.images : [p.imageUrl || "/movi/product-01.jpg"],
      category: p.category,
      description: p.description,
      variants: p.variants,
    }));
  }, [apiProducts]);

  const value = useMemo<StoreValue>(
    () => ({
      user,
      cart,
      orders,
      stocks,
      products: formattedProducts,
      refreshProducts,
      toast,
      triggerToast,
      dismissToast,
      error,
      clearError: () => setError(null),

      signIn: async (customer) => {
        if (!backendEnabled) {
          setUser(customer);
          return;
        }
        try {
          const { user: next } = await api.login({
            email: customer.email,
            password: customer.password ?? "",
          });
          setUser(next);

          // Sync any guest cart items into customer backend cart
          if (cart.length > 0 && next.role === "customer") {
            for (const item of cart) {
              const v = item.variantId || variantFor(item.code, item.size)?.id;
              if (v) {
                await api.addCart(v, item.quantity).catch(() => {});
              }
            }
            const { cart: syncedCart } = await api.cart().catch(() => ({ cart: null }));
            if (syncedCart) setCart(fromApiCart(syncedCart));
          }
        } catch (reason) {
          fail(reason);
          throw reason;
        }
      },

      register: async (customer) => {
        if (!backendEnabled) {
          setUser(customer);
          return;
        }
        try {
          const { user: next } = await api.register({
            name: customer.name,
            email: customer.email,
            password: customer.password ?? "",
            phone: customer.phone,
          });
          setUser(next);

          // Sync guest cart items
          if (cart.length > 0) {
            for (const item of cart) {
              const v = item.variantId || variantFor(item.code, item.size)?.id;
              if (v) {
                await api.addCart(v, item.quantity).catch(() => {});
              }
            }
            const { cart: syncedCart } = await api.cart().catch(() => ({ cart: null }));
            if (syncedCart) setCart(fromApiCart(syncedCart));
          }
        } catch (reason) {
          fail(reason);
          throw reason;
        }
      },

      signOut: () => {
        if (backendEnabled) void api.logout().catch(() => {});
        setUser(null);
        setCart([]);
      },

      updateProfile: (updates) => {
        if (!backendEnabled) {
          setUser((curr) => (curr ? { ...curr, ...updates } : null));
          return;
        }
        void api
          .profile(updates as Record<string, string>)
          .then(({ user: next }) => setUser(next))
          .catch(fail);
      },

      addToCart: (code, size) => {
        const variant = variantFor(code, size);
        const prod = formattedProducts.find((p) => p.code === code);
        triggerToast({
          id: Date.now().toString(),
          name: prod ? prod.name : `Garment ${code}`,
          code,
          size,
          price: prod?.price,
          image: prod?.image,
        });
        if (backendEnabled && user && variant) {
          void api
            .addCart(variant.id, 1)
            .then(({ cart: next }) => setCart(fromApiCart(next)))
            .catch(fail);
        } else {
          // Guest or offline: store in local bag without error
          setCart((lines) => {
            const existing = lines.find((item) => item.code === code && item.size === size);
            if (existing) {
              return lines.map((item) =>
                item === existing ? { ...item, quantity: item.quantity + 1 } : item,
              );
            }
            return [...lines, { code, size, quantity: 1, variantId: variant?.id }];
          });
        }
      },

      updateQuantity: (code, quantity, size) => {
        const line = cart.find((item) => item.code === code && (!size || item.size === size));
        if (backendEnabled && user && line?.variantId) {
          void api
            .updateCart(line.variantId, Math.max(0, quantity))
            .then(({ cart: next }) => setCart(fromApiCart(next)))
            .catch(fail);
        } else {
          setCart((lines) =>
            quantity < 1
              ? lines.filter((item) => !(item.code === code && (!size || item.size === size)))
              : lines.map((item) => (item.code === code && (!size || item.size === size) ? { ...item, quantity } : item)),
          );
        }
      },

      removeFromCart: (code, size) => {
        const line = cart.find((item) => item.code === code && (!size || item.size === size));
        if (backendEnabled && user && line?.variantId) {
          void api
            .removeCart(line.variantId)
            .then(({ cart: next }) => setCart(fromApiCart(next)))
            .catch(fail);
        } else {
          setCart((lines) => lines.filter((item) => !(item.code === code && (!size || item.size === size))));
        }
      },

      placeOrder: async (total, shippingAddress = user?.address ?? "", paymentMethod = "cod") => {
        const fallbackAddress =
          shippingAddress && shippingAddress.trim().length >= 10
            ? shippingAddress.trim()
            : user?.address && user.address.trim().length >= 10
            ? user.address.trim()
            : "Bandra West, Mumbai, MH — 400050";

        const local: Order = {
          id: `MV-${Date.now().toString().slice(-6)}`,
          orderNumber: `MV-${Date.now().toString().slice(-6)}`,
          date: new Date()
            .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            .toUpperCase(),
          total,
          status: "Processing",
          items: cart,
          customerName: user?.name || "MOVI Member",
        };

        if (backendEnabled && user) {
          try {
            const { order } = await api.createOrder({
              shippingAddress: fallbackAddress,
              paymentMethod,
            });
            const mapped = mapApiOrder(order);
            setOrders((current) => [mapped, ...current]);
            setCart([]);
            return mapped;
          } catch (reason) {
            fail(reason);
            throw reason;
          }
        } else {
          setOrders((current) => [local, ...current]);
          setCart([]);
          return local;
        }
      },

      updateOrderStatus: (id, status) => {
        if (backendEnabled && user?.role === "admin") {
          void api
            .updateStatus(id, status.toLowerCase())
            .then(({ order }) =>
              setOrders((current) =>
                current.map((item) => (item.id === id ? mapApiOrder(order) : item)),
              ),
            )
            .catch(fail);
        } else {
          setOrders((current) =>
            current.map((item) => (item.id === id ? { ...item, status } : item)),
          );
        }
      },

      updateStock: (code, delta) => {
        const p = apiProducts.find((item) => item.code === code);
        const variant = p?.variants.find((v) => v.isActive);
        if (backendEnabled && user?.role === "admin" && variant) {
          void api
            .adjustInventory(variant.id, delta)
            .then(({ inventory }) => {
              const stockMap: Record<string, number> = {};
              for (const item of inventory) {
                const available = Math.max(0, item.stockOnHand - item.stockReserved);
                stockMap[item.productCode] = (stockMap[item.productCode] || 0) + available;
              }
              setStocks((curr) => ({ ...curr, ...stockMap }));
            })
            .catch(fail);
        } else {
          setStocks((current) => ({
            ...current,
            [code]: Math.max(0, (current[code] || 0) + delta),
          }));
        }
      },
    }),
    [apiProducts, cart, error, formattedProducts, orders, stocks, user],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}
