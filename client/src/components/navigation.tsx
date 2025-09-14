import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Megaphone, 
  Home, 
  Plus, 
  Users, 
  Shield, 
  Menu,
  X,
  LogOut,
  LogIn,
  Gamepad2
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  const navItems = [
    { 
      path: "/", 
      label: isAuthenticated ? "Dashboard" : "Home", 
      icon: Home,
      requiresAuth: false 
    },
    { 
      path: "/campaigns", 
      label: "Browse Campaigns", 
      icon: Megaphone,
      requiresAuth: false 
    },
    { 
      path: "/create-campaign", 
      label: "Create Campaign", 
      icon: Plus,
      requiresAuth: true 
    },
    { 
      path: "/game", 
      label: "Whac-A-Mole", 
      icon: Gamepad2,
      requiresAuth: false 
    },
    { 
      path: "/admin", 
      label: "Admin", 
      icon: Shield,
      requiresAuth: true 
    },
  ];

  const filteredNavItems = navItems.filter(
    item => !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      // Log out
      window.location.href = "/api/logout";
    } else {
      // Log in
      window.location.href = "/api/login";
    }
  };

  if (isLoading) {
    return null; // Don't show nav while auth is loading
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <button 
              onClick={() => handleNavClick("/")}
              className="flex items-center space-x-2 font-bold text-lg hover:opacity-80 transition-opacity"
            >
              <Megaphone className="h-6 w-6 text-primary" />
              <span className="hidden sm:inline">Email Advocacy Platform</span>
              <span className="sm:hidden">EAP</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleNavClick(item.path)}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={cn(
                    "flex items-center space-x-2",
                    isActive(item.path) && "bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
            
            <div className="ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAuthAction}
                data-testid={isAuthenticated ? "nav-logout" : "nav-login"}
                className="flex items-center space-x-2"
              >
                {isAuthenticated ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="nav-mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleNavClick(item.path)}
                  data-testid={`nav-mobile-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={cn(
                    "w-full justify-start flex items-center space-x-2",
                    isActive(item.path) && "bg-secondary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
            
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAuthAction}
                data-testid={isAuthenticated ? "nav-mobile-logout" : "nav-mobile-login"}
                className="w-full justify-start flex items-center space-x-2"
              >
                {isAuthenticated ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}