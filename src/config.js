export const KEYWORD = "pleroma aletheia";
export const WEB_URL = "https://kainos.example.com";
export const DEVICES = [
  "Porte A - Agent 1",
  "Porte A - Agent 2",
  "Porte B - Agent 1",
];
// Supabase : Project Settings > API (clé "anon public" uniquement, jamais la clé service_role)
export const SUPABASE_URL = "https://khwbukjkvtlkrbfvuduw.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_cLFWK-S8paGZu_vzrcVhdQ_ZQ3ma48q";
export const PAYMENT_METHOD_GROUPS = [
  {
    group: "Mobile money",
    methods: [
      "Lumicash",
      "EcoCash",
      "BurundiPay",
      "Ibb Mobile",
      "CRDB SimBanking",
      "Bancobu e-Noti",
      "M-Pesa",
      "CashTel",
      "Leapea",
      "Rungika",
      "SmartPesa",
      "KCB Mobi",
    ],
  },
  { group: "Banque", methods: ["Virement bancaire"] },
  { group: "Espèces", methods: ["Espèces"] },
  { group: "Autre", methods: ["Autre"] },
];
export const PAYMENT_METHODS = PAYMENT_METHOD_GROUPS.flatMap((section) => section.methods);
export const C = {
  brand: "#16A34A",
  brandDark: "#15803D",
  bg: "#F1F5F9",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  red: "#DC2626",
  amber: "#F59E0B",
  soft: "#F0FDF4",
};
export const F = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  bold: "Outfit_600SemiBold",
};
export const money = (n) =>
  `${new Intl.NumberFormat("fr-FR").format(Number(n || 0))} FBu`;
