import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/application';
import { Menu, X, ChevronLeft, ChevronRight, LayoutDashboard, Users, ShoppingBag, ClipboardList, CreditCard, BarChart3, LogOut, User, Coffee, DollarSign, Package, Receipt, UserCog, Utensils, Wrench, ArrowLeftRight, MapPin, Building2, Printer } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import BranchBadge from '@/components/common/BranchBadge';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier', 'kitchen_staff'], group: 'Main' },
  { name: 'Profile', href: '/dashboard/profile', icon: User, roles: ['admin', 'cashier', 'kitchen_staff'], group: 'Main' },
  { name: 'Orders', href: '/dashboard/orders', icon: ClipboardList, roles: ['admin', 'kitchen_staff'], group: 'Operations' },
  { name: 'Menu', href: '/dashboard/menu', icon: Utensils, roles: ['admin', 'kitchen_staff'], group: 'Operations' },
  { name: 'Tables', href: '/dashboard/tables', icon: Coffee, roles: ['admin'], group: 'Operations' },
  { name: 'Inventory Management', href: '/dashboard/inventory', icon: Package, roles: ['admin'], group: 'Inventory Management' },
  { name: 'Stock Locations', href: '/dashboard/inventory/locations', icon: MapPin, roles: ['admin'], group: 'Inventory Management' },
  { name: 'Stock Transfer', href: '/dashboard/inventory/transfers', icon: ArrowLeftRight, roles: ['admin'], group: 'Inventory Management' },
  { name: 'Organizations', href: '/dashboard/organizations', icon: Building2, roles: ['admin'], group: 'Operations' },
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'cashier'], group: 'Finance' },
  { name: 'Expenses', href: '/dashboard/expenses', icon: DollarSign, roles: ['admin'], group: 'Finance' },
  { name: 'Payments Items', href: '/dashboard/payments-items', icon: Receipt, roles: ['admin'], group: 'Finance' },
  { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['admin'], group: 'HR & People' },
  { name: 'User Management', href: '/dashboard/users', icon: UserCog, roles: ['admin'], group: 'HR & People' },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'], group: 'Reports' },
  { name: 'Payment Methods', href: '/dashboard/settings/payment-methods', icon: CreditCard, roles: ['admin'], group: 'Settings' },
  { name: 'Roles', href: '/dashboard/settings/roles', icon: UserCog, roles: ['admin'], group: 'Settings' },
  { name: 'Cashier Employees', href: '/dashboard/cashier/employees', icon: Users, roles: ['cashier'], group: 'Operations' },
  { name: 'Add Order', href: '/dashboard/cashier/select-waiter', icon: ShoppingBag, roles: ['cashier'], group: 'Operations' },
  { name: 'Cashier Expenses', href: '/dashboard/cashier/expenses', icon: DollarSign, roles: ['cashier'], group: 'Finance' },
  {name: 'Settings', href: '/dashboard/settings/data-management', icon: Wrench, roles: ['admin'], group: 'Settings' },
  { name: 'Printer Settings', href: '/dashboard/settings/printer-settings', icon: Printer, roles: ['admin'], group: 'Settings' },

];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary',
  cafe_waiter: 'bg-info',
  cashier: 'bg-success',
  kitchen_staff: 'bg-destructive',
};

function getUserInitials(name: string) {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, getRoleDisplayName } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cashierCanManageOrgs, setCashierCanManageOrgs] = useState(false);
  const [enableCashierReceipt, setEnableCashierReceipt] = useState(false);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'cashier') {
      setCashierCanManageOrgs(false);
      return;
    }
    api.settings
      .getOrganizationSettings()
      .then((res: any) => {
        if (active) setCashierCanManageOrgs(Boolean(res?.allow_cashier_manage_org_orders));
      })
      .catch(() => {
        if (active) setCashierCanManageOrgs(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  useEffect(() => {
    let active = true;
    if (user?.role !== 'cashier') {
      setEnableCashierReceipt(false);
      return;
    }
    api.settings
      .getReceiptSettings()
      .then((res: any) => {
        if (active) setEnableCashierReceipt(Boolean(res?.enable_cashier_receipt));
      })
      .catch(() => {
        if (active) setEnableCashierReceipt(false);
      });
    return () => {
      active = false;
    };
  }, [user?.role]);

  const filteredItems = ALL_NAV_ITEMS.filter(
    item => user?.role && item.roles.includes(user.role)
  );

  if (cashierCanManageOrgs && user?.role === 'cashier') {
    filteredItems.push({
      name: 'Organizations',
      href: '/dashboard/organizations',
      icon: Building2,
      roles: ['cashier'],
      group: 'Operations',
    });
  }

  if (enableCashierReceipt && user?.role === 'cashier') {
    filteredItems.push({
      name: 'Preview receipt',
      href: '/dashboard/cashier/receipt',
      icon: Receipt,
      roles: ['cashier'],
      group: 'Operations',
    });
  }

  const groups = Array.from(new Set(filteredItems.map(i => i.group)));

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    if (href === '/dashboard/inventory') return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userDisplayName = user?.full_name || user?.name || 'User';
  const roleColor = ROLE_COLORS[user?.role || ''] || 'bg-muted';

  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo Header */}
      <div className={cn('flex items-center h-16 border-b border-border px-4 shrink-0', collapsed && !mobile ? 'justify-center' : 'justify-between')}>
        <div className={cn('flex items-center gap-2.5 min-w-0', collapsed && !mobile && 'hidden')}>
          <img src="/assets/logo.png?v=8" alt="Logo" className="w-9 h-9 object-contain shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Cafe System</p>
            <BranchBadge className="mt-0.5" />
          </div>
        </div>
        {collapsed && !mobile && (
          <img src="/assets/logo.png?v=8" alt="Logo" className="w-8 h-8 object-contain" />
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-accent transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
          </button>
        )}
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-3">
          {groups.map((group, gi) => {
            const groupItems = filteredItems.filter(i => i.group === group);
            return (
              <div key={group} className={cn(gi > 0 && 'mt-4')}>
                {(!collapsed || mobile) && (
                  <p className="px-2 mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {group}
                  </p>
                )}
                {gi > 0 && collapsed && !mobile && <Separator className="mb-3" />}
                <ul className="space-y-0.5">
                  {groupItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <button
                          title={collapsed && !mobile ? item.name : undefined}
                          onClick={() => {
                            navigate(item.href);
                            setSidebarOpen(false);
                          }}
                          className={cn(
                            'flex items-center gap-3 w-full rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150',
                            collapsed && !mobile ? 'justify-center' : '',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground/70 hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {(!collapsed || mobile) && <span className="truncate">{item.name}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Footer */}
      <div className="border-t border-border p-3 shrink-0 space-y-1">
    
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-3 w-full rounded-lg p-2 hover:bg-accent transition-colors text-left',
              collapsed && !mobile && 'justify-center'
            )}>
              <Avatar className="h-8 w-8 shrink-0 ">
                <AvatarFallback className={cn('text-xs font-bold text-forground')}>
                  {getUserInitials(userDisplayName)}
                </AvatarFallback>
              </Avatar>
              {(!collapsed || mobile) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{userDisplayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{getRoleDisplayName()}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">{userDisplayName}</p>
              <p className="text-xs text-muted-foreground font-normal">{getRoleDisplayName()}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
              <User className="h-4 w-4 mr-2" />Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border lg:hidden transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent mobile />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header - Fixed */}
        <header className="flex items-center justify-between h-14 px-4 bg-card border-b border-border shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img src="/assets/logo.png?v=8" alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-sm font-bold hidden sm:inline">Cafe System</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
