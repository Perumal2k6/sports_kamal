import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Tags, Users, 
  Truck, FileText, Settings, LogOut, Menu, X, Store,
  Maximize, Minimize, Moon, Sun, ChevronRight, Receipt, Wrench
} from 'lucide-react';

const SidebarItem = ({ to, icon: Icon, label, onClick, collapsed }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center px-4 py-3 mb-1 rounded-md transition-all ${
        isActive 
          ? 'bg-white text-primary-800 font-bold shadow-sm' 
          : 'text-primary-100 hover:bg-primary-700 hover:text-white border-l-4 border-transparent'
      } ${collapsed ? 'justify-center px-2' : ''}`
    }
    title={collapsed ? label : ''}
  >
    <Icon size={20} className={collapsed ? '' : 'mr-3'} />
    {!collapsed && <span>{label}</span>}
  </NavLink>
);

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop collapsed state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut to toggle sidebar (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (window.innerWidth < 1024) {
          setSidebarOpen((prev) => !prev);
        } else {
          setSidebarCollapsed((prev) => !prev);
        }
      } else if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authSession');
    window.location.href = '/login';
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/billing", icon: ShoppingCart, label: "Billing / POS" },
    { to: "/products", icon: Tags, label: "Products" },
    { to: "/inventory", icon: Package, label: "Inventory" },
    { to: "/purchases", icon: Store, label: "Purchases" },
    { to: "/customers", icon: Users, label: "Customers" },
    { to: "/suppliers", icon: Truck, label: "Suppliers" },
    { to: "/services", icon: Wrench, label: "Services" },
    { to: "/expenses", icon: Receipt, label: "Expenses" },
    { to: "/reports", icon: FileText, label: "Reports" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-workspace overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-800/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-primary-800 text-white transform transition-all duration-300 ease-in-out z-50 lg:translate-x-0 lg:static flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex items-center justify-center py-5 px-4 border-b border-primary-700 bg-primary-900 overflow-hidden relative">
          <div className="flex flex-col items-center justify-center w-full">
            <div className={`bg-white rounded-lg p-1 flex items-center justify-center transition-all ${sidebarCollapsed ? 'h-10 w-10' : 'h-14 w-14 mb-2'}`}>
              <img src="/Every Kadai Logo.png" alt="Logo" className="object-contain h-full w-full" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-lg font-black tracking-widest text-white mt-1">EVERYKADAI</span>
            )}
          </div>
          {/* Mobile close button */}
          <button className="lg:hidden text-primary-200 hover:text-white absolute right-4 top-4" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 sidebar-scroll">
          <nav>
            {navItems.map((item) => (
              <SidebarItem 
                key={item.to} 
                {...item} 
                collapsed={sidebarCollapsed}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }} 
              />
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t-4 border-primary-900 bg-primary-800 text-center overflow-hidden h-20 flex items-center justify-center">
          {!sidebarCollapsed && (
            <div className="flex flex-col items-center justify-center text-primary-200 text-xs">
              <p className="font-semibold text-white">Developed by</p>
              <p>Code Blaza Technology</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 z-10 shadow-sm">
          <div className="flex items-center">
            {/* Mobile Toggle */}
            <button 
              className="mr-4 text-slate-600 hover:text-primary-600 focus:outline-none lg:hidden p-1 rounded-md hover:bg-slate-100"
              onClick={() => setSidebarOpen((prev) => !prev)}
              title="Toggle Sidebar (Ctrl+B)"
              aria-label="Toggle Sidebar"
            >
              <Menu size={24} />
            </button>
            {/* Desktop Collapse Toggle */}
            <button 
              className="mr-4 text-slate-600 hover:text-primary-600 focus:outline-none hidden lg:block p-1 rounded-md hover:bg-slate-100"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              title="Toggle Sidebar (Ctrl+B)"
              aria-label="Toggle Sidebar"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden sm:block">
              <span className="text-sm text-slate-500 font-medium">Developed by</span>
              <span className="ml-1 text-primary-600 font-bold">Code Blaza Technology</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-full transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-full transition-colors hidden sm:block"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  A
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">Admin</p>
                  <p className="text-xs text-slate-500 leading-tight">ID: #001</p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 profile-dropdown">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800">Admin User</p>
                    <p className="text-xs text-slate-500">ID: EMP-001</p>
                  </div>
                  <NavLink to="/settings" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary-600 flex items-center">
                    <Settings size={16} className="mr-2" /> Settings
                  </NavLink>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
