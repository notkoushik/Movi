import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useStore } from "./app/store";

const images = {
  logo: "/movi/logo.jpg",
  hero: "/movi/main_hero.png",
  portrait: "/movi/Second_one.png",
  city: "/movi/bridge.png",
  tee: "/movi/product-01.jpg",
  hoodie: "/movi/product-02.jpg",
  flatlay: "/movi/product-03.jpg",
  night: "/movi/product-04.jpg",
  collectionTee: "/movi/collection-tshirts.jpg",
  collectionHoodie: "/movi/collection-hoodies.jpg",
  collectionCargo: "/movi/collection-cargo.jpg",
};

export const products = [
  { code: "01", name: "Essential Oversized Tee", price: "₹ 1,299", image: images.tee, category: "T-Shirts" },
  { code: "02", name: "Signature Hoodie", price: "₹ 1,999", image: images.hoodie, category: "Hoodies" },
  { code: "03", name: "Vintage Graphic Tee", price: "₹ 1,499", image: images.flatlay, category: "T-Shirts" },
  { code: "04", name: "Tech Cargo Pant", price: "₹ 1,899", image: images.night, category: "Bottoms" },
];

type Product = (typeof products)[number];

export function Mark() {
  return (
    <div className="mark" aria-label="MOVI clothing">
      <img src={images.logo} alt="MOVI Logo" className="mark__logo" width="46" height="46" />
      <div className="mark__details">
        <span className="mark__name">MOVI</span>
        <span className="mark__sub">CLOTHING CO.</span>
      </div>
    </div>
  );
}

function Arrow() {
  return <span className="arrow" aria-hidden="true">→</span>;
}

export function Header({ interior = false }: { interior?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart, user, signOut } = useStore();
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <header className={`site-header ${interior ? "site-header--interior" : ""}`}>
      <Link to="/" aria-label="MOVI home"><Mark /></Link>
      
      <div className="mobile-header-tools">
        {user ? (
          <div className="mobile-user-quick-bar">
            <Link
              to={user.role === "admin" ? "/admin" : "/account"}
              className={`mobile-user-pill ${user.role === "admin" ? "mobile-user-pill--admin" : "mobile-user-pill--customer"}`}
              title={`Logged in as ${user.name}`}
            >
              <span className={user.role === "admin" ? "role-dot role-dot--admin" : "role-dot role-dot--customer"} />
              <span className="mobile-user-name">{user.name.split(" ")[0]}</span>
            </Link>
            <button
              type="button"
              className="mobile-quick-signout-btn"
              onClick={() => signOut()}
              title="Sign Out"
              aria-label="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/login" className="mobile-signin-btn">
            Sign In
          </Link>
        )}

        <Link to="/bag" className="mobile-bag-btn" aria-label={`Shopping bag, ${itemCount} items`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
          {itemCount > 0 && <span className="mobile-bag-badge">{itemCount}</span>}
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
        </button>
      </div>

      <nav className={menuOpen ? "main-nav main-nav--open" : "main-nav"} aria-label="Main navigation">
        {/* MOBILE DRAWER USER STATUS BANNER */}
        {user ? (
          <div className="mobile-drawer-auth-card">
            <div className="mobile-drawer-auth-card__top">
              <span className={`role-chip ${user.role === "admin" ? "role-chip--admin" : "role-chip--customer"}`}>
                {user.role === "admin" ? "STUDIO ADMIN" : "CUSTOMER"}
              </span>
              <span className="mobile-drawer-email">{user.email}</span>
            </div>
            <strong className="mobile-drawer-name">{user.name}</strong>
            <div className="mobile-drawer-auth-actions">
              <Link
                to={user.role === "admin" ? "/admin" : "/account"}
                onClick={() => setMenuOpen(false)}
                className="outline-link outline-link--sm"
              >
                {user.role === "admin" ? "Admin Portal →" : "My Account →"}
              </Link>
              <button
                type="button"
                className="mobile-drawer-signout-btn"
                onClick={() => { signOut(); setMenuOpen(false); }}
              >
                Sign Out ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="mobile-drawer-auth-card mobile-drawer-auth-card--guest">
            <p className="micro">ACCOUNT ACCESS</p>
            <div className="mobile-drawer-auth-actions">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="solid-link solid-link--sm">
                Sign In / Register <Arrow />
              </Link>
            </div>
          </div>
        )}

        <div className="mobile-nav-links">
          <Link to="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link to="/t-shirts" onClick={() => setMenuOpen(false)}>T-Shirts</Link>
          <Link to="/hoodies" onClick={() => setMenuOpen(false)}>Hoodies</Link>
          <Link to="/story" onClick={() => setMenuOpen(false)}>About</Link>
          {user?.role === "admin" && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="mobile-admin-link">
              Admin Dashboard ⚙
            </Link>
          )}
        </div>

        <div className="mobile-nav-extras">
          <Link to="/search" onClick={() => setMenuOpen(false)}>Search</Link>
          <Link to="/bag" onClick={() => setMenuOpen(false)}>Bag ({itemCount})</Link>
          {user ? (
            <button
              type="button"
              className="mobile-signout-footer-btn"
              onClick={() => { signOut(); setMenuOpen(false); }}
            >
              Sign Out
            </button>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
          )}
        </div>
      </nav>
      <div className="header-tools">
        {user ? (
          <div className="header-user-status">
            <Link
              to={user.role === "admin" ? "/admin" : "/account"}
              className={`header-user-badge ${user.role === "admin" ? "header-user-badge--admin" : "header-user-badge--customer"}`}
              title={`Logged in as ${user.name} (${user.role.toUpperCase()})`}
            >
              <span className={user.role === "admin" ? "role-dot role-dot--admin" : "role-dot role-dot--customer"} />
              <span className="role-label">{user.role === "admin" ? "ADMIN" : "CUSTOMER"}</span>
              <span className="user-short-name">{user.name.split(" ")[0]}</span>
            </Link>
            <button
              type="button"
              className="header-signout-btn"
              onClick={() => signOut()}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link to="/login" className="header-signin-btn">
            Sign In
          </Link>
        )}

        <Link to="/search" aria-label="Search" className="tool-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <span>Search</span>
        </Link>
        <Link to="/bag" aria-label={`Shopping bag, ${itemCount} items`} className="tool-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
          <span>Bag ({itemCount})</span>
        </Link>
      </div>
    </header>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product">
      <Link className="product__image" to={`/product/${product.code}`} aria-label={`View ${product.name}`}>
        <img src={product.image} alt={product.name} width="293" height="149" loading="lazy" />
        <span>Quick view</span>
      </Link>
      <p className="micro">MOVI / {product.code}</p>
      <h3>{product.name}</h3>
      <p className="product__price">{product.price}</p>
    </article>
  );
}

export function Footer() {
  const [joined, setJoined] = useState(false);
  const [email, setEmail] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (email.trim()) {
      setJoined(true);
    }
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__main">
          {/* Brand & Manifesto */}
          <div className="footer-col footer-col--brand">
            <Link to="/" aria-label="MOVI home" className="footer-brand-logo">
              <Mark />
            </Link>
            <p className="footer-tagline">Move Your Way.</p>
            <p className="footer-bio">
              Independent Indian streetwear label shaped by nocturnal motion, concrete architecture, and uncompromising individuality. Built in Mumbai, worn worldwide.
            </p>
            <div className="footer-badges">
              <span>Studio: Mumbai, MH — India</span>
              <span>Express Worldwide Shipping</span>
            </div>
            <div className="footer-socials">
              <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
              <a href="https://x.com" target="_blank" rel="noreferrer">Twitter / X</a>
            </div>
          </div>

          {/* Navigation Links: Collections */}
          <div className="footer-col">
            <h4 className="footer-heading">Collections</h4>
            <ul className="footer-nav-list">
              <li><Link to="/t-shirts">DROP 01 — T-Shirts</Link></li>
              <li><Link to="/hoodies">DROP 02 — Hoodies</Link></li>
              <li><Link to="/shop">DROP 03 — Cargo & Tech</Link></li>
              <li><Link to="/shop">All Products</Link></li>
              <li><Link to="/lookbook">Lookbook 2026</Link></li>
            </ul>
          </div>

          {/* Navigation Links: Services */}
          <div className="footer-col">
            <h4 className="footer-heading">Client Services</h4>
            <ul className="footer-nav-list">
              <li><Link to="/shipping">Shipping & Orders</Link></li>
              <li><Link to="/returns">Returns & Exchanges</Link></li>
              <li><Link to="/faq">Fit & Size Guide</Link></li>
              <li><Link to="/story">The Movement Story</Link></li>
              <li><Link to="/contact">Studio Contact</Link></li>
            </ul>
          </div>

          {/* Newsletter Box */}
          <div className="footer-col footer-col--newsletter">
            <h4 className="footer-heading">Join The Movement</h4>
            <p className="footer-newsletter-text">
              Subscribe to unlock private drop invitations, secret lookbook releases, and archival pieces.
            </p>
            <form className="footer-newsletter-form" onSubmit={submit}>
              {joined ? (
                <div className="footer-newsletter-success">
                  <span className="success-icon">✓</span>
                  <span>You are on the private access list. Welcome.</span>
                </div>
              ) : (
                <div className="footer-newsletter-input-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER YOUR EMAIL"
                    aria-label="Email address"
                    required
                  />
                  <button type="submit" aria-label="Subscribe to newsletter">
                    <span>Subscribe</span>
                    <Arrow />
                  </button>
                </div>
              )}
              <span className="footer-newsletter-note">Zero marketing spam. Pure signal. Unsubscribe anytime.</span>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="site-footer__bottom">
          <p className="footer-copyright">
            © 2026 MOVI CLOTHING CO. ALL RIGHTS RESERVED.
          </p>
          <div className="footer-legal">
            <Link to="/story">Privacy Policy</Link>
            <span className="separator">•</span>
            <Link to="/story">Terms of Service</Link>
            <span className="separator">•</span>
            <Link to="/faq">Accessibility</Link>
          </div>
          <div className="footer-region">
            <span>INDIA (INR ₹)</span>
            <span className="separator">•</span>
            <span>GLOBAL (USD $)</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CatalogScreen({ title, category }: { title: string; category?: string }) {
  const visible = category ? products.filter((product) => product.category === category) : products;
  return (
    <section className="screen catalog-screen">
      <div className="screen-title">
        <p className="eyebrow"><i /> MOVI / COLLECTION 02</p>
        <h1>{title}</h1>
        <p>Objects for movement. Designed in India, made for everywhere.</p>
      </div>
      <div className="screen-filters"><span>{visible.length.toString().padStart(2, "0")} Pieces</span><span>Fall — Winter 2026</span></div>
      <div className="screen-product-grid">{visible.map((product) => <ProductCard product={product} key={product.code} />)}</div>
    </section>
  );
}

export function ProductScreen({ code }: { code: string }) {
  const product = products.find((item) => item.code === code) ?? products[0];
  const [size, setSize] = useState("M");
  const { addToCart } = useStore();
  const navigate = useNavigate();
  return (
    <section className="screen product-screen">
      <div className="product-screen__visual"><img src={product.image} alt={product.name} width="293" height="149" /></div>
      <div className="product-screen__copy">
        <p className="micro">MOVI / {product.code} — {product.category}</p>
        <h1>{product.name}</h1>
        <p className="product-screen__price">{product.price}</p>
        <p className="screen-body">A relaxed MOVI silhouette cut for everyday movement. Finished in washed charcoal with understated campaign detailing.</p>
        <div className="size-row" aria-label="Select size">{["S", "M", "L", "XL"].map((item) => <button className={size === item ? "is-selected" : ""} type="button" onClick={() => setSize(item)} key={item}>{item}</button>)}</div>
        <button className="solid-link" type="button" onClick={() => { addToCart(product.code, size); navigate("/bag"); }}>Add to bag <Arrow /></button>
        <div className="product-notes"><span>Heavyweight fabric</span><span>Relaxed unisex fit</span><span>Made in India</span></div>
      </div>
    </section>
  );
}

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <section className="screen search-screen">
      <p className="micro">MOVI / SEARCH</p>
      <h1>Find your movement.</h1>
      <label className="search-field">
        <span className="sr-only">Search products</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="TYPE TO SEARCH" />
        <Arrow />
      </label>
      {query && <div className="search-results">{matches.length ? matches.map((product) => <ProductCard product={product} key={product.code} />) : <p>No pieces found.</p>}</div>}
    </section>
  );
}

const serviceContent: Record<string, { index: string; title: string; intro: string; body: string[] }> = {
  story: { index: "01", title: "The movement", intro: "Born from movement. Built for individuality.", body: ["MOVI is an independent Indian streetwear label shaped by motion, concrete and the people who refuse to stand still.", "Our visual language is rooted here and designed to travel everywhere."] },
  lookbook: { index: "02", title: "Lookbook 2026", intro: "Night movement. Mumbai, India.", body: ["Fall — Winter 2026 explores weight, shadow and oversized silhouettes against the architecture of the city.", "Every frame is a record of movement after dark."] },
  contact: { index: "03", title: "Contact", intro: "Talk to the movement.", body: ["Studio: Mumbai, India", "Email: hello@movi.in", "Monday — Friday / 10:00 — 18:00 IST"] },
  shipping: { index: "04", title: "Shipping", intro: "From our studio to your street.", body: ["India orders ship in 2–5 working days. International delivery typically takes 7–14 working days.", "Tracking is shared by email as soon as your order moves."] },
  returns: { index: "05", title: "Returns", intro: "Make sure it moves with you.", body: ["Unworn pieces may be returned within 14 days of delivery with original tags and packaging.", "Final-sale and customised pieces cannot be returned."] },
  faq: { index: "06", title: "FAQ", intro: "Details, fit and care.", body: ["MOVI uses relaxed unisex sizing. Check the product page before selecting your fit.", "Wash cold, inside out. Air dry. Do not iron directly over artwork."] },
  instagram: { index: "07", title: "Instagram", intro: "@movi.clothing", body: ["Campaign frames, new drops and movement from the community.", "Follow the story as it happens."] },
  youtube: { index: "08", title: "YouTube", intro: "MOVI / FILMS", body: ["Campaign films, studio process and stories from the movement.", "New films arrive with every collection."] },
};

export function EditorialScreen({ route }: { route: string }) {
  const content = serviceContent[route] ?? serviceContent.story;
  const image = route === "lookbook" ? images.hero : route === "story" ? images.portrait : images.city;
  return (
    <section className="screen editorial-screen">
      <div className="editorial-screen__copy">
        <p className="micro">MOVI / {content.index}</p>
        <h1>{content.title}</h1>
        <p className="editorial-lead">{content.intro}</p>
        <span className="gold-dash" />
        {content.body.map((paragraph) => <p className="screen-body" key={paragraph}>{paragraph}</p>)}
        <Link className="outline-link" to="/shop">Shop collection <Arrow /></Link>
      </div>
      <div className="editorial-screen__image"><img src={image} alt="" /></div>
    </section>
  );
}

export function Home() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Header />
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero__image" src={images.hero} alt="MOVI campaign model in black streetwear at night" width="1312" height="414" fetchPriority="high" />
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow"><i /> MOVI / FALL — WINTER 2026</p>
          <h1 id="hero-title">Move<br />Your Way.</h1>
          <Link className="outline-link" to="/shop">Shop collection <Arrow /></Link>
          <div className="hero__progress"><span>01 / 04</span><i><b /></i></div>
        </div>
        <p className="hero__manifesto">Clothing<br />for those<br />who move<br />differently.</p>
        <span className="hero__index">M</span>
        <p className="hero__credit">Campaign 01<br />Mumbai / India</p>
      </section>

      <section className="movement reveal">
        <div className="movement__copy">
          <p className="micro">MOVI / 01 <i /></p>
          <h2><span>The</span><em>Movement</em></h2>
          <p className="serif-copy">Born from movement.<br />Built for individuality.</p>
          <span className="gold-dash" />
          <p className="small-copy">More than clothing.<br />A mindset for those<br />who move differently.</p>
        </div>
        <figure className="movement__main"><img src={images.portrait} alt="Model wearing a black hoodie in the city" width="696" height="283" loading="lazy" /></figure>
        <aside className="movement__aside">
          <div className="movement__aside-meta">
            <p>Indian roots.<br />Global movement.</p>
            <span className="gold-dash" />
          </div>
          <div className="movement__aside-frame">
            <img src={images.city} alt="Mumbai city flyover and architectural overpass at night" width="480" height="340" loading="lazy" />
            <div className="movement__aside-tag">Mumbai / Urban Night</div>
          </div>
        </aside>
      </section>

      <section className="arrivals reveal">
        <div className="section-heading"><h2>New Arrivals</h2><Link to="/shop">View all <Arrow /></Link></div>
        <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.code} />)}</div>
      </section>

      <section className="collections reveal">
        <div className="collection-intro">
          <p className="red-index">COLLECTION / 02</p>
          <h2>The Movement Series</h2>
          <span className="rule" />
          <p className="small-copy">Every piece cut for motion.<br />Heavyweight silhouettes.<br />Limited studio drops.</p>
          <Link className="outline-link" to="/shop">Explore collection <Arrow /></Link>
        </div>
        <Link className="category category--tee" to="/t-shirts">
          <img src={images.collectionTee} alt="Oversized Streetwear T-Shirts Collection" width="480" height="600" loading="lazy" />
          <div className="category__content">
            <div className="category__badge">
              <span className="category__tag">DROP 01</span>
              <span className="category__status">AVAILABLE</span>
            </div>
            <strong>T-Shirts</strong>
            <small>Heavyweight 280 GSM washed cotton.<br />Relaxed oversized cut.</small>
            <span className="category__action">Shop T-Shirts <Arrow /></span>
          </div>
        </Link>
        <Link className="category category--hoodie" to="/hoodies">
          <img src={images.collectionHoodie} alt="Signature Streetwear Hoodies Collection" width="480" height="600" loading="lazy" />
          <div className="category__content">
            <div className="category__badge">
              <span className="category__tag">DROP 02</span>
              <span className="category__status">AVAILABLE</span>
            </div>
            <strong>Hoodies</strong>
            <small>450 GSM structured fleece.<br />Double-layered hood drape.</small>
            <span className="category__action">Shop Hoodies <Arrow /></span>
          </div>
        </Link>
        <Link className="category category--cargo" to="/shop">
          <img src={images.collectionCargo} alt="Tech Utility Cargo Pants Collection" width="480" height="600" loading="lazy" />
          <div className="category__content">
            <div className="category__badge">
              <span className="category__tag">DROP 03</span>
              <span className="category__status">AVAILABLE</span>
            </div>
            <strong>Cargo & Tech</strong>
            <small>Multi-pocket utility weave.<br />Built for everywhere.</small>
            <span className="category__action">Shop Cargo <Arrow /></span>
          </div>
        </Link>
      </section>
      <Footer />
    </main>
  );
}

export default Home;
