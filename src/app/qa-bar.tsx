import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useStore } from "./store";

const API_BASE = "http://localhost:8787/api/v1";

export function StudioQaBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<"checking" | "connected" | "disconnected">("checking");
  const [latency, setLatency] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    user,
    cart,
    orders,
    signIn,
    signOut,
    addToCart,
    removeFromCart,
    placeOrder,
    updateOrderStatus,
    refreshProducts,
    products,
  } = useStore();

  const navigate = useNavigate();

  // Check API health periodically
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE}/products`, { method: "GET" });
        if (res.ok && mounted) {
          setApiHealth("connected");
          setLatency(Math.round(performance.now() - start));
        } else if (mounted) {
          setApiHealth("disconnected");
        }
      } catch {
        if (mounted) {
          setApiHealth("disconnected");
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const notify = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // 1-Click Role Switchers
  const handleQuickSignIn = async (role: "admin" | "customer") => {
    setIsProcessing(true);
    try {
      if (role === "admin") {
        await signIn({
          name: "Koushik (Studio Director)",
          email: "admin@movi.in",
          password: "admin2026",
          role: "admin",
        });
        notify("✓ Authenticated as Studio Director (Admin)");
        navigate("/admin");
      } else {
        await signIn({
          name: "Aarav Sharma",
          email: "customer@movi.in",
          password: "movi2026",
          role: "customer",
          phone: "+91 98201 44820",
          address: "Bandra West, Mumbai, MH — 400050",
        });
        notify("✓ Authenticated as Customer (Aarav Sharma)");
      }
    } catch {
      notify("Authentication failed — verify Fastify API on :8787");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickSignOut = () => {
    signOut();
    notify("✓ Signed out (Guest Mode active)");
  };

  // 1-Click Storefront Seed Actions
  const handleSeedBag = () => {
    addToCart("02", "L"); // Signature Hoodie Size L
    addToCart("01", "M"); // Essential Tee Size M
    notify("✓ Added Signature Hoodie (L) & Essential Tee (M) to Bag!");
    navigate("/bag");
  };

  const handleSimulateOrder = async () => {
    setIsProcessing(true);
    try {
      const mockTotal = 3499;
      await placeOrder(mockTotal, "Pali Hill, Bandra West, Mumbai — 400050", "cod");
      notify("✓ Simulated order placed (₹ 3,499)! Visible in Recent Dispatch Stream.");
      if (user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/account");
      }
    } catch (err: any) {
      notify(`Order failed: ${err.message || "Error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmptyBag = () => {
    cart.forEach((item) => removeFromCart(item.code, item.size));
    notify("✓ Shopping bag cleared");
  };

  const handleAdvanceNextOrder = () => {
    const processingOrder = orders.find((o) => o.status === "Processing");
    const packedOrder = orders.find((o) => o.status === "Packed");

    if (processingOrder) {
      updateOrderStatus(processingOrder.id, "Packed");
      notify(`✓ Advanced order ${processingOrder.orderNumber || processingOrder.id} to PACKED`);
    } else if (packedOrder) {
      updateOrderStatus(packedOrder.id, "Shipped");
      notify(`✓ Advanced order ${packedOrder.orderNumber || packedOrder.id} to SHIPPED`);
    } else {
      notify("No pending Processing/Packed orders to advance");
    }
  };

  const handleCreateTestGarment = async () => {
    setIsProcessing(true);
    const testSku = "QA-" + Math.floor(100 + Math.random() * 900);
    const slug = `qa-streetwear-oversized-${Date.now()}`;
    const payload = {
      name: `FW26 Experimental Shell (${testSku})`,
      slug,
      code: testSku,
      category: "Outerwear",
      description: "Technical weatherproof shell jacket with bonded seam tapes and magnetic storm closures.",
      priceMinor: 399900,
      imageUrl: "/movi/product-02.jpg",
      variants: [
        { size: "S", stockOnHand: 20 },
        { size: "M", stockOnHand: 30 },
        { size: "L", stockOnHand: 35 },
        { size: "XL", stockOnHand: 15 },
      ],
    };

    try {
      const res = await fetch(`${API_BASE}/admin/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await refreshProducts();
        notify(`✓ Published ${payload.name}! Live in catalog.`);
        navigate("/shop");
      } else {
        notify("Admin authentication required to publish garment (Switch to Admin first)");
      }
    } catch {
      notify("Garment publish failed — API offline");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <aside className="studio-qa-root" aria-label="Studio Testing & QA Console">
      {/* MINIMIZED FLOATING BADGE */}
      {!isOpen && (
        <button
          type="button"
          className="studio-qa-badge"
          onClick={() => setIsOpen(true)}
          title="Open Studio QA Testing Console"
        >
          <span className="qa-badge-icon">⚡</span>
          <span className="qa-badge-label">STUDIO QA</span>
          <span className={`qa-status-dot ${apiHealth === "connected" ? "is-online" : "is-offline"}`} />
          {cart.length > 0 && <span className="qa-cart-pill">{cart.reduce((s, i) => s + i.quantity, 0)}</span>}
        </button>
      )}

      {/* EXPANDED TESTING DECK */}
      {isOpen && (
        <div className="studio-qa-panel">
          {/* HEADER */}
          <div className="qa-panel-header">
            <div className="qa-panel-title-group">
              <span className="qa-badge-icon">⚡</span>
              <div>
                <strong>MOVI ATELIER / QA CONSOLE</strong>
                <div className="qa-telemetry-row">
                  <span className={`qa-status-pill ${apiHealth === "connected" ? "qa-status-pill--online" : "qa-status-pill--offline"}`}>
                    ● {apiHealth === "connected" ? `API 8787 (${latency}ms)` : "API Offline"}
                  </span>
                  <span className="qa-role-pill">
                    Role: <strong>{user?.role?.toUpperCase() || "GUEST"}</strong>
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="qa-panel-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Minimize QA Console"
            >
              ×
            </button>
          </div>

          {/* REALTIME ACTION FEEDBACK */}
          {actionFeedback && (
            <div className="qa-feedback-banner" role="status">
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* MAIN ACTIONS GRID */}
          <div className="qa-sections-list">
            {/* 1. INSTANT IDENTITY SWITCHER */}
            <div className="qa-section">
              <span className="qa-section-label">1. IDENTITY SWITCHER</span>
              <div className="qa-btn-grid">
                <button
                  type="button"
                  className={`qa-btn ${user?.role === "admin" ? "qa-btn--active-admin" : ""}`}
                  onClick={() => handleQuickSignIn("admin")}
                  disabled={isProcessing}
                >
                  <span className="qa-btn-icon">👑</span>
                  <div>
                    <strong>Studio Director</strong>
                    <small>admin@movi.in</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`qa-btn ${user?.role === "customer" ? "qa-btn--active-customer" : ""}`}
                  onClick={() => handleQuickSignIn("customer")}
                  disabled={isProcessing}
                >
                  <span className="qa-btn-icon">👤</span>
                  <div>
                    <strong>Customer Aarav</strong>
                    <small>customer@movi.in</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`qa-btn ${!user ? "qa-btn--active-guest" : ""}`}
                  onClick={handleQuickSignOut}
                  disabled={isProcessing}
                >
                  <span className="qa-btn-icon">🕶️</span>
                  <div>
                    <strong>Guest Mode</strong>
                    <small>Clear Session</small>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. STOREFRONT & CART WORKFLOWS */}
            <div className="qa-section">
              <span className="qa-section-label">2. STOREFRONT & BAG SIMULATOR</span>
              <div className="qa-btn-grid">
                <button
                  type="button"
                  className="qa-btn qa-btn--action"
                  onClick={handleSeedBag}
                  title="Add 2 sample garments to shopping bag and navigate to /bag"
                >
                  <span className="qa-btn-icon">🛍️</span>
                  <div>
                    <strong>Seed Test Bag</strong>
                    <small>Hoodie (L) + Tee (M)</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="qa-btn qa-btn--action"
                  onClick={handleSimulateOrder}
                  disabled={isProcessing}
                  title="Place simulated order of ₹3,499 with express shipping"
                >
                  <span className="qa-btn-icon">📦</span>
                  <div>
                    <strong>Simulate Order</strong>
                    <small>₹ 3,499 Express COD</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="qa-btn qa-btn--action"
                  onClick={handleEmptyBag}
                  title="Empty shopping bag"
                >
                  <span className="qa-btn-icon">🧹</span>
                  <div>
                    <strong>Empty Bag</strong>
                    <small>{cart.length} active items</small>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. ATELIER DISPATCH & CATALOG WORKFLOWS */}
            <div className="qa-section">
              <span className="qa-section-label">3. DISPATCH & CATALOG AUTOMATION</span>
              <div className="qa-btn-grid">
                <button
                  type="button"
                  className="qa-btn qa-btn--gold"
                  onClick={handleAdvanceNextOrder}
                  title="Advance next order through the fulfillment pipeline"
                >
                  <span className="qa-btn-icon">⚡</span>
                  <div>
                    <strong>Advance Fulfillment</strong>
                    <small>Processing → Packed → Shipped</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="qa-btn qa-btn--gold"
                  onClick={handleCreateTestGarment}
                  disabled={isProcessing}
                  title="Publish new test garment into live catalog"
                >
                  <span className="qa-btn-icon">✨</span>
                  <div>
                    <strong>Publish Test Garment</strong>
                    <small>Random SKU & 4 Sizes</small>
                  </div>
                </button>
              </div>
            </div>

            {/* 4. SPEED NAVIGATION SHORTCUTS */}
            <div className="qa-section">
              <span className="qa-section-label">4. QUICK ROUTE JUMPS</span>
              <div className="qa-nav-chips">
                <Link to="/" onClick={() => setIsOpen(false)} className="qa-chip">Home</Link>
                <Link to="/shop" onClick={() => setIsOpen(false)} className="qa-chip">Catalog</Link>
                <Link to="/hoodies" onClick={() => setIsOpen(false)} className="qa-chip">Hoodies</Link>
                <Link to="/t-shirts" onClick={() => setIsOpen(false)} className="qa-chip">T-Shirts</Link>
                <Link to="/bag" onClick={() => setIsOpen(false)} className="qa-chip">Bag ({cart.length})</Link>
                <Link to="/checkout" onClick={() => setIsOpen(false)} className="qa-chip">Checkout</Link>
                <Link to="/account" onClick={() => setIsOpen(false)} className="qa-chip">Account</Link>
                <Link to="/admin" onClick={() => setIsOpen(false)} className="qa-chip qa-chip--admin">Admin Console ↗</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
