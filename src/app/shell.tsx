import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Footer, Header } from "../App";
import { AtelierToast } from "./toast";
import { StudioQaBar } from "./qa-bar";

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export function AppShell() {
  const { pathname } = useLocation();

  return (
    <main className="interior-page">
      <ScrollToTop />
      {/* Route change progress indicator beam */}
      <span className="route-progress-beam" key={`beam-${pathname}`} />
      <Header interior />
      <div key={pathname} className="page-transition-container">
        <Outlet />
      </div>
      <Footer />
      <AtelierToast />
      <StudioQaBar />
    </main>
  );
}
