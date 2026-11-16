import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleDollarSign,
  ClipboardList,
  Ellipsis,
  Eye,
  HandCoins,
  House,
  Menu,
  Package,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

// Biblioteca única de ícones: Lucide, traço único (DS §13). Os nomes
// semânticos abaixo são o contrato usado pelas telas — trocar o desenho de
// um ícone é mudar só este mapa.
const icons = {
  home: House,
  sales: ArrowUpRight,
  customers: Users,
  products: Package,
  purchases: ShoppingBag,
  suppliers: Building2,
  inventory: PackageOpen,
  finance: CircleDollarSign,
  debtors: HandCoins,
  imports: Upload,
  settings: Settings,
  chevronRight: ChevronRight,
  chevronsLeft: ChevronsLeft,
  chevronsRight: ChevronsRight,
  chevronDown: ChevronDown,
  shield: ShieldCheck,
  search: Search,
  plus: Plus,
  eye: Eye,
  edit: Pencil,
  cancel: X,
  more: Ellipsis,
  menu: Menu,
  list: ClipboardList,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function AppIcon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      strokeWidth={1.8}
      className={className}
    />
  );
}
