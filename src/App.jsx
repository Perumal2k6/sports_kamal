import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Customers from './pages/Customers';
import Purchases from './pages/Purchases';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Services from './pages/Services';
import { initDb } from './lib/db';
import { Search } from 'lucide-react';

const GenericPage = ({ title }) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500">Manage your {title.toLowerCase()} here.</p>
      </div>
    </div>
    <div className="card p-4 flex flex-col sm:flex-row gap-4">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search size={18} />
        </div>
        <input type="text" placeholder={`Search ${title}...`} className="input-field pl-10" />
      </div>
    </div>
    <div className="card p-8 text-center text-slate-500">
      <p>Data grid for {title} will be displayed here.</p>
      <p className="text-sm mt-2">Currently showing demo generic page.</p>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    // Database initialization handles synchronous defaults now
  }, []);

  const isAuthenticated = !!localStorage.getItem('authSession');

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<GenericPage title="New Product" />} />
          <Route path="products/:id" element={<GenericPage title="Product Details" />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<SalesHistory />} />
          <Route path="sales/returns" element={<GenericPage title="Sales Returns" />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchases/new" element={<GenericPage title="New Purchase" />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<GenericPage title="Customer Details" />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="suppliers/:id" element={<GenericPage title="Supplier Details" />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="services" element={<Services />} />
          <Route path="reports/*" element={<Reports />} />
          <Route path="users" element={<GenericPage title="Users & Roles" />} />
          <Route path="settings/*" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
