import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Trash2, Edit, FileText, Calendar, IndianRupee, Eye, 
  X, CheckCircle, AlertTriangle, Filter, ArrowUpDown, ChevronDown 
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../lib/db';

const CATEGORIES = [
  'Tea & Coffee',
  'Drinking Water',
  'Food & Snacks',
  'Electricity',
  'Rent',
  'Transport & Delivery',
  'Packing Materials',
  'Repairs & Maintenance',
  'Salary & Wages',
  'Marketing',
  'Other'
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Credit / Pay Later'
];

const UNITS = [
  'Pcs',
  'Box',
  'Kg',
  'Month',
  'Ltr',
  'Day',
  'Other'
];

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeExpense, setActiveExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, item: null });
  const [toast, setToast] = useState(null);

  // Form state
  const initialFormState = {
    expenseDate: new Date().toISOString().split('T')[0],
    category: '',
    expenseName: '',
    description: '',
    quantity: 1,
    unit: 'Pcs',
    unitPrice: '',
    totalAmount: '',
    paymentMethod: 'Cash',
    paidBy: 'Admin',
    receiptNumber: '',
    notes: '',
    paymentStatus: 'Paid'
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadData = () => {
    const data = getExpenses() || [];
    // Sort latest by date or createdAt
    data.sort((a, b) => new Date(b.expenseDate || b.date) - new Date(a.expenseDate || a.date));
    setExpenses(data);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form amount auto-calculation
  const handleQtyPriceChange = (qtyVal, priceVal) => {
    const qty = parseFloat(qtyVal);
    const price = parseFloat(priceVal);
    if (!isNaN(qty) && !isNaN(price) && qty > 0) {
      const calculated = (qty * price).toFixed(2);
      return calculated;
    }
    return '';
  };

  // Filtered & Searched data
  const filteredExpenses = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Yesterday
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];

    // Week start (7 days ago)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Month start
    const thisMonthStr = todayStr.substring(0, 7);

    return expenses.filter(item => {
      const itemDate = item.expenseDate || item.date || '';
      const name = item.expenseName || item.description || '';
      const cat = item.category || '';
      const desc = item.description || '';
      const receipt = item.receiptNumber || '';
      const paidBy = item.paidBy || item.addedBy || '';
      const id = String(item.id || '');
      const query = searchQuery.toLowerCase();

      // Search
      const matchesSearch = !query || 
        name.toLowerCase().includes(query) ||
        cat.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query) ||
        receipt.toLowerCase().includes(query) ||
        paidBy.toLowerCase().includes(query) ||
        id.toLowerCase().includes(query);

      // Category
      const matchesCategory = categoryFilter === 'All' || cat === categoryFilter;

      // Status
      const status = item.paymentStatus || 'Paid';
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      // Date
      let matchesDate = true;
      if (dateFilter === 'Today') {
        matchesDate = itemDate.startsWith(todayStr);
      } else if (dateFilter === 'Yesterday') {
        matchesDate = itemDate.startsWith(yestStr);
      } else if (dateFilter === 'This Week') {
        matchesDate = itemDate >= weekAgoStr && itemDate <= todayStr;
      } else if (dateFilter === 'This Month') {
        matchesDate = itemDate.startsWith(thisMonthStr);
      } else if (dateFilter === 'Custom') {
        if (customStartDate && customEndDate) {
          matchesDate = itemDate >= customStartDate && itemDate <= customEndDate;
        } else if (customStartDate) {
          matchesDate = itemDate >= customStartDate;
        } else if (customEndDate) {
          matchesDate = itemDate <= customEndDate;
        }
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDate;
    });
  }, [expenses, searchQuery, categoryFilter, statusFilter, dateFilter, customStartDate, customEndDate]);

  // KPI Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0);
  }, [expenses]);

  const todayExpenseSum = useMemo(() => {
    return expenses
      .filter(e => (e.expenseDate || e.date || '').startsWith(todayStr))
      .reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0);
  }, [expenses, todayStr]);

  const thisMonthExpenseSum = useMemo(() => {
    return expenses
      .filter(e => (e.expenseDate || e.date || '').startsWith(thisMonthStr))
      .reduce((sum, e) => sum + Number(e.totalAmount || e.amount || 0), 0);
  }, [expenses, thisMonthStr]);

  const totalEntriesCount = expenses.length;

  // Pagination calculation
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, dateFilter, customStartDate, customEndDate, itemsPerPage]);

  // Handle Add Expense Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.expenseName.trim()) {
      showToast('Please enter expense name', 'error');
      return;
    }
    const finalAmount = parseFloat(formData.totalAmount) || 0;
    if (finalAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const payload = {
      expenseDate: formData.expenseDate,
      category: formData.category,
      expenseName: formData.expenseName.trim(),
      description: formData.description.trim(),
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit,
      unitPrice: Number(formData.unitPrice) || 0,
      totalAmount: finalAmount,
      amount: finalAmount, // backwards-compatible alias
      paymentMethod: formData.paymentMethod,
      paidBy: formData.paidBy.trim() || 'Admin',
      receiptNumber: formData.receiptNumber.trim(),
      notes: formData.notes.trim(),
      paymentStatus: formData.paymentStatus
    };

    addExpense(payload);
    showToast('Expense recorded successfully!');
    setShowAddModal(false);
    setFormData(initialFormState);
    loadData();
  };

  // Handle Edit Expense Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.expenseName.trim()) {
      showToast('Please enter expense name', 'error');
      return;
    }
    const finalAmount = parseFloat(formData.totalAmount) || 0;
    if (finalAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    const payload = {
      expenseDate: formData.expenseDate,
      category: formData.category,
      expenseName: formData.expenseName.trim(),
      description: formData.description.trim(),
      quantity: Number(formData.quantity) || 1,
      unit: formData.unit,
      unitPrice: Number(formData.unitPrice) || 0,
      totalAmount: finalAmount,
      amount: finalAmount,
      paymentMethod: formData.paymentMethod,
      paidBy: formData.paidBy.trim() || 'Admin',
      receiptNumber: formData.receiptNumber.trim(),
      notes: formData.notes.trim(),
      paymentStatus: formData.paymentStatus
    };

    updateExpense(activeExpense.id, payload);
    showToast('Expense updated successfully!');
    setShowEditModal(false);
    setActiveExpense(null);
    setFormData(initialFormState);
    loadData();
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setActiveExpense(item);
    setFormData({
      expenseDate: item.expenseDate || item.date || '',
      category: item.category || 'Other',
      expenseName: item.expenseName || item.description || '',
      description: item.description || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'Pcs',
      unitPrice: item.unitPrice || '',
      totalAmount: item.totalAmount || item.amount || '',
      paymentMethod: item.paymentMethod || 'Cash',
      paidBy: item.paidBy || item.addedBy || 'Admin',
      receiptNumber: item.receiptNumber || '',
      notes: item.notes || '',
      paymentStatus: item.paymentStatus || 'Paid'
    });
    setShowEditModal(true);
  };

  // Open View Modal
  const openViewModal = (item) => {
    setActiveExpense(item);
    setShowViewModal(true);
  };

  // Handle Delete Confirmation
  const confirmDeleteExpense = () => {
    if (confirmDelete.item) {
      deleteExpense(confirmDelete.item.id);
      showToast('Expense deleted successfully.');
      setConfirmDelete({ isOpen: false, item: null });
      loadData();
    }
  };

  return (
    <div className="space-y-6 relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-all transform animate-bounce-short ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={20} className="mr-2" /> : <CheckCircle size={20} className="mr-2" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-slate-500">Track and manage your shop expenses.</p>
        </div>
        <button 
          className="btn-primary flex items-center shadow-sm hover:shadow"
          onClick={() => {
            setFormData(initialFormState);
            setShowAddModal(true);
          }}
        >
          <Plus size={18} className="mr-2" /> + Add Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Expenses</p>
              <h3 className="text-2xl font-black text-slate-800">₹{totalExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-red-50 rounded-lg text-red-600">
              <IndianRupee size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Today's Expenses</p>
              <h3 className="text-2xl font-black text-slate-800">₹{todayExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Calendar size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">This Month</p>
              <h3 className="text-2xl font-black text-slate-800">₹{thisMonthExpenseSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <Calendar size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Entries</p>
              <h3 className="text-2xl font-black text-slate-800">{totalEntriesCount}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
              <FileText size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, name, description, receipt or paid by..." 
              className="input-field pl-10 w-full"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-auto">
            <select 
              className="input-field w-full sm:w-48"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-auto">
            <select 
              className="input-field w-full sm:w-40"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-auto">
            <select 
              className="input-field w-full sm:w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Rows:</span>
            <select 
              className="input-field py-1.5 px-2 w-20 text-sm"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {dateFilter === 'Custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-600">From:</span>
            <input 
              type="date" 
              className="input-field py-1.5 px-3 text-sm w-44" 
              value={customStartDate} 
              onChange={(e) => setCustomStartDate(e.target.value)} 
            />
            <span className="text-xs font-semibold text-slate-600">To:</span>
            <input 
              type="date" 
              className="input-field py-1.5 px-3 text-sm w-44" 
              value={customEndDate} 
              onChange={(e) => setCustomEndDate(e.target.value)} 
            />
            {(customStartDate || customEndDate) && (
              <button 
                type="button" 
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-xs text-primary-600 hover:underline ml-2"
              >
                Clear Range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-24">Expense ID</th>
                <th>Date</th>
                <th>Category</th>
                <th>Expense Name</th>
                <th className="text-center">Quantity</th>
                <th className="text-right">Amount</th>
                <th className="text-center">Payment Method</th>
                <th className="text-center">Status</th>
                <th className="text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedExpenses.map((e) => {
                const amountVal = Number(e.totalAmount || e.amount || 0);
                const statusVal = e.paymentStatus || 'Paid';
                const isPaid = statusVal === 'Paid';

                return (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono text-xs font-semibold text-slate-600">
                      {e.id}
                    </td>
                    <td className="whitespace-nowrap text-sm text-slate-600">
                      {e.expenseDate || e.date}
                    </td>
                    <td>
                      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {e.category}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800">{e.expenseName || e.description}</div>
                      {e.description && e.expenseName && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{e.description}</div>
                      )}
                    </td>
                    <td className="text-center text-sm text-slate-600">
                      {e.quantity ? `${e.quantity} ${e.unit || 'Pcs'}` : '-'}
                    </td>
                    <td className="text-right font-bold text-red-600 whitespace-nowrap">
                      ₹{amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
                        {e.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {statusVal}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center items-center space-x-2 text-slate-400">
                        <button 
                          className="hover:text-blue-600 p-1 transition-colors" 
                          title="View Expense"
                          onClick={() => openViewModal(e)}
                        >
                          <Eye size={17} />
                        </button>
                        <button 
                          className="hover:text-primary-600 p-1 transition-colors" 
                          title="Edit Expense"
                          onClick={() => openEditModal(e)}
                        >
                          <Edit size={17} />
                        </button>
                        <button 
                          className="hover:text-red-600 p-1 transition-colors" 
                          title="Delete Expense"
                          onClick={() => setConfirmDelete({ isOpen: true, item: e })}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500">
                    <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No expenses found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || categoryFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All'
                        ? 'Try clearing your search or filters.'
                        : 'Click "+ Add Expense" to record your first expense.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-white gap-3">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold">{filteredExpenses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredExpenses.length)}</span> of{' '}
            <span className="font-semibold">{filteredExpenses.length}</span> expenses
          </div>
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredExpenses.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Add New Expense</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter details to record a new shop expense</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>
            
            <form id="addExpenseForm" onSubmit={handleAddSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expense Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Expense Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="input-field" 
                    value={formData.expenseDate} 
                    onChange={e => setFormData({ ...formData, expenseDate: e.target.value })} 
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tea & Coffee, Rent, Electricity..." 
                    className="input-field" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                  />
                </div>
              </div>

              {/* Expense Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Expense Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Morning Tea & Snacks for Staff, Monthly Electricity Bill"
                  className="input-field" 
                  value={formData.expenseName} 
                  onChange={e => setFormData({ ...formData, expenseName: e.target.value })} 
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea 
                  rows="2"
                  placeholder="Additional description or item details..."
                  className="input-field resize-none" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>

              {/* Quantity, Unit, Unit Price, Total Amount */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    step="any"
                    className="input-field" 
                    value={formData.quantity} 
                    onChange={e => {
                      const qty = e.target.value;
                      const calculated = handleQtyPriceChange(qty, formData.unitPrice);
                      setFormData({ 
                        ...formData, 
                        quantity: qty,
                        totalAmount: calculated !== '' ? calculated : formData.totalAmount 
                      });
                    }} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
                  <select 
                    className="input-field" 
                    value={formData.unit} 
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Price (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="any"
                    placeholder="0.00"
                    className="input-field" 
                    value={formData.unitPrice} 
                    onChange={e => {
                      const price = e.target.value;
                      const calculated = handleQtyPriceChange(formData.quantity, price);
                      setFormData({ 
                        ...formData, 
                        unitPrice: price,
                        totalAmount: calculated !== '' ? calculated : formData.totalAmount 
                      });
                    }} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0.01" 
                    step="any"
                    placeholder="0.00"
                    className="input-field font-bold text-red-600 bg-white" 
                    value={formData.totalAmount} 
                    onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} 
                  />
                </div>
              </div>

              {/* Payment Method, Paid By, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select 
                    className="input-field" 
                    value={formData.paymentMethod} 
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Paid By</label>
                  <input 
                    type="text" 
                    placeholder="Admin / Cashier Name"
                    className="input-field" 
                    value={formData.paidBy} 
                    onChange={e => setFormData({ ...formData, paidBy: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select 
                    className="input-field" 
                    value={formData.paymentStatus} 
                    onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Receipt Number & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Receipt Number</label>
                  <input 
                    type="text" 
                    placeholder="e.g. REC-9842 / Bill #12"
                    className="input-field" 
                    value={formData.receiptNumber} 
                    onChange={e => setFormData({ ...formData, receiptNumber: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes</label>
                  <input 
                    type="text" 
                    placeholder="Optional remarks..."
                    className="input-field" 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                  />
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="addExpenseForm" 
                className="btn-primary"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && activeExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edit Expense</h2>
                <p className="text-xs text-slate-500 mt-0.5">Editing Record: <span className="font-mono font-bold text-primary-600">{activeExpense.id}</span></p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>
            
            <form id="editExpenseForm" onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Expense Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="input-field" 
                    value={formData.expenseDate} 
                    onChange={e => setFormData({ ...formData, expenseDate: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Tea & Coffee, Rent, Electricity..." 
                    className="input-field" 
                    value={formData.category} 
                    onChange={e => setFormData({ ...formData, category: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Expense Name *</label>
                <input 
                  type="text" 
                  required 
                  className="input-field" 
                  value={formData.expenseName} 
                  onChange={e => setFormData({ ...formData, expenseName: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
                <textarea 
                  rows="2"
                  className="input-field resize-none" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    step="any"
                    className="input-field" 
                    value={formData.quantity} 
                    onChange={e => {
                      const qty = e.target.value;
                      const calculated = handleQtyPriceChange(qty, formData.unitPrice);
                      setFormData({ 
                        ...formData, 
                        quantity: qty,
                        totalAmount: calculated !== '' ? calculated : formData.totalAmount 
                      });
                    }} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit</label>
                  <select 
                    className="input-field" 
                    value={formData.unit} 
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unit Price (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="any"
                    className="input-field" 
                    value={formData.unitPrice} 
                    onChange={e => {
                      const price = e.target.value;
                      const calculated = handleQtyPriceChange(formData.quantity, price);
                      setFormData({ 
                        ...formData, 
                        unitPrice: price,
                        totalAmount: calculated !== '' ? calculated : formData.totalAmount 
                      });
                    }} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0.01" 
                    step="any"
                    className="input-field font-bold text-red-600 bg-white" 
                    value={formData.totalAmount} 
                    onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select 
                    className="input-field" 
                    value={formData.paymentMethod} 
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Paid By</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.paidBy} 
                    onChange={e => setFormData({ ...formData, paidBy: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Status</label>
                  <select 
                    className="input-field" 
                    value={formData.paymentStatus} 
                    onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Receipt Number</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.receiptNumber} 
                    onChange={e => setFormData({ ...formData, receiptNumber: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.notes} 
                    onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                  />
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="editExpenseForm" 
                className="btn-primary"
              >
                Update Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {showViewModal && activeExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Expense Details</h2>
                  <p className="text-xs font-mono text-slate-500">{activeExpense.id}</p>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Expense Name</span>
                <span className="font-bold text-slate-800 text-base">{activeExpense.expenseName || activeExpense.description}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Date</span>
                  <span className="font-semibold text-slate-700">{activeExpense.expenseDate || activeExpense.date}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Category</span>
                  <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                    {activeExpense.category}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div>
                  <span className="text-xs text-slate-400 block">Quantity</span>
                  <span className="font-bold text-slate-700">{activeExpense.quantity || 1} {activeExpense.unit || 'Pcs'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Unit Price</span>
                  <span className="font-bold text-slate-700">₹{activeExpense.unitPrice ? Number(activeExpense.unitPrice).toFixed(2) : '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Total Amount</span>
                  <span className="font-black text-red-600">₹{Number(activeExpense.totalAmount || activeExpense.amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Payment Method</span>
                  <span className="font-semibold text-slate-700">{activeExpense.paymentMethod || 'Cash'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Payment Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    (activeExpense.paymentStatus || 'Paid') === 'Paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {activeExpense.paymentStatus || 'Paid'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Paid By</span>
                  <span className="font-semibold text-slate-700">{activeExpense.paidBy || activeExpense.addedBy || 'Admin'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Receipt Number</span>
                  <span className="font-semibold text-slate-700">{activeExpense.receiptNumber || 'None'}</span>
                </div>
              </div>

              {activeExpense.description && (
                <div className="pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-400 block mb-0.5">Description</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{activeExpense.description}</p>
                </div>
              )}

              {activeExpense.notes && (
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Notes</span>
                  <p className="text-slate-700 italic">{activeExpense.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(activeExpense);
                }} 
                className="btn-primary"
              >
                Edit Expense
              </button>
              <button 
                type="button" 
                onClick={() => setShowViewModal(false)} 
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDelete({ isOpen: false, item: null })}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex items-center space-x-3 bg-red-50">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Confirm Delete</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete expense{' '}
                <span className="font-bold text-slate-800 font-mono">{confirmDelete.item?.id}</span> (
                <span className="font-semibold text-slate-700">{confirmDelete.item?.expenseName || confirmDelete.item?.description}</span>)?
              </p>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setConfirmDelete({ isOpen: false, item: null })} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDeleteExpense} 
                className="btn-danger"
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
