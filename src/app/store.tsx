import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type Customer = {
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
};

export type Order = {
  id: string;
  date: string;
  total: number;
  status: "Processing" | "Shipped" | "Delivered";
  items: CartLine[];
  customerName?: string;
};

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

type StoreValue = {
  user: Customer | null;
  cart: CartLine[];
  orders: Order[];
  stocks: Record<string, number>;
  signIn: (customer: Customer) => void;
  signOut: () => void;
  updateProfile: (customer: Partial<Customer>) => void;
  addToCart: (code: string, size: string) => void;
  updateQuantity: (code: string, quantity: number) => void;
  removeFromCart: (code: string) => void;
  placeOrder: (total: number) => Order;
  updateOrderStatus: (id: string, status: "Processing" | "Shipped" | "Delivered") => void;
  updateStock: (code: string, delta: number) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(() => read("movi-user", null));
  const [cart, setCart] = useState<CartLine[]>(() => read("movi-cart", []));
  const [orders, setOrders] = useState<Order[]>(() =>
    read("movi-orders", [
      { id: "MV-260104", date: "14 JAN 2026", total: 3298, status: "Delivered", items: [{ code: "01", quantity: 1, size: "M" }, { code: "02", quantity: 1, size: "L" }], customerName: "Aarav Sharma" },
      { id: "MV-260098", date: "11 JAN 2026", total: 4899, status: "Shipped", items: [{ code: "02", quantity: 1, size: "XL" }], customerName: "Rohan V." },
      { id: "MV-260085", date: "09 JAN 2026", total: 7998, status: "Processing", items: [{ code: "03", quantity: 1, size: "M" }, { code: "01", quantity: 1, size: "L" }], customerName: "Priya Menon" },
    ]),
  );
  const [stocks, setStocks] = useState<Record<string, number>>(() =>
    read("movi-stocks", { "01": 48, "02": 14, "03": 26, "04": 62 }),
  );

  useEffect(() => localStorage.setItem("movi-user", JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem("movi-cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("movi-orders", JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem("movi-stocks", JSON.stringify(stocks)), [stocks]);

  const value = useMemo<StoreValue>(() => ({
    user,
    cart,
    orders,
    stocks,
    signIn: setUser,
    signOut: () => setUser(null),
    updateProfile: (updates) => setUser((curr) => curr ? { ...curr, ...updates } : null),
    addToCart: (code, size) => setCart((lines) => {
      const existing = lines.find((line) => line.code === code && line.size === size);
      return existing
        ? lines.map((line) => line === existing ? { ...line, quantity: line.quantity + 1 } : line)
        : [...lines, { code, size, quantity: 1 }];
    }),
    updateQuantity: (code, quantity) => setCart((lines) =>
      quantity < 1 ? lines.filter((line) => line.code !== code) : lines.map((line) => line.code === code ? { ...line, quantity } : line),
    ),
    removeFromCart: (code) => setCart((lines) => lines.filter((line) => line.code !== code)),
    placeOrder: (total) => {
      const order: Order = {
        id: `MV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
        total,
        status: "Processing",
        items: cart,
        customerName: user?.name || "MOVI Member",
      };
      setOrders((current) => [order, ...current]);
      setCart([]);
      return order;
    },
    updateOrderStatus: (id, status) => {
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    },
    updateStock: (code, delta) => {
      setStocks((curr) => ({ ...curr, [code]: Math.max(0, (curr[code] || 0) + delta) }));
    },
  }), [cart, orders, stocks, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within StoreProvider");
  return store;
}
