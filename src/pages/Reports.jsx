import React, { useState, useEffect, useMemo } from 'react';
import { Download, Printer, Calendar, TrendingUp, IndianRupee, ShoppingCart, Truck, Users, Package, FileText, ChevronLeft, Search, Plus, X } from 'lucide-react';
import { getSales, getPurchases, getCustomers, getSuppliers, getProducts, getExpenses, addExpense } from '../lib/db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Pagination from '../components/Pagination';

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#14B8A6'];

// Date Helpers
const getStartOfDay = (date = new Date()) => { const d = new Date(date); d.setHours(0,0,0,0); return d; };
const getEndOfDay = (date = new Date()) => { const d = new Date(date); d.setHours(23,59,59,999); return d; };

const getDateRange = (preset) => {
  const now = new Date();
  let start, end;
  switch (preset) {
    case 'Today':
      start = getStartOfDay(now);
      end = getEndOfDay(now);
      break;
    case 'Yesterday':
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      start = getStartOfDay(yest);
      end = getEndOfDay(yest);
      break;
    case 'This Week':
      start = getStartOfDay(new Date(now.setDate(now.getDate() - now.getDay())));
      end = getEndOfDay(new Date());
      break;
    case 'This Month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = getEndOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
    case 'Last Month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = getEndOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      break;
    case 'This Year':
      start = new Date(now.getFullYear(), 0, 1);
      end = getEndOfDay(new Date(now.getFullYear(), 11, 31));
      break;
    default:
      start = getStartOfDay(new Date());
      end = getEndOfDay(new Date());
  }
  return { start, end };
};

const ReportCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex justify-between items-start">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
      <div className="p-2 rounded-lg bg-slate-50 text-slate-500" style={{ color }}>
        <Icon size={20} />
      </div>
    </div>
    <div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      {subtext && <p className="text-xs font-medium mt-1 text-slate-500">{subtext}</p>}
    </div>
  </div>
);

const Reports = () => {
  const [data, setData] = useState({ sales: [], purchases: [], customers: [], suppliers: [], products: [], expenses: [] });
  
  // Date State
  const [datePreset, setDatePreset] = useState('This Month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [activeDateRange, setActiveDateRange] = useState(getDateRange('This Month'));

  // View State
  const [activeReport, setActiveReport] = useState(null);
  
  // Report Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ date: new Date().toISOString().split('T')[0], category: 'Rent', description: '', amount: '', method: 'Cash', notes: '' });

  const loadData = () => {
    setData({
      sales: getSales().filter(s => s.status !== 'Deleted' && s.status !== 'Cancelled'),
      purchases: getPurchases().filter(p => p.status !== 'Deleted' && p.status !== 'Cancelled'),
      customers: getCustomers(),
      suppliers: getSuppliers(),
      products: getProducts(),
      expenses: getExpenses()
    });
  };

  useEffect(() => { loadData(); }, []);

  // Update date range
  useEffect(() => {
    if (datePreset !== 'Custom Date') {
      setActiveDateRange(getDateRange(datePreset));
    }
  }, [datePreset]);

  const applyCustomDate = () => {
    if (customRange.start && customRange.end) {
      setActiveDateRange({ start: getStartOfDay(customRange.start), end: getEndOfDay(customRange.end) });
      setDatePreset('Custom Date');
      setShowCustomDate(false);
    }
  };

  // -------------------------------------------------------------
  // Calculate Base Metrics based on Date Range
  // -------------------------------------------------------------
  const { sales, purchases, customers, suppliers, products, expenses } = data;
  
  const filteredSales = useMemo(() => sales.filter(s => new Date(s.date) >= activeDateRange.start && new Date(s.date) <= activeDateRange.end), [sales, activeDateRange]);
  const filteredPurchases = useMemo(() => purchases.filter(p => new Date(p.date) >= activeDateRange.start && new Date(p.date) <= activeDateRange.end), [purchases, activeDateRange]);
  const filteredExpenses = useMemo(() => expenses.filter(e => new Date(e.date) >= activeDateRange.start && new Date(e.date) <= activeDateRange.end), [expenses, activeDateRange]);

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate Gross Profit properly (Revenue - COGS)
  let cogs = 0;
  filteredSales.forEach(s => {
    s.items?.forEach(item => {
      // Find actual product to get purchase rate if not stored in sale item
      const prod = products.find(p => p.id === (item.productId || item.id));
      const costRate = item.purchaseRate || (prod ? prod.price * 0.7 : 0);
      cogs += costRate * (item.quantity || 1);
    });
  });
  
  const grossProfit = totalSales - cogs;
  
  // GST
  const gstCollected = filteredSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
  
  // Outstanding
  const custOut = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  const supOut = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  
  // Stock Value
  const stockValue = products.reduce((sum, p) => sum + (p.stock * (p.price * 0.7)), 0);

  // Previous Period Comparison (Simple exact previous duration)
  const duration = activeDateRange.end.getTime() - activeDateRange.start.getTime();
  const prevStart = new Date(activeDateRange.start.getTime() - duration - 86400000);
  const prevEnd = new Date(activeDateRange.start.getTime() - 1000);
  
  const prevSales = sales.filter(s => new Date(s.date) >= prevStart && new Date(s.date) <= prevEnd).reduce((sum, s) => sum + s.total, 0);
  const salesGrowth = prevSales ? ((totalSales - prevSales) / prevSales) * 100 : 0;
  
  const prevPurchases = purchases.filter(p => new Date(p.date) >= prevStart && new Date(p.date) <= prevEnd).reduce((sum, p) => sum + p.total, 0);
  const purchaseGrowth = prevPurchases ? ((totalPurchases - prevPurchases) / prevPurchases) * 100 : 0;

  // -------------------------------------------------------------
  // Chart Data Preparation
  // -------------------------------------------------------------
  
  // Payment Methods Donut
  const paymentMethods = filteredSales.reduce((acc, s) => {
    const method = s.paymentMethod || 'Unknown';
    acc[method] = (acc[method] || 0) + s.total;
    return acc;
  }, {});
  const paymentChartData = Object.keys(paymentMethods).map(k => ({ name: k, value: paymentMethods[k] }));

  // Sales Trend Chart (Group by day if short range, else month)
  const trendData = [];
  if (duration <= 31 * 86400000) {
    // Group by Day
    let current = new Date(activeDateRange.start);
    while (current <= activeDateRange.end) {
      const dateStr = current.toISOString().split('T')[0];
      const daySales = filteredSales.filter(s => s.date.startsWith(dateStr)).reduce((sum, s) => sum + s.total, 0);
      const dayPur = filteredPurchases.filter(p => p.date.startsWith(dateStr)).reduce((sum, p) => sum + p.total, 0);
      trendData.push({ name: current.toLocaleDateString('en-IN', {day:'numeric', month:'short'}), Sales: daySales, Purchases: dayPur });
      current.setDate(current.getDate() + 1);
    }
  }

  // Top Products
  const productSales = {};
  filteredSales.forEach(s => {
    s.items?.forEach(item => {
      const id = item.productId || item.id;
      if (!productSales[id]) productSales[id] = { name: item.productName || item.name, qty: 0, revenue: 0 };
      productSales[id].qty += (item.quantity || 1);
      productSales[id].revenue += (item.total || 0);
    });
  });
  const topProducts = Object.values(productSales).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

  // -------------------------------------------------------------
  // Export and Print
  // -------------------------------------------------------------

  const handleExportCSV = (tableId, filename) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll('td, th');
      for (let j = 0; j < cols.length; j++) {
        let data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/,/g, '');
        row.push('"' + data + '"');
      }
      csv.push(row.join(','));
    }
    const csvFile = new Blob([csv.join('\n')], {type: 'text/csv'});
    const downloadLink = document.createElement('a');
    downloadLink.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    addExpense({
      ...expenseForm,
      amount: Number(expenseForm.amount),
      date: new Date(expenseForm.date).toISOString()
    });
    setShowExpenseModal(false);
    setExpenseForm({ date: new Date().toISOString().split('T')[0], category: 'Rent', description: '', amount: '', method: 'Cash', notes: '' });
    loadData();
  };

  // -------------------------------------------------------------
  // Render Main Dashboard
  // -------------------------------------------------------------
  if (!activeReport) {
    return (
      <div className="space-y-6 pb-12 print:hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Reports & Analytics</h1>
            <p className="text-slate-500 font-medium">Track sales, purchases, inventory, GST and business performance.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input-field py-2 font-bold" value={datePreset} onChange={e => {
                if (e.target.value === 'Custom Date') setShowCustomDate(true);
                else setDatePreset(e.target.value);
              }}>
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
              <option>Custom Date</option>
            </select>
            {showCustomDate && (
              <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded p-1">
                <input type="date" className="text-sm px-2 py-1 outline-none" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
                <span className="text-slate-400">to</span>
                <input type="date" className="text-sm px-2 py-1 outline-none" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
                <button onClick={applyCustomDate} className="bg-slate-800 text-white px-3 py-1 rounded text-sm font-bold">Apply</button>
                <button onClick={() => {setShowCustomDate(false); setDatePreset('This Month');}} className="text-slate-400 hover:text-slate-800 px-2"><X size={16}/></button>
              </div>
            )}
            <button className="btn-secondary flex items-center py-2" onClick={handlePrint}>
              <Printer size={18} className="mr-2" /> Print Dashboard
            </button>
          </div>
        </div>

        {/* Date Context */}
        <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold inline-block shadow-sm">
          {activeDateRange.start.toLocaleDateString('en-IN')} – {activeDateRange.end.toLocaleDateString('en-IN')}
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard title="Total Sales" value={`₹${totalSales.toLocaleString('en-IN', {minimumFractionDigits:2})}`} subtext={salesGrowth ? `${salesGrowth > 0 ? '+' : ''}${salesGrowth.toFixed(1)}% vs prev period` : null} icon={IndianRupee} color="#10B981" />
          <ReportCard title="Total Purchases" value={`₹${totalPurchases.toLocaleString('en-IN', {minimumFractionDigits:2})}`} subtext={purchaseGrowth ? `${purchaseGrowth > 0 ? '+' : ''}${purchaseGrowth.toFixed(1)}% vs prev period` : null} icon={ShoppingCart} color="#3B82F6" />
          <ReportCard title="Gross Profit" value={`₹${grossProfit.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={TrendingUp} color="#8B5CF6" />
          <ReportCard title="Total Expenses" value={`₹${totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={FileText} color="#EF4444" />
          
          <ReportCard title="GST Collected" value={`₹${gstCollected.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={FileText} color="#F59E0B" />
          <ReportCard title="Customer Outstanding" value={`₹${custOut.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={Users} color="#F43F5E" />
          <ReportCard title="Supplier Outstanding" value={`₹${supOut.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={Truck} color="#EC4899" />
          <ReportCard title="Stock Value" value={`₹${stockValue.toLocaleString('en-IN', {minimumFractionDigits:2})}`} icon={Package} color="#14B8A6" />
        </div>

        {/* Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5 flex flex-col h-[400px]">
            <h3 className="font-bold text-slate-800 mb-6">Sales vs Purchases Overview</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dx={-10} tickFormatter={value => `₹${value}`} />
                  <RechartsTooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={value => `₹${value}`} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="Sales" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Purchases" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="card p-5 flex flex-col h-[400px]">
            <h3 className="font-bold text-slate-800 mb-6">Payment Methods</h3>
            <div className="flex-1 w-full min-h-0 relative">
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {paymentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={value => `₹${value}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No payment data for this period</div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Reports Entry */}
        <h2 className="text-xl font-bold text-slate-800 mt-10 mb-4">Detailed Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { id: 'Sales Report', icon: IndianRupee, desc: 'Detailed invoice history and taxes', color: 'text-emerald-500 bg-emerald-50' },
            { id: 'Purchase Report', icon: ShoppingCart, desc: 'Supplier bills and purchase history', color: 'text-blue-500 bg-blue-50' },
            { id: 'Inventory Report', icon: Package, desc: 'Current stock value and status', color: 'text-teal-500 bg-teal-50' },
            { id: 'Profit & Loss', icon: TrendingUp, desc: 'Revenue, COGS and net margin', color: 'text-purple-500 bg-purple-50' },
            { id: 'GST Report', icon: FileText, desc: 'Estimated output and input taxes', color: 'text-orange-500 bg-orange-50' },
            { id: 'Customer Report', icon: Users, desc: 'Customer sales and outstanding', color: 'text-rose-500 bg-rose-50' },
            { id: 'Supplier Report', icon: Truck, desc: 'Supplier purchases and payables', color: 'text-pink-500 bg-pink-50' },
            { id: 'Expense Report', icon: FileText, desc: 'Business expenses breakdown', color: 'text-red-500 bg-red-50' },
          ].map(r => (
            <div key={r.id} onClick={() => { setActiveReport(r.id); setCurrentPage(1); setSearchQuery(''); }} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:border-primary-500 hover:shadow-md cursor-pointer transition-all group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${r.color}`}>
                <r.icon size={20} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{r.id}</h3>
              <p className="text-sm text-slate-500 flex-1">{r.desc}</p>
              <div className="mt-4 text-sm font-bold text-primary-600 flex items-center group-hover:translate-x-1 transition-transform">
                View Report &rarr;
              </div>
            </div>
          ))}
        </div>

        {/* Expenses Floating Button or action */}
        <div className="flex justify-end mt-4">
          <button onClick={() => setShowExpenseModal(true)} className="btn-primary flex items-center shadow-lg"><Plus size={18} className="mr-2"/> Add Expense</button>
        </div>

        {/* Add Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl bg-slate-50">
                <h2 className="font-bold text-slate-800">Add Expense</h2>
                <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date *</label>
                    <input type="date" required className="input-field" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                    <select className="input-field" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                      <option>Rent</option>
                      <option>Salary</option>
                      <option>Electricity</option>
                      <option>Transport</option>
                      <option>Maintenance</option>
                      <option>Marketing</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description *</label>
                  <input type="text" required className="input-field" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹) *</label>
                    <input type="number" min="1" required className="input-field font-bold" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
                    <select className="input-field" value={expenseForm.method} onChange={e => setExpenseForm({...expenseForm, method: e.target.value})}>
                      <option>Cash</option>
                      <option>UPI</option>
                      <option>Card</option>
                      <option>Bank</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Expense</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render Detailed Report Views
  // -------------------------------------------------------------
  
  let reportContent = null;
  const tableId = `report-table-${activeReport.replace(/ /g, '-')}`;

  if (activeReport === 'Sales Report') {
    const list = filteredSales.filter(s => s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) || (s.customerName||'').toLowerCase().includes(searchQuery.toLowerCase()));
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const sumTotal = list.reduce((a,b)=>a+b.total, 0);
    const sumGst = list.reduce((a,b)=>a+(b.taxAmount||0), 0);
    
    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">GST</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(s => (
                <tr key={s.id}>
                  <td className="py-3 px-4">{new Date(s.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{s.invoiceNo}</td>
                  <td className="py-3 px-4">{s.customerName || 'Walk-in Customer'}</td>
                  <td className="py-3 px-4 text-center">{s.items?.length || 0}</td>
                  <td className="py-3 px-4 text-right text-slate-500">₹{(s.taxAmount||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{s.total.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-center">{s.paymentMethod || 'Cash'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="7" className="text-center py-10 text-slate-500">No sales found for this period.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="4" className="py-3 px-4 text-right">Totals:</td>
                <td className="py-3 px-4 text-right">₹{sumGst.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td className="py-3 px-4 text-right text-emerald-600">₹{sumTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={list.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  } 
  else if (activeReport === 'Purchase Report') {
    const list = filteredPurchases.filter(p => p.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const sumTotal = list.reduce((a,b)=>a+(b.total||0), 0);
    const sumPaid = list.reduce((a,b)=>a+(b.amountPaid||0), 0);

    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(p => {
                const supplier = suppliers.find(s => s.id === p.supplierId);
                const out = (p.total||0) - (p.amountPaid||0);
                return (
                <tr key={p.id}>
                  <td className="py-3 px-4">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{p.invoiceNo}</td>
                  <td className="py-3 px-4">{supplier ? supplier.name : '-'}</td>
                  <td className="py-3 px-4 text-center">{p.items?.length || 0}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">₹{(p.total||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-right text-emerald-600">₹{(p.amountPaid||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-bold">₹{out.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-center">{p.paymentStatus}</td>
                </tr>
              )})}
              {list.length === 0 && <tr><td colSpan="8" className="text-center py-10 text-slate-500">No purchases found for this period.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="4" className="py-3 px-4 text-right">Totals:</td>
                <td className="py-3 px-4 text-right text-blue-600">₹{sumTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td className="py-3 px-4 text-right text-emerald-600">₹{sumPaid.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td className="py-3 px-4 text-right text-red-600">₹{(sumTotal-sumPaid).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={list.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else if (activeReport === 'Inventory Report') {
    const list = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku||'').toLowerCase().includes(searchQuery.toLowerCase()));
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const sumVal = list.reduce((a,b) => a + (b.stock * (b.price * 0.7)), 0);

    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Cost Price (Est)</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Stock Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(p => (
                <tr key={p.id}>
                  <td className="py-3 px-4">{p.sku || '-'}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                  <td className="py-3 px-4">{p.category || '-'}</td>
                  <td className={`py-3 px-4 text-center font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-800'}`}>{p.stock}</td>
                  <td className="py-3 px-4 text-right">₹{(p.price * 0.7).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-right">₹{(p.price).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-right font-bold text-blue-600">₹{(p.stock * p.price * 0.7).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="7" className="text-center py-10 text-slate-500">No inventory data found.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="6" className="py-3 px-4 text-right">Total Stock Value:</td>
                <td className="py-3 px-4 text-right text-blue-600">₹{sumVal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={list.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else if (activeReport === 'Profit & Loss') {
    // Detailed P&L calculation
    reportContent = (
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-8 print:border-none print:shadow-none print:p-0">
        <h3 className="text-2xl font-black text-center text-slate-800 mb-6">Profit & Loss Statement</h3>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Revenue</h4>
            <div className="flex justify-between py-2"><span className="text-slate-600">Gross Sales</span><span className="font-medium">₹{totalSales.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
            <div className="flex justify-between py-2"><span className="text-slate-600">Sales Returns & Discounts (Est)</span><span className="font-medium text-red-500">-₹0.00</span></div>
            <div className="flex justify-between py-3 border-t border-slate-100 font-bold"><span className="text-slate-800">Net Revenue</span><span className="text-emerald-600">₹{totalSales.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Cost of Goods Sold (COGS)</h4>
            <div className="flex justify-between py-2"><span className="text-slate-600">Product Costs</span><span className="font-medium">₹{cogs.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
            <div className="flex justify-between py-3 border-t border-slate-100 font-bold"><span className="text-slate-800">Total COGS</span><span className="text-red-500">₹{cogs.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg flex justify-between font-black text-lg">
            <span>Gross Profit</span>
            <span className="text-blue-600">₹{grossProfit.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3">Operating Expenses</h4>
            {filteredExpenses.map(e => (
              <div key={e.id} className="flex justify-between py-2"><span className="text-slate-600">{e.category} - {e.description}</span><span className="font-medium">₹{e.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
            ))}
            {filteredExpenses.length === 0 && <div className="text-sm text-slate-400 py-2">No expenses recorded.</div>}
            <div className="flex justify-between py-3 border-t border-slate-100 font-bold"><span className="text-slate-800">Total Expenses</span><span className="text-red-500">₹{totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
          </div>

          <div className="bg-slate-800 text-white p-5 rounded-xl flex justify-between items-center shadow-lg print:border print:border-black print:text-black print:bg-white print:shadow-none">
            <span className="text-xl font-black tracking-wide">NET PROFIT</span>
            <span className="text-3xl font-black">₹{(grossProfit - totalExpenses).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
          </div>
        </div>
      </div>
    );
  }
  else if (activeReport === 'GST Report') {
    // GST Output (Sales)
    let outputTaxable = 0, outputCgst = 0, outputSgst = 0, outputIgst = 0;
    filteredSales.forEach(s => {
      s.items?.forEach(i => {
        outputTaxable += (i.taxableAmount || 0);
        // Naive split of GST for demo (Assuming intra-state CGST+SGST)
        const halfGst = (i.gstAmount || 0) / 2;
        outputCgst += halfGst;
        outputSgst += halfGst;
      });
    });
    
    // GST Input (Purchases)
    let inputTaxable = 0, inputCgst = 0, inputSgst = 0, inputIgst = 0;
    filteredPurchases.forEach(p => {
      p.items?.forEach(i => {
        inputTaxable += (i.taxableAmount || 0);
        const halfGst = (i.gstAmount || 0) / 2;
        inputCgst += halfGst;
        inputSgst += halfGst;
      });
    });

    reportContent = (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-orange-50 text-orange-800 p-4 rounded-lg font-bold flex items-center border border-orange-200 print:hidden">
          <FileText className="mr-3" /> Note: This report provides an estimated GST summary based on recorded transactions. It is not a formal tax filing.
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print:border-black print:shadow-none">
            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-200 pb-3 mb-4">Output GST (Sales)</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">Taxable Value</span><span className="font-bold">₹{outputTaxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">CGST</span><span className="font-medium text-slate-800">₹{outputCgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">SGST</span><span className="font-medium text-slate-800">₹{outputSgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">IGST</span><span className="font-medium text-slate-800">₹{outputIgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black"><span className="text-slate-800">Total Output Tax</span><span className="text-orange-600">₹{(outputCgst+outputSgst+outputIgst).toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print:border-black print:shadow-none">
            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-200 pb-3 mb-4">Input GST (Purchases)</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-slate-600">Taxable Value</span><span className="font-bold">₹{inputTaxable.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">CGST</span><span className="font-medium text-slate-800">₹{inputCgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">SGST</span><span className="font-medium text-slate-800">₹{inputSgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">IGST</span><span className="font-medium text-slate-800">₹{inputIgst.toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black"><span className="text-slate-800">Total Input Tax</span><span className="text-emerald-600">₹{(inputCgst+inputSgst+inputIgst).toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 text-white p-6 rounded-xl flex flex-col sm:flex-row justify-between items-center shadow-lg print:bg-white print:text-black print:border print:border-black print:shadow-none">
          <div>
            <h3 className="text-lg font-bold opacity-80">Estimated GST Payable</h3>
            <p className="text-sm opacity-60">Output Tax - Input Tax</p>
          </div>
          <span className="text-4xl font-black mt-3 sm:mt-0">
            ₹{((outputCgst+outputSgst+outputIgst) - (inputCgst+inputSgst+inputIgst)).toLocaleString('en-IN', {minimumFractionDigits:2})}
          </span>
        </div>
      </div>
    );
  }
  else if (activeReport === 'Stock Movement') {
    // Generate basic stock movement log
    const movements = [];
    products.forEach(p => {
      // Fake historical opening stock log if none
      movements.push({ id: `open-${p.id}`, date: p.createdAt || new Date().toISOString(), product: p.name, sku: p.sku, type: 'Opening Stock', qty: p.stock });
    });
    // Add sales out
    filteredSales.forEach(s => {
      s.items?.forEach(i => {
        movements.push({ id: `sale-${s.id}-${i.productId||i.id}`, date: s.date, product: i.productName||i.name, sku: i.sku, type: 'Sale', qty: -(i.quantity||1), ref: s.invoiceNo });
      });
    });
    // Add purchases in
    filteredPurchases.forEach(p => {
      p.items?.forEach(i => {
        movements.push({ id: `pur-${p.id}-${i.productId||i.id}`, date: p.date, product: i.productName||i.name, sku: i.sku, type: 'Purchase', qty: (i.quantity||1), ref: p.invoiceNo });
      });
    });
    // Note: Actual system might have a dedicated stockMovements array. Using derived for demo completeness if missing.
    movements.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    const paginated = movements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible bg-white rounded-xl border border-slate-200">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Qty Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(m => (
                <tr key={m.id}>
                  <td className="py-3 px-4">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{m.product}</td>
                  <td className="py-3 px-4">{m.sku || '-'}</td>
                  <td className="py-3 px-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{m.type}</span></td>
                  <td className="py-3 px-4 text-slate-500">{m.ref || '-'}</td>
                  <td className={`py-3 px-4 text-right font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.qty > 0 ? `+${m.qty}` : m.qty}</td>
                </tr>
              ))}
              {movements.length === 0 && <tr><td colSpan="6" className="text-center py-10 text-slate-500">No stock movements found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={movements.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else if (activeReport === 'Customer Report') {
    const list = customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const sumOut = list.reduce((a,b)=>a+(b.balance||0), 0);

    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible bg-white rounded-xl border border-slate-200">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4 text-right">Outstanding Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(c => (
                <tr key={c.id}>
                  <td className="py-3 px-4 font-bold text-slate-800">{c.name}</td>
                  <td className="py-3 px-4">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">₹{(c.balance||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-center">{c.status || 'Active'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="4" className="text-center py-10 text-slate-500">No customers found.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="2" className="py-3 px-4 text-right">Total Outstanding:</td>
                <td className="py-3 px-4 text-right text-red-600">₹{sumOut.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={list.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else if (activeReport === 'Supplier Report') {
    const list = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const paginated = list.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const sumOut = list.reduce((a,b)=>a+(b.balance||0), 0);

    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible bg-white rounded-xl border border-slate-200">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Supplier / Company</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4 text-right">Outstanding Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(s => (
                <tr key={s.id}>
                  <td className="py-3 px-4 font-bold text-slate-800">{s.name} {s.companyName ? `(${s.companyName})` : ''}</td>
                  <td className="py-3 px-4">{s.phone || '-'}</td>
                  <td className="py-3 px-4">{s.gstin || '-'}</td>
                  <td className="py-3 px-4 text-right font-bold text-orange-600">₹{(s.balance||0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                  <td className="py-3 px-4 text-center">{s.status || 'Active'}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-500">No suppliers found.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="3" className="py-3 px-4 text-right">Total Payable:</td>
                <td className="py-3 px-4 text-right text-orange-600">₹{sumOut.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={list.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else if (activeReport === 'Expense Report') {
    const paginated = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    reportContent = (
      <>
        <div className="overflow-x-auto print:overflow-visible bg-white rounded-xl border border-slate-200">
          <table id={tableId} className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(e => (
                <tr key={e.id}>
                  <td className="py-3 px-4">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-700">{e.category}</td>
                  <td className="py-3 px-4 text-slate-600">{e.description}</td>
                  <td className="py-3 px-4 text-center">{e.method || 'Cash'}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">₹{e.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && <tr><td colSpan="5" className="text-center py-10 text-slate-500">No expenses found for this period.</td></tr>}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-200">
              <tr>
                <td colSpan="4" className="py-3 px-4 text-right">Total Expenses:</td>
                <td className="py-3 px-4 text-right text-red-600">₹{totalExpenses.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="print:hidden"><Pagination currentPage={currentPage} totalItems={filteredExpenses.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></div>
      </>
    );
  }
  else {
    // Fallback for others
    reportContent = (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
        <FileText size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Detailed view available soon</h3>
        <p className="text-slate-500">The detailed tabular view for {activeReport} is under construction.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 bg-slate-50/50 min-h-screen">
      
      {/* Detail Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center">
          <button onClick={() => setActiveReport(null)} className="mr-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"><ChevronLeft size={20}/></button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">{activeReport}</h1>
            <p className="text-slate-500 font-medium text-sm">{activeDateRange.start.toLocaleDateString('en-IN')} – {activeDateRange.end.toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {['Sales Report', 'Purchase Report', 'Inventory Report'].includes(activeReport) && (
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." className="input-field pl-9 w-full" value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} />
            </div>
          )}
          <button className="btn-secondary flex items-center" onClick={handlePrint}><Printer size={18} className="mr-2" /> Print</button>
          <button className="btn-primary flex items-center" onClick={() => handleExportCSV(tableId, activeReport.replace(/ /g, '-').toLowerCase())}><Download size={18} className="mr-2" /> Export CSV</button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black">EVERYKADAI</h1>
        <h2 className="text-xl font-bold mt-2 uppercase">{activeReport}</h2>
        <p className="text-sm mt-1">Period: {activeDateRange.start.toLocaleDateString('en-IN')} to {activeDateRange.end.toLocaleDateString('en-IN')}</p>
        <p className="text-xs mt-1">Generated: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Report Content */}
      <div className="print:m-0 print:p-0">
        {reportContent}
      </div>
      
    </div>
  );
};

export default Reports;
