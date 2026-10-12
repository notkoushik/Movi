import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { TeeScene } from "./walking-tee-scene";

/**
 * 360° walking tee. The three.js scene is a separate chunk that only loads
 * when this frame nears the viewport, and it only renders while on screen.
 */
export default function WalkingTee() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

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
          setReady(true);
          sync();
        })
        .catch(() => undefined); // No WebGL: the branded backdrop stays as a still.

    // Never compete with the hero image: wait for page load, then an idle moment.
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
    };
  }, []);

  return (
    <div className={`walking-tee ${ready ? "walking-tee--ready" : ""}`}>
      <div className="walking-tee__backdrop" aria-hidden="true">
        <span className="walking-tee__glow" />
        <span className="walking-tee__monogram" />
        <span className="walking-tee__word">MOVI</span>
      </div>
      <div
        className="walking-tee__stage"
        ref={stageRef}
        role="img"
        aria-label="MOVI Essential Oversized Tee in charcoal, turning 360 degrees as it walks"
      />
      <span className="walking-tee__grain" aria-hidden="true" />
      <Link className="movement__aside-tag walking-tee__tag" to="/product/01">
        MOVI / 01 — Essential Oversized Tee
      </Link>
    </div>
  );
}
