import { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { Home } from "../App";
import { AppShell } from "./shell";

const load = async (name: keyof typeof import("./pages")) => {
  const pages = await import("./pages");
  return { Component: pages[name] as ComponentType };
};

const loadEditorial = async (route: string) => {
  const { EditorialPage } = await import("./pages");
  return { Component: () => <EditorialPage route={route} /> };
};

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  {
    Component: AppShell,
    children: [
      { path: "shop", lazy: () => load("ShopPage") },
      { path: "t-shirts", lazy: () => load("TShirtsPage") },
      { path: "hoodies", lazy: () => load("HoodiesPage") },
      { path: "product/:code", lazy: () => load("ProductPage") },
      { path: "search", lazy: () => load("SearchPage") },
      { path: "bag", lazy: () => load("CartPage") },
      { path: "checkout", lazy: () => load("CheckoutPage") },
      { path: "login", lazy: () => load("AuthPage") },
      { path: "account", lazy: () => load("AccountPage") },
      { path: "story", lazy: () => loadEditorial("story") },
      { path: "lookbook", lazy: () => loadEditorial("lookbook") },
      { path: "contact", lazy: () => loadEditorial("contact") },
      { path: "shipping", lazy: () => loadEditorial("shipping") },
      { path: "returns", lazy: () => loadEditorial("returns") },
      { path: "faq", lazy: () => loadEditorial("faq") },
      { path: "instagram", lazy: () => loadEditorial("instagram") },
      { path: "youtube", lazy: () => loadEditorial("youtube") },
      { path: "*", lazy: () => load("NotFoundPage") },
    ],
  },
  { path: "/admin", lazy: () => load("AdminPage") },
]);
