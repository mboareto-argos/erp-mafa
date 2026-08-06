export type IconName = "home" | "sales" | "customers" | "products" | "purchases" | "suppliers" | "inventory" | "finance" | "imports" | "chevronRight" | "chevronsLeft" | "chevronsRight" | "chevronDown" | "shield" | "search" | "plus" | "eye" | "edit" | "cancel" | "more";

const paths: Record<IconName, string> = {
  home: "M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z",
  sales: "M5 19 19 5M8 5h11v11M5 8v11h11",
  customers: "M16 20v-1.8A4.2 4.2 0 0 0 11.8 14H7.2A4.2 4.2 0 0 0 3 18.2V20M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m10.5 10v-1.8a4.2 4.2 0 0 0-3-4M16 3.2a3.5 3.5 0 0 1 0 6.8",
  products: "m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5 12 12l8-4.5M12 12v9",
  purchases: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  suppliers: "M4 20V5l8-2 8 2v15M8 20v-5h8v5M8 8h.01M12 8h.01M16 8h.01",
  inventory: "M4 7h16v13H4zM7 4h10v3M8 11h8M8 15h5",
  finance: "M12 3v18M16 7.2c-.6-1.2-2-2-4-2-2.2 0-3.7 1.1-3.7 2.8 0 4 7.4 2 7.4 6 0 1.8-1.6 3-3.8 3-2 0-3.6-.9-4.3-2.2",
  imports: "M12 3v12m0-12L7.5 7.5M12 3l4.5 4.5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  chevronRight: "m9 18 6-6-6-6",
  chevronsLeft: "m13 17-5-5 5-5m4 10-5-5 5-5",
  chevronsRight: "m11 17 5-5-5-5m-4 10 5-5-5-5",
  chevronDown: "m6 9 6 6 6-6",
  shield: "M12 3 5.5 5.8v5.4c0 4.1 2.7 7.9 6.5 9.3 3.8-1.4 6.5-5.2 6.5-9.3V5.8z",
  search: "m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
  eye: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  edit: "M4 20h4l11-11-4-4L4 16v4Zm9.5-13.5 4 4",
  cancel: "M5 5l14 14M19 5 5 19",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export function AppIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{name === "more" ? <><circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.35" fill="currentColor" stroke="none" /></> : <path d={paths[name]} />}</svg>;
}
