import { FormEvent, ReactNode, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { CatalogScreen, EditorialScreen, ProductScreen, SearchScreen, products } from "../App";
import { DEMO_ACCOUNTS, useStore } from "./store";

function Arrow() {
  return <span className="arrow" aria-hidden="true">→</span>;
}

export function ShopPage() {
  return <CatalogScreen title="All products" />;
}

export function TShirtsPage() {
  return <CatalogScreen title="T-Shirts" category="T-Shirts" />;
}

export function HoodiesPage() {
  return <CatalogScreen title="Hoodies" category="Hoodies" />;
}

export function ProductPage() {
  const { code = "01" } = useParams();
  return <ProductScreen code={code} />;
}

export function SearchPage() {
  return <SearchScreen />;
}

export function EditorialPage({ route }: { route: string }) {
  return <EditorialScreen route={route} />;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>;
}

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const { user, signIn, signOut } = useStore();
  const navigate = useNavigate();

  const handleQuickLogin = (role: "customer" | "admin") => {
    const cred = DEMO_ACCOUNTS[role];
    signIn(cred);
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/account");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isAdmin = emailInput.toLowerCase().includes("admin") || emailInput === DEMO_ACCOUNTS.admin.email;
    if (isAdmin) {
      signIn({
        name: nameInput || DEMO_ACCOUNTS.admin.name,
        email: emailInput,
        role: "admin",
        tier: "Studio Director",
        phone: DEMO_ACCOUNTS.admin.phone,
        address: DEMO_ACCOUNTS.admin.address,
      });
      navigate("/admin");
    } else {
      signIn({
        name: nameInput || "MOVI Member",
        email: emailInput,
        role: "customer",
        tier: "VIP Member",
        phone: "+91 98201 44820",
        address: "Bandra West, Mumbai, MH",
      });
      navigate("/account");
    }
  };

  return (
    <section className="auth-screen">
      <div className="auth-screen__image">
        <img src="/movi/Second_one.png" alt="MOVI campaign model" />
        <div className="auth-screen__image-overlay">
          <p className="micro">MOVI / AUTHENTICATION</p>
          <h2>Indian roots.<br />Global movement.</h2>
          <span>Select customer or admin account below to explore different views.</span>
        </div>
      </div>

      <div className="auth-screen__form">
        {/* CURRENTLY LOGGED-IN SESSION STATUS */}
        {user && (
          <div className="active-session-banner">
            <div className="active-session-banner__text">
              <span className="session-status-tag">ACTIVE SESSION</span>
              <h3>Logged in as: <strong>{user.name}</strong></h3>
              <p>Role: <span className={`role-badge role-badge--${user.role}`}>{user.role.toUpperCase()}</span> ({user.email})</p>
            </div>
            <div className="active-session-banner__actions">
              <Link to={user.role === "admin" ? "/admin" : "/account"} className="solid-link solid-link--sm">
                Go to {user.role === "admin" ? "Admin Portal" : "Account"} <Arrow />
              </Link>
              <button type="button" className="outline-link outline-link--sm" onClick={() => signOut()}>
                Sign Out / Switch User
              </button>
            </div>
          </div>
        )}

        <div className="auth-header">
          <p className="micro">ACCOUNT ACCESS</p>
          <h1>{mode === "login" ? "Sign In" : "Create Account"}</h1>
          <p className="screen-body">
            {mode === "login"
              ? "Choose a quick demo login below, or enter your email and password."
              : "Register your details for faster order tracking and drop notifications."}
          </p>
        </div>

        {/* DEMO ACCESS ACCOUNTS */}
        <div className="demo-accounts-box">
          <div className="demo-accounts-box__head">
            <span className="gold-dot" />
            <h3>Quick Role Login</h3>
          </div>
          <p className="demo-accounts-box__desc">
            Test the separate Customer and Admin screens with 1-click access:
          </p>

          <div className="demo-accounts-grid">
            {/* Customer Account */}
            <div className="demo-account-card demo-account-card--customer">
              <div className="demo-account-card__top">
                <span className="account-tag account-tag--customer">CUSTOMER</span>
                <span className="account-name">Aarav Sharma</span>
              </div>
              <div className="demo-account-card__credentials">
                <code>customer@movi.in</code>
                <code>Pass: movi2026</code>
              </div>
              <p className="demo-account-card__access">View order history, address & customer portal</p>
              <button
                type="button"
                className="demo-account-btn demo-account-btn--customer"
                onClick={() => handleQuickLogin("customer")}
              >
                Sign In as Customer <Arrow />
              </button>
            </div>

            {/* Admin Account */}
            <div className="demo-account-card demo-account-card--admin">
              <div className="demo-account-card__top">
                <span className="account-tag account-tag--admin">STUDIO ADMIN</span>
                <span className="account-name">Koushik (Director)</span>
              </div>
              <div className="demo-account-card__credentials">
                <code>admin@movi.in</code>
                <code>Pass: admin2026</code>
              </div>
              <p className="demo-account-card__access">Manage inventory, adjust drop stocks & dispatch</p>
              <button
                type="button"
                className="demo-account-btn demo-account-btn--admin"
                onClick={() => handleQuickLogin("admin")}
              >
                Sign In as Admin <Arrow />
              </button>
            </div>
          </div>
        </div>

        {/* MANUAL LOGIN FORM */}
        <form className="movi-form auth-manual-form" onSubmit={submit}>
          <div className="form-divider">
            <span>OR ENTER CREDENTIALS MANUALLY</span>
          </div>

          {mode === "register" && (
            <Field label="Full Name">
              <input
                name="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Vikram Rao"
                required
              />
            </Field>
          )}

          <Field label="Email Address">
            <input
              name="email"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="customer@movi.in or admin@movi.in"
              autoComplete="email"
              required
            />
          </Field>

          <Field label="Password">
            <input
              name="password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </Field>

          <button className="solid-link auth-submit-btn" type="submit">
            {mode === "login" ? "Sign In" : "Register Account"} <Arrow />
          </button>
        </form>

        <div className="auth-footer-toggle">
          <button
            className="text-action"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "New to MOVI? Create a customer account."
              : "Already have an account? Sign in."}
          </button>
        </div>
      </div>
    </section>
  );
}

export function AccountPage() {
  const { user, orders, signOut, updateProfile } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "orders" | "profile">("overview");
  const [saved, setSaved] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateProfile({
      name: String(data.get("name")),
      email: String(data.get("email")),
      phone: String(data.get("phone")),
      address: String(data.get("address")),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <section className="account-screen">
      <aside className="account-nav">
        <div className="account-nav__header">
          <p className="micro">MOVI / CUSTOMER PORTAL</p>
          <h1>My Account</h1>
          <div className="user-role-strip">
            <span className="role-chip role-chip--customer">CUSTOMER</span>
            <span className="user-email-tag">{user.email}</span>
          </div>
        </div>

        <nav>
          <button className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")}>
            Account Overview <Arrow />
          </button>
          <button className={tab === "orders" ? "is-active" : ""} onClick={() => setTab("orders")}>
            Order History ({orders.length}) <Arrow />
          </button>
          <button className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")}>
            Profile & Address <Arrow />
          </button>
          {user.role === "admin" && (
            <Link to="/admin" className="account-nav__admin-link">
              Admin Operations Center <Arrow />
            </Link>
          )}
          <button className="account-nav__signout" onClick={() => { signOut(); navigate("/login"); }}>
            Sign Out <Arrow />
          </button>
        </nav>
      </aside>

      <div className="account-content">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="account-overview">
            <div className="account-profile-header">
              <div>
                <p className="micro">LOGGED IN CUSTOMER</p>
                <h2>{user.name}</h2>
                <p className="account-intro">
                  {user.tier || "VIP Member"} &bull; Registered customer on MOVI Streetwear.
                </p>
              </div>
              <div className="header-actions">
                <Link to="/shop" className="solid-link solid-link--sm">
                  Shop Collection <Arrow />
                </Link>
              </div>
            </div>

            {/* CUSTOMER STAT TILES */}
            <div className="account-stats">
              <div className="account-stat-box">
                <strong>{orders.length.toString().padStart(2, "0")}</strong>
                <span>Orders Placed</span>
              </div>
              <div className="account-stat-box">
                <strong>03</strong>
                <span>Active Drops</span>
              </div>
              <div className="account-stat-box">
                <strong>01</strong>
                <span>Saved Address</span>
              </div>
            </div>

            {/* RECENT ORDERS */}
            <div className="account-recent-section">
              <div className="section-subheading">
                <h3>Recent Orders</h3>
                <button type="button" className="text-link" onClick={() => setTab("orders")}>
                  View all ({orders.length}) →
                </button>
              </div>
              <div className="order-list">
                {orders.slice(0, 3).map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="order-card__meta">
                      <strong>{order.id}</strong>
                      <span>{order.date}</span>
                    </div>
                    <div className="order-card__status">
                      <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                      <small>{order.items.length} piece{order.items.length > 1 ? "s" : ""}</small>
                    </div>
                    <strong className="order-card__total">₹ {order.total.toLocaleString("en-IN")}</strong>
                    <button type="button" className="order-card__link" onClick={() => setTab("orders")}>Details →</button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="account-orders-tab">
            <p className="micro">PURCHASE HISTORY</p>
            <h2>Your Movement Orders</h2>
            <div className="order-list">
              {orders.map((order) => (
                <article key={order.id} className="order-card">
                  <div className="order-card__meta">
                    <strong>{order.id}</strong>
                    <span>{order.date}</span>
                  </div>
                  <div className="order-card__status">
                    <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <small>{order.items.length} pieces</small>
                  </div>
                  <strong className="order-card__total">₹ {order.total.toLocaleString("en-IN")}</strong>
                  <span className="order-card__delivered">Express Courier</span>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="account-profile-tab">
            <p className="micro">CUSTOMER INFORMATION</p>
            <h2>Profile & Shipping Details</h2>
            <form className="movi-form profile-form" onSubmit={saveProfile}>
              <Field label="Full Name">
                <input name="name" defaultValue={user.name} required />
              </Field>
              <Field label="Email Address">
                <input name="email" type="email" defaultValue={user.email} required />
              </Field>
              <Field label="Phone Number">
                <input name="phone" type="tel" defaultValue={user.phone || "+91 98201 44820"} />
              </Field>
              <Field label="Delivery Address">
                <input name="address" defaultValue={user.address || "Bandra West, Mumbai, MH — 400050"} />
              </Field>
              <button className="solid-link" type="submit">
                {saved ? "✓ Profile Updated" : "Save Changes"} <Arrow />
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

export function AdminPage() {
  const { user, orders, stocks, updateOrderStatus, updateStock, signIn, signOut } = useStore();
  const [tab, setTab] = useState<"overview" | "inventory" | "orders" | "customers">("overview");

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);

  if (!user || user.role !== "admin") {
    return (
      <section className="admin-lock-screen">
        <div className="admin-lock-card">
          <p className="micro">AUTHORIZATION REQUIRED</p>
          <h1>Studio Admin Portal</h1>
          <p className="screen-body">
            You must be signed in with Studio Director credentials to access the inventory catalog, drop release controls, and order dispatch stream.
          </p>
          <div className="admin-lock-pass">
            <span>Admin Account: <strong>admin@movi.in</strong></span>
            <span>Password: <strong>admin2026</strong></span>
          </div>
          <button
            type="button"
            className="solid-link"
            onClick={() => signIn(DEMO_ACCOUNTS.admin)}
          >
            Sign In as Studio Director <Arrow />
          </button>
          <Link to="/" className="outline-link">Return to Storefront</Link>
        </div>
      </section>
    );
  }

  const totalStockUnits = Object.values(stocks).reduce((sum, count) => sum + count, 0);

  return (
    <section className="admin-screen">
      {/* UNIFIED TOP STUDIO BAR */}
      <header className="admin-topbar">
        <div className="admin-topbar__main">
          <div className="admin-topbar__brand">
            <span className="admin-atelier-tag">MOVI ATELIER / MUMBAI</span>
            <div className="admin-title-row">
              <h1>Studio Director Portal</h1>
              <span className="admin-live-badge">
                <span className="live-pulse" /> LIVE
              </span>
            </div>
          </div>

          <div className="admin-topbar__user">
            <div className="admin-user-pill">
              <span className="admin-avatar">K</span>
              <div className="admin-user-meta">
                <strong>{user.name}</strong>
                <small>Studio Director</small>
              </div>
            </div>
            <button
              type="button"
              className="admin-signout-action"
              onClick={() => signOut()}
              title="Sign Out"
            >
              Sign Out ✕
            </button>
          </div>
        </div>

        {/* QUICK JUMP BAR */}
        <div className="admin-quick-nav">
          <Link to="/" className="quick-nav-pill">
            Storefront ↗
          </Link>
          <Link to="/account" className="quick-nav-pill">
            Customer View ↗
          </Link>
        </div>

        {/* TABS SWITCHER */}
        <nav className="admin-tabs-nav" aria-label="Admin tabs">
          <button
            type="button"
            className={tab === "overview" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("overview")}
          >
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={tab === "inventory" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("inventory")}
          >
            <span>Inventory ({products.length})</span>
          </button>
          <button
            type="button"
            className={tab === "orders" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("orders")}
          >
            <span>Orders ({orders.length})</span>
          </button>
          <button
            type="button"
            className={tab === "customers" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("customers")}
          >
            <span>Customers (3)</span>
          </button>
        </nav>
      </header>

      <div className="admin-main-container">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="admin-tab-pane">
            <div className="admin-metrics-grid">
              <article className="admin-stat-card admin-stat-card--gold">
                <span className="stat-label">Gross Revenue</span>
                <strong className="stat-value">₹ {revenue.toLocaleString("en-IN")}</strong>
                <span className="stat-sub">From {orders.length} Customer Orders</span>
              </article>
              <article className="admin-stat-card">
                <span className="stat-label">Customer Orders</span>
                <strong className="stat-value">{orders.length.toString().padStart(2, "0")}</strong>
                <span className="stat-sub">100% Fulfilled / On Track</span>
              </article>
              <article className="admin-stat-card">
                <span className="stat-label">Active Drops</span>
                <strong className="stat-value">03</strong>
                <span className="stat-sub">FW 2026 Collection</span>
              </article>
              <article className="admin-stat-card">
                <span className="stat-label">Inventory Units</span>
                <strong className="stat-value">{totalStockUnits}</strong>
                <span className="stat-sub">Across All Size Runs</span>
              </article>
            </div>

            {/* REVENUE VELOCITY CHART */}
            <div className="admin-chart-card">
              <div className="admin-chart-card__head">
                <div>
                  <span className="stat-label">7-DAY REVENUE VELOCITY</span>
                  <h3>₹ {revenue.toLocaleString("en-IN")}</h3>
                </div>
                <span className="velocity-tag">+24.8% FW SPEED</span>
              </div>
              <div className="admin-chart-bars">
                {[
                  { day: "MON", val: "₹ 2.4K", height: "48%" },
                  { day: "TUE", val: "₹ 3.8K", height: "65%" },
                  { day: "WED", val: "₹ 3.1K", height: "55%" },
                  { day: "THU", val: "₹ 5.2K", height: "82%" },
                  { day: "FRI", val: "₹ 4.6K", height: "74%" },
                  { day: "SAT", val: "₹ 7.1K", height: "100%" },
                  { day: "SUN", val: "₹ 6.4K", height: "92%" },
                ].map((item, index) => (
                  <div key={index} className="velocity-bar-col">
                    <span className="velocity-val">{item.val}</span>
                    <div className="velocity-bar-track">
                      <div className="velocity-bar-fill" style={{ height: item.height }} />
                    </div>
                    <span className="velocity-day">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIVE ORDERS STREAM */}
            <div className="admin-section-block">
              <div className="admin-section-header">
                <div>
                  <span className="stat-label">RECENT DISPATCH STREAM</span>
                  <h2>Customer Orders</h2>
                </div>
                <button type="button" className="admin-view-all-btn" onClick={() => setTab("orders")}>
                  Manage All ({orders.length}) →
                </button>
              </div>

              <div className="admin-orders-stream">
                {orders.map((order) => (
                  <article key={order.id} className="admin-order-item">
                    <div className="admin-order-item__top">
                      <div className="admin-order-id-group">
                        <strong className="order-id">{order.id}</strong>
                        <span className="order-date">{order.date}</span>
                      </div>
                      <strong className="order-total">₹ {order.total.toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="admin-order-item__details">
                      <span className="order-customer">👤 {order.customerName || "Aarav Sharma"}</span>
                      <span className="order-pieces">{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
                    </div>

                    <div className="admin-order-item__footer">
                      <span className="status-label">Status:</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                        className={`status-select status-select--${order.status.toLowerCase()}`}
                      >
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === "inventory" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">LIVE STOCK MANAGEMENT</span>
                <h2>Atelier Drops Catalog</h2>
              </div>
              <span className="stat-sub">{products.length} Products Tracked</span>
            </div>

            <div className="admin-inventory-list">
              {products.map((product) => {
                const stock = stocks[product.code] ?? 30;
                return (
                  <article key={product.code} className="admin-product-stock-card">
                    <div className="stock-card-thumb">
                      <img src={product.image} alt={product.name} />
                    </div>
                    <div className="stock-card-info">
                      <div className="stock-card-title-row">
                        <strong>{product.name}</strong>
                        <span className="stock-category">{product.category}</span>
                      </div>
                      <div className="stock-card-meta">
                        <span className="stock-code">SKU: {product.code}</span>
                        <span className="stock-price">{product.price}</span>
                      </div>
                      <div className="stock-level-badge">
                        <span className={stock < 20 ? "stock-pill stock-pill--low" : "stock-pill stock-pill--ok"}>
                          {stock < 20 ? "● LOW STOCK" : "● IN STOCK"}: {stock} units
                        </span>
                      </div>
                      <div className="stock-stepper">
                        <button type="button" onClick={() => updateStock(product.code, -5)} title="Decrease 5">-5</button>
                        <button type="button" onClick={() => updateStock(product.code, 10)} title="Add 10">+10</button>
                        <button type="button" onClick={() => updateStock(product.code, 50)} title="Add 50">+50</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">FULFILLMENT & DISPATCH</span>
                <h2>All Store Orders ({orders.length})</h2>
              </div>
            </div>

            <div className="admin-orders-stream">
              {orders.map((order) => (
                <article key={order.id} className="admin-order-item">
                  <div className="admin-order-item__top">
                    <div className="admin-order-id-group">
                      <strong className="order-id">{order.id}</strong>
                      <span className="order-date">{order.date}</span>
                    </div>
                    <strong className="order-total">₹ {order.total.toLocaleString("en-IN")}</strong>
                  </div>

                  <div className="admin-order-item__details">
                    <span className="order-customer">👤 {order.customerName || "Aarav Sharma"}</span>
                    <span className="order-pieces">{order.items.length} items &bull; Express Delivery</span>
                  </div>

                  <div className="admin-order-item__footer">
                    <span className="status-label">Fulfillment Status:</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                      className={`status-select status-select--${order.status.toLowerCase()}`}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {tab === "customers" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">CLIENTELE REGISTRY</span>
                <h2>Customer Directory</h2>
              </div>
            </div>

            <div className="admin-customer-cards">
              <article className="admin-customer-card">
                <div className="customer-card-head">
                  <span className="customer-avatar">A</span>
                  <div>
                    <strong>Aarav Sharma</strong>
                    <small>customer@movi.in</small>
                  </div>
                  <span className="tier-tag">VIP MEMBER</span>
                </div>
                <div className="customer-card-meta">
                  <span>📞 +91 98201 44820</span>
                  <span>📍 Bandra West, Mumbai, MH</span>
                </div>
              </article>

              <article className="admin-customer-card">
                <div className="customer-card-head">
                  <span className="customer-avatar">R</span>
                  <div>
                    <strong>Rohan Varma</strong>
                    <small>rohan.v@gmail.com</small>
                  </div>
                  <span className="tier-tag">REGULAR</span>
                </div>
                <div className="customer-card-meta">
                  <span>📞 +91 99112 34567</span>
                  <span>📍 Indiranagar, Bengaluru, KA</span>
                </div>
              </article>

              <article className="admin-customer-card">
                <div className="customer-card-head">
                  <span className="customer-avatar">P</span>
                  <div>
                    <strong>Priya Menon</strong>
                    <small>priya.m@icloud.com</small>
                  </div>
                  <span className="tier-tag">VIP MEMBER</span>
                </div>
                <div className="customer-card-meta">
                  <span>📞 +91 97450 88910</span>
                  <span>📍 Marine Drive, Kochi, KL</span>
                </div>
              </article>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function CartPage() {
  const { cart, updateQuantity, removeFromCart } = useStore();
  const navigate = useNavigate();

  const cartDetails = cart.map((line) => {
    const item = products.find((p) => p.code === line.code);
    const unitPrice = item ? parseInt(item.price.replace(/[^0-9]/g, ""), 10) || 1599 : 1599;
    return {
      ...line,
      name: item?.name || `Item ${line.code}`,
      image: item?.image || "",
      unitPrice,
      totalPrice: unitPrice * line.quantity,
    };
  });

  const subtotal = cartDetails.reduce((sum, item) => sum + item.totalPrice, 0);

  if (cart.length === 0) {
    return (
      <section className="screen bag-screen">
        <p className="micro">SHOPPING BAG</p>
        <h1>Your bag is empty.</h1>
        <p className="screen-body">Explore the latest drops and add items to your cart.</p>
        <Link to="/shop" className="solid-link">
          Explore Collection <Arrow />
        </Link>
      </section>
    );
  }

  return (
    <section className="screen bag-screen">
      <div className="bag-header">
        <p className="micro">MOVI / ATELIER BAG</p>
        <h1>Shopping Bag ({cart.reduce((s, i) => s + i.quantity, 0)})</h1>
      </div>

      <div className="bag-layout">
        <div className="bag-items">
          {cartDetails.map((item) => (
            <article key={`${item.code}-${item.size}`} className="bag-item-card">
              {item.image && <img src={item.image} alt={item.name} className="bag-item-img" />}
              <div className="bag-item-info">
                <h3>{item.name}</h3>
                <p className="bag-item-meta">Size: {item.size} &bull; Code: {item.code}</p>
                <strong className="bag-item-price">₹ {item.unitPrice.toLocaleString("en-IN")}</strong>
              </div>
              <div className="bag-item-controls">
                <div className="qty-picker">
                  <button type="button" onClick={() => updateQuantity(item.code, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.code, item.quantity + 1)}>+</button>
                </div>
                <button type="button" className="bag-remove-btn" onClick={() => removeFromCart(item.code)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="bag-summary">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹ {subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>FREE EXPRESS</span>
          </div>
          <div className="summary-total">
            <span>Estimated Total</span>
            <strong>₹ {subtotal.toLocaleString("en-IN")}</strong>
          </div>
          <button type="button" className="solid-link w-full" onClick={() => navigate("/checkout")}>
            Proceed to Checkout <Arrow />
          </button>
          <Link to="/shop" className="outline-link outline-link--sm w-full text-center">
            Continue Shopping
          </Link>
        </aside>
      </div>
    </section>
  );
}

export function CheckoutPage() {
  const { cart, user, placeOrder } = useStore();
  const navigate = useNavigate();
  const [method, setMethod] = useState("upi");
  const [placed, setPlaced] = useState(false);

  const cartDetails = cart.map((line) => {
    const item = products.find((p) => p.code === line.code);
    const unitPrice = item ? parseInt(item.price.replace(/[^0-9]/g, ""), 10) || 1599 : 1599;
    return {
      ...line,
      name: item?.name || `Item ${line.code}`,
      totalPrice: unitPrice * line.quantity,
    };
  });

  const total = cartDetails.reduce((sum, item) => sum + item.totalPrice, 0);

  if (cart.length === 0 && !placed) {
    return <Navigate to="/bag" replace />;
  }

  const handleCheckout = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPlaced(true);
    placeOrder(total);
    setTimeout(() => {
      navigate("/account");
    }, 1500);
  };

  return (
    <section className="screen checkout-screen">
      <p className="micro">MOVI SECURE CHECKOUT</p>
      <h1>Order Dispatch & Payment</h1>

      {placed ? (
        <div className="checkout-success-banner">
          <h2>✓ Order Confirmed!</h2>
          <p>Thank you for your order. Redirecting you to your account orders...</p>
        </div>
      ) : (
        <div className="checkout-grid">
          <form className="movi-form checkout-form" onSubmit={handleCheckout}>
            <h3>1. Shipping Address</h3>
            <Field label="Full Name">
              <input name="name" defaultValue={user?.name || "Aarav Sharma"} required />
            </Field>
            <Field label="Email Address">
              <input name="email" type="email" defaultValue={user?.email || "customer@movi.in"} required />
            </Field>
            <Field label="Phone">
              <input name="phone" type="tel" defaultValue={user?.phone || "+91 98201 44820"} required />
            </Field>
            <Field label="Delivery Address">
              <input name="address" defaultValue={user?.address || "Bandra West, Mumbai, MH — 400050"} required />
            </Field>

            <h3 style={{ marginTop: "24px" }}>2. Payment Method</h3>
            <div className="payment-options">
              <label className={`payment-option ${method === "upi" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={method === "upi"} onChange={() => setMethod("upi")} />
                <span>UPI (GPay / PhonePe / Paytm)</span>
              </label>
              <label className={`payment-option ${method === "card" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={method === "card"} onChange={() => setMethod("card")} />
                <span>Credit / Debit Card</span>
              </label>
              <label className={`payment-option ${method === "cod" ? "is-selected" : ""}`}>
                <input type="radio" name="payment" checked={method === "cod"} onChange={() => setMethod("cod")} />
                <span>Cash on Delivery (Express)</span>
              </label>
            </div>

            <button type="submit" className="solid-link auth-submit-btn">
              Complete Order (₹ {total.toLocaleString("en-IN")}) <Arrow />
            </button>
          </form>

          <aside className="checkout-summary">
            <h3>Items in Bag ({cart.length})</h3>
            <div className="checkout-items-list">
              {cartDetails.map((item) => (
                <div key={`${item.code}-${item.size}`} className="checkout-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <small>Size: {item.size} &bull; Qty: {item.quantity}</small>
                  </div>
                  <span>₹ {item.totalPrice.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
            <div className="checkout-total-row">
              <span>Total Payable</span>
              <strong>₹ {total.toLocaleString("en-IN")}</strong>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

export function NotFoundPage() {
  return <section className="screen bag-screen"><p className="micro">MOVI / 404</p><h1>Lost movement.</h1><p className="screen-body">This page moved somewhere else.</p><Link className="outline-link" to="/">Return home <Arrow /></Link></section>;
}
