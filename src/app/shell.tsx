import { Outlet } from "react-router";
import { Footer, Header } from "../App";

export function AppShell() {
  return <main className="interior-page"><Header interior /><Outlet /><Footer /></main>;
}
