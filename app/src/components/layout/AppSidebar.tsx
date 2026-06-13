import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  BarChart3,
  LogOut,
  User,
  Coffee,
  DollarSign,
  Package,
  MapPin,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CalendarCheck,
  Receipt,
  UserCog,
  Utensils,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import BranchBadge from '@/components/common/BranchBadge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  // Base
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier', 'kitchen_staff'], group: 'Main' },
  { name: 'Profile', href: '/dashboard/profile', icon: User, roles: ['admin', 'cashier', 'kitchen_staff'], group: 'Main' },

  // Admin - Operations
  { name: 'Orders', href: '/dashboard/orders', icon: ClipboardList, roles: ['admin', 'kitchen_staff'], group: 'Operations' },
  { name: 'Menu', href: '/dashboard/menu', icon: Utensils, roles: ['admin', 'kitchen_staff'], group: 'Operations' },
  { name: 'Tables', href: '/dashboard/tables', icon: Coffee, roles: ['admin'], group: 'Operations' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package, roles: ['admin'], group: 'Operations' },
  { name: 'Stock Locations', href: '/dashboard/inventory/locations', icon: MapPin, roles: ['admin'], group: 'Operations' },

  // Admin - Finance
  { name: 'Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['admin', 'cashier'], group: 'Finance' },
  { name: 'Expenses', href: '/dashboard/expenses', icon: DollarSign, roles: ['admin'], group: 'Finance' },
  { name: 'Payments Items', href: '/dashboard/payments-items', icon: Receipt, roles: ['admin'], group: 'Finance' },

  // Admin - HR
  { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['admin'], group: 'HR & People' },
  { name: 'User Management', href: '/dashboard/users', icon: UserCog, roles: ['admin'], group: 'HR & People' },
  { name: 'Attendance', href: '/dashboard/attendance', icon: CalendarCheck, roles: ['admin'], group: 'HR & People' },
  { name: 'Performance', href: '/dashboard/performance', icon: TrendingUp, roles: ['admin'], group: 'HR & People' },
  { name: 'Payroll', href: '/dashboard/payroll', icon: DollarSign, roles: ['admin'], group: 'HR & People' },
  { name: 'HR Analytics', href: '/dashboard/hr-analytics', icon: BarChart3, roles: ['admin'], group: 'HR & People' },

  // Admin - Reports
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin'], group: 'Reports' },

  // Admin - Settings
  { name: 'Payment Methods', href: '/dashboard/settings/payment-methods', icon: CreditCard, roles: ['admin'], group: 'Settings' },
  { name: 'Roles', href: '/dashboard/settings/roles', icon: UserCog, roles: ['admin'], group: 'Settings' },

  // Cashier-specific
  { name: 'Cashier Employees', href: '/dashboard/cashier/employees', icon: Users, roles: ['cashier'], group: 'Operations' },
  { name: 'Add Order', href: '/dashboard/cashier/select-waiter', icon: ShoppingBag, roles: ['cashier'], group: 'Operations' },
  { name: 'Expenses', href: '/dashboard/cashier/expenses', icon: DollarSign, roles: ['cashier'], group: 'Finance' },
];

function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  cafe_waiter: 'bg-info text-info-foreground',
  cashier: 'bg-success text-success-foreground',
  kitchen_staff: 'bg-destructive text-destructive-foreground',
};

export function AppSidebar() {
  const { user, logout, getRoleDisplayName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { open, toggleOpen } = useSidebar();

  const filteredItems = ALL_NAV_ITEMS.filter(
    item => user?.role && item.roles.includes(user.role)
  );

  const groups = Array.from(new Set(filteredItems.map(i => i.group)));

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColor = ROLE_COLORS[user?.role || ''] || 'bg-muted text-muted-foreground';
  const userDisplayName = user?.full_name || user?.name || 'User';
  const userInitials = getUserInitials(userDisplayName);

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className={cn('justify-between', !open && 'justify-center')}>
        {open ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/assets/logo.png?v=8" alt="Logo" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate leading-tight">Cafe system</p>
              <BranchBadge className="mt-0.5" />
            </div>
          </div>
        ) : (
          <img src="/assets/logo.png?v=8" alt="Logo" className="w-8 h-8 object-contain" />
        )}
        <button
          onClick={toggleOpen}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent transition-colors shrink-0"
        >
          {open ? <ChevronLeft className="h-4 w-4 text-sidebar-foreground/60" /> : <ChevronRight className="h-4 w-4 text-sidebar-foreground/60" />}
        </button>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {groups.map(group => {
          const groupItems = filteredItems.filter(i => i.group === group);
          return (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarMenu>
                {groupItems.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.name}
                        onClick={() => navigate(item.href)}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {open && <span className="truncate">{item.name}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer - User Menu */}
      <SidebarFooter className={'flex gap-2 sm:flex-row flex-col'}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors',
              !open && 'justify-center'
            )}>
              <Avatar className={cn('shrink-0', roleColor, 'h-8 w-8')}>
                <AvatarFallback className={cn('text-xs font-semibold', roleColor)}>
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">{userDisplayName}</p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">{getRoleDisplayName()}</p>
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
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      
       
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
