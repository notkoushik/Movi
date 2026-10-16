import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useStore } from "./store";

export function AtelierToast() {
  const { toast, dismissToast } = useStore();
  const [animatingOut, setAnimatingOut] = useState(false);

  useEffect(() => {
    if (!toast) {
      setAnimatingOut(false);
    }
  }, [toast]);

  if (!toast) return null;

  const handleClose = () => {
    setAnimatingOut(true);
    setTimeout(() => {
      dismissToast();
      setAnimatingOut(false);
    }, 280);
  };

  return (
    <aside
      className={`atelier-toast ${animatingOut ? "atelier-toast--exit" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="atelier-toast__thumb">
        {toast.image ? (
          <img src={toast.image} alt={toast.name} width="38" height="38" />
        ) : (
          <span className="atelier-toast__check">✓</span>
        )}
      </div>

      <div className="atelier-toast__body">
        <span className="atelier-toast__eyebrow">
          <span className="pulse-dot-emerald" /> MOVI ATELIER / ITEM ADDED
        </span>
        <strong className="atelier-toast__title">
          {toast.name} <span className="atelier-toast__size">({toast.size})</span>
        </strong>
        {toast.price && <span className="atelier-toast__price">{toast.price}</span>}
      </div>

      <div className="atelier-toast__actions">
        <Link to="/bag" className="atelier-toast__cta" onClick={dismissToast}>
          Bag ↗
        </Link>
        <button
          type="button"
          className="atelier-toast__close"
          onClick={handleClose}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>

      <span className="atelier-toast__progress" />
    </aside>
  );
}
