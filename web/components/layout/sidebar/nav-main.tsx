"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  GaugeIcon,
  ShoppingBagIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  CreditCardIcon,
  CoffeeIcon,
  UtensilsCrossedIcon,
  BoxesIcon,
  WarehouseIcon,
  ArrowLeftRightIcon,
  UsersIcon,
  Building2Icon,
  BarChart3Icon,
  BanknoteIcon,
  WalletCardsIcon,
  ShieldIcon,
  MonitorSmartphoneIcon,
  ArmchairIcon,
  ScrollTextIcon,
  SlidersHorizontalIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import Link from "next/link";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type NavGroup = {
  title: string;
  items: NavItem;
};

type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  isComing?: boolean;
  isDataBadge?: string;
  isNew?: boolean;
  newTab?: boolean;
  items?: NavItem;
}[];

const platformNav: NavGroup[] = [
  {
    title: "Platform",
    items: [
      { title: "Overview", href: "/dashboard/overview", icon: GaugeIcon },
      { title: "Businesses", href: "/dashboard/businesses", icon: ShoppingBagIcon },
      { title: "Users", href: "/dashboard/users", icon: UsersIcon },
      { title: "Devices", href: "/dashboard/devices", icon: MonitorSmartphoneIcon },
      { title: "Audit log", href: "/dashboard/audit", icon: ScrollTextIcon }
    ]
  }
];

const ownerNav: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard/home", icon: LayoutDashboardIcon }
    ]
  },
  {
    title: "Operations",
    items: [
      { title: "Orders", href: "/dashboard/orders", icon: ReceiptTextIcon },
      { title: "Payments", href: "/dashboard/payments", icon: CreditCardIcon },
      { title: "Items Sold", href: "/dashboard/payments/items", icon: CoffeeIcon },
      { title: "Tables", href: "/dashboard/tables", icon: ArmchairIcon }
    ]
  },
  {
    title: "Catalog & Inventory",
    items: [
      { title: "Menu", href: "/dashboard/menu", icon: UtensilsCrossedIcon },
      { title: "Inventory", href: "/dashboard/inventory", icon: BoxesIcon },
      { title: "Stock Locations", href: "/dashboard/inventory/locations", icon: WarehouseIcon },
      { title: "Transfers", href: "/dashboard/inventory/transfers", icon: ArrowLeftRightIcon }
    ]
  },
  {
    title: "People",
    items: [
      { title: "Staff", href: "/dashboard/staff", icon: UsersIcon },
      { title: "Organizations", href: "/dashboard/customers", icon: Building2Icon }
    ]
  },
  {
    title: "Insights",
    items: [
      { title: "Reports", href: "/dashboard/reports", icon: BarChart3Icon },
      { title: "Expenses", href: "/dashboard/expenses", icon: BanknoteIcon }
    ]
  },
  {
    title: "Settings",
    items: [
      { title: "All Settings", href: "/dashboard/settings", icon: SettingsIcon },
      { title: "Order Rules", href: "/dashboard/settings/preferences", icon: SlidersHorizontalIcon },
      { title: "Payment Methods", href: "/dashboard/settings/payment-methods", icon: WalletCardsIcon },
      { title: "Roles", href: "/dashboard/settings/roles", icon: ShieldIcon },
      { title: "Devices", href: "/dashboard/settings/devices", icon: MonitorSmartphoneIcon }
    ]
  }
];

// The F&B (Food & Beverage) manager runs the food-and-beverage operation of a
// single branch: menu engineering, item performance and cost control. They get
// a trimmed, branch-scoped slice of the owner nav (their branch is pinned by the
// JWT, so there's no branch switcher) plus a dedicated F&B overview.
const fbManagerNav: NavGroup[] = [
  {
    title: "Food & Beverage",
    items: [
      { title: "F&B Overview", href: "/dashboard/fb", icon: GaugeIcon },
      { title: "Menu", href: "/dashboard/menu", icon: UtensilsCrossedIcon },
      { title: "Items Sold", href: "/dashboard/payments/items", icon: CoffeeIcon },
      { title: "Reports", href: "/dashboard/reports", icon: BarChart3Icon }
    ]
  }
];

export function NavMain() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const [items, setItems] = useState<NavGroup[]>([]);

  useEffect(() => {
    const role = getUser()?.role;
    setItems(
      role === "super_admin"
        ? platformNav
        : role === "fb_manager"
          ? fbManagerNav
          : ownerNav,
    );
  }, []);

  return (
    <>
      {items.map((nav) => (
        <SidebarGroup key={nav.title}>
          <SidebarGroupLabel>{nav.title}</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {nav.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {Array.isArray(item.items) && item.items.length > 0 ? (
                    <>
                      <div className="hidden group-data-[collapsible=icon]:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton tooltip={item.title}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                            className="min-w-48 rounded-lg">
                            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                            {item.items?.map((item) => (
                              <DropdownMenuItem
                                className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10! active:bg-[var(--primary)]/10!"
                                asChild
                                key={item.title}>
                                <a href={item.href}>{item.title}</a>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <Collapsible className="group/collapsible block group-data-[collapsible=icon]:hidden">
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                            tooltip={item.title}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item?.items?.map((subItem, key) => (
                              <SidebarMenuSubItem key={key}>
                                <SidebarMenuSubButton
                                  className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                                  isActive={pathname === subItem.href}
                                  asChild>
                                  <Link href={subItem.href} target={subItem.newTab ? "_blank" : ""}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  ) : (
                    <SidebarMenuButton
                      className="hover:text-foreground active:text-foreground hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/10"
                      isActive={pathname === item.href}
                      tooltip={item.title}
                      asChild>
                      <Link href={item.href} target={item.newTab ? "_blank" : ""}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                  {!!item.isComing && (
                    <SidebarMenuBadge className="peer-hover/menu-button:text-foreground opacity-50">
                      Coming
                    </SidebarMenuBadge>
                  )}
                  {!!item.isNew && (
                    <SidebarMenuBadge className="border border-green-400 text-green-600 peer-hover/menu-button:text-green-600">
                      New
                    </SidebarMenuBadge>
                  )}
                  {!!item.isDataBadge && (
                    <SidebarMenuBadge className="peer-hover/menu-button:text-foreground">
                      {item.isDataBadge}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
