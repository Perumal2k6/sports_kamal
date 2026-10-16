import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, IndianRupee, Users as UsersIcon, CreditCard, Eye, X, CheckCircle, AlertTriangle, FileText, Ban } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getCustomers, saveCustomers, getSales, getCustomerPayments, getCustomerLedger, addCustomerPayment, addCustomerLedgerEntry, updateCustomerBalance } from '../lib/db';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // UI State
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [viewTab, setViewTab] = useState('Overview'); // Overview, Sales, Payments, Ledger

  const [customerForm, setCustomerForm] = useState({ 
    name: '', mobile: '', alternateMobile: '', email: '', dob: '', gender: 'Male',
    address: '', city: '', district: '', state: '', pincode: '', gstin: '', 
    creditLimit: '', openingBalance: '', notes: '', status: 'Active'
  });

  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const loadData = () => {
    setCustomers(getCustomers().sort((a, b) => b.id - a.id));
    setSales(getSales());
    setPayments(getCustomerPayments());
    setLedger(getCustomerLedger());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------
  // Data Aggregation
  // -------------------------------------------------------------

  const calculateCustomerStats = (cId) => {
    const cSales = sales.filter(s => s.customerId === cId);
    const totalPurchases = cSales.reduce((sum, s) => sum + s.total, 0);
    const totalPaidSales = cSales.reduce((sum, s) => sum + (s.amountReceived || 0), 0);
    
    // Total Payments directly via payments module
    const cPayments = payments.filter(p => p.customerId === cId);
    const totalDirectPayments = cPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = totalPaidSales + totalDirectPayments;
    
    // We trust c.balance for current outstanding (since pos handles it, and we handle it via ledger)
    // But we can also compute if needed.
    const c = customers.find(x => x.id === cId);
    const outstanding = c?.balance || 0;

    return { totalPurchases, totalPaid, outstanding };
  };

  // -------------------------------------------------------------
  // Filters & Pagination
  // -------------------------------------------------------------

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) ||
                          (c.phone && c.phone.includes(q)) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          c.id.toString().includes(q);
    
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = c.status !== 'Inactive';
    if (statusFilter === 'inactive') matchesStatus = c.status === 'Inactive';
    if (statusFilter === 'credit') matchesStatus = c.balance > 0;
    if (statusFilter === 'no_outstanding') matchesStatus = c.balance <= 0;
    if (statusFilter === 'over_limit') matchesStatus = (c.balance > 0) && (c.creditLimit > 0) && (c.balance > c.creditLimit);

    return matchesSearch && matchesStatus;
  });

  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalCustomersCount = customers.filter(c => c.name !== 'Walk-in Customer').length;
  const activeCustomersCount = customers.filter(c => c.status !== 'Inactive' && c.name !== 'Walk-in Customer').length;
  const creditCustomersCount = customers.filter(c => c.balance > 0).length;
  const totalOutstanding = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

  // -------------------------------------------------------------
  // Create / Edit Workflow
  // -------------------------------------------------------------

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setCustomerForm({ 
      name: '', mobile: '', alternateMobile: '', email: '', dob: '', gender: 'Male',
      address: '', city: '', district: '', state: '', pincode: '', gstin: '', 
      creditLimit: '', openingBalance: '', notes: '', status: 'Active'
    });
    setShowAddModal(true);
  };

  const openEditModal = (c) => {
    if (c.name === 'Walk-in Customer') {
      return showToast('Walk-in Customer cannot be edited.', 'error');
    }
    setIsEditing(true);
    setEditingId(c.id);
    setCustomerForm({ 
      name: c.name, 
      mobile: c.phone || '', 
      alternateMobile: c.alternateMobile || '', 
      email: c.email || '', 
      dob: c.dob || '', 
      gender: c.gender || 'Male',
      address: c.address || '', 
      city: c.city || '', 
      district: c.district || '', 
      state: c.state || '', 
      pincode: c.pincode || '', 
      gstin: c.gstin || '', 
      creditLimit: c.creditLimit || '', 
      openingBalance: c.openingBalance || '', 
      notes: c.notes || '', 
      status: c.status || 'Active'
    });
    setShowAddModal(true);
  };

  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    if (!customerForm.name) return showToast('Customer Name is required.', 'error');
    if (!customerForm.mobile && !isEditing) return showToast('Mobile Number is required.', 'error');

    // Duplicate Check
    if (customerForm.mobile) {
      const duplicate = customers.find(c => c.phone === customerForm.mobile && c.id !== editingId);
      if (duplicate) return showToast('Customer with this mobile already exists.', 'error');
    }

    const newOpeningBalance = Number(customerForm.openingBalance) || 0;
    
    if (isEditing) {
      const updatedCustomers = customers.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            ...customerForm,
            phone: customerForm.mobile,
            creditLimit: Number(customerForm.creditLimit) || 0,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });
      saveCustomers(updatedCustomers);
      showToast('Customer updated successfully.');
    } else {
      const newCustomer = {
        id: Date.now(),
        ...customerForm,
        phone: customerForm.mobile,
        balance: newOpeningBalance,
        creditLimit: Number(customerForm.creditLimit) || 0,
        createdAt: new Date().toISOString()
      };
      saveCustomers([newCustomer, ...customers]);

      if (newOpeningBalance > 0) {
        addCustomerLedgerEntry({
          customerId: newCustomer.id,
          type: 'Opening Balance',
          referenceId: 'OPEN',
          description: 'Initial Opening Balance',
          debit: newOpeningBalance,
          credit: 0,
          balance: newOpeningBalance,
          date: new Date().toISOString()
        });
      }
      showToast('Customer created successfully.');
    }

    setShowAddModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // Delete / Deactivate Workflow
  // -------------------------------------------------------------

  const triggerDelete = (c) => {
    if (c.name === 'Walk-in Customer') {
      return showToast('Walk-in Customer cannot be deleted.', 'error');
    }

    const hasTransactions = sales.some(s => s.customerId === c.id) || payments.some(p => p.customerId === c.id);

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer?',
      message: `Customer: ${c.name}\nMobile: ${c.phone || 'N/A'}\n\n${hasTransactions ? 'This customer has transaction history and cannot be permanently deleted.\n\nYou can deactivate this customer instead.' : 'Are you sure you want to permanently delete this customer?'}`,
      confirmText: hasTransactions ? 'Deactivate' : 'Delete Customer',
      isDestructive: true,
      onConfirm: () => {
        if (hasTransactions) {
          const updated = customers.map(x => x.id === c.id ? { ...x, status: 'Inactive' } : x);
          saveCustomers(updated);
          showToast('Customer deactivated successfully.');
        } else {
          const filtered = customers.filter(x => x.id !== c.id);
          saveCustomers(filtered);
          showToast('Customer deleted successfully.');
        }
        setConfirmDialog({ isOpen: false });
        loadData();
      }
    });
  };

  // -------------------------------------------------------------
  // Payment Workflow
  // -------------------------------------------------------------

  const openPaymentModal = (c) => {
    if (c.name === 'Walk-in Customer') {
      return showToast('Walk-in Customer cannot have outstanding balances.', 'error');
    }
    setActiveCustomer(c);
    setPaymentForm({ amount: c.balance, method: 'Cash', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const paymentAmt = Number(paymentForm.amount);

    if (paymentAmt <= 0) return showToast('Payment amount must be greater than 0.', 'error');
    if (paymentAmt > activeCustomer.balance) return showToast('Payment amount cannot exceed outstanding balance.', 'error');

    // Add Payment
    const paymentRec = {
      customerId: activeCustomer.id,
      amount: paymentAmt,
      paymentMethod: paymentForm.method,
      reference: paymentForm.reference,
      date: new Date(paymentForm.date).toISOString(),
      notes: paymentForm.notes
    };
    addCustomerPayment(paymentRec);

    // Update Customer Balance
    updateCustomerBalance(activeCustomer.id, -paymentAmt);

    // Add Ledger Entry
    addCustomerLedgerEntry({
      customerId: activeCustomer.id,
      type: 'Payment',
      referenceId: paymentForm.reference || 'PAY-CUST',
      description: `Payment via ${paymentForm.method}`,
      debit: 0,
      credit: paymentAmt,
      balance: activeCustomer.balance - paymentAmt,
      date: new Date(paymentForm.date).toISOString()
    });

    showToast('Payment recorded successfully.');
    setShowPaymentModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // View Details Workflow
  // -------------------------------------------------------------

  const openViewModal = (c) => {
    setActiveCustomer(c);
    setViewTab('Overview');
    setShowViewModal(true);
  };

  return (
    <div className="space-y-6 relative pb-10">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-8 text-white px-6 py-3 rounded-lg shadow-xl z-[100] animate-in fade-in slide-in-from-top-5 ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          <div className="flex items-center space-x-2">
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} className="text-emerald-400" />}
            <span className="font-medium text-sm">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog({ isOpen: false })}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center mb-4"><AlertTriangle size={24} /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{confirmDialog.message}</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-center space-x-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setConfirmDialog({ isOpen: false })} className="btn-secondary px-6">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="px-6 py-2 rounded-lg font-bold text-white shadow-md bg-red-600 hover:bg-red-700">
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500">Manage your customers and their outstanding balances.</p>
        </div>
        <button className="btn-primary flex items-center" onClick={openAddModal}>
          <Plus size={18} className="mr-2" /> Add Customer
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Customers</p>
            <h3 className="text-xl font-bold text-slate-800">{totalCustomersCount}</h3>
          </div>
          <UsersIcon className="text-blue-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active</p>
            <h3 className="text-xl font-bold text-slate-800">{activeCustomersCount}</h3>
          </div>
          <CheckCircle className="text-emerald-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-orange-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Credit Customers</p>
            <h3 className="text-xl font-bold text-slate-800">{creditCustomersCount}</h3>
          </div>
          <CreditCard className="text-orange-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
            <h3 className="text-xl font-bold text-slate-800">₹{totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          </div>
          <IndianRupee className="text-red-100" size={32} />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search by Name, Mobile or ID..." className="input-field pl-10 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-40 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="credit">Credit Customers</option>
            <option value="no_outstanding">No Outstanding</option>
            <option value="over_limit">Over Credit Limit</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold w-16">ID</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Mobile</th>
                <th className="py-3 px-4 font-semibold text-right">Total Purchases</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-4 font-semibold text-right">Credit Limit</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedCustomers.map((c) => {
                const stats = calculateCustomerStats(c.id);
                const isOverLimit = (c.creditLimit > 0) && (c.balance > c.creditLimit);

                return (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === 'Inactive' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4 font-bold text-slate-400">#{c.id.toString().slice(-4)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{c.name}</div>
                      {c.email && <div className="text-xs text-slate-500">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">₹{stats.totalPurchases.toLocaleString('en-IN')}</td>
                    <td className={`py-3 px-4 text-right font-bold ${c.balance > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      ₹{c.balance.toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${isOverLimit ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      {c.creditLimit ? `₹${Number(c.creditLimit).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        c.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center space-x-2 text-slate-400">
                        {c.balance > 0 && c.status !== 'Inactive' && (
                          <button onClick={() => openPaymentModal(c)} className="w-8 h-8 rounded hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title="Record Payment">
                            <CreditCard size={16} />
                          </button>
                        )}
                        <button onClick={() => openViewModal(c)} className="w-8 h-8 rounded hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors" title="View"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(c)} className="w-8 h-8 rounded hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-colors" title="Edit"><Edit size={18} /></button>
                        <button onClick={() => triggerDelete(c)} className="w-8 h-8 rounded hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" title={c.status === 'Inactive' ? 'Delete' : 'Delete / Deactivate'}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    <UsersIcon size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">No customers found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-white">
          <Pagination currentPage={currentPage} totalItems={filteredCustomers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
        </div>
        <div className="px-4 pb-4 flex items-center text-sm text-slate-500 bg-white">
            <span>Items per page:</span>
            <select className="ml-2 border border-slate-300 rounded p-1 outline-none focus:border-primary-500" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
        </div>
      </div>

      {/* ---------------------------------------------------------
          ADD / EDIT CUSTOMER MODAL
      --------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <form id="addCustForm" onSubmit={handleCustomerSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Customer Name *</label>
                    <input type="text" required className="input-field" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Mobile Number *</label>
                    <input type="text" required={!isEditing} className="input-field" value={customerForm.mobile} onChange={e => setCustomerForm({...customerForm, mobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Alternate Mobile</label>
                    <input type="text" className="input-field" value={customerForm.alternateMobile} onChange={e => setCustomerForm({...customerForm, alternateMobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                    <input type="email" className="input-field" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Date of Birth</label>
                    <input type="date" className="input-field" value={customerForm.dob} onChange={e => setCustomerForm({...customerForm, dob: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Gender</label>
                    <select className="input-field" value={customerForm.gender} onChange={e => setCustomerForm({...customerForm, gender: e.target.value})}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Address</label>
                    <input type="text" className="input-field" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">City</label>
                    <input type="text" className="input-field" value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">State</label>
                    <input type="text" className="input-field" value={customerForm.state} onChange={e => setCustomerForm({...customerForm, state: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Pincode</label>
                    <input type="text" className="input-field" value={customerForm.pincode} onChange={e => setCustomerForm({...customerForm, pincode: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">GSTIN</label>
                    <input type="text" className="input-field uppercase" value={customerForm.gstin} onChange={e => setCustomerForm({...customerForm, gstin: e.target.value})} />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Credit Limit (₹)</label>
                    <input type="number" min="0" className="input-field" value={customerForm.creditLimit} onChange={e => setCustomerForm({...customerForm, creditLimit: e.target.value})} />
                  </div>
                  {!isEditing && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Opening Balance (₹)</label>
                      <input type="number" min="0" className="input-field" value={customerForm.openingBalance} onChange={e => setCustomerForm({...customerForm, openingBalance: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Status</label>
                    <select className="input-field" value={customerForm.status} onChange={e => setCustomerForm({...customerForm, status: e.target.value})}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Notes</label>
                    <textarea className="input-field resize-none h-20" value={customerForm.notes} onChange={e => setCustomerForm({...customerForm, notes: e.target.value})}></textarea>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" form="addCustForm" className="btn-primary px-8">Save Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PAYMENT MODAL
      --------------------------------------------------------- */}
      {showPaymentModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">Record Payment</h2>
                <p className="text-xs text-slate-500 mt-1">{activeCustomer.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-center">
                <span className="text-sm font-medium text-slate-500">Current Outstanding</span>
                <div className="text-2xl font-black text-red-600 mt-1">₹{activeCustomer.balance.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Payment Amount (₹) *</label>
                <input type="number" required min="1" step="0.01" max={activeCustomer.balance} className="input-field text-lg font-bold" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Date *</label>
                  <input type="date" required className="input-field" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Method</label>
                  <select className="input-field" value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Reference No (Optional)</label>
                <input type="text" className="input-field" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-sm border-emerald-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          VIEW CUSTOMER DETAILS MODAL
      --------------------------------------------------------- */}
      {showViewModal && activeCustomer && (() => {
        const stats = calculateCustomerStats(activeCustomer.id);
        const cLedger = ledger.filter(l => l.customerId === activeCustomer.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        const cSales = sales.filter(s => s.customerId === activeCustomer.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        const cPayments = payments.filter(p => p.customerId === activeCustomer.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  {activeCustomer.name}
                  <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${activeCustomer.status === 'Inactive' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                    {activeCustomer.status || 'Active'}
                  </span>
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">{activeCustomer.phone || 'No Mobile'} {activeCustomer.email ? `• ${activeCustomer.email}` : ''}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="btn-secondary text-sm py-1.5" onClick={() => { setShowViewModal(false); openEditModal(activeCustomer); }}>Edit</button>
                {activeCustomer.balance > 0 && activeCustomer.status !== 'Inactive' && <button className="btn-primary bg-emerald-600 border-emerald-700 text-sm py-1.5" onClick={() => openPaymentModal(activeCustomer)}>Record Payment</button>}
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-700 ml-2"><X size={24} /></button>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-0 border-b border-slate-200 bg-white">
              <div className="p-4 border-r border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Purchases</p>
                <p className="text-xl font-bold text-slate-800">₹{stats.totalPurchases.toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
              </div>
              <div className="p-4 border-r border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600">₹{stats.totalPaid.toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
              </div>
              <div className="p-4 border-r border-slate-100 bg-red-50">
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Outstanding</p>
                <p className="text-xl font-bold text-red-600">₹{stats.outstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Limit</p>
                <p className="text-xl font-bold text-slate-800">{activeCustomer.creditLimit ? `₹${Number(activeCustomer.creditLimit).toLocaleString('en-IN')}` : 'None'}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 border-b border-slate-200 bg-slate-50 space-x-6">
              {['Overview', 'Sales', 'Payments', 'Ledger'].map(tab => (
                <button 
                  key={tab}
                  className={`py-3 text-sm font-bold border-b-2 transition-colors ${viewTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  onClick={() => setViewTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
              
              {viewTab === 'Overview' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Customer ID</p><p className="font-medium text-slate-800">#{activeCustomer.id}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Name</p><p className="font-medium text-slate-800">{activeCustomer.name}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Mobile</p><p className="font-medium text-slate-800">{activeCustomer.phone || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Email</p><p className="font-medium text-slate-800">{activeCustomer.email || 'N/A'}</p></div>
                  <div className="md:col-span-2"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Address</p><p className="font-medium text-slate-800">{activeCustomer.address ? `${activeCustomer.address}, ${activeCustomer.city}, ${activeCustomer.state} - ${activeCustomer.pincode}` : 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">GSTIN</p><p className="font-medium text-slate-800">{activeCustomer.gstin || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Opening Balance</p><p className="font-medium text-slate-800">₹{(activeCustomer.openingBalance || 0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Created On</p><p className="font-medium text-slate-800">{activeCustomer.createdAt ? new Date(activeCustomer.createdAt).toLocaleDateString() : 'N/A'}</p></div>
                  <div className="md:col-span-3"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Notes</p><p className="font-medium text-slate-800">{activeCustomer.notes || 'N/A'}</p></div>
                </div>
              )}

              {viewTab === 'Sales' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Invoice</th>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold text-center">Items</th>
                        <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                        <th className="py-3 px-4 font-semibold text-right">Paid</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cSales.length > 0 ? cSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-primary-600">{s.invoiceNo}</td>
                          <td className="py-3 px-4">{new Date(s.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center">{s.items?.length || 0}</td>
                          <td className="py-3 px-4 text-right font-bold">₹{s.total.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-medium">₹{(s.amountReceived||0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${(s.amountReceived||0) >= s.total ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {(s.amountReceived||0) >= s.total ? 'Paid' : 'Credit'}
                            </span>
                          </td>
                        </tr>
                      )) : <tr><td colSpan="6" className="text-center py-8 text-slate-500">No sales history found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {viewTab === 'Payments' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Method</th>
                        <th className="py-3 px-4 font-semibold">Reference</th>
                        <th className="py-3 px-4 font-semibold">Notes</th>
                        <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cPayments.length > 0 ? cPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{p.paymentMethod}</td>
                          <td className="py-3 px-4">{p.reference || '-'}</td>
                          <td className="py-3 px-4 text-slate-500">{p.notes || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                        </tr>
                      )) : <tr><td colSpan="5" className="text-center py-8 text-slate-500">No payment history found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              {viewTab === 'Ledger' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Account Statement</h3>
                    <button className="btn-secondary py-1 text-xs flex items-center" onClick={() => window.print()}><FileText size={14} className="mr-1" /> Print Statement</button>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Description</th>
                        <th className="py-3 px-4 font-semibold">Ref No</th>
                        <th className="py-3 px-4 font-semibold text-right text-red-600">Debit (Dr)</th>
                        <th className="py-3 px-4 font-semibold text-right text-emerald-600">Credit (Cr)</th>
                        <th className="py-3 px-4 font-semibold text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cLedger.length > 0 ? cLedger.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-medium">{l.description}</td>
                          <td className="py-3 px-4 text-slate-500">{l.referenceId}</td>
                          <td className="py-3 px-4 text-right font-medium text-red-500">{l.debit > 0 ? `₹${l.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">{l.credit > 0 ? `₹${l.credit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">₹{l.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      )) : <tr><td colSpan="6" className="text-center py-8 text-slate-500">No ledger entries found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
};

export default Customers;
