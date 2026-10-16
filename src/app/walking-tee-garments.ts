export type Garment3DConfig = {
  id: string;
  code: string;
  name: string;
  category: string;
  price: string;
  fabricColor: string;
  insideColor: string;
  accentColor?: string;
  headline: string;
  subline: string;
  tagline: string;
  graphicStyle: "crest" | "hoodie" | "vintage" | "technical" | "minimal";
  customImage?: string;
  roughness?: number;
  sheen?: number;
  sheenColor?: number;
};

export const DEFAULT_GARMENTS: Garment3DConfig[] = [
  {
    id: "01",
    code: "01",
    name: "Essential Oversized Tee",
    category: "T-Shirts",
    price: "₹ 1,299",
    fabricColor: "#222222",
    insideColor: "#141414",
    accentColor: "#c5a880",
    headline: "MOVI CLOTHING",
    subline: "HEAVYWEIGHT 280 GSM",
    tagline: "M O V E   Y O U R   W A Y .",
    graphicStyle: "crest",
    roughness: 0.88,
    sheen: 1.0,
    sheenColor: 0x8b8680,
  },
  {
    id: "02",
    code: "02",
    name: "Signature Boxy Hoodie",
    category: "Hoodies",
    price: "₹ 1,999",
    fabricColor: "#111112",
    insideColor: "#0a0a0a",
    accentColor: "#d4af37",
    headline: "MOVI ATELIER / FW26",
    subline: "STRUCTURED FLEECE 450 GSM",
    tagline: "B U I L T   F O R   M O T I O N .",
    graphicStyle: "hoodie",
    roughness: 0.94,
    sheen: 0.65,
    sheenColor: 0x777777,
  },
  {
    id: "03",
    code: "03",
    name: "Vintage Graphic Tee",
    category: "T-Shirts",
    price: "₹ 1,499",
    fabricColor: "#2a2725",
    insideColor: "#181615",
    accentColor: "#bfa382",
    headline: "MOVI ARCHIVES / 2026",
    subline: "DISTRESSED SCREENPRINT",
    tagline: "I N D I A N   R O O T S .",
    graphicStyle: "vintage",
    roughness: 0.92,
    sheen: 0.75,
    sheenColor: 0x9b8568,
  },
  {
    id: "04",
    code: "04",
    name: "Tech Cargo Overshirt",
    category: "Bottoms",
    price: "₹ 1,899",
    fabricColor: "#242825",
    insideColor: "#161a17",
    accentColor: "#e67e22",
    headline: "MOVI LAB / SPEC.04",
    subline: "STRUCTURED WEATHERPROOF",
    tagline: "A R C H I T E C T U R A L   F I T .",
    graphicStyle: "technical",
    roughness: 0.68,
    sheen: 1.1,
    sheenColor: 0x8a9485,
  },
  {
    id: "05",
    code: "05",
    name: "Bone Minimalist Atelier Tee",
    category: "T-Shirts",
    price: "₹ 1,599",
    fabricColor: "#ded8cc",
    insideColor: "#222222",
    accentColor: "#222222",
    headline: "MOVI ATELIER / MUMBAI",
    subline: "ORGANIC COMBED JERSEY",
    tagline: "P U R E   S I L H O U E T T E .",
    graphicStyle: "minimal",
    roughness: 0.85,
    sheen: 0.85,
    sheenColor: 0xffffff,
  },
];
