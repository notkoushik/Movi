import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { CatalogScreen, EditorialScreen, ProductScreen, SearchScreen, products } from "../App";
import { DEMO_ACCOUNTS, useStore } from "./store";
import { StudioQaBar } from "./qa-bar";
import { api, type ApiProduct } from "./api";

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

function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="eye-svg" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="eye-svg" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Field({
  label,
  children,
  error,
  hint,
  required,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className={`form-field ${error ? "form-field--error" : ""}`}>
      <div className="form-field-header">
        <span className="form-field-label">
          {label} {required && <span className="field-required-star">*</span>}
        </span>
        {hint && <span className="form-field-hint">{hint}</span>}
      </div>
      {children}
      {error && <span className="field-error-msg" role="alert">{error}</span>}
    </div>
  );
}

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [newsletterOptIn, setNewsletterOptIn] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { user, signIn, register, signOut, clearError } = useStore();
  const navigate = useNavigate();

  // Dynamic Password Security Strength Calculation
  const passwordSecurity = useMemo(() => {
    const pwd = passwordInput;
    if (!pwd) return { score: 0, label: "ENTER PASSWORD", color: "#666", hasMinLength: false, hasNumber: false, hasLetter: false, hasSpecial: false };

    const hasMinLength = pwd.length >= 8;
    const hasNumber = /[0-9]/.test(pwd);
    const hasLetter = /[a-zA-Z]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    let score = 0;
    if (pwd.length >= 6) score++;
    if (hasMinLength) score++;
    if (hasNumber && hasLetter) score++;
    if (hasSpecial && pwd.length >= 10) score++;

    const labels = ["TOO SHORT", "WEAK", "FAIR", "STRONG", "ATELIER GRADE"];
    const colors = ["#ef4444", "#ef4444", "#f59e0b", "#10b981", "#c5a880"];

    return {
      score: Math.min(4, Math.max(1, score)),
      label: labels[score] || "TOO SHORT",
      color: colors[score] || "#ef4444",
      hasMinLength,
      hasNumber,
      hasLetter,
      hasSpecial,
    };
  }, [passwordInput]);

  const passwordsMatch = useMemo(() => {
    if (!confirmPasswordInput) return null;
    return passwordInput === confirmPasswordInput;
  }, [passwordInput, confirmPasswordInput]);

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError(null);
    clearError();
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    clearErrors();
  };

  const handleQuickLogin = async (role: "customer" | "admin") => {
    clearErrors();
    setLoading(true);
    const cred = DEMO_ACCOUNTS[role];
    try {
      await signIn(cred);
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/account");
      }
    } catch (err: any) {
      setGeneralError(err?.message || "Quick demo authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailInput.trim()) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(emailInput.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!passwordInput) {
      errors.password = "Password is required.";
    } else if (passwordInput.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (mode === "register") {
      if (!nameInput.trim()) {
        errors.name = "Full name is required.";
      } else if (nameInput.trim().length < 2) {
        errors.name = "Full name must be at least 2 characters.";
      }

      if (!confirmPasswordInput) {
        errors.confirmPassword = "Confirm password is required.";
      } else if (passwordInput !== confirmPasswordInput) {
        errors.confirmPassword = "Passwords do not match.";
      }

      if (!termsAccepted) {
        errors.terms = "You must agree to the Terms of Service to create an account.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearErrors();

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "register") {
        await register({
          name: nameInput.trim(),
          email: emailInput.trim().toLowerCase(),
          role: "customer",
          password: passwordInput,
          phone: phoneInput.trim() || undefined,
        });
      } else {
        await signIn({
          name: nameInput.trim() || "MOVI Member",
          email: emailInput.trim().toLowerCase(),
          role: "customer",
          password: passwordInput,
        });
      }
      navigate("/account");
    } catch (err: any) {
      if (err?.fields) {
        setFieldErrors(err.fields);
      }
      const msg = err?.message || (mode === "register" ? "Registration failed." : "Authentication failed.");
      setGeneralError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-screen">
      {/* LEFT COLUMN: EDITORIAL ATELIER CANVAS */}
      <div className="auth-screen__image">
        <img src="/movi/Second_one.png" alt="MOVI campaign model" />
        <div className="auth-screen__image-overlay">
          <div className="atelier-badge-tag">MOVI ATELIER / ACCESS PORTAL</div>
          <h2>Indian roots.<br />Global movement.</h2>
          <div className="atelier-perks-list">
            <div className="perk-item">
              <span className="perk-bullet">✦</span>
              <span>Private drop invitations & secret lookbook archival access</span>
            </div>
            <div className="perk-item">
              <span className="perk-bullet">✦</span>
              <span>Express domestic delivery & dedicated atelier order tracking</span>
            </div>
            <div className="perk-item">
              <span className="perk-bullet">✦</span>
              <span>Synchronized 3D fitting room & saved silhouette colorways</span>
            </div>
          </div>
          <div className="atelier-footer-sub">MUMBAI &bull; PARIS &bull; TOKYO &bull; NEW YORK</div>
        </div>
      </div>

      {/* RIGHT COLUMN: PROFESSIONAL AUTH & REGISTRATION PORTAL */}
      <div className="auth-screen__form">
        {/* CURRENTLY LOGGED-IN SESSION STATUS */}
        {user && (
          <div className="active-session-banner">
            <div className="active-session-banner__text">
              <span className="session-status-tag">ACTIVE ATELIER SESSION</span>
              <h3>Logged in as: <strong>{user.name}</strong></h3>
              <p>Role: <span className={`role-badge role-badge--${user.role}`}>{user.role.toUpperCase()}</span> ({user.email})</p>
            </div>
            <div className="active-session-banner__actions">
              <Link to={user.role === "admin" ? "/admin" : "/account"} className="solid-link solid-link--sm">
                Go to {user.role === "admin" ? "Admin Portal" : "Account"} <Arrow />
              </Link>
              <button type="button" className="outline-link outline-link--sm" onClick={() => signOut()}>
                Sign Out / Switch Account
              </button>
            </div>
          </div>
        )}

        {/* ELEGANT ATELIER SEGMENTED TAB SWITCHER */}
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("login")}
          >
            <span className="auth-tab-num">01</span>
            <span className="auth-tab-text">SIGN IN</span>
            {mode === "login" && <span className="auth-tab-bar" />}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            className={`auth-tab ${mode === "register" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("register")}
          >
            <span className="auth-tab-num">02</span>
            <span className="auth-tab-text">CREATE MEMBERSHIP</span>
            {mode === "register" && <span className="auth-tab-bar" />}
          </button>
        </div>

        {/* HEADER INFORMATION */}
        <div className="auth-header">
          <h1>{mode === "login" ? "Atelier Sign In" : "Join The Movement"}</h1>
          <p className="screen-body">
            {mode === "login"
              ? "Access your studio orders, saved fits, and private drop privileges."
              : "Register your customer membership for express shipping, order telemetry, and private collections."}
          </p>
        </div>

        {/* GENERAL ERROR NOTIFICATION */}
        {generalError && (
          <div className="auth-alert-banner" role="alert">
            <span className="auth-alert-icon">⚠</span>
            <div className="auth-alert-content">
              <strong>{generalError}</strong>
              {generalError.toLowerCase().includes("already exists") && (
                <button
                  type="button"
                  className="auth-alert-action"
                  onClick={() => switchMode("login")}
                >
                  Switch to Sign In →
                </button>
              )}
            </div>
          </div>
        )}

        {/* AUTHENTICATION & REGISTRATION FORM */}
        <form className="movi-form auth-pro-form" onSubmit={submit} noValidate>
          {/* REGISTRATION: FULL NAME */}
          {mode === "register" && (
            <Field
              label="Full Name"
              error={fieldErrors.name}
              required
              hint="FIRST & LAST NAME"
            >
              <input
                name="name"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                }}
                placeholder="e.g. Vikram Rao"
                autoComplete="name"
                disabled={loading}
                required
              />
            </Field>
          )}

          {/* EMAIL ADDRESS */}
          <Field
            label="Email Address"
            error={fieldErrors.email}
            required
            hint="ACCOUNT IDENTIFIER"
          >
            <input
              name="email"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="e.g. customer@movi.in"
              autoComplete="email"
              disabled={loading}
              required
            />
          </Field>

          {/* REGISTRATION: OPTIONAL MOBILE PHONE */}
          {mode === "register" && (
            <Field
              label="Mobile Phone"
              error={fieldErrors.phone}
              hint="OPTIONAL — SMS TRACKING & DROP NOTIFICATIONS"
            >
              <input
                name="phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98201 00000"
                autoComplete="tel"
                disabled={loading}
              />
            </Field>
          )}

          {/* PASSWORD FIELD WITH SHOW/HIDE */}
          <Field
            label="Password"
            error={fieldErrors.password}
            required
            hint={mode === "register" ? "MIN 8 CHARACTERS" : undefined}
          >
            <div className="password-input-wrap">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="••••••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </Field>

          {/* REGISTRATION: DYNAMIC PASSWORD SECURITY METER */}
          {mode === "register" && passwordInput.length > 0 && (
            <div className="password-meter-box">
              <div className="password-meter-header">
                <span className="meter-label">PASSWORD SECURITY:</span>
                <span className="meter-grade" style={{ color: passwordSecurity.color }}>
                  {passwordSecurity.label}
                </span>
              </div>
              <div className="password-meter-bars">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className="meter-bar-segment"
                    style={{
                      backgroundColor:
                        step <= passwordSecurity.score ? passwordSecurity.color : "rgba(255, 255, 255, 0.1)",
                    }}
                  />
                ))}
              </div>
              <div className="password-checklist">
                <span className={passwordSecurity.hasMinLength ? "check-pass" : "check-todo"}>
                  {passwordSecurity.hasMinLength ? "✓" : "○"} 8+ characters
                </span>
                <span className={passwordSecurity.hasLetter && passwordSecurity.hasNumber ? "check-pass" : "check-todo"}>
                  {passwordSecurity.hasLetter && passwordSecurity.hasNumber ? "✓" : "○"} Letters & numbers
                </span>
                <span className={passwordSecurity.hasSpecial ? "check-pass" : "check-todo"}>
                  {passwordSecurity.hasSpecial ? "✓" : "○"} Special character
                </span>
              </div>
            </div>
          )}

          {/* REGISTRATION: CONFIRM PASSWORD */}
          {mode === "register" && (
            <Field
              label="Confirm Password"
              error={fieldErrors.confirmPassword}
              required
              hint={passwordsMatch === true ? "✓ MATCHED" : passwordsMatch === false ? "⚠ MISMATCH" : undefined}
            >
              <div className="password-input-wrap">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPasswordInput}
                  onChange={(e) => {
                    setConfirmPasswordInput(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </Field>
          )}

          {/* SIGN IN: REMEMBER ME & FORGOT PASSWORD */}
          {mode === "login" && (
            <div className="auth-aux-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <span>Keep me signed in on this device</span>
              </label>
              <Link to="/contact" className="forgot-password-link">
                Assistance?
              </Link>
            </div>
          )}

          {/* REGISTRATION: NEWSLETTER & TERMS CHECKBOXES */}
          {mode === "register" && (
            <div className="auth-consent-stack">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={newsletterOptIn}
                  onChange={(e) => setNewsletterOptIn(e.target.checked)}
                />
                <span className="checkbox-custom" />
                <span>Notify me of private studio drops, secret lookbooks, and archival pieces.</span>
              </label>

              <label className={`auth-checkbox-label ${fieldErrors.terms ? "auth-checkbox-label--error" : ""}`}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.terms) setFieldErrors((prev) => ({ ...prev, terms: "" }));
                  }}
                  required
                />
                <span className="checkbox-custom" />
                <span>
                  I agree to MOVI's <Link to="/story" className="inline-legal-link">Terms of Service</Link> and <Link to="/story" className="inline-legal-link">Privacy Policy</Link>.
                </span>
              </label>
              {fieldErrors.terms && <span className="field-error-msg">{fieldErrors.terms}</span>}
            </div>
          )}

          {/* SUBMIT BUTTON WITH HIGH-FASHION TACTILE SPINNER */}
          <button
            className="solid-link auth-submit-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading-state">
                <span className="btn-spinner" />
                <span>{mode === "login" ? "AUTHENTICATING..." : "CREATING MEMBERSHIP..."}</span>
              </span>
            ) : (
              <span>{mode === "login" ? "AUTHENTICATE & ENTER" : "CREATE MEMBERSHIP ACCOUNT"} <Arrow /></span>
            )}
          </button>
        </form>

        {/* BOTTOM MODE TOGGLE BAR */}
        <div className="auth-footer-toggle">
          <p className="auth-footer-prompt">
            {mode === "login" ? "New to MOVI Streetwear?" : "Already hold an atelier membership?"}
          </p>
          <button
            type="button"
            className="auth-mode-switch-btn"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "CREATE CUSTOMER ACCOUNT →" : "SIGN IN WITH EXISTING ACCOUNT →"}
          </button>
        </div>

        {/* DISCREET QUICK STUDIO DEMO ACCESS DRAWER */}
        <div className="studio-demo-drawer">
          <div className="studio-demo-drawer__header">
            <span className="gold-dot" />
            <span className="studio-demo-title">STUDIO ONE-CLICK DEMO ACCESS:</span>
          </div>
          <div className="studio-demo-pills">
            <button
              type="button"
              className="studio-pill studio-pill--customer"
              onClick={() => handleQuickLogin("customer")}
              disabled={loading}
              title="Sign in instantly as Customer Aarav Sharma"
            >
              <span className="studio-pill-badge">A</span>
              <span className="studio-pill-meta">
                <strong>Aarav Sharma</strong>
                <small>CUSTOMER &bull; movi2026</small>
              </span>
              <span className="studio-pill-arrow">→</span>
            </button>

            <button
              type="button"
              className="studio-pill studio-pill--admin"
              onClick={() => handleQuickLogin("admin")}
              disabled={loading}
              title="Sign in instantly as Studio Director Koushik"
            >
              <span className="studio-pill-badge studio-pill-badge--admin">K</span>
              <span className="studio-pill-meta">
                <strong>Koushik (Director)</strong>
                <small>STUDIO ADMIN &bull; admin2026</small>
              </span>
              <span className="studio-pill-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AccountPage() {
  const { user, orders, signOut, updateProfile, error, clearError } = useStore();
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
                    <strong>{order.orderNumber || order.id}</strong>
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

const ATELIER_MEDIA_LIBRARY = [
  { label: "Oversized Tee (Front)", url: "/movi/product-01.jpg" },
  { label: "Studio Tee (Lookbook)", url: "/movi/collection-tee.png" },
  { label: "Signature Hoodie (Front)", url: "/movi/product-02.jpg" },
  { label: "Fleece Hoodie (Angle)", url: "/movi/collection-hoodie.png" },
  { label: "Vintage Graphic Tee", url: "/movi/product-03.jpg" },
  { label: "Tech Cargo Pant (Front)", url: "/movi/product-04.jpg" },
  { label: "Cargo Pocket Angle", url: "/movi/collection-cargo.jpg" },
  { label: "Campaign Silhouette (Side)", url: "/movi/movement-side.png" },
  { label: "Atelier Model (Editorial)", url: "/movi/Second_one.png" },
  { label: "Studio Runway Full", url: "/movi/hero.png" },
];

const PRESET_GARMENTS = [
  {
    name: "Heavyweight Boxy Tee — Ink Black",
    slug: "heavyweight-boxy-tee-ink-black",
    code: "05",
    category: "T-Shirts",
    price: "1699",
    description: "280 GSM combed luxury jersey cotton with a tailored dropped shoulder and raw architectural hem.",
    imageUrl: "/movi/product-01.jpg",
    images: ["/movi/product-01.jpg", "/movi/collection-tee.png", "/movi/movement-side.png"],
  },
  {
    name: "Architectural Trench Overshirt",
    slug: "architectural-trench-overshirt",
    code: "06",
    category: "Outerwear",
    price: "3499",
    description: "Structured Japanese twill with concealed horn buttons, storm welt pockets, and relaxed atelier proportions.",
    imageUrl: "/movi/product-02.jpg",
    images: ["/movi/product-02.jpg", "/movi/collection-hoodie.png", "/movi/Second_one.png"],
  },
  {
    name: "Structured Minimalist Hoodie — Bone",
    slug: "structured-minimalist-hoodie-bone",
    code: "07",
    category: "Hoodies",
    price: "2499",
    description: "450 GSM diagonal loopback French terry with double-needle ribbing and zero external branding.",
    imageUrl: "/movi/product-03.jpg",
    images: ["/movi/product-03.jpg", "/movi/collection-hoodies.jpg", "/movi/hero.png"],
  },
  {
    name: "Pleated Wide Technical Trouser",
    slug: "pleated-wide-technical-trouser",
    code: "08",
    category: "Bottoms",
    price: "2899",
    description: "Durable memory-stretch poly-wool blend with deep double front pleats and adjustable side cinches.",
    imageUrl: "/movi/product-04.jpg",
    images: ["/movi/product-04.jpg", "/movi/collection-cargo.jpg", "/movi/movement-main.png"],
  },
];

type CustomerRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  role: string;
  createdAt: string;
  ordersCount: number;
  lifetimeSpendMinor: number;
};

type InventoryVariant = {
  id: string;
  code: string;
  size: string;
  priceMinor: number;
  stockOnHand: number;
  stockReserved: number;
  isActive: boolean;
  productId?: string;
  productName: string;
  productCode: string;
  productImage?: string;
  category?: string;
};

export function AdminPage() {
  const { user, orders, stocks, updateOrderStatus, updateStock, signIn, signOut, refreshProducts, products: storeProducts } = useStore();
  const [tab, setTab] = useState<"overview" | "garments" | "inventory" | "orders" | "customers">("overview");

  // Dynamic Data State
  const [catalog, setCatalog] = useState<ApiProduct[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryVariant[]>([]);
  const [customerList, setCustomerList] = useState<CustomerRecord[]>([]);
  const [summary, setSummary] = useState<{ revenueMinor: number; orders: number; customers: number; inventoryUnits: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Filter state
  const [garmentSearch, setGarmentSearch] = useState("");
  const [garmentCategory, setGarmentCategory] = useState("All");
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("all");
  const [inventoryStockFilter, setInventoryStockFilter] = useState<"all" | "low" | "depleted">("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grouped" | "table">("grouped");
  const [inventoryBatchLoading, setInventoryBatchLoading] = useState<string | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Garment Creation & Editing Modal State
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ApiProduct | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("T-Shirts");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("1599");
  const [formImageUrl, setFormImageUrl] = useState("/movi/product-01.jpg");
  const [formImages, setFormImages] = useState<string[]>(["/movi/product-01.jpg"]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [formSizes, setFormSizes] = useState<Record<string, number>>({ XS: 15, S: 25, M: 30, L: 30, XL: 20, XXL: 10 });
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Dynamic Category Management
  const [categoriesList, setCategoriesList] = useState<string[]>([
    "T-Shirts",
    "Hoodies",
    "Bottoms",
    "Outerwear",
    "Knitwear",
    "Accessories",
  ]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showAddCategoryDrawer, setShowAddCategoryDrawer] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Outside click listener for custom dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".custom-atelier-dropdown-wrap")) {
        setShowCategoryDropdown(false);
      }
    };
    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showCategoryDropdown]);

  const handleCreateCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      showToast("Please enter a category or collection name.", "error");
      return;
    }
    setIsCreatingCategory(true);
    try {
      try {
        await api.createCategory(trimmed);
      } catch {
        // Fallback gracefully
      }
      setCategoriesList((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      setFormCategory(trimmed);
      setNewCategoryInput("");
      setShowAddCategoryDrawer(false);
      setShowCategoryDropdown(false);
      showToast(`Category "${trimmed}" created & selected!`, "success");
    } catch {
      showToast("Could not create category.", "error");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Device Photo Upload & Multi-image management
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDeviceImage, setIsUploadingDeviceImage] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);

  // ESC key listener to exit fullscreen workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalMode) {
        setModalMode(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalMode]);

  const processFileToUpload = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const res = await api.uploadImage(dataUrl, file.name);
      if (res?.url) {
        return res.url;
      }
    } catch {
      // Fallback to dataUrl directly if server upload endpoint fails
    }
    return dataUrl;
  };

  const handleDeviceFileUpload = async (filesToProcess: FileList | File[]) => {
    if (!filesToProcess || filesToProcess.length === 0) return;
    setIsUploadingDeviceImage(true);
    try {
      const validFiles = Array.from(filesToProcess).filter((f) => f.type.startsWith("image/"));
      if (validFiles.length === 0) {
        showToast("Please select valid image files (JPG, PNG, WEBP).", "error");
        return;
      }

      const uploadedUrls: string[] = [];
      for (const file of validFiles) {
        const url = await processFileToUpload(file);
        if (!formImages.includes(url) && !uploadedUrls.includes(url)) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        const updated = [...formImages, ...uploadedUrls];
        setFormImages(updated);
        setActiveImageIndex(updated.length - 1);
        showToast(`Added ${uploadedUrls.length} ${uploadedUrls.length === 1 ? "photo angle" : "photo angles"} from device!`, "success");
      }
    } catch {
      showToast("Error reading photos from device.", "error");
    } finally {
      setIsUploadingDeviceImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleDeviceFileUpload(e.dataTransfer.files);
    }
  };

  // URL / Preset image management functions
  const handleAddImage = (urlToAdd?: string) => {
    const rawUrl = (urlToAdd || newImageUrl).trim();
    if (!rawUrl) return;
    if (formImages.includes(rawUrl)) {
      const idx = formImages.indexOf(rawUrl);
      setActiveImageIndex(idx);
      setNewImageUrl("");
      return;
    }
    const updated = [...formImages, rawUrl];
    setFormImages(updated);
    setActiveImageIndex(updated.length - 1);
    setNewImageUrl("");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    if (formImages.length <= 1) {
      showToast("A garment must have at least one photo.", "info");
      return;
    }
    const updated = formImages.filter((_, idx) => idx !== indexToRemove);
    setFormImages(updated);
    if (activeImageIndex >= updated.length) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    if (indexToPrimary === 0 || !formImages[indexToPrimary]) return;
    const selected = formImages[indexToPrimary];
    const remaining = formImages.filter((_, idx) => idx !== indexToPrimary);
    const updated = [selected, ...remaining];
    setFormImages(updated);
    setActiveImageIndex(0);
    setFormImageUrl(selected);
    showToast("Updated cover / primary lookbook photo.", "info");
  };

  // Load summary and core data
  const loadData = async () => {
    if (user?.role !== "admin") return;
    setIsLoading(true);
    try {
      const [sumRes, prodRes, invRes, custRes, catRes] = await Promise.allSettled([
        api.adminSummary(),
        api.adminProducts(),
        api.inventory(),
        api.customers(),
        api.categories(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (prodRes.status === "fulfilled") {
        setCatalog(prodRes.value.products);
        const existingCats = prodRes.value.products.map((p) => p.category).filter(Boolean);
        if (existingCats.length > 0) {
          setCategoriesList((prev) => [...new Set([...prev, ...existingCats])]);
        }
      }
      if (invRes.status === "fulfilled") setInventoryList(invRes.value.inventory);
      if (custRes.status === "fulfilled") setCustomerList(custRes.value.customers);
      if (catRes.status === "fulfilled" && catRes.value.categories) {
        const names = catRes.value.categories.map((c) => c.name);
        setCategoriesList((prev) => [...new Set([...prev, ...names])]);
      }
    } catch {
      showToast("Could not sync latest atelier data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      void loadData();
    }
  }, [user?.role]);

  // Open modal for new garment
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    const nextCode = (catalog.length + 1).toString().padStart(2, "0");
    setFormCode(nextCode);
    setFormCategory("T-Shirts");
    setFormDescription("");
    setFormPrice("1599");
    setFormImageUrl("/movi/product-01.jpg");
    setFormImages(["/movi/product-01.jpg", "/movi/collection-tee.png"]);
    setActiveImageIndex(0);
    setNewImageUrl("");
    setFormSizes({ XS: 15, S: 25, M: 30, L: 30, XL: 20, XXL: 10 });
    setFormIsActive(true);
    setFormError("");
    setShowCategoryDropdown(false);
    setShowAddCategoryDrawer(false);
    setNewCategoryInput("");
    setModalMode("create");
  };

  // Open modal for editing garment
  const handleOpenEditModal = (product: ApiProduct) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormCode(product.code);
    setFormCategory(product.category);
    if (product.category) {
      setCategoriesList((prev) => (prev.includes(product.category) ? prev : [...prev, product.category]));
    }
    setFormDescription(product.description);
    setFormPrice((product.priceMinor / 100).toString());
    const initialImages = (product.images && product.images.length > 0)
      ? product.images
      : [product.imageUrl || "/movi/product-01.jpg"];
    setFormImages(initialImages);
    setFormImageUrl(initialImages[0]);
    setActiveImageIndex(0);
    setNewImageUrl("");
    const sizeMap: Record<string, number> = {};
    for (const v of product.variants) {
      sizeMap[v.size] = v.stockOnHand;
    }
    setFormSizes(sizeMap);
    setFormIsActive(true);
    setFormError("");
    setShowCategoryDropdown(false);
    setShowAddCategoryDrawer(false);
    setNewCategoryInput("");
    setModalMode("edit");
  };

  // Apply quick preset to form
  const applyPreset = (preset: typeof PRESET_GARMENTS[number]) => {
    setFormName(preset.name);
    setFormSlug(preset.slug);
    setFormCode(preset.code);
    setFormCategory(preset.category);
    setCategoriesList((prev) => (prev.includes(preset.category) ? prev : [...prev, preset.category]));
    setFormDescription(preset.description);
    setFormPrice(preset.price);
    const presetImgs = (preset.images && preset.images.length > 0) ? preset.images : [preset.imageUrl];
    setFormImages(presetImgs);
    setFormImageUrl(presetImgs[0]);
    setActiveImageIndex(0);
    setNewImageUrl("");
  };

  // Save Garment (Create or Edit)
  const handleSaveGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) { setFormError("Garment name is required."); return; }
    if (!formSlug.trim()) { setFormError("URL slug is required."); return; }
    if (!formCode.trim()) { setFormError("SKU / Atelier Code is required."); return; }
    if (!formPrice || Number(formPrice) <= 0) { setFormError("Price must be greater than zero."); return; }
    if (formImages.length === 0 && !formImageUrl.trim()) { setFormError("At least one garment photo is required."); return; }

    setFormSubmitting(true);
    try {
      const priceMinor = Math.round(Number(formPrice) * 100);
      const primaryPhoto = formImages[0] || formImageUrl.trim() || "/movi/product-01.jpg";
      const allPhotos = formImages.length > 0 ? formImages : [primaryPhoto];

      if (modalMode === "create") {
        const variants = Object.entries(formSizes).map(([size, stock]) => ({
          size: size.toUpperCase(),
          stockOnHand: Math.max(0, Number(stock) || 0),
        }));

        const { product } = await api.createProduct({
          name: formName.trim(),
          slug: formSlug.trim(),
          code: formCode.trim().toUpperCase(),
          category: formCategory,
          description: formDescription.trim(),
          priceMinor,
          imageUrl: primaryPhoto,
          images: allPhotos,
          variants,
        });

        setCatalog((curr) => [product, ...curr]);
        showToast(`"${product.name}" published with ${allPhotos.length} photo angles!`, "success");
      } else if (modalMode === "edit" && editingProduct) {
        const { product } = await api.updateProduct(editingProduct.id, {
          name: formName.trim(),
          slug: formSlug.trim(),
          code: formCode.trim().toUpperCase(),
          category: formCategory,
          description: formDescription.trim(),
          priceMinor,
          imageUrl: primaryPhoto,
          images: allPhotos,
          isActive: formIsActive,
        });

        setCatalog((curr) => curr.map((p) => (p.id === product.id ? product : p)));
        showToast(`"${product.name}" updated successfully.`, "success");
      }

      setModalMode(null);
      void refreshProducts();
      void loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save garment.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete / Archive Garment
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await api.deleteProduct(deleteConfirm.id);
      if (res.archived) {
        showToast(`"${deleteConfirm.name}" archived from active storefront.`, "info");
      } else {
        showToast(`"${deleteConfirm.name}" deleted from catalog.`, "success");
      }
      setCatalog((curr) => curr.filter((p) => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      void refreshProducts();
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete garment.", "error");
    }
  };

  // Adjust stock directly
  const handleAdjustVariantStock = async (variantId: string, delta: number, productName: string, size: string) => {
    try {
      const { inventory } = await api.adjustInventory(variantId, delta);
      setInventoryList(inventory);
      showToast(`${productName} (${size}): ${delta > 0 ? "+" + delta : delta} units adjusted.`, "success");
      void refreshProducts();
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Stock adjustment failed.", "error");
    }
  };

  // Batch adjust stock across all sizes of a garment
  const handleBatchAdjustGarmentStock = async (productName: string, variants: InventoryVariant[], delta: number) => {
    if (!variants.length) return;
    setInventoryBatchLoading(productName);
    try {
      let lastInv: InventoryVariant[] = [];
      for (const v of variants) {
        const { inventory } = await api.adjustInventory(v.id, delta);
        lastInv = inventory;
      }
      setInventoryList(lastInv);
      showToast(`${productName}: ${delta > 0 ? "+" + delta : delta} units added across all ${variants.length} sizes.`, "success");
      void refreshProducts();
      void loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Batch restock failed.", "error");
    } finally {
      setInventoryBatchLoading(null);
    }
  };

  // Filtered Garments
  const filteredCatalog = useMemo(() => {
    return catalog.filter((prod) => {
      const matchesCategory = garmentCategory === "All" || prod.category.toLowerCase() === garmentCategory.toLowerCase();
      const matchesSearch =
        garmentSearch.trim() === "" ||
        prod.name.toLowerCase().includes(garmentSearch.toLowerCase()) ||
        prod.code.toLowerCase().includes(garmentSearch.toLowerCase()) ||
        prod.category.toLowerCase().includes(garmentSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, garmentCategory, garmentSearch]);

  // Order Dispatch Metrics
  const orderMetrics = useMemo(() => {
    let totalRevenue = 0;
    let processingCount = 0;
    let packedCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let cancelledCount = 0;

    orders.forEach((o) => {
      totalRevenue += o.total;
      const st = (o.status || "").toLowerCase();
      if (st === "processing") processingCount++;
      else if (st === "packed") packedCount++;
      else if (st === "shipped") shippedCount++;
      else if (st === "delivered") deliveredCount++;
      else if (st === "cancelled") cancelledCount++;
    });

    return {
      totalCount: orders.length,
      totalRevenue,
      processingCount,
      packedCount,
      shippedCount,
      deliveredCount,
      cancelledCount,
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = orderFilter === "all" || order.status.toLowerCase() === orderFilter.toLowerCase();
      if (!matchesStatus) return false;
      if (!orderSearch.trim()) return true;
      const q = orderSearch.toLowerCase();
      const hasItemMatch = order.items.some((it) => {
        const codeMatch = (it.code || "").toLowerCase().includes(q);
        const nameMatch = (it.name || "").toLowerCase().includes(q);
        return codeMatch || nameMatch;
      });
      return (
        (order.orderNumber || order.id).toLowerCase().includes(q) ||
        (order.customerName || "").toLowerCase().includes(q) ||
        (order.customerEmail || "").toLowerCase().includes(q) ||
        (order.shippingAddress || "").toLowerCase().includes(q) ||
        hasItemMatch
      );
    });
  }, [orders, orderFilter, orderSearch]);

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customerList.filter((cust) => {
      if (!customerSearch.trim()) return true;
      const q = customerSearch.toLowerCase();
      return cust.name.toLowerCase().includes(q) || cust.email.toLowerCase().includes(q) || (cust.phone || "").includes(q);
    });
  }, [customerList, customerSearch]);

  // 1. Enriched full inventory list with product images and categories guaranteed
  const enrichedInventoryList = useMemo(() => {
    const source = inventoryList.length > 0
      ? inventoryList
      : (catalog.flatMap((p: ApiProduct) =>
          (p.variants || []).map((v: any) => ({
            ...v,
            productId: p.id,
            productName: p.name,
            productCode: p.code,
            productImage: p.images?.[0] || "/movi/product-01.jpg",
            category: p.category,
          }))
        ));

    const productMap = new Map<string, ApiProduct>();
    catalog.forEach((p) => {
      if (p.code) productMap.set(p.code.toLowerCase(), p);
      if (p.name) productMap.set(p.name.toLowerCase(), p);
      if (p.id) productMap.set(p.id, p);
    });

    return source.map((inv) => {
      const match = (inv.productId && productMap.get(inv.productId)) ||
                    (inv.productCode && productMap.get(inv.productCode.toLowerCase())) ||
                    (inv.productName && productMap.get(inv.productName.toLowerCase()));
      return {
        ...inv,
        productId: inv.productId || match?.id || "",
        productImage: inv.productImage || match?.images?.[0] || "/movi/product-01.jpg",
        category: inv.category || match?.category || "General Studio",
        priceMinor: inv.priceMinor || match?.priceMinor || 0,
      };
    });
  }, [inventoryList, catalog]);

  // 2. Available categories with style and unit counts
  const inventoryCategoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; units: number }>();
    enrichedInventoryList.forEach((inv) => {
      const cat = inv.category || "General Studio";
      const existing = stats.get(cat) || { count: 0, units: 0 };
      existing.units += inv.stockOnHand;
      stats.set(cat, existing);
    });

    // Count unique products per category
    const productCatMap = new Map<string, Set<string>>();
    enrichedInventoryList.forEach((inv) => {
      const cat = inv.category || "General Studio";
      const set = productCatMap.get(cat) || new Set<string>();
      set.add(inv.productName);
      productCatMap.set(cat, set);
    });

    return Array.from(stats.entries()).map(([name, val]) => ({
      name,
      stylesCount: productCatMap.get(name)?.size || 0,
      units: val.units,
    })).sort((a, b) => b.units - a.units);
  }, [enrichedInventoryList]);

  // 3. Overall inventory metrics
  const inventoryMetrics = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let depletedCount = 0;
    const styles = new Set<string>();

    enrichedInventoryList.forEach((inv) => {
      totalUnits += inv.stockOnHand;
      styles.add(inv.productName);
      const avail = Math.max(0, inv.stockOnHand - (inv.stockReserved || 0));
      if (avail === 0) depletedCount++;
      else if (avail < 20) lowStockCount++;
    });

    return {
      totalUnits,
      stylesCount: styles.size,
      lowStockCount,
      depletedCount,
    };
  }, [enrichedInventoryList]);

  // 4. Filtered Inventory List
  const filteredInventoryList = useMemo(() => {
    return enrichedInventoryList.filter((inv) => {
      if (inventoryCategoryFilter !== "all" && inv.category !== inventoryCategoryFilter) {
        return false;
      }
      const avail = Math.max(0, inv.stockOnHand - (inv.stockReserved || 0));
      if (inventoryStockFilter === "low" && (avail >= 20 || avail === 0)) return false;
      if (inventoryStockFilter === "depleted" && avail > 0) return false;

      if (!inventorySearch.trim()) return true;
      const q = inventorySearch.toLowerCase();
      return (
        inv.productName.toLowerCase().includes(q) ||
        inv.productCode.toLowerCase().includes(q) ||
        inv.size.toLowerCase().includes(q) ||
        (inv.category && inv.category.toLowerCase().includes(q))
      );
    });
  }, [enrichedInventoryList, inventoryCategoryFilter, inventoryStockFilter, inventorySearch]);

  const filteredInventory = filteredInventoryList;

  // 5. Grouped inventory by garment
  const groupedInventory = useMemo(() => {
    const groups = new Map<string, {
      productId: string;
      productName: string;
      productCode: string;
      productImage: string;
      category: string;
      priceMinor: number;
      totalOnHand: number;
      totalReserved: number;
      totalAvailable: number;
      hasLowStock: boolean;
      hasDepleted: boolean;
      variants: Array<InventoryVariant & { available: number; isLow: boolean; isDepleted: boolean }>;
    }>();

    filteredInventoryList.forEach((inv) => {
      const key = inv.productCode || inv.productName;
      const available = Math.max(0, inv.stockOnHand - (inv.stockReserved || 0));
      const isLow = available > 0 && available < 20;
      const isDepleted = available === 0;

      if (!groups.has(key)) {
        groups.set(key, {
          productId: inv.productId || "",
          productName: inv.productName,
          productCode: inv.productCode,
          productImage: inv.productImage || "/movi/product-01.jpg",
          category: inv.category || "General Studio",
          priceMinor: inv.priceMinor || 0,
          totalOnHand: 0,
          totalReserved: 0,
          totalAvailable: 0,
          hasLowStock: false,
          hasDepleted: false,
          variants: [],
        });
      }

      const grp = groups.get(key)!;
      grp.totalOnHand += inv.stockOnHand;
      grp.totalReserved += (inv.stockReserved || 0);
      grp.totalAvailable += available;
      if (isLow) grp.hasLowStock = true;
      if (isDepleted) grp.hasDepleted = true;

      grp.variants.push({
        ...inv,
        available,
        isLow,
        isDepleted,
      });
    });

    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "OS"];
    groups.forEach((grp) => {
      grp.variants.sort((a, b) => {
        const ia = sizeOrder.indexOf(a.size.toUpperCase());
        const ib = sizeOrder.indexOf(b.size.toUpperCase());
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.size.localeCompare(b.size);
      });
    });

    return Array.from(groups.values());
  }, [filteredInventoryList]);

  const revenue = summary ? summary.revenueMinor / 100 : orders.reduce((sum, order) => sum + order.total, 0);
  const totalStockUnits = summary?.inventoryUnits ?? Object.values(stocks).reduce((sum, count) => sum + count, 0);

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

  return (
    <section className="admin-screen">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`admin-toast admin-toast--${toast.type}`} role="alert" onClick={() => setToast(null)}>
          <span className="toast-dot" />
          <span>{toast.message}</span>
          <button type="button" className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* TOP STUDIO COMMAND BAR */}
      <header className="admin-topbar">
        <div className="admin-topbar__main">
          <div className="admin-topbar__brand">
            <div className="admin-brand-top">
              <span className="admin-atelier-tag">MOVI ATELIER / MUMBAI</span>
              <span className="admin-live-badge">
                <span className="live-pulse" /> DATABASE LIVE
              </span>
            </div>
            <div className="admin-title-row">
              <h1>Studio Director Console</h1>
            </div>
          </div>

          <div className="admin-topbar__actions">
            <button
              type="button"
              className="admin-create-garment-btn"
              onClick={handleOpenCreateModal}
            >
              <span>+ Add New Garment</span>
            </button>
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
              Sign Out
            </button>
          </div>
        </div>

        {/* QUICK EXTERNAL NAVIGATION */}
        <div className="admin-quick-nav">
          <div className="quick-nav-links">
            <Link to="/" className="quick-nav-pill" target="_blank">
              Live Storefront ↗
            </Link>
            <Link to="/shop" className="quick-nav-pill" target="_blank">
              Catalog View ↗
            </Link>
            <Link to="/account" className="quick-nav-pill">
              Customer Profile ↗
            </Link>
          </div>
          <button
            type="button"
            className="admin-refresh-pill"
            onClick={loadData}
            title="Refresh All Atelier Data"
          >
            {isLoading ? "Syncing..." : "↻ Refresh Live Data"}
          </button>
        </div>

        {/* HIGH-FASHION TABBED NAVIGATION */}
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
            className={tab === "garments" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("garments")}
          >
            <span>Garments Studio</span>
            <span className="admin-tab__counter">{catalog.length}</span>
          </button>
          <button
            type="button"
            className={tab === "inventory" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("inventory")}
          >
            <span>SKU Matrix</span>
            <span className="admin-tab__counter">{inventoryList.length || (storeProducts?.length ? storeProducts : products).length}</span>
          </button>
          <button
            type="button"
            className={tab === "orders" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("orders")}
          >
            <span>Orders Dispatch</span>
            <span className="admin-tab__counter">{orders.length}</span>
          </button>
          <button
            type="button"
            className={tab === "customers" ? "admin-tab is-active" : "admin-tab"}
            onClick={() => setTab("customers")}
          >
            <span>Clientele Registry</span>
            <span className="admin-tab__counter">{customerList.length || 3}</span>
          </button>
        </nav>
      </header>

      {/* MAIN CONTAINER PANES */}
      <div className="admin-main-container">

        {/* 1. OVERVIEW PANE */}
        {tab === "overview" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">ATELIER CONTROL CENTER</span>
                <h2>Executive Overview</h2>
              </div>
              <button type="button" className="solid-link" onClick={handleOpenCreateModal}>
                + Add New Garment <Arrow />
              </button>
            </div>

            <div className="admin-metrics-grid">
              <article className="admin-stat-card admin-stat-card--gold">
                <span className="stat-label">Gross Revenue</span>
                <strong className="stat-value">₹ {revenue.toLocaleString("en-IN")}</strong>
                <span className="stat-sub">From {orders.length} Customer Orders</span>
              </article>
              <article className="admin-stat-card">
                <span className="stat-label">Active Orders</span>
                <strong className="stat-value">{orders.length.toString().padStart(2, "0")}</strong>
                <span className="stat-sub">Fulfillment On Track</span>
              </article>
              <article className="admin-stat-card">
                <span className="stat-label">Garment Models</span>
                <strong className="stat-value">{catalog.length.toString().padStart(2, "0")}</strong>
                <span className="stat-sub">Active in Public Catalog</span>
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

            {/* RECENT DISPATCH STREAM */}
            <div className="admin-section-block">
              <div className="admin-section-header">
                <div>
                  <span className="stat-label">RECENT DISPATCH STREAM</span>
                  <h2>Latest Customer Orders</h2>
                </div>
                <button type="button" className="admin-view-all-btn" onClick={() => setTab("orders")}>
                  Manage All Orders ({orders.length}) →
                </button>
              </div>

              <div className="admin-orders-stream">
                {orders.slice(0, 6).map((order) => {
                  const statusColors: Record<string, string> = {
                    Processing: "#c5a880",
                    Packed: "#60a5fa",
                    Shipped: "#c084fc",
                    Delivered: "#4ade80",
                    Cancelled: "#f87171",
                  };
                  return (
                    <article key={order.id} className="admin-order-item">
                      <div className="admin-order-item__top">
                        <div className="admin-order-id-group">
                          <strong className="order-id">{order.orderNumber || order.id}</strong>
                          <span className="order-date">{order.date}</span>
                        </div>
                        <strong className="order-total">₹ {order.total.toLocaleString("en-IN")}</strong>
                      </div>

                      <div className="admin-order-item__details">
                        <div className="order-customer-box">
                          <span className="order-customer-avatar">
                            {(order.customerName || "C").charAt(0).toUpperCase()}
                          </span>
                          <span className="order-customer-name">{order.customerName || "Customer"}</span>
                        </div>
                        <span className="order-pieces-badge">
                          {order.items.length} {order.items.length === 1 ? "garment" : "garments"}
                        </span>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="admin-order-item__thumbnails">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="order-item-mini-thumb" title={`${item.name || item.code} (Size ${item.size})`}>
                              <img src={item.image || "/movi/product-01.jpg"} alt={item.name || item.code} />
                              <span className="mini-thumb-size">{item.size}</span>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <span className="mini-thumb-more">+{order.items.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="admin-order-item__footer">
                        <div className="admin-order-status-wrap">
                          <span className="status-indicator-dot" style={{ backgroundColor: statusColors[order.status] || "#c5a880" }} />
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                            className={`status-select status-select--${order.status.toLowerCase()}`}
                            aria-label={`Update fulfillment status for order ${order.orderNumber || order.id}`}
                          >
                            <option value="Processing">Processing</option>
                            <option value="Packed">Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="order-inspect-link"
                          onClick={() => {
                            setTab("orders");
                            setOrderSearch(order.orderNumber || order.id);
                          }}
                        >
                          Dossier →
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. GARMENTS STUDIO PANE (DYNAMIC PRODUCT CATALOG) */}
        {tab === "garments" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">DYNAMIC ATELIER CATALOG</span>
                <h2>Clothing Models & Drops</h2>
                <p className="admin-subtext">Add, edit, or archive garments. All changes propagate instantaneously to the live customer storefront.</p>
              </div>
              <div className="admin-section-actions">
                <button
                  type="button"
                  className="outline-link admin-top-add-cat-btn"
                  onClick={() => {
                    handleOpenCreateModal();
                    setShowAddCategoryDrawer(true);
                  }}
                >
                  + Add More Category
                </button>
                <button type="button" className="solid-link" onClick={handleOpenCreateModal}>
                  + Add New Garment <Arrow />
                </button>
              </div>
            </div>

            {/* SEARCH & CATEGORY FILTERS */}
            <div className="admin-filter-bar">
              <div className="admin-search-box">
                <input
                  type="text"
                  placeholder="Search garments by name, SKU or category..."
                  value={garmentSearch}
                  onChange={(e) => setGarmentSearch(e.target.value)}
                />
                {garmentSearch && (
                  <button type="button" className="search-clear-btn" onClick={() => setGarmentSearch("")}>✕</button>
                )}
              </div>
              <div className="admin-category-pills">
                {["All", ...categoriesList].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-pill ${garmentCategory === cat ? "is-active" : ""}`}
                    onClick={() => setGarmentCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* GARMENTS LIST / GRID */}
            <div className="admin-garments-grid">
              {filteredCatalog.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No garments found matching the active criteria.</p>
                  <button type="button" className="solid-link" onClick={handleOpenCreateModal}>
                    + Create First Garment <Arrow />
                  </button>
                </div>
              ) : (
                filteredCatalog.map((product: ApiProduct) => {
                  const totalUnits = (product.variants || []).reduce((sum: number, v: any) => sum + v.stockOnHand, 0);
                  return (
                    <article key={product.id} className="admin-garment-card">
                      <div className="admin-garment-card__visual">
                        <img src={product.imageUrl} alt={product.name} />
                        <span className="garment-sku-badge">SKU: {product.code}</span>
                      </div>
                      <div className="admin-garment-card__body">
                        <div className="garment-card-top">
                          <span className="garment-category-tag">{product.category}</span>
                          <strong className="garment-price-tag">₹ {(product.priceMinor / 100).toLocaleString("en-IN")}</strong>
                        </div>
                        <h3 className="garment-card-title">{product.name}</h3>
                        <p className="garment-card-desc">{product.description}</p>

                        {/* SIZE RUN STOCK PILLS */}
                        <div className="garment-size-run">
                          <span className="size-run-label">Size Stock:</span>
                          <div className="size-run-chips">
                            {(product.variants || []).map((v: any) => (
                              <span key={v.id} className="size-stock-chip">
                                <strong>{v.size}</strong>: {v.stockOnHand}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="garment-card-meta">
                          <span className="units-tag">Total: {totalUnits} units on hand</span>
                        </div>

                        {/* ACTIONS BAR */}
                        <div className="garment-card-actions">
                          <button
                            type="button"
                            className="garment-action-btn garment-action-btn--edit"
                            onClick={() => handleOpenEditModal(product)}
                          >
                            ✎ Edit Garment
                          </button>
                          <button
                            type="button"
                            className="garment-action-btn garment-action-btn--delete"
                            onClick={() => setDeleteConfirm(product)}
                            title="Remove or Archive Garment"
                          >
                            🗑 Archive
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3. SKU MATRIX & INVENTORY PANE */}
        {tab === "inventory" && (
          <div className="admin-tab-pane admin-inventory-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">WAREHOUSE LOGISTICS & STOCK HEALTH</span>
                <h2>Inventory Distribution Studio</h2>
                <p className="admin-subtext">
                  Direct live stock management across all collections. Visually organized by garment silhouette with instant variant steppers, product photos, and category filtering.
                </p>
              </div>
              <div className="admin-header-actions">
                <button type="button" className="solid-link" onClick={loadData}>
                  ↻ Refresh Stock <Arrow />
                </button>
              </div>
            </div>

            {/* WAREHOUSE KPI METRIC TILES */}
            <div className="admin-inventory-kpi-grid">
              <div className="inv-kpi-card">
                <span className="inv-kpi-label">TOTAL STOCK UNITS</span>
                <span className="inv-kpi-val">{inventoryMetrics.totalUnits.toLocaleString()}</span>
                <span className="inv-kpi-sub">Across all sizes & silhouettes</span>
              </div>
              <div className="inv-kpi-card">
                <span className="inv-kpi-label">ACTIVE SILHOUETTES</span>
                <span className="inv-kpi-val">{inventoryMetrics.stylesCount}</span>
                <span className="inv-kpi-sub">{inventoryCategoryStats.length} catalog categories</span>
              </div>
              <div className={`inv-kpi-card ${inventoryMetrics.lowStockCount > 0 ? "inv-kpi-card--warn" : ""}`}>
                <span className="inv-kpi-label">LOW STOCK ALERTS</span>
                <span className="inv-kpi-val">{inventoryMetrics.lowStockCount}</span>
                <span className="inv-kpi-sub">Variants under 20 units</span>
              </div>
              <div className={`inv-kpi-card ${inventoryMetrics.depletedCount > 0 ? "inv-kpi-card--alert" : ""}`}>
                <span className="inv-kpi-label">DEPLETED VARIANTS</span>
                <span className="inv-kpi-val">{inventoryMetrics.depletedCount}</span>
                <span className="inv-kpi-sub">Completely sold out (0 units)</span>
              </div>
            </div>

            {/* CATEGORY FILTER STRIP */}
            <div className="admin-inventory-category-bar">
              <div className="inv-category-bar-label">
                <span>CATEGORIES:</span>
              </div>
              <div className="inv-category-chips">
                <button
                  type="button"
                  className={`inv-category-chip ${inventoryCategoryFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setInventoryCategoryFilter("all")}
                >
                  All Collections <span className="chip-count">({inventoryMetrics.stylesCount})</span>
                </button>
                {inventoryCategoryStats.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`inv-category-chip ${inventoryCategoryFilter === cat.name ? "is-active" : ""}`}
                    onClick={() => setInventoryCategoryFilter(cat.name)}
                  >
                    {cat.name} <span className="chip-count">({cat.stylesCount})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* TOOLBAR: SEARCH + STOCK HEALTH FILTER + VIEW SWITCHER */}
            <div className="admin-inventory-toolbar">
              <div className="admin-search-box inv-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Filter by garment name, SKU code, category, or size..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                />
                {inventorySearch && (
                  <button type="button" className="search-clear-btn" onClick={() => setInventorySearch("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="inv-health-filters">
                <button
                  type="button"
                  className={`inv-health-btn ${inventoryStockFilter === "all" ? "is-active" : ""}`}
                  onClick={() => setInventoryStockFilter("all")}
                >
                  All Items
                </button>
                <button
                  type="button"
                  className={`inv-health-btn inv-health-btn--warn ${inventoryStockFilter === "low" ? "is-active" : ""}`}
                  onClick={() => setInventoryStockFilter("low")}
                >
                  ⚠️ Low Stock ({inventoryMetrics.lowStockCount})
                </button>
                <button
                  type="button"
                  className={`inv-health-btn inv-health-btn--alert ${inventoryStockFilter === "depleted" ? "is-active" : ""}`}
                  onClick={() => setInventoryStockFilter("depleted")}
                >
                  🚫 Depleted ({inventoryMetrics.depletedCount})
                </button>
              </div>

              <div className="inv-view-toggle">
                <button
                  type="button"
                  className={`inv-view-btn ${inventoryViewMode === "grouped" ? "is-active" : ""}`}
                  onClick={() => setInventoryViewMode("grouped")}
                  title="Compact Garment View (Efficient)"
                >
                  ☷ Garment View
                </button>
                <button
                  type="button"
                  className={`inv-view-btn ${inventoryViewMode === "table" ? "is-active" : ""}`}
                  onClick={() => setInventoryViewMode("table")}
                  title="Spreadsheet Table View"
                >
                  ☰ Detailed Table
                </button>
              </div>
            </div>

            {/* VIEW 1: GROUPED COMPACT PRODUCT CARDS (HIGH EFFICIENCY) */}
            {inventoryViewMode === "grouped" && (
              <div className="admin-inventory-grouped-stream">
                {groupedInventory.length === 0 ? (
                  <div className="inv-empty-card">
                    <p className="inv-empty-title">No Garments Found</p>
                    <p className="inv-empty-sub">
                      No inventory matched your active category filter ("{inventoryCategoryFilter}") or search criteria.
                    </p>
                    <button
                      type="button"
                      className="solid-link"
                      onClick={() => {
                        setInventoryCategoryFilter("all");
                        setInventoryStockFilter("all");
                        setInventorySearch("");
                      }}
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  groupedInventory.map((item) => {
                    const catalogProd = catalog.find(
                      (p) => p.code === item.productCode || p.name === item.productName || (item.productId && p.id === item.productId)
                    );

                    return (
                      <div key={item.productCode || item.productName} className="admin-inventory-garment-card">
                        {/* GARMENT MASTER SPEC BAR */}
                        <div className="inv-card-header">
                          <div className="inv-card-media-block">
                            <div
                              className="inv-card-thumb-wrap"
                              onClick={() => catalogProd && handleOpenEditModal(catalogProd)}
                              title="Click to open Fullscreen Studio for this garment"
                            >
                              <img
                                src={item.productImage || "/movi/product-01.jpg"}
                                alt={item.productName}
                                className="inv-card-thumb-img"
                                onError={(e) => {
                                  e.currentTarget.src = "/movi/product-01.jpg";
                                }}
                              />
                              <div className="inv-thumb-hover-overlay">
                                <span>✎ Edit</span>
                              </div>
                            </div>
                            <div className="inv-card-meta">
                              <div className="inv-meta-tag-row">
                                <span className="inv-cat-pill">{item.category}</span>
                                <span className="code-pill">SKU: {item.productCode}</span>
                              </div>
                              <h3
                                className="inv-garment-name"
                                onClick={() => catalogProd && handleOpenEditModal(catalogProd)}
                              >
                                {item.productName}
                              </h3>
                              <div className="inv-price-row">
                                <span className="inv-price-val">₹{(item.priceMinor / 100).toLocaleString()}</span>
                                <span className="inv-specs-dot">·</span>
                                <span className="inv-sizes-count">{item.variants.length} Sizes</span>
                              </div>
                            </div>
                          </div>

                          <div className="inv-card-summary-block">
                            <div className="inv-stock-totals">
                              <span className="inv-total-units">
                                <strong>{item.totalOnHand}</strong> units on hand
                              </span>
                              <span className="inv-avail-units">
                                ({item.totalAvailable} available, {item.totalReserved} reserved)
                              </span>
                              <div className="inv-status-pill-wrap">
                                {item.hasDepleted ? (
                                  <span className="status-pill status-pill--depleted">SOME SIZES SOLD OUT</span>
                                ) : item.hasLowStock ? (
                                  <span className="status-pill status-pill--low">LOW STOCK WARNING</span>
                                ) : (
                                  <span className="status-pill status-pill--ok">IN STOCK</span>
                                )}
                              </div>
                            </div>

                            <div className="inv-card-actions">
                              <button
                                type="button"
                                className="inv-batch-restock-btn"
                                onClick={() => void handleBatchAdjustGarmentStock(item.productName, item.variants, 10)}
                                disabled={inventoryBatchLoading === item.productName}
                                title="Add 10 units to every size variant of this garment"
                              >
                                {inventoryBatchLoading === item.productName ? "Restocking..." : "+10 All Sizes"}
                              </button>
                              {catalogProd && (
                                <button
                                  type="button"
                                  className="inv-edit-garment-btn"
                                  onClick={() => handleOpenEditModal(catalogProd)}
                                  title="Edit garment specs, price, or lookbook photos"
                                >
                                  ✎ Specs & Photos
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SIZES DISTRIBUTION RIBBON */}
                        <div className="inv-sizes-ribbon">
                          {item.variants.map((v) => (
                            <div
                              key={v.id}
                              className={`inv-size-tile ${v.isDepleted ? "inv-size-tile--depleted" : v.isLow ? "inv-size-tile--low" : ""}`}
                            >
                              <div className="inv-size-tile-top">
                                <span className="inv-size-letter">{v.size}</span>
                                <span
                                  className={`status-pill ${v.isDepleted ? "status-pill--depleted" : v.isLow ? "status-pill--low" : "status-pill--ok"}`}
                                >
                                  {v.isDepleted ? "OUT" : v.isLow ? "LOW" : "OK"}
                                </span>
                              </div>

                              <div className="inv-size-tile-stock">
                                <span className="inv-size-qty">{v.stockOnHand}</span>
                                <span className="inv-size-sub">units</span>
                              </div>

                              {v.stockReserved > 0 && (
                                <div className="inv-size-reserved">
                                  <span>{v.stockReserved} reserved</span>
                                </div>
                              )}

                              <div className="inv-size-steppers">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(v.id, -5, v.productName, v.size)}
                                  title="Decrease 5"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(v.id, -1, v.productName, v.size)}
                                  title="Decrease 1"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  className="inv-step-add"
                                  onClick={() => handleAdjustVariantStock(v.id, 1, v.productName, v.size)}
                                  title="Add 1"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  className="inv-step-add"
                                  onClick={() => handleAdjustVariantStock(v.id, 10, v.productName, v.size)}
                                  title="Add 10"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  className="inv-step-add"
                                  onClick={() => handleAdjustVariantStock(v.id, 50, v.productName, v.size)}
                                  title="Add 50"
                                >
                                  +50
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW 2: FLAT SPREADSHEET TABLE (UPGRADED WITH PRODUCT PHOTOS & CATEGORIES) */}
            {inventoryViewMode === "table" && (
              <div className="admin-sku-table-container">
                <table className="admin-sku-table">
                  <thead>
                    <tr>
                      <th style={{ width: "56px" }}>Photo</th>
                      <th>Garment</th>
                      <th>Category</th>
                      <th>Code</th>
                      <th>Size</th>
                      <th>On Hand</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      <th>Status</th>
                      <th>Stock Steppers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventoryList.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "40px" }}>
                          No variants matched the active filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredInventoryList.map((variant) => {
                        const available = Math.max(0, variant.stockOnHand - (variant.stockReserved || 0));
                        const isLow = available < 20;
                        const isDepleted = available === 0;

                        return (
                          <tr key={variant.id}>
                            <td>
                              <div className="table-thumb-cell">
                                <img
                                  src={variant.productImage || "/movi/product-01.jpg"}
                                  alt={variant.productName}
                                  className="table-thumb-img"
                                  onError={(e) => {
                                    e.currentTarget.src = "/movi/product-01.jpg";
                                  }}
                                />
                              </div>
                            </td>
                            <td>
                              <div className="table-garment-cell">
                                <strong>{variant.productName}</strong>
                              </div>
                            </td>
                            <td>
                              <span className="table-cat-pill">{variant.category}</span>
                            </td>
                            <td>
                              <span className="code-pill">{variant.productCode}</span>
                            </td>
                            <td>
                              <span className="size-badge">{variant.size}</span>
                            </td>
                            <td>{variant.stockOnHand}</td>
                            <td>{variant.stockReserved || 0}</td>
                            <td>
                              <strong>{available}</strong>
                            </td>
                            <td>
                              {isDepleted ? (
                                <span className="status-pill status-pill--depleted">OUT OF STOCK</span>
                              ) : isLow ? (
                                <span className="status-pill status-pill--low">LOW STOCK</span>
                              ) : (
                                <span className="status-pill status-pill--ok">IN STOCK</span>
                              )}
                            </td>
                            <td>
                              <div className="table-stock-steppers">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(variant.id, -5, variant.productName, variant.size)}
                                  title="Decrease 5"
                                >
                                  -5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(variant.id, -1, variant.productName, variant.size)}
                                  title="Decrease 1"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(variant.id, 1, variant.productName, variant.size)}
                                  title="Add 1"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(variant.id, 10, variant.productName, variant.size)}
                                  title="Add 10"
                                >
                                  +10
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustVariantStock(variant.id, 50, variant.productName, variant.size)}
                                  title="Add 50"
                                >
                                  +50
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. ORDERS DISPATCH PANE */}
        {tab === "orders" && (
          <div className="admin-tab-pane admin-orders-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">LOGISTICS & CLIENT DISPATCH CONSOLE</span>
                <h2>Clientele Orders Stream</h2>
                <p className="admin-subtext">
                  Direct dispatch management from boutique checkout to doorstep handover. Inspect full garment cut specs, verified client dossiers, and progress fulfillment stages.
                </p>
              </div>
              <div className="admin-header-actions">
                <button type="button" className="solid-link" onClick={loadData}>
                  ↻ Refresh Dispatch Stream <Arrow />
                </button>
              </div>
            </div>

            {/* FULFILLMENT KPI METRIC TILES */}
            <div className="admin-inventory-kpi-grid admin-orders-kpi-grid">
              <div className="inv-kpi-card">
                <span className="inv-kpi-label">TOTAL DISPATCH REVENUE</span>
                <span className="inv-kpi-val">₹{orderMetrics.totalRevenue.toLocaleString("en-IN")}</span>
                <span className="inv-kpi-sub">Across {orderMetrics.totalCount} client orders</span>
              </div>
              <div className={`inv-kpi-card ${orderMetrics.processingCount > 0 ? "inv-kpi-card--warn" : ""}`}>
                <span className="inv-kpi-label">AWAITING PACKING</span>
                <span className="inv-kpi-val">{orderMetrics.processingCount}</span>
                <span className="inv-kpi-sub">New orders to quality-check</span>
              </div>
              <div className="inv-kpi-card">
                <span className="inv-kpi-label">PACKED & READY</span>
                <span className="inv-kpi-val">{orderMetrics.packedCount}</span>
                <span className="inv-kpi-sub">Ready for courier handover</span>
              </div>
              <div className="inv-kpi-card">
                <span className="inv-kpi-label">IN TRANSIT & DELIVERED</span>
                <span className="inv-kpi-val">{orderMetrics.shippedCount + orderMetrics.deliveredCount}</span>
                <span className="inv-kpi-sub">{orderMetrics.shippedCount} in transit · {orderMetrics.deliveredCount} fulfilled</span>
              </div>
            </div>

            {/* STATUS FILTER PILLS & SEARCH */}
            <div className="admin-orders-toolbar">
              <div className="admin-search-box orders-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Order #, Client Name, Email, Address, or Garment..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                {orderSearch && (
                  <button type="button" className="search-clear-btn" onClick={() => setOrderSearch("")}>
                    ✕
                  </button>
                )}
              </div>

              <div className="orders-status-chips">
                {[
                  { key: "all", label: "All Orders", count: orders.length },
                  { key: "processing", label: "Processing", count: orderMetrics.processingCount },
                  { key: "packed", label: "Packed", count: orderMetrics.packedCount },
                  { key: "shipped", label: "In Transit", count: orderMetrics.shippedCount },
                  { key: "delivered", label: "Delivered", count: orderMetrics.deliveredCount },
                  { key: "cancelled", label: "Cancelled", count: orderMetrics.cancelledCount },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    className={`orders-chip ${orderFilter === st.key ? "is-active" : ""}`}
                    onClick={() => setOrderFilter(st.key)}
                  >
                    {st.label} <span className="chip-count">({st.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ORDERS STREAM */}
            <div className="admin-orders-stream">
              {filteredOrders.length === 0 ? (
                <div className="inv-empty-card">
                  <p className="inv-empty-title">No Orders Found</p>
                  <p className="inv-empty-sub">
                    No orders match your active filter criteria ({orderFilter.toUpperCase()}) or search query.
                  </p>
                  <button
                    type="button"
                    className="solid-link"
                    onClick={() => {
                      setOrderFilter("all");
                      setOrderSearch("");
                    }}
                  >
                    Reset Order Filters
                  </button>
                </div>
              ) : (
                filteredOrders.map((order: any) => {
                  const matchedCustomer = customerList.find(
                    (c) =>
                      (order.customerName && c.name?.toLowerCase() === order.customerName.toLowerCase()) ||
                      (order.customerEmail && c.email?.toLowerCase() === order.customerEmail.toLowerCase())
                  );
                  const clientEmail = order.customerEmail || matchedCustomer?.email || `${(order.customerName || "client").toLowerCase().replace(/[^a-z0-9]+/g, ".")}@movi.in`;
                  const clientPhone = matchedCustomer?.phone || "+91 98201 44820";
                  const clientAddress = order.shippingAddress || matchedCustomer?.address || "Bandra West, Mumbai, MH — 400050";
                  const isVip = matchedCustomer ? (matchedCustomer.lifetimeSpendMinor || 0) > 300000 : true;

                  const nextStatus =
                    order.status.toLowerCase() === "processing"
                      ? { label: "📦 Mark Packed & Ready →", target: "Packed" }
                      : order.status.toLowerCase() === "packed"
                      ? { label: "🚚 Dispatch & Mark Shipped →", target: "Shipped" }
                      : order.status.toLowerCase() === "shipped"
                      ? { label: "✓ Confirm Doorstep Delivery →", target: "Delivered" }
                      : null;

                  return (
                    <article key={order.id} className="admin-order-card-detailed">
                      {/* CARD HEAD: ORDER ID, TIME, PAYMENT, TOTAL */}
                      <div className="admin-order-card-head">
                        <div className="admin-order-id-group">
                          <span className="order-num-pill">
                            #{order.orderNumber || order.id}
                          </span>
                          <span className="order-date-pill">
                            📅 {order.date}
                          </span>
                          <span className="payment-badge">
                            💳 COD · VERIFIED ON ARRIVAL
                          </span>
                        </div>
                        <div className="order-head-price">
                          <span className="order-total-label">ORDER TOTAL</span>
                          <strong className="order-total">₹ {order.total.toLocaleString("en-IN")}</strong>
                        </div>
                      </div>

                      {/* 4-STAGE FULFILLMENT PIPELINE STEPPER */}
                      <div className="admin-order-stepper-bar">
                        {[
                          { key: "processing", label: "01. Received", sub: "Payment & Order Verified" },
                          { key: "packed", label: "02. Packed", sub: "Atelier Inspection Done" },
                          { key: "shipped", label: "03. In Transit", sub: "Courier Logistics Assigned" },
                          { key: "delivered", label: "04. Delivered", sub: "Client Handover Complete" },
                        ].map((step, sIdx) => {
                          const statusOrder = ["processing", "packed", "shipped", "delivered"];
                          const currentIdx = statusOrder.indexOf(order.status.toLowerCase());
                          const isCompleted = currentIdx >= sIdx;
                          const isCurrent = currentIdx === sIdx;

                          return (
                            <div
                              key={step.key}
                              className={`stepper-step ${isCompleted ? "is-completed" : ""} ${isCurrent ? "is-current" : ""}`}
                            >
                              <div className="stepper-dot-wrap">
                                <div className="stepper-dot">{isCompleted && !isCurrent ? "✓" : sIdx + 1}</div>
                                {sIdx < 3 && <div className={`stepper-line ${currentIdx > sIdx ? "is-filled" : ""}`} />}
                              </div>
                              <div className="stepper-info">
                                <span className="stepper-label">{step.label}</span>
                                <span className="stepper-sub">{step.sub}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* CLIENT & LOGISTICS DOSSIER GRID */}
                      <div className="admin-order-dossier-grid">
                        <div className="dossier-col dossier-col--client">
                          <div className="dossier-col-head">
                            <span className="dossier-kicker">01. CLIENT DOSSIER</span>
                            <span className="vip-tag">{isVip ? "★ VIP PRIVATE CLIENT" : "VERIFIED MEMBER"}</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Client Name:</span>
                            <span className="dossier-val font-semibold">{order.customerName || "Verified Member"}</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Direct Email:</span>
                            <span className="dossier-val text-gold">{clientEmail}</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Phone Contact:</span>
                            <span className="dossier-val">{clientPhone}</span>
                          </div>
                        </div>

                        <div className="dossier-col dossier-col--dispatch">
                          <div className="dossier-col-head">
                            <span className="dossier-kicker">02. DISPATCH & LOGISTICS</span>
                            <span className="courier-badge">⚡ PRIORITY AIR COURIER</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Destination Address:</span>
                            <span className="dossier-val">{clientAddress}</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Fulfillment Service:</span>
                            <span className="dossier-val">Insured Express Doorstep Dispatch</span>
                          </div>
                          <div className="dossier-row">
                            <span className="dossier-label">Payment Mode:</span>
                            <span className="dossier-val text-gold">Cash On Delivery (Verified)</span>
                          </div>
                        </div>
                      </div>

                      {/* ITEM DETAILS ("much better design for these items to be known details") */}
                      <div className="admin-order-items-wrapper">
                        <div className="order-items-section-head">
                          <span className="items-section-title">
                            GARMENT LINE ITEMS ({order.items.length} {order.items.length === 1 ? "PIECE" : "PIECES"})
                          </span>
                          <span className="items-section-hint">High-GSM Atelier Silhouettes</span>
                        </div>

                        <div className="admin-order-items-list-rich">
                          {order.items.map((line: any, idx: number) => {
                            const product = catalog.find(
                              (p) => p.code === line.code || (p.variants && p.variants.some((v: any) => v.id === line.variantId))
                            );
                            const itemImage = product?.images?.[0] || line.image || "/movi/product-01.jpg";
                            const itemCategory = product?.category || "Studio Outerwear";
                            const itemTitle = line.name || product?.name || `Garment ${line.code}`;
                            const unitPrice = line.unitPrice ?? (product ? product.priceMinor / 100 : Math.round(order.total / (line.quantity || 1)));
                            const lineTotal = line.lineTotal ?? (unitPrice * (line.quantity || 1));

                            return (
                              <div key={idx} className="admin-order-item-rich">
                                <div
                                  className="order-item-thumb-rich"
                                  onClick={() => product && handleOpenEditModal(product)}
                                  title="Inspect garment in Fullscreen Atelier Studio"
                                >
                                  <img
                                    src={itemImage}
                                    alt={itemTitle}
                                    onError={(e) => { e.currentTarget.src = "/movi/product-01.jpg"; }}
                                  />
                                  <div className="order-item-thumb-hover">
                                    <span>✎ Inspect</span>
                                  </div>
                                </div>

                                <div className="order-item-info-rich">
                                  <div className="item-tags-row">
                                    <span className="order-item-cat-pill">{itemCategory}</span>
                                    <span className="code-pill">SKU: {line.code}</span>
                                  </div>
                                  <h4
                                    className="order-item-title-rich"
                                    onClick={() => product && handleOpenEditModal(product)}
                                  >
                                    {itemTitle}
                                  </h4>
                                  <div className="order-item-specs-bar">
                                    <span className="spec-badge">SIZE: <strong>{line.size}</strong></span>
                                    <span className="spec-badge">QTY: <strong>{line.quantity} UNIT</strong></span>
                                    <span className="spec-price">₹{unitPrice.toLocaleString("en-IN")} / unit</span>
                                  </div>
                                </div>

                                <div className="order-item-subtotal-rich">
                                  <span className="subtotal-label">LINE TOTAL</span>
                                  <span className="subtotal-val">₹{lineTotal.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CARD FOOTER & 1-CLICK ADVANCE ACTIONS */}
                      <div className="admin-order-card-footer-rich">
                        <div className="footer-left-actions">
                          {nextStatus && (
                            <button
                              type="button"
                              className="solid-link stage-advance-btn"
                              onClick={() => updateOrderStatus(order.id, nextStatus.target as any)}
                            >
                              {nextStatus.label}
                            </button>
                          )}
                          {order.status.toLowerCase() === "delivered" && (
                            <span className="order-fulfilled-badge">
                              ✓ Doorstep Handover Completed
                            </span>
                          )}
                          {order.status.toLowerCase() === "cancelled" && (
                            <span className="order-cancelled-badge">
                              ✕ Order Cancelled / Restocked
                            </span>
                          )}
                        </div>

                        <div className="footer-right-controls">
                          <span className="status-label">Manual Status Override:</span>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                            className={`status-select status-select--${order.status.toLowerCase()}`}
                          >
                            <option value="Processing">Processing</option>
                            <option value="Packed">Packed</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 5. CLIENTELE REGISTRY PANE (DYNAMIC USERS & SPEND) */}
        {tab === "customers" && (
          <div className="admin-tab-pane">
            <div className="admin-section-header">
              <div>
                <span className="stat-label">CLIENTELE REGISTRY</span>
                <h2>Registered Studio Customers</h2>
                <p className="admin-subtext">Live clientele database query with order volume, total lifetime spend, and address records.</p>
              </div>
              <button type="button" className="solid-link" onClick={loadData}>
                ↻ Refresh Directory <Arrow />
              </button>
            </div>

            <div className="admin-filter-bar">
              <div className="admin-search-box">
                <input
                  type="text"
                  placeholder="Search clientele by name, email or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-customer-cards">
              {filteredCustomers.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No customers match the current search query.</p>
                </div>
              ) : (
                filteredCustomers.map((cust: CustomerRecord) => {
                  const spend = (cust.lifetimeSpendMinor || 0) / 100;
                  const isVip = spend > 4000 || cust.ordersCount >= 2;

                  return (
                    <article key={cust.id} className="admin-customer-card">
                      <div className="customer-card-head">
                        <span className="customer-avatar">{cust.name.slice(0, 1).toUpperCase()}</span>
                        <div className="customer-name-group">
                          <strong>{cust.name}</strong>
                          <small>{cust.email}</small>
                        </div>
                        <span className={`tier-tag ${isVip ? "tier-tag--vip" : ""}`}>
                          {cust.role === "admin" ? "STUDIO DIRECTOR" : isVip ? "VIP MEMBER" : "CLIENT"}
                        </span>
                      </div>
                      <div className="customer-stats-row">
                        <div className="customer-stat-col">
                          <span className="stat-mini-label">Orders</span>
                          <strong className="stat-mini-val">{cust.ordersCount}</strong>
                        </div>
                        <div className="customer-stat-col">
                          <span className="stat-mini-label">Lifetime Spend</span>
                          <strong className="stat-mini-val">₹ {spend.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="customer-stat-col">
                          <span className="stat-mini-label">Member Since</span>
                          <strong className="stat-mini-val">
                            {new Date(cust.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                          </strong>
                        </div>
                      </div>
                      <div className="customer-card-meta">
                        <span>📞 {cust.phone || "Phone not registered"}</span>
                        <span>📍 {cust.address || "Address pending fulfillment"}</span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* =========================================================================
          FULLSCREEN ATELIER WORKSPACE: ADD NEW GARMENT / EDIT GARMENT
          ========================================================================= */}
      {modalMode && (
        <div className="admin-modal-backdrop admin-modal-backdrop--fullscreen" onClick={() => setModalMode(null)}>
          <div className="admin-modal-window admin-modal-window--fullscreen" onClick={(e) => e.stopPropagation()}>
            
            {/* FULLSCREEN STICKY TOP COMMAND BAR */}
            <header className="admin-fullscreen-header">
              <div className="fullscreen-header-brand">
                <div className="fullscreen-kicker">
                  <span className="atelier-pulse-dot" />
                  <span className="stat-label">
                    {modalMode === "create" ? "01 / ATELIER PRODUCTION ARCHIVE" : "01 / ATELIER PRODUCTION • EDIT SILHOUETTE"}
                  </span>
                  <span className="fullscreen-badge">STUDIO DIRECTOR FULLSCREEN WORKSPACE</span>
                </div>
                <h2>{modalMode === "create" ? "Add Garment to Catalog" : `Edit Silhouette: ${editingProduct?.name}`}</h2>
              </div>
              <div className="fullscreen-header-actions">
                <button
                  type="button"
                  className="fullscreen-exit-btn"
                  onClick={() => setModalMode(null)}
                  title="Exit Fullscreen Studio (ESC)"
                >
                  ✕ Exit Fullscreen Studio
                </button>
              </div>
            </header>

            {/* SCROLLABLE FULLSCREEN WORKSPACE BODY */}
            <div className="admin-fullscreen-body">
              <div className="admin-fullscreen-content">
                {/* TOP ACTION BAR: ADD CATEGORY / COLLECTION BUTTON */}
                <div className="admin-modal-top-bar">
                  <div className="admin-modal-top-bar__info">
                    <span className="top-bar-label">✦ ATELIER TAXONOMY:</span>
                    <span className="top-bar-active">Current: <strong>{formCategory}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="add-category-top-btn"
                    onClick={() => setShowAddCategoryDrawer((prev) => !prev)}
                  >
                    + Add More Category / Collection
                  </button>
                </div>

                {/* INLINE NEW CATEGORY CREATION DRAWER */}
                {showAddCategoryDrawer && (
                  <div className="add-category-banner">
                    <div className="add-category-banner__head">
                      <div className="banner-title-group">
                        <span className="banner-kicker">NEW TAXONOMY RECORD</span>
                        <h4>Register Custom Category or Capsule Collection</h4>
                        <p>Enter any custom garment taxonomy to register it in the atelier database and apply it to this piece.</p>
                      </div>
                      <button
                        type="button"
                        className="banner-close-btn"
                        onClick={() => setShowAddCategoryDrawer(false)}
                        aria-label="Close category drawer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="add-category-input-row">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleCreateCategory();
                          }
                        }}
                        placeholder="Enter category name (e.g. Trench Coats, Oversized Sweaters, Capsule 03)..."
                        disabled={isCreatingCategory}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="solid-link add-cat-submit-btn"
                        onClick={() => void handleCreateCategory()}
                        disabled={isCreatingCategory || !newCategoryInput.trim()}
                      >
                        {isCreatingCategory ? "Registering..." : "+ Save & Select Category"}
                      </button>
                    </div>
                  </div>
                )}

                {/* PRESET CHIPS (FOR QUICK TEST ADDITION) */}
                {modalMode === "create" && (
                  <div className="admin-preset-picker">
                    <div className="preset-header-row">
                      <span className="preset-label">✦ Quick Atelier Presets:</span>
                      <span className="preset-hint">1-tap to auto-populate design specs, fabric notes, and multi-angle editorial images</span>
                    </div>
                    <div className="preset-chips">
                      {PRESET_GARMENTS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="preset-chip"
                          onClick={() => applyPreset(preset)}
                        >
                          + {preset.name.split("—")[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form id="admin-garment-form" className="movi-form admin-modal-form" onSubmit={handleSaveGarment}>
                  <div className="admin-form-grid admin-form-grid--expanded">
                    {/* LEFT COLUMN: GARMENT SPECIFICATIONS & ARCHITECTURE */}
                    <div className="admin-form-col admin-form-col--specs">
                      <div className="admin-section-tag">
                        <span>01. SPECIFICATION & CUT ARCHITECTURE</span>
                      </div>

                      <Field label="Garment Name *">
                        <input
                          value={formName}
                          onChange={(e) => {
                            setFormName(e.target.value);
                            if (modalMode === "create" && !formSlug) {
                              setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                            }
                          }}
                          placeholder="e.g. Movement Heavyweight Boxy Tee"
                          required
                        />
                      </Field>

                      <div className="admin-form-split">
                        <Field label="SKU / Atelier Code *">
                          <input
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                            placeholder="05"
                            required
                          />
                        </Field>

                        <Field label="Category / Collection *">
                          <div className="custom-atelier-dropdown-wrap">
                            <button
                              type="button"
                              className="custom-atelier-dropdown-btn"
                              onClick={() => setShowCategoryDropdown((v) => !v)}
                              aria-haspopup="listbox"
                              aria-expanded={showCategoryDropdown}
                            >
                              <span className="dropdown-btn-val">{formCategory}</span>
                              <span className="dropdown-btn-caret">{showCategoryDropdown ? "▲" : "▼"}</span>
                            </button>

                            {showCategoryDropdown && (
                              <div className="custom-atelier-dropdown-menu" role="listbox">
                                <div className="dropdown-menu-list">
                                  {categoriesList.map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      role="option"
                                      aria-selected={formCategory === cat}
                                      className={`dropdown-menu-item ${formCategory === cat ? "is-selected" : ""}`}
                                      onClick={() => {
                                        setFormCategory(cat);
                                        setShowCategoryDropdown(false);
                                      }}
                                    >
                                      <span className="dropdown-item-name">{cat}</span>
                                      {formCategory === cat && <span className="dropdown-item-check">✓</span>}
                                    </button>
                                  ))}
                                </div>
                                <div className="dropdown-menu-footer">
                                  <button
                                    type="button"
                                    className="dropdown-add-new-btn"
                                    onClick={() => {
                                      setShowCategoryDropdown(false);
                                      setShowAddCategoryDrawer(true);
                                    }}
                                  >
                                    + Add More Category / Collection...
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </Field>
                      </div>

                      <div className="admin-form-split">
                        <Field label="Retail Price (INR) *">
                          <div className="price-input-wrapper">
                            <span className="currency-symbol">₹</span>
                            <input
                              type="number"
                              min="1"
                              value={formPrice}
                              onChange={(e) => setFormPrice(e.target.value)}
                              placeholder="1699"
                              required
                            />
                          </div>
                        </Field>

                        <Field label="URL Slug *">
                          <input
                            value={formSlug}
                            onChange={(e) => setFormSlug(e.target.value)}
                            placeholder="movement-heavyweight-boxy-tee"
                            required
                          />
                        </Field>
                      </div>

                      <Field label="Fabric & Architectural Story *">
                        <textarea
                          rows={4}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Describe weave, GSM, drape, cut, and construction story."
                          required
                        />
                      </Field>

                      {/* INITIAL SIZE RUN MATRIX */}
                      {modalMode === "create" && (
                        <div className="admin-sizes-config">
                          <div className="sizes-config-head">
                            <span className="sizes-config-label">Initial Size Run Stock (Units)</span>
                            <div className="sizes-batch-actions">
                              <button
                                type="button"
                                className="size-batch-btn"
                                onClick={() => setFormSizes({ XS: 15, S: 25, M: 30, L: 30, XL: 20, XXL: 10 })}
                              >
                                Standard Run
                              </button>
                              <button
                                type="button"
                                className="size-batch-btn"
                                onClick={() => {
                                  const updated: Record<string, number> = {};
                                  for (const sz of Object.keys(formSizes)) updated[sz] = (formSizes[sz] || 0) + 10;
                                  setFormSizes(updated);
                                }}
                              >
                                +10 All
                              </button>
                            </div>
                          </div>
                          <div className="sizes-inputs-row">
                            {["XS", "S", "M", "L", "XL", "XXL"].map((sz) => (
                              <div key={sz} className="size-stock-input-group">
                                <label>{sz}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={formSizes[sz] ?? (sz === "M" || sz === "L" ? 30 : 20)}
                                  onChange={(e) => setFormSizes({ ...formSizes, [sz]: Number(e.target.value) || 0 })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {modalMode === "edit" && (
                        <div className="admin-active-toggle-row">
                          <label className="active-checkbox-label">
                            <input
                              type="checkbox"
                              checked={formIsActive}
                              onChange={(e) => setFormIsActive(e.target.checked)}
                            />
                            <span>Active in Customer Storefront (Publish Status)</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: MULTI-IMAGE VISUAL ATELIER STUDIO */}
                    <div className="admin-form-col admin-image-gallery-studio">
                      <div className="admin-section-tag">
                        <span>02. MULTI-ANGLE VISUAL GALLERY ({formImages.length} {formImages.length === 1 ? "PHOTO" : "PHOTOS"})</span>
                      </div>

                      {/* BIG HIGH-RES ACTIVE PREVIEW STAGE */}
                      <div className="admin-gallery-stage">
                        <div className="stage-head-tags">
                          <span className={`stage-tag ${activeImageIndex === 0 ? "stage-tag--primary" : "stage-tag--secondary"}`}>
                            {activeImageIndex === 0 ? "★ PRIMARY COVER PHOTO" : `LOOKBOOK ANGLE 0${activeImageIndex + 1}`}
                          </span>
                          <span className="stage-res-tag">HD ATELIER VIEW</span>
                        </div>

                        <div className="stage-img-container">
                          <img
                            src={formImages[activeImageIndex] || formImages[0] || "/movi/product-01.jpg"}
                            alt="Active garment angle preview"
                            onError={(e) => { e.currentTarget.src = "/movi/product-01.jpg"; }}
                          />
                        </div>

                        <div className="stage-controls-overlay">
                          {activeImageIndex !== 0 && (
                            <button
                              type="button"
                              className="stage-btn stage-btn--primary"
                              onClick={() => handleSetPrimaryImage(activeImageIndex)}
                            >
                              ★ Make Cover Photo
                            </button>
                          )}
                          {formImages.length > 1 && (
                            <button
                              type="button"
                              className="stage-btn stage-btn--danger"
                              onClick={() => handleRemoveImage(activeImageIndex)}
                            >
                              ✕ Remove Angle
                            </button>
                          )}
                        </div>
                      </div>

                      {/* THUMBNAILS CAROUSEL / STRIP */}
                      <div className="admin-thumbnails-section">
                        <div className="thumbnails-head">
                          <span className="thumbnails-label">CURRENT GARMENT LOOKBOOK:</span>
                          <span className="thumbnails-count">{formImages.length} angles attached</span>
                        </div>
                        <div className="admin-thumbnails-grid">
                          {formImages.map((img, idx) => (
                            <div
                              key={idx}
                              className={`thumbnail-card ${activeImageIndex === idx ? "thumbnail-card--active" : ""}`}
                              onClick={() => setActiveImageIndex(idx)}
                            >
                              <img
                                src={img}
                                alt={`Garment thumbnail ${idx + 1}`}
                                onError={(e) => { e.currentTarget.src = "/movi/product-01.jpg"; }}
                              />
                              {idx === 0 && <span className="thumbnail-cover-badge">COVER</span>}
                              <button
                                type="button"
                                className="thumbnail-remove-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(idx);
                                }}
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* DEVICE PHOTO UPLOADER & DROPZONE */}
                      <div className="admin-device-uploader-box">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files) void handleDeviceFileUpload(e.target.files);
                          }}
                        />

                        <div
                          className={`device-dropzone ${isDragOverDropzone ? "device-dropzone--dragover" : ""} ${isUploadingDeviceImage ? "device-dropzone--uploading" : ""}`}
                          onDragOver={(e) => { e.preventDefault(); setIsDragOverDropzone(true); }}
                          onDragLeave={() => setIsDragOverDropzone(false)}
                          onDrop={handleDropFiles}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="dropzone-icon">
                            {isUploadingDeviceImage ? (
                              <span className="dropzone-spinner" />
                            ) : (
                              <span className="dropzone-camera-icon">📸</span>
                            )}
                          </div>
                          <div className="dropzone-copy">
                            <strong className="dropzone-heading">
                              {isUploadingDeviceImage ? "Uploading Photos From Device..." : "+ Upload Photos from Device"}
                            </strong>
                            <p className="dropzone-sub">
                              Click to browse device or drag & drop high-res garment angles (JPG, PNG, WEBP)
                            </p>
                          </div>
                          <button
                            type="button"
                            className="dropzone-browse-btn"
                            disabled={isUploadingDeviceImage}
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            {isUploadingDeviceImage ? "Processing..." : "Browse Files"}
                          </button>
                        </div>
                      </div>

                      {/* OR ADD CUSTOM PHOTO URL */}
                      <div className="add-photo-url-box">
                        <span className="add-photo-label">OR ADD PHOTO VIA URL:</span>
                        <div className="add-photo-input-row">
                          <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddImage();
                              }
                            }}
                            placeholder="Paste image URL (e.g. /movi/product-02.jpg or https://...)"
                          />
                          <button
                            type="button"
                            className="add-photo-btn"
                            onClick={() => handleAddImage()}
                          >
                            + Add URL
                          </button>
                        </div>
                      </div>

                      {/* ATELIER MEDIA ASSET PICKER */}
                      <div className="admin-media-library-picker">
                        <span className="media-picker-label">✦ QUICK-ADD FROM MOVI EDITORIAL ASSETS:</span>
                        <div className="media-picker-chips">
                          {ATELIER_MEDIA_LIBRARY.map((item, idx) => {
                            const isAdded = formImages.includes(item.url);
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`media-picker-pill ${isAdded ? "media-picker-pill--added" : ""}`}
                                onClick={() => {
                                  if (isAdded) {
                                    const foundIdx = formImages.indexOf(item.url);
                                    if (foundIdx >= 0) setActiveImageIndex(foundIdx);
                                  } else {
                                    handleAddImage(item.url);
                                  }
                                }}
                              >
                                <img src={item.url} alt={item.label} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                <span>{item.label}</span>
                                {isAdded ? <span className="added-check">✓</span> : <span className="add-plus">+</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <div className="admin-form-alert" role="alert">
                      <span className="alert-icon">⚠</span>
                      <span>{formError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* FULLSCREEN COMMAND FOOTER */}
            <footer className="admin-fullscreen-footer">
              <div className="fullscreen-footer-meta">
                <span className="footer-meta-pill">
                  Silhouette: <strong>{formName.trim() || "Untitled"}</strong>
                </span>
                <span className="footer-meta-pill">
                  SKU: <strong>{formCode || "--"}</strong>
                </span>
                <span className="footer-meta-pill">
                  Category: <strong>{formCategory}</strong>
                </span>
                <span className="footer-meta-pill">
                  Gallery: <strong>{formImages.length} {formImages.length === 1 ? "Photo" : "Photos"}</strong>
                </span>
              </div>

              <div className="fullscreen-footer-actions">
                <button
                  type="button"
                  className="outline-link footer-cancel-btn"
                  onClick={() => setModalMode(null)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="admin-garment-form"
                  className="solid-link admin-publish-btn"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? "Synchronizing Atelier Catalog..."
                    : modalMode === "create"
                    ? `Publish ${formName.trim() || "Garment"} (${formImages.length} Photos) to Storefront →`
                    : "Save All Garment Changes →"}
                </button>
              </div>
            </footer>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM ARCHIVE / DELETE
          ========================================================================= */}
      {deleteConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal-window admin-modal-window--small" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <span className="stat-label">CONFIRM ARCHIVE</span>
                <h2>Archive Garment</h2>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <p className="screen-body">
              Are you sure you want to remove <strong>{deleteConfirm.name}</strong> (SKU: {deleteConfirm.code}) from the active customer storefront?
            </p>
            <p className="micro" style={{ color: "var(--muted)" }}>
              If orders exist for this garment, it will be safely archived without breaking order histories.
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="outline-link" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button type="button" className="solid-link admin-danger-btn" onClick={handleConfirmDelete}>
                Confirm Archive / Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* STUDIO QA & TESTING DECK */}
      <StudioQaBar />
    </section>
  );
}

export function CartPage() {
  const { cart, updateQuantity, removeFromCart, user, products: storeProducts } = useStore();
  const list = storeProducts?.length ? storeProducts : products;
  const navigate = useNavigate();

  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; percent: number } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccess, setVoucherSuccess] = useState<string | null>(null);

  const cartDetails = cart.map((line) => {
    const item = list.find((p) => p.code === line.code);
    const unitPrice = item ? (item.priceNumber ?? (parseInt(item.price.replace(/[^0-9]/g, ""), 10) || 1599)) : 1599;
    return {
      ...line,
      name: item?.name || `Garment ${line.code}`,
      category: item?.category || "Apparel",
      image: item?.image || "/movi/product-01.jpg",
      unitPrice,
      totalPrice: unitPrice * line.quantity,
    };
  });

  const subtotal = cartDetails.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const discountAmount = appliedVoucher ? Math.round((subtotal * appliedVoucher.percent) / 100) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyVoucher = (e: FormEvent) => {
    e.preventDefault();
    setVoucherError(null);
    setVoucherSuccess(null);
    const code = voucherInput.trim().toUpperCase();
    if (!code) return;

    if (code === "MOVI10") {
      setAppliedVoucher({ code: "MOVI10", percent: 10 });
      setVoucherInput("");
      setVoucherSuccess("Voucher MOVI10 applied: 10% privilege discount!");
    } else if (code === "ATELIER15" || code === "VIP15") {
      setAppliedVoucher({ code: "ATELIER15", percent: 15 });
      setVoucherInput("");
      setVoucherSuccess("Voucher ATELIER15 applied: 15% VIP discount!");
    } else {
      setVoucherError("Invalid voucher code. Try MOVI10 or ATELIER15");
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
  };

  if (cart.length === 0) {
    return (
      <section className="screen bag-screen">
        <div className="bag-empty-state">
          <div className="bag-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <p className="micro">MOVI / ATELIER BAG</p>
          <h1>Your shopping bag is empty.</h1>
          <p className="screen-body">
            You haven't reserved any runway editions or core streetwear pieces yet. Explore the current drop and curate your wardrobe.
          </p>
          <div className="bag-empty-shortcuts">
            <Link to="/hoodies" className="outline-link outline-link--sm">Hoodies</Link>
            <Link to="/t-shirts" className="outline-link outline-link--sm">T-Shirts</Link>
            <Link to="/shop" className="outline-link outline-link--sm">All Editions</Link>
            <Link to="/lookbook" className="outline-link outline-link--sm">Lookbook</Link>
          </div>
          <Link to="/shop" className="solid-link">
            Explore Collection <Arrow />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="screen bag-screen">
      {/* BAG HEADER */}
      <div className="bag-header">
        <div className="bag-header__title-group">
          <p className="micro">MOVI / ATELIER BAG</p>
          <h1>Shopping Bag <span className="bag-header__count">({totalItemCount} {totalItemCount === 1 ? "item" : "items"})</span></h1>
        </div>
        <div className="bag-header__perk-badge">
          <span className="perk-bullet">●</span>
          <span>Complimentary Express Shipping & Luxury Atelier Packaging Included</span>
        </div>
      </div>

      {/* MAIN 2-COLUMN LAYOUT */}
      <div className="bag-layout">
        {/* LEFT COLUMN: ITEM DOSSIERS */}
        <div className="bag-items-pane">
          <div className="bag-table-heading">
            <span>Garment Reserved</span>
            <span>Quantity & Price</span>
          </div>

          <div className="bag-items-list">
            {cartDetails.map((item) => (
              <article key={`${item.code}-${item.size}`} className="bag-item-card">
                <Link to={`/product/${item.code}`} className="bag-item-thumb-link" aria-label={`View ${item.name}`}>
                  <img src={item.image} alt={item.name} className="bag-item-img" loading="lazy" />
                  <span className="bag-item-thumb-tag">MOVI</span>
                </Link>

                <div className="bag-item-details">
                  <div className="bag-item-info">
                    <p className="micro bag-item-code">MOVI / {item.code} &bull; {item.category}</p>
                    <h3 className="bag-item-title">
                      <Link to={`/product/${item.code}`}>{item.name}</Link>
                    </h3>
                    <div className="bag-item-badges">
                      <span className="bag-size-badge">SIZE: {item.size}</span>
                      <span className="bag-stock-indicator">
                        <span className="status-dot"></span> In Stock (Atelier Dispatch)
                      </span>
                    </div>
                  </div>

                  <div className="bag-item-pricing-mobile">
                    <strong>₹ {item.totalPrice.toLocaleString("en-IN")}</strong>
                    <small>₹ {item.unitPrice.toLocaleString("en-IN")} each</small>
                  </div>
                </div>

                <div className="bag-item-actions">
                  <div className="bag-item-price-block">
                    <strong className="bag-line-total">₹ {item.totalPrice.toLocaleString("en-IN")}</strong>
                    <span className="bag-unit-price">₹ {item.unitPrice.toLocaleString("en-IN")} each</span>
                  </div>

                  <div className="bag-item-controls">
                    <div className="qty-picker">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.code, item.quantity - 1, item.size)}
                        aria-label="Decrease quantity"
                        title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                      >
                        −
                      </button>
                      <span className="qty-picker__count">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.code, item.quantity + 1, item.size)}
                        aria-label="Increase quantity"
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="bag-remove-btn"
                      onClick={() => removeFromCart(item.code, item.size)}
                      title="Remove from shopping bag"
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="bag-items-footer">
            <Link to="/shop" className="bag-continue-link">
              ← Continue browsing collections
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY ORDER SUMMARY */}
        <aside className="bag-summary-pane">
          <div className="bag-summary-card">
            <h3 className="bag-summary-title">Order Summary</h3>

            {/* FINANCIAL ROWS */}
            <div className="bag-summary-breakdown">
              <div className="summary-row">
                <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? "item" : "items"})</span>
                <span>₹ {subtotal.toLocaleString("en-IN")}</span>
              </div>

              {appliedVoucher && (
                <div className="summary-row summary-row--discount">
                  <div className="discount-label">
                    <span>Privilege Voucher ({appliedVoucher.code})</span>
                    <button type="button" onClick={handleRemoveVoucher} className="voucher-remove-pill" title="Remove voucher">×</button>
                  </div>
                  <span>− ₹ {discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="summary-row">
                <span>Express Courier Dispatch</span>
                <span className="shipping-free-tag">FREE EXPRESS</span>
              </div>

              <div className="summary-row">
                <span>Atelier Luxury Packaging</span>
                <span className="packaging-tag">COMPLIMENTARY</span>
              </div>

              <div className="summary-row summary-row--tax-note">
                <small>Goods and Services Tax (GST) included in all prices.</small>
              </div>
            </div>

            {/* VOUCHER PROMO BOX */}
            <div className="bag-voucher-box">
              <form onSubmit={handleApplyVoucher} className="voucher-form">
                <input
                  type="text"
                  placeholder="Enter promo code (e.g. MOVI10)"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  className="voucher-input"
                  aria-label="Voucher promo code"
                />
                <button type="submit" className="voucher-apply-btn">Apply</button>
              </form>
              {voucherError && <p className="voucher-error-msg">{voucherError}</p>}
              {voucherSuccess && <p className="voucher-success-msg">✓ {voucherSuccess}</p>}
              {!appliedVoucher && !voucherError && !voucherSuccess && (
                <p className="voucher-hint">First order privilege: use code <strong>MOVI10</strong> for 10% off</p>
              )}
            </div>

            {/* TOTAL PAYABLE */}
            <div className="summary-total-block">
              <div className="summary-total-header">
                <span>Estimated Total</span>
                <strong className="summary-total-figure">₹ {finalTotal.toLocaleString("en-IN")}</strong>
              </div>
              <p className="summary-total-subnote">Includes all duties, taxes, and domestic handling</p>
            </div>

            {/* CHECKOUT CTAS */}
            <div className="bag-checkout-actions">
              <button
                type="button"
                className="solid-link w-full bag-checkout-btn"
                onClick={() => navigate(user ? "/checkout" : "/login")}
              >
                Proceed to Checkout <Arrow />
              </button>
              <Link to="/shop" className="outline-link outline-link--sm w-full text-center">
                Continue Shopping
              </Link>
            </div>

            {/* ATELIER ASSURANCE PERKS */}
            <div className="bag-perks-list">
              <div className="bag-perk-item">
                <span className="perk-icon">⚡</span>
                <div>
                  <strong>Express Atelier Dispatch</strong>
                  <p>Dispatched in 24–48 hours with insured tracking</p>
                </div>
              </div>
              <div className="bag-perk-item">
                <span className="perk-icon">🔄</span>
                <div>
                  <strong>14-Day Complimentary Exchange</strong>
                  <p>Seamless door-to-door size and fit exchanges</p>
                </div>
              </div>
              <div className="bag-perk-item">
                <span className="perk-icon">🛡️</span>
                <div>
                  <strong>Authentic Streetwear Craft</strong>
                  <p>Custom-milled high GSM fabrics & numbered editions</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function CheckoutPage() {
  const { cart, user, placeOrder, products: storeProducts } = useStore();
  const list = storeProducts?.length ? storeProducts : products;
  const navigate = useNavigate();
  const [method] = useState("cod");
  const [placed, setPlaced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cartDetails = cart.map((line) => {
    const item = list.find((p) => p.code === line.code);
    const unitPrice = item ? (item.priceNumber ?? (parseInt(item.price.replace(/[^0-9]/g, ""), 10) || 1599)) : 1599;
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

  const handleCheckout = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData(e.currentTarget);
    const address = String(data.get("address") || user?.address || "Bandra West, Mumbai, MH — 400050");
    try {
      await placeOrder(total, address, "cod");
      setPlaced(true);
      setTimeout(() => {
        navigate("/account");
      }, 1500);
    } catch {
      // Error message is surfaced via useStore error banner
    } finally {
      setSubmitting(false);
    }
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
            <div className="payment-options"><label className="payment-option is-selected"><input type="radio" name="payment" checked readOnly /><span>Cash on Delivery (Express)</span></label><small>Online payments will be enabled after the payment gateway is connected.</small></div>

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
