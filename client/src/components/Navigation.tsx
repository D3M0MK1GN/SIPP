import { Shield, BarChart3, UserPlus, Search, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: "/", icon: BarChart3, label: "Dashboard", id: "dashboard" },
    { path: "/register", icon: UserPlus, label: "Registrar", id: "register" },
    { path: "/search", icon: Search, label: "Buscar", id: "search" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Shield className="text-blue-600 text-2xl w-8 h-8" />
              </div>
              <h1 className="text-xl font-semibold text-gray-700">Sistema Policial</h1>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.id} href={item.path}>
                    <a className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    }`}>
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <User className="text-white text-sm" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Oficial'}
                </span>
              </div>
              <a 
                href="/api/logout" 
                className="text-sm text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Salir
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="grid grid-cols-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.id} href={item.path}>
                <a className={`flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive(item.path) ? "text-blue-600" : "text-gray-600"
                }`}>
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
