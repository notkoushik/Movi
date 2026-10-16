import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useStore } from "./store";
import { DEFAULT_GARMENTS, type Garment3DConfig } from "./walking-tee-garments";
import type { TeeScene } from "./walking-tee-scene";

const ATELIER_COLORWAYS = [
  { name: "Onyx Black", hex: "#0f0f10", border: "#2a2a2c" },
  { name: "Charcoal Washed", hex: "#222222", border: "#3d3d3d" },
  { name: "Raw Bone", hex: "#ded8cc", border: "#c2bcaf" },
  { name: "Vintage Olive", hex: "#242825", border: "#3d423e" },
  { name: "Oxblood Wine", hex: "#382022", border: "#523336" },
];

/**
 * Enhanced 360° Walking 3D Model with Dynamic Clothing.
 * Renders Three.js procedural cloth simulation with real-time dressing,
 * colorway dye switcher, interactive 360° mouse/touch rotation, and dynamic
 * catalog synchronization.
 */
export default function WalkingTee() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TeeScene | null>(null);
  const [ready, setReady] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  const { products: storeProducts, addToCart } = useStore();

  // Combine curated high-fashion presets with dynamic garments from store
  const allGarments = useMemo<Garment3DConfig[]>(() => {
    const list = [...DEFAULT_GARMENTS];
    if (storeProducts && storeProducts.length > 0) {
      for (const sp of storeProducts) {
        if (!list.some((g) => g.code === sp.code)) {
          const isHoodie = sp.category?.toLowerCase().includes("hoodie");
          const isOuter = sp.category?.toLowerCase().includes("outer") || sp.category?.toLowerCase().includes("bottom");
          list.push({
            id: sp.id || sp.code,
            code: sp.code,
            name: sp.name,
            category: sp.category,
            price: sp.price,
            fabricColor: isHoodie ? "#111112" : isOuter ? "#242825" : "#222222",
            insideColor: isHoodie ? "#0a0a0a" : "#141414",
            headline: sp.name.slice(0, 20).toUpperCase(),
            subline: sp.category.toUpperCase(),
            tagline: sp.description ? sp.description.slice(0, 32).toUpperCase() : "MOVI ATELIER",
            graphicStyle: isHoodie ? "hoodie" : isOuter ? "technical" : "crest",
            customImage: sp.image,
            roughness: isHoodie ? 0.94 : 0.88,
            sheen: isHoodie ? 0.65 : 1.0,
            sheenColor: 0x8b8680,
          });
        }
      }
    }
    return list;
  }, [storeProducts]);

  const [activeGarment, setActiveGarment] = useState<Garment3DConfig>(allGarments[0]);
  const [selectedColor, setSelectedColor] = useState<string>(activeGarment.fabricColor);
  const [isDressing, setIsDressing] = useState(false);

  // Dynamic atmospheric lighting matching selected dye
  const glowStyle = useMemo(() => {
    if (selectedColor === "#ded8cc") {
      return {
        background:
          "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(222, 216, 204, .45), rgba(184, 145, 92, .24) 48%, transparent 74%), radial-gradient(ellipse 95% 75% at 50% 62%, rgba(140, 120, 100, .3), transparent 72%)",
      };
    }
    if (selectedColor === "#242825") {
      return {
        background:
          "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(65, 88, 70, .48), rgba(35, 52, 40, .26) 48%, transparent 74%), radial-gradient(ellipse 95% 75% at 50% 62%, rgba(25, 40, 30, .45), transparent 72%)",
      };
    }
    if (selectedColor === "#382022") {
      return {
        background:
          "radial-gradient(ellipse 60% 50% at 50% 55%, rgba(135, 45, 55, .5), rgba(75, 25, 32, .28) 48%, transparent 74%), radial-gradient(ellipse 95% 75% at 50% 62%, rgba(60, 18, 24, .48), transparent 72%)",
      };
    }
    return {
      background:
        "radial-gradient(ellipse 56% 44% at 50% 57%, rgba(201, 150, 92, .4), rgba(161, 73, 56, .16) 48%, transparent 76%), radial-gradient(ellipse 95% 75% at 50% 62%, rgba(87, 38, 32, .38), transparent 72%)",
    };
  }, [selectedColor]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let scene: TeeScene | undefined;
    let disposed = false;
    let onScreen = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const sync = () => {
      if (!scene) return;
      if (onScreen && !document.hidden) scene.start();
      else scene.stop();
    };

    const load = () =>
      import("./walking-tee-scene")
        .then(({ createTeeScene }) => createTeeScene(stage, { reduceMotion }))
        .then((created) => {
          if (disposed) return created.dispose();
          scene = created;
          sceneRef.current = created;
          setReady(true);
          sync();
        })
        .catch(() => undefined);

    const loadWhenIdle = () => {
      const idle = () =>
        typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(load, { timeout: 500 }) : setTimeout(load, 200);
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });
    };

    const preload = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        preload.disconnect();
        loadWhenIdle();
      },
      { rootMargin: "600px 0px" },
    );
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    preload.observe(stage);
    visibility.observe(stage);
    document.addEventListener("visibilitychange", sync);

    return () => {
      disposed = true;
      preload.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Handle switching dynamic garment
  const handleDressGarment = async (garment: Garment3DConfig) => {
    setActiveGarment(garment);
    setSelectedColor(garment.fabricColor);
    setIsDressing(true);
    setTimeout(() => setIsDressing(false), 500);
    if (sceneRef.current) {
      await sceneRef.current.setGarment(garment);
    }
  };

  // Handle custom color dye
  const handleDyeColor = (hex: string) => {
    setSelectedColor(hex);
    setIsDressing(true);
    setTimeout(() => setIsDressing(false), 500);
    if (sceneRef.current) {
      sceneRef.current.setCustomColor(hex);
    }
  };

  // Quick Add to Bag directly from 3D model
  const handleQuickAdd = () => {
    addToCart(activeGarment.code, "L");
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2400);
  };

  return (
    <div className={`walking-tee ${ready ? "walking-tee--ready" : ""}`}>
      {/* BRANDED ATMOSPHERIC BACKDROP */}
      <div className="walking-tee__backdrop" aria-hidden="true">
        <span className="walking-tee__glow" style={glowStyle} />
        <span className="walking-tee__monogram" />
        <span className="walking-tee__word">MOVI</span>
      </div>

      {isDressing && <span className="walking-tee__flash" aria-hidden="true" />}

      {/* THREE.JS INTERACTIVE STAGE */}
      <div
        className="walking-tee__stage"
        ref={stageRef}
        role="img"
        aria-label={`3D Walking Mannequin wearing ${activeGarment.name}`}
      />

      <span className="walking-tee__grain" aria-hidden="true" />

      {/* TOP ATELIER BADGE & 360 HINT */}
      <div className="walking-tee__topbar">
        <span className="atelier-3d-badge">
          <span className="pulse-dot-emerald" /> 3D ATELIER FIT
        </span>
        <span className="drag-hint-pill">⇄ Drag 360° to Inspect</span>
      </div>

      {/* DYNAMIC CLOTHING SELECTOR RAIL */}
      <nav className="walking-tee__wardrobe-rail" aria-label="3D Model Wardrobe Selector">
        <span className="wardrobe-rail-label">DRESS 3D MANNEQUIN:</span>
        <div className="wardrobe-chips-scroll">
          {allGarments.map((garment) => {
            const isSelected = activeGarment.code === garment.code;
            return (
              <button
                key={garment.code}
                type="button"
                className={`wardrobe-chip ${isSelected ? "is-active" : ""}`}
                onClick={() => handleDressGarment(garment)}
                title={`Make 3D model wear ${garment.name}`}
              >
                <span className="chip-code">{garment.code}</span>
                <span className="chip-name">{garment.name.split(" ")[0]}</span>
                {isSelected && <span className="chip-active-dot" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* COLORWAY DYE SWATCHES */}
      <div className="walking-tee__colorways" aria-label="Fabric Colorways">
        <span className="colorway-label">DYE:</span>
        {ATELIER_COLORWAYS.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            className={`colorway-swatch ${selectedColor === swatch.hex ? "is-active" : ""}`}
            style={{ backgroundColor: swatch.hex }}
            onClick={() => handleDyeColor(swatch.hex)}
            title={`Re-dye fabric in ${swatch.name}`}
            aria-label={swatch.name}
          />
        ))}
      </div>

      {/* ACTIVE GARMENT DOSSIER CARD & ACTIONS */}
      <div className="walking-tee__garment-card">
        <div className="garment-card__info">
          <span className="garment-category-pill">{activeGarment.category}</span>
          <strong className="garment-title">
            MOVI / {activeGarment.code} — {activeGarment.name}
          </strong>
          <span className="garment-price">{activeGarment.price}</span>
        </div>

        <div className="garment-card__actions">
          <button
            type="button"
            className="action-add-bag"
            onClick={handleQuickAdd}
          >
            {addedToast ? "✓ Added to Bag!" : "+ Add to Bag"}
          </button>
          <Link
            className="action-view-link"
            to={`/product/${activeGarment.code}`}
            title="View Full Garment Details"
          >
            Inspect ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
