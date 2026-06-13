import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggleOpen = useCallback(() => setOpen(v => !v), []);
  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarProps {
  className?: string;
  children: React.ReactNode;
}

export function Sidebar({ className, children }: SidebarProps) {
  const { open } = useSidebar();
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0',
          open ? 'w-64' : 'w-16',
          className
        )}
      >
        {children}
      </aside>
    </>
  );
}

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center px-4 h-16 border-b border-sidebar-border shrink-0', className)}>
      {children}
    </div>
  );
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex-1 overflow-y-auto overflow-x-hidden py-4', className)}>
      {children}
    </div>
  );
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('border-t border-sidebar-border p-4 shrink-0', className)}>
      {children}
    </div>
  );
}

export function SidebarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-3 mb-4', className)}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useSidebar();
  if (!open) return null;
  return (
    <p className={cn('text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-2 mb-2', className)}>
      {children}
    </p>
  );
}

export function SidebarMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <ul className={cn('space-y-0.5', className)}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <li className={cn('list-none', className)}>{children}</li>;
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  tooltip?: string;
  asChild?: boolean;
}

export function SidebarMenuButton({
  className,
  isActive,
  tooltip,
  children,
  ...props
}: SidebarMenuButtonProps) {
  const { open } = useSidebar();
  return (
    <button
      title={!open ? tooltip : undefined}
      className={cn(
        'flex items-center w-full gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-200',
        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90',
        !open && 'justify-center',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SidebarTrigger({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { toggleOpen } = useSidebar();
  return (
    <button
      onClick={toggleOpen}
      className={cn(
        'inline-flex items-center justify-center rounded-md w-8 h-8 hover:bg-accent transition-colors',
        className
      )}
      {...props}
    />
  );
}
