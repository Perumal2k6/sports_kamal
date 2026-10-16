import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  TrendingUp, ShoppingCart, Package, IndianRupee, AlertTriangle, 
  RefreshCw, FileText, ArrowRight, UserPlus, Truck, Bell 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getSales, getProducts, getPurchases, getExpenses, getCustomers, getSuppliers } from '../lib/db';

const COLORS = ['#DC2626', '#2563EB', '#16A34A', '#F97316', '#9333EA', '#14B8A6', '#64748B'];

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, trend, trendUp }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorClass.bg} ${colorClass.text}`}>
        <Icon size={24} />
      </div>
    </div>
    <div className="mt-4 flex items-center text-sm">
      {trend && (
        <>
          <span className={`font-semibold ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {trendUp ? '+' : '-'}{trend}
          </span>
          <span className="text-slate-500 ml-2 mr-2">vs last period</span>
          <span className="text-slate-300">|</span>
        </>
      )}
      <span className={`text-slate-500 ${trend ? 'ml-2' : ''}`}>{subtitle}</span>
    </div>
  </div>
);

// Helper for dates
const getRangeDates = (range) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (range === 'Today') {
    return { start: todayStart, end: now };
  } else if (range === 'Yesterday') {
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);
    return { start: yesterday, end: yEnd };
  } else if (range === 'This Week') {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1)); // Monday
    return { start, end: now };
  } else if (range === 'Last Week') {
    const end = new Date(todayStart);
    end.setDate(end.getDate() - end.getDay() + (end.getDay() === 0 ? -6 : 1) - 1);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0,0,0,0);
    return { start, end };
  } else if (range === 'This Month') {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  } else if (range === 'Last Month') {
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { start, end };
  } else if (range === 'This Year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: now };
  }
  return { start: new Date(0), end: now };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalRange, setGlobalRange] = useState('Today');
  const [chartRange, setChartRange] = useState('This Week');
  
  const [data, setData] = useState({
    products: [],
    sales: [],
    purchases: [],
    expenses: [],
    customers: [],
    suppliers: []
  });

  const loadData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setData({
        products: getProducts(),
        sales: getSales(),
        purchases: getPurchases(),
        expenses: getExpenses(),
        customers: getCustomers(),
        suppliers: getSuppliers()
      });
      setIsRefreshing(false);
    }, 400);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics based on globalRange
  const { start: gStart, end: gEnd } = getRangeDates(globalRange);
  
  const periodSales = data.sales.filter(s => {
    const d = new Date(s.date);
    return d >= gStart && d <= gEnd;
  });
  
  const periodSalesTotal = periodSales.reduce((sum, s) => sum + s.total, 0);
  
  const activeProducts = data.products.filter(p => p.status === 'Active').length;
  const lowStockItems = data.products.filter(p => p.stock > 0 && p.stock <= 5);
  const outOfStockItems = data.products.filter(p => p.stock === 0);
  const totalLowStock = lowStockItems.length + outOfStockItems.length;
  const stockValue = data.products.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0);

  // Business Overview
  const periodPurchases = data.purchases.filter(p => {
    const d = new Date(p.date);
    return d >= gStart && d <= gEnd;
  }).reduce((sum, p) => sum + p.total, 0);
  
  const periodExpenses = data.expenses.filter(e => {
    const d = new Date(e.date);
    return d >= gStart && d <= gEnd;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const estimatedProfit = periodSalesTotal - periodPurchases - periodExpenses;

  // Chart Data
  const getChartData = () => {
    const { start: cStart, end: cEnd } = getRangeDates(chartRange);
    const cSales = data.sales.filter(s => {
      const d = new Date(s.date);
      return d >= cStart && d <= cEnd;
    });

    if (chartRange.includes('Week')) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const result = days.map(d => ({ name: d, sales: 0 }));
      cSales.forEach(s => {
        const d = new Date(s.date);
        let dayIdx = d.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6; // Sunday
        if (result[dayIdx]) result[dayIdx].sales += s.total;
      });
      return result;
    } else {
      const daysInMonth = cEnd.getDate();
      const result = [];
      for (let i = 1; i <= daysInMonth; i++) {
        result.push({ name: `${i}`, sales: 0 });
      }
      cSales.forEach(s => {
        const d = new Date(s.date);
        const day = d.getDate();
        if (result[day - 1]) result[day - 1].sales += s.total;
      });
      return result;
    }
  };
  const chartData = getChartData();

  // Top Selling Products
  const getTopProducts = () => {
    const counts = {};
    data.sales.forEach(s => {
      s.items.forEach(i => {
        if (!counts[i.id]) counts[i.id] = { name: i.name, qty: 0 };
        counts[i.id].qty += i.qty;
      });
    });
    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  };
  const topProducts = getTopProducts();

  // Alerts
  const pendingCustomers = data.sales.filter(s => s.amountReceived < s.total).length;
  const pendingSuppliers = data.purchases.filter(p => p.amountPaid < p.total).length;

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center space-x-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <select 
            className="border-none bg-transparent font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
            value={globalRange}
            onChange={e => setGlobalRange(e.target.value)}
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>This Week</option>
            <option>Last Week</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
          <div className="w-px h-6 bg-slate-200"></div>
          <button 
            onClick={loadData}
            className={`p-2 rounded-md hover:bg-slate-100 text-slate-600 transition-all ${isRefreshing ? 'animate-spin text-primary-600' : ''}`}
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={globalRange === 'Today' ? "Today's Sales" : `${globalRange} Sales`}
          value={`₹${periodSalesTotal.toLocaleString('en-IN')}`} 
          subtitle="Total revenue"
          icon={IndianRupee} 
          trend="12.5%" 
          trendUp={true}
          colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-600' }}
        />
        <StatCard 
          title="Total Products" 
          value={activeProducts} 
          subtitle="Active products"
          icon={Package} 
          colorClass={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
        />
        <StatCard 
          title="Low Stock Items" 
          value={totalLowStock} 
          subtitle="Needs attention"
          icon={AlertTriangle} 
          colorClass={totalLowStock > 0 ? { bg: 'bg-red-100', text: 'text-red-600' } : { bg: 'bg-orange-100', text: 'text-orange-600' }}
        />
        <StatCard 
          title="Stock Value" 
          value={`₹${stockValue.toLocaleString('en-IN')}`} 
          subtitle="Current inventory value"
          icon={TrendingUp} 
          colorClass={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
        />
      </div>

      {/* Main Chart & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Weekly Sales Overview</h3>
              <p className="text-sm text-slate-500">Sales performance for the selected period</p>
            </div>
            <select 
              className="input-field py-1.5 text-sm w-36 outline-none"
              value={chartRange}
              onChange={e => setChartRange(e.target.value)}
            >
              <option>This Week</option>
              <option>Last Week</option>
              <option>This Month</option>
              <option>Last Month</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            {chartData.every(d => d.sales === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={48} className="mb-3 opacity-20" />
                <p>No sales data for {chartRange}</p>
                <Link to="/billing" className="mt-4 btn-primary py-2 px-4 text-sm">Create New Bill</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748B', fontSize: 12 }} 
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`₹${value}`, 'Sales']}
                  />
                  <Bar dataKey="sales" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Bills</h3>
            <Link to="/sales-history" className="text-sm text-primary-600 font-semibold hover:text-primary-800 flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-auto">
            {data.sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group cursor-pointer" onClick={() => navigate('/sales-history')}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{sale.invoiceNo}</p>
                    <p className="text-xs text-slate-500">{sale.customerId ? 'Registered Customer' : 'Walk-in Customer'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">₹{sale.total.toFixed(2)}</p>
                  <p className="text-xs font-medium text-slate-500">{new Date(sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {sale.paymentMethod}</p>
                </div>
              </div>
            ))}
            {data.sales.length === 0 && (
              <div className="text-center py-10 text-slate-500 h-full flex flex-col items-center justify-center">
                <FileText size={32} className="mb-3 opacity-20" />
                <p className="text-sm">No recent bills found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Low Stock & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Low Stock Products</h3>
            <Link to="/inventory" className="text-sm text-primary-600 font-semibold hover:text-primary-800 flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {[...outOfStockItems, ...lowStockItems].slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate('/inventory')}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Stock: {p.stock} / Minimum: 5</p>
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    p.stock === 0 ? 'bg-red-100 text-red-700' : 
                    p.stock <= 2 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.stock === 0 ? 'OUT OF STOCK' : p.stock <= 2 ? 'CRITICAL' : 'LOW STOCK'}
                  </span>
                </div>
              </div>
            ))}
            {totalLowStock === 0 && (
              <div className="text-center py-6 text-slate-500">
                <p className="text-sm">All products are well stocked.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Top Selling Products</h3>
            <Link to="/reports" className="text-sm text-primary-600 font-semibold hover:text-primary-800 flex items-center">
              Report <ArrowRight size={14} className="ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 cursor-pointer" onClick={() => navigate('/reports')}>
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm mr-4">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{p.qty} sold</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="text-center py-6 text-slate-500">
                <p className="text-sm">No sales data yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Row: Quick Actions, Business Overview, Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/billing" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-primary-50 hover:text-primary-600 rounded-xl border border-slate-100 transition-colors group">
              <ShoppingCart size={24} className="text-slate-400 group-hover:text-primary-600 mb-2" />
              <span className="text-sm font-semibold">New Bill</span>
            </Link>
            <Link to="/products" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl border border-slate-100 transition-colors group">
              <Package size={24} className="text-slate-400 group-hover:text-blue-600 mb-2" />
              <span className="text-sm font-semibold">Add Product</span>
            </Link>
            <Link to="/purchases" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 rounded-xl border border-slate-100 transition-colors group">
              <Truck size={24} className="text-slate-400 group-hover:text-purple-600 mb-2" />
              <span className="text-sm font-semibold">Add Purchase</span>
            </Link>
            <Link to="/customers" className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl border border-slate-100 transition-colors group">
              <UserPlus size={24} className="text-slate-400 group-hover:text-emerald-600 mb-2" />
              <span className="text-sm font-semibold">Add Customer</span>
            </Link>
          </div>
        </div>

        {/* Business Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Business Overview</h3>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider bg-slate-100 px-2 py-1 rounded">For {globalRange}</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
              <span className="text-sm font-medium text-slate-600">Sales</span>
              <span className="text-sm font-bold text-slate-800">₹{periodSalesTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
              <span className="text-sm font-medium text-slate-600">Purchases</span>
              <span className="text-sm font-bold text-slate-800">₹{periodPurchases.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
              <span className="text-sm font-medium text-slate-600">Expenses</span>
              <span className="text-sm font-bold text-slate-800">₹{periodExpenses.toLocaleString('en-IN')}</span>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center p-2">
              <span className="text-sm font-bold text-slate-800">Estimated Profit</span>
              <span className={`text-lg font-bold ${estimatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₹{estimatedProfit.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Bell size={18} className="mr-2 text-slate-400" /> Notifications
          </h3>
          <div className="space-y-3">
            {outOfStockItems.length > 0 && (
              <div onClick={() => navigate('/inventory')} className="p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium flex justify-between cursor-pointer hover:bg-red-100 transition-colors">
                <span>{outOfStockItems.length} products out of stock</span>
                <ArrowRight size={16} />
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div onClick={() => navigate('/inventory')} className="p-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium flex justify-between cursor-pointer hover:bg-orange-100 transition-colors">
                <span>{lowStockItems.length} products low stock</span>
                <ArrowRight size={16} />
              </div>
            )}
            {pendingCustomers > 0 && (
              <div onClick={() => navigate('/customers')} className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex justify-between cursor-pointer hover:bg-blue-100 transition-colors">
                <span>{pendingCustomers} customer payments pending</span>
                <ArrowRight size={16} />
              </div>
            )}
            {pendingSuppliers > 0 && (
              <div onClick={() => navigate('/purchases')} className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium flex justify-between cursor-pointer hover:bg-purple-100 transition-colors">
                <span>{pendingSuppliers} supplier payments pending</span>
                <ArrowRight size={16} />
              </div>
            )}
            {outOfStockItems.length === 0 && lowStockItems.length === 0 && pendingCustomers === 0 && pendingSuppliers === 0 && (
              <div className="text-center py-6 text-slate-500">
                <Bell size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
