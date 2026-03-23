// src/modules/shared/components/AppShell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  BookOpen,
  LayoutDashboard,
  FolderKanban,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
} from "lucide-react";
import { cn } from "../utils";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { roleLabel } from "../utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: Role): NavItem[] {
  if (role === "CONSULTANT") {
    return [
      { label: "Dashboard", href: "/consultant/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "My Projects", href: "/consultant/projects", icon: <FolderKanban className="w-4 h-4" /> },
    ];
  }
  if (role === "LEARNER") {
    return [
      { label: "Dashboard", href: "/learner/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Browse Projects", href: "/learner/projects", icon: <Search className="w-4 h-4" /> },
    ];
  }
  return [
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
  ];
}

interface AppShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    image?: string | null;
  };
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navItems = getNavItems(user.role);

  const roleBadgeVariant =
    user.role === "CONSULTANT" ? "info" :
    user.role === "LEARNER" ? "success" : "warning";

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-surface-200",
          "flex flex-col transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-surface-900 text-sm">Kaliyuva</span>
            <span className="block text-xs text-surface-400">LMS Platform</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-surface-400 hover:text-surface-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-4 pb-2">
          <Badge variant={roleBadgeVariant} dot>
            {roleLabel(user.role)}
          </Badge>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive ? "nav-item-active" : "nav-item"
                )}
              >
                <span className={cn(isActive ? "text-brand-600" : "text-surface-400")}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="px-3 pb-4 pt-2 border-t border-surface-100">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-50 transition-colors"
            >
              <Avatar name={user.name} src={user.image} size="sm" />
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">{user.name}</p>
                <p className="text-xs text-surface-500 truncate">{user.email}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-surface-400 transition-transform", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-surface-200 rounded-xl shadow-panel py-1 z-50">
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                  onClick={() => {}}
                >
                  <Settings className="w-4 h-4 text-surface-400" />
                  Settings
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-surface-500 hover:text-surface-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title will be set per-page via next/head or h1 */}
          <div className="flex-1" />

          {/* Notifications */}
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-all">
            <Bell className="w-5 h-5" />
            {/* Notification dot — wired up in Phase 5 */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
          </button>

          {/* Avatar shortcut */}
          <Avatar name={user.name} src={user.image} size="sm" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
