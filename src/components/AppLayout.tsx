import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, Pin, Calendar, FolderOpen, Search, LogOut, Menu, X, Settings, Shield } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/search", label: "Search", icon: Search },
  { to: "/pinned", label: "Pinned", icon: Pin },
  { to: "/planner", label: "Planner", icon: Calendar },
  { to: "/saved", label: "Saved", icon: FolderOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

const adminNavItem = { to: "/admin", label: "Admin", icon: Shield };

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const allNavItems = profile?.is_admin ? [...navItems, adminNavItem] : navItems;

  const isActive = (to: string) => location.pathname === to || (to === "/dashboard" && location.pathname === "/");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b glass">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Bookpadi
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={isActive(item.to) ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1.5 h-9 text-xs font-medium"
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden lg:block text-sm text-muted-foreground truncate max-w-[140px]">
              {profile?.full_name}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="h-9 w-9">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-card/95 backdrop-blur-md p-3 space-y-0.5 animate-fade-in">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={isActive(item.to) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-10"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
