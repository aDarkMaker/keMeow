import { withBase } from "./paths";

export interface NavItem {
  href: string;
  label: string;
}

export const NAV: readonly NavItem[] = [
  { href: withBase(), label: "开始" },
  { href: withBase("changelog/"), label: "更新" },
];
