import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, IndianRupee, Truck, FileText, Eye, X, CheckCircle, AlertTriangle, CreditCard, Ban } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getSuppliers, saveSuppliers, getPurchases, getSupplierPayments, getSupplierLedger, addSupplierPayment, addSupplierLedgerEntry, updateSupplierBalance, getPurchaseReturns, addPurchaseReturn, updateProductStock } from '../lib/db';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  
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
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [activePurchase, setActivePurchase] = useState(null);
  const [viewTab, setViewTab] = useState('Overview');

  const [supplierForm, setSupplierForm] = useState({ 
    name: '', companyName: '', mobile: '', alternateMobile: '', email: '', 
    gstin: '', pan: '', address: '', city: '', district: '', state: '', pincode: '', 
    paymentTerms: 'Immediate', customDays: '', creditLimit: '', openingBalance: '', notes: '', status: 'Active'
  });

  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'UPI', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });
  
  const [returnForm, setReturnForm] = useState({ productId: '', quantity: 1, reason: '', date: new Date().toISOString().split('T')[0] });

  const loadData = () => {
    setSuppliers(getSuppliers().sort((a, b) => b.id - a.id));
    setPurchases(getPurchases());
    setPayments(getSupplierPayments());
    setLedger(getSupplierLedger());
    setPurchaseReturns(getPurchaseReturns());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  const validateGSTIN = (gstin) => {
    if (!gstin) return true; // Optional
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstin);
  };

  const getDaysFromTerms = (terms, customDays) => {
    if (terms === 'Immediate') return 0;
    if (terms === '7 Days') return 7;
    if (terms === '15 Days') return 15;
    if (terms === '30 Days') return 30;
    if (terms === '45 Days') return 45;
    if (terms === '60 Days') return 60;
    if (terms === 'Custom') return Number(customDays) || 0;
    return 0;
  };

  const getSupplierStats = (sId) => {
    const sPurchases = purchases.filter(p => p.supplierId === sId);
    const totalPurchases = sPurchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaidPurchases = sPurchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    
    const sPayments = payments.filter(p => p.supplierId === sId);
    const totalDirectPayments = sPayments.reduce((sum, p) => sum + p.amount, 0);

    const sReturns = purchaseReturns.filter(pr => pr.supplierId === sId);
    const totalReturns = sReturns.reduce((sum, pr) => sum + pr.amount, 0);

    const totalPaid = totalPaidPurchases + totalDirectPayments;
    const s = suppliers.find(x => x.id === sId);
    const outstanding = s?.balance || 0;

    // Calculate generic due date from the latest credit purchase
    // Simplification for list view: take the oldest unpaid purchase
    const unpaidPurchases = sPurchases.filter(p => p.amountPaid < p.total).sort((a, b) => new Date(a.date) - new Date(b.date));
    let dueDate = null;
    let isOverdue = false;
    
    if (unpaidPurchases.length > 0 && s) {
      const oldestUnpaid = unpaidPurchases[0];
      const days = getDaysFromTerms(s.paymentTerms, s.customDays);
      const purchaseDate = new Date(oldestUnpaid.date);
      purchaseDate.setDate(purchaseDate.getDate() + days);
      dueDate = purchaseDate;
      if (dueDate < new Date()) {
        isOverdue = true;
      }
    }

    return { totalPurchases, totalPaid, outstanding, dueDate, isOverdue };
  };

  // -------------------------------------------------------------
  // Filters & Pagination
  // -------------------------------------------------------------

  const filteredSuppliers = suppliers.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) ||
                          (s.companyName && s.companyName.toLowerCase().includes(q)) ||
                          (s.phone && s.phone.includes(q)) ||
                          (s.email && s.email.toLowerCase().includes(q));
    
    let matchesStatus = true;
    const stats = getSupplierStats(s.id);
    if (statusFilter === 'active') matchesStatus = s.status !== 'Inactive';
    if (statusFilter === 'inactive') matchesStatus = s.status === 'Inactive';
    if (statusFilter === 'with_outstanding') matchesStatus = stats.outstanding > 0;
    if (statusFilter === 'no_outstanding') matchesStatus = stats.outstanding <= 0;
    if (statusFilter === 'overdue') matchesStatus = stats.isOverdue;

    return matchesSearch && matchesStatus;
  });

  const paginatedSuppliers = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalSuppliersCount = suppliers.length;
  const activeSuppliersCount = suppliers.filter(s => s.status !== 'Inactive').length;
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total, 0);

  // -------------------------------------------------------------
  // Create / Edit Workflow
  // -------------------------------------------------------------

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setSupplierForm({ 
      name: '', companyName: '', mobile: '', alternateMobile: '', email: '', 
      gstin: '', pan: '', address: '', city: '', district: '', state: '', pincode: '', 
      paymentTerms: 'Immediate', customDays: '', creditLimit: '', openingBalance: '', notes: '', status: 'Active'
    });
    setShowAddModal(true);
  };

  const openEditModal = (s) => {
    setIsEditing(true);
    setEditingId(s.id);
    setSupplierForm({ 
      name: s.name, 
      companyName: s.companyName || '',
      mobile: s.phone || '', 
      alternateMobile: s.alternateMobile || '', 
      email: s.email || '', 
      gstin: s.gstin || '',
      pan: s.pan || '',
      address: s.address || '', 
      city: s.city || '', 
      district: s.district || '', 
      state: s.state || '', 
      pincode: s.pincode || '', 
      paymentTerms: s.paymentTerms || 'Immediate',
      customDays: s.customDays || '',
      creditLimit: s.creditLimit || '', 
      openingBalance: s.openingBalance || '', 
      notes: s.notes || '', 
      status: s.status || 'Active'
    });
    setShowAddModal(true);
  };

  const handleSupplierSubmit = (e) => {
    e.preventDefault();
    if (!supplierForm.name) return showToast('Supplier Name is required.', 'error');
    if (!supplierForm.mobile) return showToast('Mobile Number is required.', 'error');
    
    if (supplierForm.gstin && !validateGSTIN(supplierForm.gstin)) {
      return showToast('Please enter a valid GSTIN.', 'error');
    }

    // Duplicate Check
    const duplicate = suppliers.find(s => s.phone === supplierForm.mobile && s.id !== editingId);
    if (duplicate) return showToast('Supplier with this mobile already exists.', 'error');

    const newOpeningBalance = Number(supplierForm.openingBalance) || 0;
    
    if (isEditing) {
      const updatedSuppliers = suppliers.map(s => {
        if (s.id === editingId) {
          const wasInactive = s.status === 'Inactive';
          const isNowActive = supplierForm.status !== 'Inactive';
          
          if (wasInactive && isNowActive) {
            setTimeout(() => showToast('Supplier reactivated successfully.'), 500);
          } else {
            setTimeout(() => showToast('Supplier updated successfully.'), 500);
          }
          
          return {
            ...s,
            ...supplierForm,
            phone: supplierForm.mobile,
            creditLimit: Number(supplierForm.creditLimit) || 0,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
      saveSuppliers(updatedSuppliers);
    } else {
      const newSupplier = {
        id: Date.now(),
        ...supplierForm,
        phone: supplierForm.mobile,
        balance: newOpeningBalance,
        creditLimit: Number(supplierForm.creditLimit) || 0,
        createdAt: new Date().toISOString()
      };
      saveSuppliers([newSupplier, ...suppliers]);

      if (newOpeningBalance > 0) {
        addSupplierLedgerEntry({
          supplierId: newSupplier.id,
          type: 'Opening Balance',
          referenceId: 'OPEN',
          description: 'Initial Opening Balance',
          debit: 0,
          credit: newOpeningBalance,
          balance: newOpeningBalance,
          date: new Date().toISOString()
        });
      }
      showToast('Supplier created successfully.');
    }

    setShowAddModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // Delete / Deactivate Workflow
  // -------------------------------------------------------------

  const triggerDelete = (s) => {
    const hasTransactions = purchases.some(p => p.supplierId === s.id) || payments.some(p => p.supplierId === s.id);

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Supplier?',
      message: `Supplier: ${s.name}\n\n${hasTransactions ? 'This supplier has transaction history and cannot be permanently deleted.\n\nYou can deactivate this supplier instead.' : 'Are you sure you want to permanently delete this supplier?'}`,
      confirmText: hasTransactions ? 'Deactivate Supplier' : 'Delete Supplier',
      isDestructive: true,
      onConfirm: () => {
        if (hasTransactions) {
          const updated = suppliers.map(x => x.id === s.id ? { ...x, status: 'Inactive' } : x);
          saveSuppliers(updated);
          showToast('Supplier deactivated successfully.');
        } else {
          const filtered = suppliers.filter(x => x.id !== s.id);
          saveSuppliers(filtered);
          showToast('Supplier deleted successfully.');
        }
        setConfirmDialog({ isOpen: false });
        loadData();
      }
    });
  };

  // -------------------------------------------------------------
  // Payment Workflow
  // -------------------------------------------------------------

  const openPaymentModal = (s) => {
    setActiveSupplier(s);
    setPaymentForm({ amount: s.balance, method: 'UPI', reference: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const paymentAmt = Number(paymentForm.amount);

    if (paymentAmt <= 0) return showToast('Payment amount must be greater than 0.', 'error');
    if (paymentAmt > activeSupplier.balance) return showToast('Payment amount cannot exceed supplier outstanding balance.', 'error');

    // Add Payment
    const paymentRec = {
      supplierId: activeSupplier.id,
      amount: paymentAmt,
      paymentMethod: paymentForm.method,
      reference: paymentForm.reference,
      date: new Date(paymentForm.date).toISOString(),
      notes: paymentForm.notes
    };
    addSupplierPayment(paymentRec);

    // Update Supplier Balance (Outstanding decreases, which means we pass negative to our generic update function if it adds, wait:
    // our db.js updateSupplierBalance adds the amount. So passing -paymentAmt reduces it.
    updateSupplierBalance(activeSupplier.id, -paymentAmt);

    // Add Ledger Entry
    addSupplierLedgerEntry({
      supplierId: activeSupplier.id,
      type: 'Payment',
      referenceId: paymentForm.reference || 'PAY-SUP',
      description: `Payment via ${paymentForm.method}`,
      debit: paymentAmt,
      credit: 0,
      balance: activeSupplier.balance - paymentAmt,
      date: new Date(paymentForm.date).toISOString()
    });

    showToast('Payment recorded successfully.');
    setShowPaymentModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // Purchase Return Workflow
  // -------------------------------------------------------------

  const openReturnModal = (purchase) => {
    setActivePurchase(purchase);
    if (!purchase.items || purchase.items.length === 0) return showToast('No items in this purchase to return.', 'error');
    setReturnForm({ productId: purchase.items[0].productId || purchase.items[0].id, quantity: 1, reason: 'Defective', date: new Date().toISOString().split('T')[0] });
    setShowReturnModal(true);
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const qty = Number(returnForm.quantity);
    if (qty <= 0) return showToast('Return quantity must be greater than 0', 'error');

    const item = activePurchase.items.find(i => (i.productId || i.id) == returnForm.productId);
    if (!item) return showToast('Item not found in purchase', 'error');
    if (qty > (item.quantity || item.qty)) return showToast('Cannot return more than purchased quantity', 'error');

    // Calculate return amount
    // Rough estimate based on rate + GST - discount. Actually, we can use the item's unit total
    const unitPrice = (item.total || 0) / (item.quantity || item.qty || 1);
    const returnAmount = unitPrice * qty;

    const pr = {
      supplierId: activeSupplier.id,
      purchaseId: activePurchase.id,
      purchaseInvoiceNo: activePurchase.invoiceNo,
      productId: item.productId || item.id,
      productName: item.productName || item.name,
      quantity: qty,
      amount: returnAmount,
      reason: returnForm.reason,
      date: new Date(returnForm.date).toISOString()
    };

    addPurchaseReturn(pr);

    // 1. Update Stock OUT
    updateProductStock(pr.productId, -qty, 'PURCHASE_RETURN', `PR from ${activePurchase.invoiceNo}`);

    // 2. Reduce Supplier Payable
    updateSupplierBalance(activeSupplier.id, -returnAmount);

    // 3. Ledger Entry (Debit)
    addSupplierLedgerEntry({
      supplierId: activeSupplier.id,
      type: 'Purchase Return',
      referenceId: `PR-${activePurchase.invoiceNo}`,
      description: `Return ${qty}x ${pr.productName}`,
      debit: returnAmount,
      credit: 0,
      balance: activeSupplier.balance - returnAmount,
      date: new Date(returnForm.date).toISOString()
    });

    showToast('Purchase return recorded successfully.');
    setShowReturnModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // View Details Workflow
  // -------------------------------------------------------------

  const openViewModal = (s) => {
    setActiveSupplier(s);
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
          <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
          <p className="text-slate-500">Manage your suppliers, purchases and outstanding payments.</p>
        </div>
        <button className="btn-primary flex items-center" onClick={openAddModal}>
          <Plus size={18} className="mr-2" /> Add Supplier
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Suppliers</p>
            <h3 className="text-xl font-bold text-slate-800">{totalSuppliersCount}</h3>
          </div>
          <Truck className="text-blue-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Suppliers</p>
            <h3 className="text-xl font-bold text-slate-800">{activeSuppliersCount}</h3>
          </div>
          <CheckCircle className="text-emerald-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-orange-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Payments</p>
            <h3 className="text-xl font-bold text-slate-800">₹{totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          </div>
          <IndianRupee className="text-orange-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Purchase Value</p>
            <h3 className="text-xl font-bold text-slate-800">₹{totalPurchaseValue.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          </div>
          <FileText className="text-purple-100" size={32} />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={18} /></div>
          <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} placeholder="Search supplier, company, mobile or email..." className="input-field pl-10 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-44 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Suppliers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="with_outstanding">With Outstanding</option>
            <option value="no_outstanding">No Outstanding</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Mobile</th>
                <th className="py-3 px-4 font-semibold text-right">Total Purchases</th>
                <th className="py-3 px-4 font-semibold text-right">Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-4 font-semibold text-center">Due Date</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSuppliers.map((s) => {
                const stats = getSupplierStats(s.id);
                
                return (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${s.status === 'Inactive' ? 'opacity-60' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{s.name}</div>
                      {s.companyName && <div className="text-xs text-slate-500">{s.companyName}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{s.phone || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">₹{stats.totalPurchases.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">₹{stats.totalPaid.toLocaleString('en-IN')}</td>
                    <td className={`py-3 px-4 text-right font-bold ${s.balance > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      ₹{s.balance.toLocaleString('en-IN', {minimumFractionDigits:2})}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {stats.outstanding > 0 && stats.dueDate ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${stats.isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-50 text-orange-600'}`}>
                          {stats.isOverdue ? 'OVERDUE' : stats.dueDate.toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        s.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {s.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center space-x-2 text-slate-400">
                        {s.balance > 0 && (
                          <button onClick={() => openPaymentModal(s)} className="w-8 h-8 rounded hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors" title="Record Payment">
                            <CreditCard size={16} />
                          </button>
                        )}
                        <button onClick={() => openViewModal(s)} className="w-8 h-8 rounded hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors" title="View Supplier"><Eye size={18} /></button>
                        <button onClick={() => openEditModal(s)} className="w-8 h-8 rounded hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-colors" title="Edit Supplier"><Edit size={18} /></button>
                        <button onClick={() => triggerDelete(s)} className="w-8 h-8 rounded hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" title={s.status === 'Inactive' ? 'Delete' : 'Delete / Deactivate'}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    <Truck size={40} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">
                      {searchQuery ? 'No suppliers match your search.' : 'No suppliers found. Add your first supplier to start managing purchases.'}
                    </p>
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-2 text-primary-600 font-bold text-sm">Clear Search</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-white">
          <Pagination currentPage={currentPage} totalItems={filteredSuppliers.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
        </div>
        <div className="px-4 pb-4 flex items-center text-sm text-slate-500 bg-white">
            <span>Items per page:</span>
            <select className="ml-2 border border-slate-300 rounded p-1 outline-none focus:border-primary-500" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
        </div>
      </div>

      {/* ---------------------------------------------------------
          ADD / EDIT SUPPLIER MODAL
      --------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto">
              <form id="addSupForm" onSubmit={handleSupplierSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Supplier Name *</label>
                    <input type="text" required className="input-field" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Company Name</label>
                    <input type="text" className="input-field" value={supplierForm.companyName} onChange={e => setSupplierForm({...supplierForm, companyName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Mobile Number *</label>
                    <input type="text" required className="input-field" value={supplierForm.mobile} onChange={e => setSupplierForm({...supplierForm, mobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Alternate Mobile</label>
                    <input type="text" className="input-field" value={supplierForm.alternateMobile} onChange={e => setSupplierForm({...supplierForm, alternateMobile: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Email</label>
                    <input type="email" className="input-field" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">PAN</label>
                    <input type="text" className="input-field uppercase" value={supplierForm.pan} onChange={e => setSupplierForm({...supplierForm, pan: e.target.value})} />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Address</label>
                    <input type="text" className="input-field" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">City</label>
                    <input type="text" className="input-field" value={supplierForm.city} onChange={e => setSupplierForm({...supplierForm, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">State</label>
                    <input type="text" className="input-field" value={supplierForm.state} onChange={e => setSupplierForm({...supplierForm, state: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Pincode</label>
                    <input type="text" className="input-field" value={supplierForm.pincode} onChange={e => setSupplierForm({...supplierForm, pincode: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">GSTIN</label>
                    <input type="text" className="input-field uppercase" value={supplierForm.gstin} onChange={e => setSupplierForm({...supplierForm, gstin: e.target.value})} />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Payment Terms</label>
                    <select className="input-field" value={supplierForm.paymentTerms} onChange={e => setSupplierForm({...supplierForm, paymentTerms: e.target.value})}>
                      <option>Immediate</option>
                      <option>7 Days</option>
                      <option>15 Days</option>
                      <option>30 Days</option>
                      <option>45 Days</option>
                      <option>60 Days</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  {supplierForm.paymentTerms === 'Custom' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Custom Days</label>
                      <input type="number" min="0" className="input-field" value={supplierForm.customDays} onChange={e => setSupplierForm({...supplierForm, customDays: e.target.value})} />
                    </div>
                  )}
                  <div className={supplierForm.paymentTerms === 'Custom' ? '' : 'md:col-span-2'}>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Credit Limit (₹)</label>
                    <input type="number" min="0" className="input-field" value={supplierForm.creditLimit} onChange={e => setSupplierForm({...supplierForm, creditLimit: e.target.value})} />
                  </div>

                  {!isEditing && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Opening Balance (₹)</label>
                      <input type="number" min="0" className="input-field" value={supplierForm.openingBalance} onChange={e => setSupplierForm({...supplierForm, openingBalance: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Status</label>
                    <select className="input-field" value={supplierForm.status} onChange={e => setSupplierForm({...supplierForm, status: e.target.value})}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Notes</label>
                    <textarea className="input-field resize-none h-20" value={supplierForm.notes} onChange={e => setSupplierForm({...supplierForm, notes: e.target.value})}></textarea>
                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" form="addSupForm" className="btn-primary px-8">Save Supplier</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PAYMENT MODAL
      --------------------------------------------------------- */}
      {showPaymentModal && activeSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">Record Payment</h2>
                <p className="text-xs text-slate-500 mt-1">{activeSupplier.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-center">
                <span className="text-sm font-medium text-slate-500">Total Outstanding</span>
                <div className="text-2xl font-black text-red-600 mt-1">₹{activeSupplier.balance.toLocaleString('en-IN', {minimumFractionDigits:2})}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Payment Amount (₹) *</label>
                <input type="number" required min="1" step="0.01" max={activeSupplier.balance} className="input-field text-lg font-bold" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
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
                    <option>Cheque</option>
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
          RETURN MODAL
      --------------------------------------------------------- */}
      {showReturnModal && activePurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReturnModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">Return Products</h2>
                <p className="text-xs text-slate-500 mt-1">Invoice: {activePurchase.invoiceNo}</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleReturnSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Product to Return *</label>
                <select className="input-field" required value={returnForm.productId} onChange={e => setReturnForm({...returnForm, productId: e.target.value})}>
                  {activePurchase.items.map(i => (
                    <option key={i.productId || i.id} value={i.productId || i.id}>{i.productName || i.name} (Purchased: {i.quantity || i.qty})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Quantity *</label>
                  <input type="number" required min="1" max={activePurchase.items.find(i => (i.productId || i.id) == returnForm.productId)?.quantity || 1} className="input-field" value={returnForm.quantity} onChange={e => setReturnForm({...returnForm, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Date *</label>
                  <input type="date" required className="input-field" value={returnForm.date} onChange={e => setReturnForm({...returnForm, date: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Reason *</label>
                <select className="input-field" required value={returnForm.reason} onChange={e => setReturnForm({...returnForm, reason: e.target.value})}>
                  <option>Defective</option>
                  <option>Damaged</option>
                  <option>Wrong Item</option>
                  <option>Expired</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowReturnModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary bg-orange-600 hover:bg-orange-700 shadow-sm border-orange-700">Confirm Return</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          VIEW SUPPLIER DETAILS MODAL
      --------------------------------------------------------- */}
      {showViewModal && activeSupplier && (() => {
        const stats = getSupplierStats(activeSupplier.id);
        const sLedger = ledger.filter(l => l.supplierId === activeSupplier.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        const sPurchases = purchases.filter(p => p.supplierId === activeSupplier.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        const sPayments = payments.filter(p => p.supplierId === activeSupplier.id).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  {activeSupplier.name}
                  <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${activeSupplier.status === 'Inactive' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                    {activeSupplier.status || 'Active'}
                  </span>
                </h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">{activeSupplier.phone || 'No Mobile'} {activeSupplier.companyName ? `• ${activeSupplier.companyName}` : ''}</p>
              </div>
              <div className="flex items-center space-x-2 print:hidden">
                <button className="btn-secondary text-sm py-1.5" onClick={() => { setShowViewModal(false); openEditModal(activeSupplier); }}>Edit</button>
                {activeSupplier.balance > 0 && <button className="btn-primary bg-emerald-600 border-emerald-700 text-sm py-1.5" onClick={() => openPaymentModal(activeSupplier)}>Record Payment</button>}
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-700 ml-2"><X size={24} /></button>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-5 gap-0 border-b border-slate-200 bg-white print:hidden">
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
              <div className="p-4 border-r border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Limit</p>
                <p className="text-xl font-bold text-slate-800">{activeSupplier.creditLimit ? `₹${Number(activeSupplier.creditLimit).toLocaleString('en-IN')}` : 'None'}</p>
              </div>
              <div className="p-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Returns</p>
                <p className="text-xl font-bold text-slate-800">₹{purchaseReturns.filter(pr => pr.supplierId === activeSupplier.id).reduce((sum, pr) => sum + pr.amount, 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 border-b border-slate-200 bg-slate-50 space-x-6 print:hidden">
              {['Overview', 'Purchases', 'Payments', 'Ledger', 'Returns'].map(tab => (
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
            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 print:p-0 print:bg-white">
              
              {viewTab === 'Overview' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none">
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Supplier ID</p><p className="font-medium text-slate-800">#{activeSupplier.id}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Company</p><p className="font-medium text-slate-800">{activeSupplier.companyName || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Mobile</p><p className="font-medium text-slate-800">{activeSupplier.phone || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Email</p><p className="font-medium text-slate-800">{activeSupplier.email || 'N/A'}</p></div>
                  <div className="md:col-span-2"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Address</p><p className="font-medium text-slate-800">{activeSupplier.address ? `${activeSupplier.address}, ${activeSupplier.city}, ${activeSupplier.state} - ${activeSupplier.pincode}` : 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">GSTIN</p><p className="font-medium text-slate-800">{activeSupplier.gstin || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">PAN</p><p className="font-medium text-slate-800">{activeSupplier.pan || 'N/A'}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Terms</p><p className="font-medium text-slate-800">{activeSupplier.paymentTerms} {activeSupplier.paymentTerms === 'Custom' ? `(${activeSupplier.customDays} Days)` : ''}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Opening Balance</p><p className="font-medium text-slate-800">₹{(activeSupplier.openingBalance || 0).toLocaleString('en-IN')}</p></div>
                  <div><p className="text-xs font-bold text-slate-400 uppercase mb-1">Created On</p><p className="font-medium text-slate-800">{activeSupplier.createdAt ? new Date(activeSupplier.createdAt).toLocaleDateString() : 'N/A'}</p></div>
                  <div className="md:col-span-3"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Notes</p><p className="font-medium text-slate-800">{activeSupplier.notes || 'N/A'}</p></div>
                </div>
              )}

              {viewTab === 'Purchases' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Invoice</th>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold text-center">Items</th>
                        <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                        <th className="py-3 px-4 font-semibold text-right">Paid</th>
                        <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        <th className="py-3 px-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sPurchases.length > 0 ? sPurchases.map(p => {
                        const paid = p.amountPaid || 0;
                        const outstanding = p.total - paid;
                        return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-primary-600">{p.invoiceNo}</td>
                          <td className="py-3 px-4">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-center">{p.items?.length || 0}</td>
                          <td className="py-3 px-4 text-right font-bold">₹{p.total.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-emerald-600 font-medium">₹{paid.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right text-red-600 font-bold">₹{outstanding.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${paid >= p.total ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {paid >= p.total ? 'Paid' : 'Credit'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => openReturnModal(p)} className="text-xs font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-2 py-1 rounded">Return</button>
                          </td>
                        </tr>
                      )}) : <tr><td colSpan="8" className="text-center py-8 text-slate-500">No purchase history found.</td></tr>}
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
                      {sPayments.length > 0 ? sPayments.map(p => (
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:bg-white print:border-b-2 print:border-black">
                    <h3 className="font-bold text-slate-800">Account Statement</h3>
                    <button className="btn-secondary py-1 text-xs flex items-center print:hidden" onClick={() => window.print()}><FileText size={14} className="mr-1" /> Print Statement</button>
                  </div>
                  
                  {/* Print Header */}
                  <div className="hidden print:block p-4 mb-4">
                    <h1 className="text-2xl font-bold text-center mb-1">EVERYKADAI</h1>
                    <h2 className="text-lg font-bold text-center mb-6">SUPPLIER STATEMENT</h2>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p><strong>Supplier:</strong> {activeSupplier.name}</p>
                        <p><strong>Mobile:</strong> {activeSupplier.phone}</p>
                        <p><strong>GSTIN:</strong> {activeSupplier.gstin || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p><strong>Date Printed:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Total Outstanding:</strong> ₹{stats.outstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-600 border-b border-slate-200 print:border-b-2 print:border-black">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Description</th>
                        <th className="py-3 px-4 font-semibold">Ref No</th>
                        <th className="py-3 px-4 font-semibold text-right text-emerald-600 print:text-black">Debit (Payment)</th>
                        <th className="py-3 px-4 font-semibold text-right text-red-600 print:text-black">Credit (Purchase)</th>
                        <th className="py-3 px-4 font-semibold text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sLedger.length > 0 ? sLedger.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 whitespace-nowrap">{new Date(l.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-medium">{l.description}</td>
                          <td className="py-3 px-4 text-slate-500">{l.referenceId}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600 print:text-black">{l.debit > 0 ? `₹${l.debit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-medium text-red-500 print:text-black">{l.credit > 0 ? `₹${l.credit.toLocaleString('en-IN')}` : '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">₹{l.balance.toLocaleString('en-IN')}</td>
                        </tr>
                      )) : <tr><td colSpan="6" className="text-center py-8 text-slate-500">No ledger entries found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              
              {viewTab === 'Returns' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Invoice</th>
                        <th className="py-3 px-4 font-semibold">Product</th>
                        <th className="py-3 px-4 font-semibold text-center">Qty</th>
                        <th className="py-3 px-4 font-semibold">Reason</th>
                        <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseReturns.filter(pr => pr.supplierId === activeSupplier.id).length > 0 ? 
                        purchaseReturns.filter(pr => pr.supplierId === activeSupplier.id).map(pr => (
                        <tr key={pr.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium">{new Date(pr.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{pr.purchaseInvoiceNo}</td>
                          <td className="py-3 px-4 font-bold text-slate-700">{pr.productName}</td>
                          <td className="py-3 px-4 text-center font-bold text-orange-600">{pr.quantity}</td>
                          <td className="py-3 px-4 text-slate-500">{pr.reason || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-orange-600">₹{pr.amount.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                        </tr>
                      )) : <tr><td colSpan="6" className="text-center py-8 text-slate-500">No purchase returns found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
        );
      })()}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .fixed.inset-0, .fixed.inset-0 * { visibility: visible; overflow: visible !important; }
          .fixed.inset-0 { position: absolute; left: 0; top: 0; width: 100%; min-height: 100vh; background: white; padding: 0; margin: 0; }
          .shadow-2xl { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Suppliers;
