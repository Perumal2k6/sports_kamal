import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Truck, IndianRupee, FileText, Edit, Trash2, X, CheckCircle, AlertTriangle, UserPlus, CreditCard } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getPurchases, savePurchases, addPurchase, getSuppliers, saveSuppliers, getProducts, updateProductStock, updateSupplierBalance, addSupplierPayment, addSupplierLedgerEntry } from '../lib/db';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // UI State
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  // Add/Edit Purchase State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activePurchase, setActivePurchase] = useState(null);
  
  const [purchaseForm, setPurchaseForm] = useState({ 
    invoiceNo: '', 
    supplierId: '', 
    date: new Date().toISOString().split('T')[0],
    amountPaid: '',
    paymentMethod: 'Cash',
    paymentReference: ''
  });
  
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');

  // Add Supplier State
  const [supplierForm, setSupplierForm] = useState({ name: '', company: '', phone: '', gstin: '', balance: 0 });

  // Payment State
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', reference: '' });

  const loadData = () => {
    setPurchases(getPurchases().sort((a, b) => new Date(b.date) - new Date(a.date)));
    setSuppliers(getSuppliers());
    setProducts(getProducts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // -------------------------------------------------------------
  // Derived Calculations
  // -------------------------------------------------------------
  
  // Filter logic
  const filteredPurchases = purchases.filter(p => {
    const q = searchQuery.toLowerCase();
    const sup = suppliers.find(s => s.id === p.supplierId);
    
    const matchesSearch = (p.invoiceNo || '').toLowerCase().includes(q) ||
                          (sup && (sup.name || '').toLowerCase().includes(q)) ||
                          (sup && sup.company && sup.company.toLowerCase().includes(q)) ||
                          (sup && sup.phone.includes(q));

    const matchesStatus = statusFilter === 'all' || (p.paymentStatus || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesSupplier = supplierFilter === 'all' || p.supplierId.toString() === supplierFilter;

    // Simplified Date filter
    let matchesDate = true;
    const pDate = new Date(p.date);
    const today = new Date();
    if (dateFilter === 'today') {
      matchesDate = pDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today.setDate(today.getDate() - 7));
      matchesDate = pDate >= weekAgo;
    } else if (dateFilter === 'month') {
      matchesDate = pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear();
    }

    return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
  });

  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // KPI Calculations
  const totalPurchasesCount = purchases.length;
  const pendingPayments = purchases.reduce((sum, p) => sum + (p.outstandingAmount || 0), 0);
  const activeSuppliersCount = suppliers.length;
  const totalPurchasesValue = purchases.reduce((sum, p) => sum + (p.grandTotal || p.total || 0), 0);

  // Form Calculations
  const calcItemTotals = (item) => {
    const rate = Number(item.purchaseRate) || 0;
    const qty = Number(item.quantity) || 0;
    const disc = Number(item.discount) || 0;
    const gstPercent = Number(item.gstPercent) || 0;

    const subtotal = rate * qty;
    const taxableAmount = Math.max(0, subtotal - disc);
    const gstAmount = taxableAmount * (gstPercent / 100);
    const total = taxableAmount + gstAmount;

    return { ...item, subtotal, taxableAmount, gstAmount, total };
  };

  const getFormSummary = () => {
    const subtotal = purchaseItems.reduce((sum, i) => sum + (Number(i.purchaseRate) * Number(i.quantity) || 0), 0);
    const totalDiscount = purchaseItems.reduce((sum, i) => sum + (Number(i.discount) || 0), 0);
    const taxableValue = purchaseItems.reduce((sum, i) => sum + (i.taxableAmount || 0), 0);
    const totalGst = purchaseItems.reduce((sum, i) => sum + (i.gstAmount || 0), 0);
    const grandTotal = purchaseItems.reduce((sum, i) => sum + (i.total || 0), 0);

    return { subtotal, totalDiscount, taxableValue, totalGst, grandTotal };
  };

  const formSummary = getFormSummary();

  // -------------------------------------------------------------
  // Purchase Creation & Editing Workflow
  // -------------------------------------------------------------

  const openAddPurchase = () => {
    setIsEditing(false);
    setEditingId(null);
    setPurchaseForm({
      invoiceNo: `PUR-${(purchases.length + 1).toString().padStart(6, '0')}`,
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
      amountPaid: '',
      paymentMethod: 'Cash',
      paymentReference: ''
    });
    setPurchaseItems([]);
    setShowAddModal(true);
  };

  const addProductToPurchase = (product) => {
    const existing = purchaseItems.find(i => i.productId === product.id);
    if (existing) {
      const updated = purchaseItems.map(i => i.productId === product.id ? calcItemTotals({ ...i, quantity: i.quantity + 1 }) : i);
      setPurchaseItems(updated);
    } else {
      const newItem = calcItemTotals({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        purchaseRate: product.price * 0.7, // Assume a default purchase rate if not stored
        discount: 0,
        gstPercent: product.tax || 0
      });
      setPurchaseItems([...purchaseItems, newItem]);
    }
    setItemSearch('');
  };

  const updatePurchaseItem = (index, field, value) => {
    const newItems = [...purchaseItems];
    newItems[index] = calcItemTotals({ ...newItems[index], [field]: value });
    setPurchaseItems(newItems);
  };

  const removePurchaseItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handlePurchaseSubmit = (e) => {
    e.preventDefault();
    if (purchaseItems.length === 0) return showToast('Please add items to purchase.', 'error');
    if (!purchaseForm.supplierId) return showToast('Please select a supplier.', 'error');
    if (purchaseItems.some(i => i.quantity <= 0)) return showToast('Quantities must be greater than 0.', 'error');

    if (isEditing) {
      setConfirmDialog({
        isOpen: true,
        title: 'Confirm Edit',
        message: 'Editing this purchase will update stock and supplier ledger.\n\nContinue?',
        confirmText: 'Continue',
        isDestructive: false,
        onConfirm: () => {
          processPurchaseEdit();
          setConfirmDialog({ isOpen: false });
        }
      });
    } else {
      processPurchaseAdd();
    }
  };

  const processPurchaseAdd = () => {
    const paid = Number(purchaseForm.amountPaid) || 0;
    const outstandingAmount = Math.max(0, formSummary.grandTotal - paid);
    
    let paymentStatus = 'Pending';
    if (paid >= formSummary.grandTotal) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';
    else paymentStatus = 'Credit';

    const newPur = {
      invoiceNo: purchaseForm.invoiceNo,
      supplierId: Number(purchaseForm.supplierId),
      date: new Date(purchaseForm.date).toISOString(),
      ...formSummary,
      amountPaid: paid,
      outstandingAmount,
      paymentStatus,
      paymentMethod: purchaseForm.paymentMethod,
      paymentReference: purchaseForm.paymentReference,
      items: purchaseItems
    };

    // Use db.js addPurchase which automatically updates stock & supplier ledger
    addPurchase({ ...newPur, total: formSummary.grandTotal });
    
    showToast('Purchase completed successfully!');
    setShowAddModal(false);
    loadData();
  };

  const processPurchaseEdit = () => {
    const original = purchases.find(p => p.id === editingId);
    if (!original) return;

    // 1. Reverse original effects
    original.items.forEach(item => {
      updateProductStock(item.productId || item.id, -item.quantity, 'PURCHASE REVERSAL', `Rev Edit: ${original.invoiceNo}`);
    });
    if (original.outstandingAmount > 0) {
      updateSupplierBalance(original.supplierId, -original.outstandingAmount);
      
      const suppliers = getSuppliers();
      const s = suppliers.find(x => x.id === original.supplierId);
      addSupplierLedgerEntry({
        supplierId: original.supplierId,
        type: 'Reversal',
        referenceId: `REV-${original.invoiceNo}`,
        description: `Purchase Edit Reversal: ${original.invoiceNo}`,
        debit: original.outstandingAmount,
        credit: 0,
        balance: s ? (s.balance || 0) : 0,
        date: new Date().toISOString()
      });
    }

    // 2. Apply new effects
    const paid = Number(purchaseForm.amountPaid) || 0;
    const outstandingAmount = Math.max(0, formSummary.grandTotal - paid);
    
    let paymentStatus = 'Pending';
    if (paid >= formSummary.grandTotal) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'Partial';
    else paymentStatus = 'Credit';

    const updatedPurchase = {
      ...original,
      invoiceNo: purchaseForm.invoiceNo,
      supplierId: Number(purchaseForm.supplierId),
      date: new Date(purchaseForm.date).toISOString(),
      ...formSummary,
      amountPaid: paid,
      outstandingAmount,
      paymentStatus,
      paymentMethod: purchaseForm.paymentMethod,
      paymentReference: purchaseForm.paymentReference,
      items: purchaseItems,
      total: formSummary.grandTotal
    };

    const updatedPurchases = purchases.map(p => p.id === editingId ? updatedPurchase : p);
    savePurchases(updatedPurchases);

    // Apply new stock
    updatedPurchase.items.forEach(item => {
      updateProductStock(item.productId || item.id, item.quantity, 'PURCHASE_IN', updatedPurchase.invoiceNo);
    });
    
    // Apply new supplier balance
    if (outstandingAmount > 0) {
      updateSupplierBalance(updatedPurchase.supplierId, outstandingAmount);
      
      const suppliers = getSuppliers();
      const s = suppliers.find(x => x.id === updatedPurchase.supplierId);
      addSupplierLedgerEntry({
        supplierId: updatedPurchase.supplierId,
        type: 'Purchase',
        referenceId: updatedPurchase.invoiceNo,
        description: `Purchase Edit: ${updatedPurchase.invoiceNo}`,
        debit: 0,
        credit: outstandingAmount,
        balance: s ? (s.balance || 0) : outstandingAmount,
        date: new Date().toISOString()
      });
    }

    showToast('Purchase updated successfully!');
    setShowAddModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // Delete Workflow
  // -------------------------------------------------------------

  const triggerDelete = (purchase) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Purchase?',
      message: `Purchase: ${purchase.invoiceNo}\nSupplier: ${suppliers.find(s=>s.id === purchase.supplierId)?.name}\nTotal: ₹${(purchase.grandTotal||purchase.total||0).toFixed(2)}\n\nWarning: Deleting this purchase will reverse:\n- Inventory stock\n- Supplier ledger\n- Payment records\n- Purchase history`,
      confirmText: 'Delete Purchase',
      isDestructive: true,
      onConfirm: () => {
        // Reverse Stock
        purchase.items.forEach(item => {
          updateProductStock(item.productId || item.id, -(item.quantity||item.qty), 'PURCHASE REVERSAL', `Del: ${purchase.invoiceNo}`);
        });

        // Reverse Supplier Ledger
        const outstanding = purchase.outstandingAmount ?? Math.max(0, (purchase.grandTotal || purchase.total) - (purchase.amountPaid || 0));
        if (outstanding > 0) {
          updateSupplierBalance(purchase.supplierId, -outstanding);
          
          const suppliers = getSuppliers();
          const s = suppliers.find(x => x.id === purchase.supplierId);
          addSupplierLedgerEntry({
            supplierId: purchase.supplierId,
            type: 'Reversal',
            referenceId: `DEL-${purchase.invoiceNo}`,
            description: `Purchase Deleted: ${purchase.invoiceNo}`,
            debit: outstanding,
            credit: 0,
            balance: s ? (s.balance || 0) : 0,
            date: new Date().toISOString()
          });
        }

        // Delete record
        const filtered = purchases.filter(p => p.id !== purchase.id);
        savePurchases(filtered);

        showToast('Purchase deleted and effects reversed successfully.');
        setConfirmDialog({ isOpen: false });
        loadData();
      }
    });
  };

  // -------------------------------------------------------------
  // Payment Workflow
  // -------------------------------------------------------------

  const openPayment = (purchase) => {
    setActivePurchase(purchase);
    const outstanding = purchase.outstandingAmount ?? Math.max(0, (purchase.grandTotal || purchase.total) - (purchase.amountPaid || 0));
    setPaymentForm({ amount: outstanding, method: 'Cash', reference: '' });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const paymentAmt = Number(paymentForm.amount);
    const currentOutstanding = activePurchase.outstandingAmount ?? Math.max(0, (activePurchase.grandTotal || activePurchase.total) - (activePurchase.amountPaid || 0));

    if (paymentAmt <= 0) return showToast('Payment amount must be greater than 0.', 'error');
    if (paymentAmt > currentOutstanding) return showToast('Payment amount cannot exceed outstanding balance.', 'error');

    const newPaid = (activePurchase.amountPaid || 0) + paymentAmt;
    const newOutstanding = currentOutstanding - paymentAmt;
    
    let paymentStatus = 'Partial';
    if (newOutstanding <= 0) paymentStatus = 'Paid';

    const updatedPurchase = {
      ...activePurchase,
      amountPaid: newPaid,
      outstandingAmount: newOutstanding,
      paymentStatus
    };

    const updatedPurchases = purchases.map(p => p.id === activePurchase.id ? updatedPurchase : p);
    savePurchases(updatedPurchases);

    // Reduce supplier outstanding balance
    updateSupplierBalance(activePurchase.supplierId, -paymentAmt);

    addSupplierPayment({
      supplierId: activePurchase.supplierId,
      purchaseId: activePurchase.id,
      amount: paymentAmt,
      paymentMethod: paymentForm.method,
      reference: paymentForm.reference,
      date: new Date().toISOString(),
      notes: `Payment for Invoice: ${activePurchase.invoiceNo}`
    });

    const suppliers = getSuppliers();
    const s = suppliers.find(x => x.id === activePurchase.supplierId);

    addSupplierLedgerEntry({
      supplierId: activePurchase.supplierId,
      type: 'Payment',
      referenceId: paymentForm.reference || `PAY-${activePurchase.invoiceNo}`,
      description: `Payment for Invoice ${activePurchase.invoiceNo}`,
      debit: paymentAmt,
      credit: 0,
      balance: s ? (s.balance || 0) : 0,
      date: new Date().toISOString()
    });

    showToast('Payment recorded successfully.');
    setShowPaymentModal(false);
    loadData();
  };

  // -------------------------------------------------------------
  // Add Supplier Flow (Inline)
  // -------------------------------------------------------------

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone) return showToast('Name and phone are required.', 'error');

    const newSupplier = { ...supplierForm, id: Date.now(), balance: Number(supplierForm.balance) || 0 };
    saveSuppliers([newSupplier, ...suppliers]);
    
    showToast('Supplier added successfully.');
    setShowAddSupplier(false);
    
    // Auto-select in form
    setPurchaseForm({ ...purchaseForm, supplierId: newSupplier.id });
    loadData();
  };

  // -------------------------------------------------------------
  // View & Edit Actions
  // -------------------------------------------------------------
  const openView = (purchase) => {
    setActivePurchase(purchase);
    setShowViewModal(true);
  };

  const openEdit = (purchase) => {
    setIsEditing(true);
    setEditingId(purchase.id);
    
    setPurchaseForm({
      invoiceNo: purchase.invoiceNo,
      supplierId: purchase.supplierId,
      date: new Date(purchase.date).toISOString().split('T')[0],
      amountPaid: purchase.amountPaid || '',
      paymentMethod: purchase.paymentMethod || 'Cash',
      paymentReference: purchase.paymentReference || ''
    });

    // Re-calculate all items just to be safe
    const mappedItems = purchase.items.map(item => calcItemTotals({
      ...item,
      productId: item.productId || item.id, // Support old structure
      quantity: item.quantity || item.qty,
      purchaseRate: item.purchaseRate || item.price,
      discount: item.discount || 0,
      gstPercent: item.gstPercent || 0
    }));
    
    setPurchaseItems(mappedItems);
    setShowAddModal(true);
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

      {/* Confirm Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmDialog({ isOpen: false })}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${confirmDialog.isDestructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-500 whitespace-pre-wrap">{confirmDialog.message}</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-center space-x-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setConfirmDialog({ isOpen: false })} className="btn-secondary px-6">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Purchases</h1>
          <p className="text-slate-500">Manage supplier invoices and stock inward.</p>
        </div>
        <button className="btn-primary flex items-center" onClick={openAddPurchase}>
          <Plus size={18} className="mr-2" /> Add Purchase
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Purchases</p>
            <h3 className="text-xl font-bold text-slate-800">{totalPurchasesCount}</h3>
          </div>
          <FileText className="text-blue-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-orange-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Payments</p>
            <h3 className="text-xl font-bold text-slate-800">₹{pendingPayments.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          </div>
          <IndianRupee className="text-orange-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Suppliers</p>
            <h3 className="text-xl font-bold text-slate-800">{activeSuppliersCount}</h3>
          </div>
          <Truck className="text-emerald-100" size={32} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Purchase Value</p>
            <h3 className="text-xl font-bold text-slate-800">₹{totalPurchasesValue.toLocaleString('en-IN', {minimumFractionDigits:2})}</h3>
          </div>
          <IndianRupee className="text-purple-100" size={32} />
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search invoice, supplier or mobile..." 
            className="input-field pl-10 w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input-field w-40 text-sm" value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input-field w-32 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="credit">Credit</option>
          </select>
          <select className="input-field w-32 text-sm" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Invoice No</th>
                <th className="py-3 px-4 font-semibold">Supplier</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Total Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Paid</th>
                <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPurchases.map((p) => {
                const sup = suppliers.find(s => s.id === p.supplierId);
                const itemsCount = p.items ? p.items.length : 0;
                const grandTotal = p.grandTotal || p.total || 0;
                const paid = p.amountPaid || 0;
                const outstanding = p.outstandingAmount ?? Math.max(0, grandTotal - paid);
                
                let statusColor = 'bg-red-100 text-red-800';
                let statusText = 'Credit';
                if (paid >= grandTotal) { statusColor = 'bg-emerald-100 text-emerald-800'; statusText = 'Paid'; }
                else if (paid > 0) { statusColor = 'bg-orange-100 text-orange-800'; statusText = 'Partial'; }

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-primary-600">{p.invoiceNo}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{sup ? sup.name : 'Unknown Supplier'}</div>
                      <div className="text-xs text-slate-500">{sup?.phone}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-600">{itemsCount}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">₹{grandTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">₹{paid.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                    <td className="py-3 px-4 text-right text-red-600 font-bold">₹{outstanding.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center space-x-2 text-slate-400">
                        {outstanding > 0 && (
                          <button onClick={() => openPayment(p)} className="w-8 h-8 rounded hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-colors border border-transparent hover:border-emerald-200" title="Record Payment">
                            <CreditCard size={16} />
                          </button>
                        )}
                        <button onClick={() => openView(p)} className="w-8 h-8 rounded hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors" title="View Details"><Eye size={18} /></button>
                        <button onClick={() => openEdit(p)} className="w-8 h-8 rounded hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-colors" title="Edit Purchase"><Edit size={18} /></button>
                        <button onClick={() => triggerDelete(p)} className="w-8 h-8 rounded hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" title="Delete Purchase"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center">
                      <FileText size={40} className="text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No purchases found.</p>
                      <p className="text-sm mt-1">Create your first purchase to add stock to inventory.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-white">
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredPurchases.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
        <div className="px-4 pb-4 flex items-center text-sm text-slate-500 bg-white">
            <span>Items per page:</span>
            <select className="ml-2 border border-slate-300 rounded text-sm p-1 outline-none focus:border-primary-500" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
        </div>
      </div>

      {/* ---------------------------------------------------------
          CREATE / EDIT PURCHASE MODAL
      --------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Purchase' : 'Create Purchase'}</h2>
                <p className="text-sm text-slate-500">Purchase Invoice No: <span className="font-bold text-primary-600">{purchaseForm.invoiceNo}</span></p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-auto bg-slate-50">
              
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Supplier *</label>
                  <div className="flex space-x-2">
                    <select className="input-field py-2" required value={purchaseForm.supplierId} onChange={e => setPurchaseForm({...purchaseForm, supplierId: e.target.value})}>
                      <option value="">Select Supplier ▼</option>
                      {suppliers.filter(s => s.status !== 'Inactive').map(s => <option key={s.id} value={s.id}>{s.name} {s.companyName ? `(${s.companyName})` : ''}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddSupplier(true)} className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-200" title="Add Supplier"><UserPlus size={18} /></button>
                  </div>
                  {purchaseForm.supplierId && (() => {
                    const s = suppliers.find(sup => sup.id === Number(purchaseForm.supplierId));
                    if(s) return (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-bold text-slate-700">{s.name}</span> <br/>
                        Mobile: {s.phone} {s.gstin ? `| GSTIN: ${s.gstin}` : ''}
                      </div>
                    );
                  })()}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Invoice Date *</label>
                  <input type="date" className="input-field py-2" required value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Invoice Number *</label>
                  <input type="text" className="input-field py-2" required value={purchaseForm.invoiceNo} onChange={e => setPurchaseForm({...purchaseForm, invoiceNo: e.target.value})} />
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="font-bold text-slate-800">Purchase Items</h3>
                  <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search product by name, SKU..." 
                      className="input-field pl-10 py-1.5 text-sm w-full"
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                    />
                    {itemSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-md z-20 max-h-60 overflow-y-auto">
                        {products.filter(p => (p.name || '').toLowerCase().includes(itemSearch.toLowerCase()) || (p.sku || '').toLowerCase().includes(itemSearch.toLowerCase())).map(p => (
                          <div key={p.id} className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0" onClick={() => addProductToPurchase(p)}>
                            <div className="font-bold text-sm text-slate-800">{p.name}</div>
                            <div className="text-xs text-slate-500 flex justify-between mt-1">
                              <span>SKU: {p.sku}</span>
                              <span className="font-medium">Stock: {p.stock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto min-h-[200px]">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3 font-semibold w-10">#</th>
                        <th className="py-2 px-3 font-semibold min-w-[200px]">Product & SKU</th>
                        <th className="py-2 px-3 font-semibold text-center w-24">Qty *</th>
                        <th className="py-2 px-3 font-semibold text-right w-28">Pur. Rate *</th>
                        <th className="py-2 px-3 font-semibold text-right w-24">Disc</th>
                        <th className="py-2 px-3 font-semibold text-center w-24">GST %</th>
                        <th className="py-2 px-3 font-semibold text-right w-24">Taxable</th>
                        <th className="py-2 px-3 font-semibold text-right w-24">GST Amt</th>
                        <th className="py-2 px-3 font-semibold text-right w-28">Total</th>
                        <th className="py-2 px-3 font-semibold text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{item.productName || item.name}</div>
                            <div className="text-xs text-slate-500">{item.sku}</div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input type="number" min="1" className="w-full border border-slate-300 rounded px-2 py-1 text-center focus:border-primary-500 outline-none" value={item.quantity} onChange={e => updatePurchaseItem(idx, 'quantity', e.target.value)} />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input type="number" min="0" step="0.01" className="w-full border border-slate-300 rounded px-2 py-1 text-right focus:border-primary-500 outline-none" value={item.purchaseRate} onChange={e => updatePurchaseItem(idx, 'purchaseRate', e.target.value)} />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input type="number" min="0" step="0.01" className="w-full border border-slate-300 rounded px-2 py-1 text-right focus:border-primary-500 outline-none" value={item.discount} onChange={e => updatePurchaseItem(idx, 'discount', e.target.value)} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <select className="w-full border border-slate-300 rounded px-1 py-1 text-center focus:border-primary-500 outline-none" value={item.gstPercent} onChange={e => updatePurchaseItem(idx, 'gstPercent', e.target.value)}>
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-600">₹{(item.taxableAmount||0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-600">₹{(item.gstAmount||0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">₹{(item.total||0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <button type="button" onClick={() => removePurchaseItem(idx)} className="text-slate-400 hover:text-red-500"><X size={18} /></button>
                          </td>
                        </tr>
                      ))}
                      {purchaseItems.length === 0 && (
                        <tr>
                          <td colSpan="10" className="text-center py-10 text-slate-400">
                            Search and select products to add them to this purchase.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Amount Paid (₹)</label>
                      <input type="number" min="0" step="0.01" className="input-field py-2 font-bold text-lg text-emerald-600" value={purchaseForm.amountPaid} onChange={e => setPurchaseForm({...purchaseForm, amountPaid: e.target.value})} placeholder={`Max: ${formSummary.grandTotal.toFixed(2)}`} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Payment Status</label>
                      <div className={`mt-2 font-bold text-lg uppercase tracking-wider ${
                        (Number(purchaseForm.amountPaid)||0) >= formSummary.grandTotal && formSummary.grandTotal > 0 ? 'text-emerald-600' :
                        (Number(purchaseForm.amountPaid)||0) > 0 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {(Number(purchaseForm.amountPaid)||0) >= formSummary.grandTotal && formSummary.grandTotal > 0 ? 'Paid' :
                         (Number(purchaseForm.amountPaid)||0) > 0 ? 'Partial' : 'Credit'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Payment Method</label>
                      <select className="input-field py-2" value={purchaseForm.paymentMethod} onChange={e => setPurchaseForm({...purchaseForm, paymentMethod: e.target.value})}>
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Card</option>
                        <option>Bank Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Reference No</label>
                      <input type="text" className="input-field py-2" value={purchaseForm.paymentReference} onChange={e => setPurchaseForm({...purchaseForm, paymentReference: e.target.value})} placeholder="Optional" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 rounded-xl shadow-md p-5 text-white">
                  <h3 className="font-bold text-slate-300 border-b border-slate-700 pb-2 mb-4 uppercase tracking-wider text-xs">Purchase Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subtotal</span>
                      <span>₹{formSummary.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Discount</span>
                      <span className="text-red-400">-₹{formSummary.totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-slate-300">Taxable Value</span>
                      <span className="font-medium">₹{formSummary.taxableValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total GST</span>
                      <span>₹{formSummary.totalGst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-4 mt-2 border-t border-slate-600 items-center">
                      <span className="font-bold text-base">Grand Total</span>
                      <span className="font-black text-2xl text-emerald-400">₹{formSummary.grandTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary px-6">Cancel</button>
              <button type="button" onClick={handlePurchaseSubmit} className="btn-primary px-8 shadow-md py-2.5 text-base flex items-center">
                {isEditing ? 'Save Changes' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          VIEW PURCHASE MODAL
      --------------------------------------------------------- */}
      {showViewModal && activePurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Purchase Details</h2>
                <p className="text-sm text-slate-500">{activePurchase.invoiceNo}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${activePurchase.paymentStatus==='Paid' ? 'bg-emerald-100 text-emerald-800' : activePurchase.paymentStatus==='Partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                  {activePurchase.paymentStatus}
                </span>
                <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-700"><X size={24} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Supplier</p>
                  <p className="font-bold text-slate-800">{suppliers.find(s=>s.id === activePurchase.supplierId)?.name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Invoice Date</p>
                  <p className="font-bold text-slate-800">{new Date(activePurchase.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Items Added to Inventory</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-center">Qty (+ Stock)</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Disc</th>
                        <th className="py-2 px-3 text-right">GST</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePurchase.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-800">{item.productName || item.name}</td>
                          <td className="py-2 px-3 text-center font-bold text-emerald-600">+{item.quantity || item.qty}</td>
                          <td className="py-2 px-3 text-right">₹{(item.purchaseRate || item.price || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">₹{(item.discount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">{(item.gstPercent || 0)}% (₹{(item.gstAmount||0).toFixed(2)})</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">₹{(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Payment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Amount Paid</span><span className="font-bold text-emerald-600">₹{(activePurchase.amountPaid||0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Method</span><span className="font-medium text-slate-800">{activePurchase.paymentMethod || 'N/A'}</span></div>
                    {activePurchase.paymentReference && <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-medium text-slate-800">{activePurchase.paymentReference}</span></div>}
                    <div className="flex justify-between pt-2 border-t border-slate-100"><span className="font-bold text-slate-800">Outstanding</span><span className="font-bold text-red-600">₹{(activePurchase.outstandingAmount ?? Math.max(0, (activePurchase.grandTotal||activePurchase.total) - (activePurchase.amountPaid||0))).toFixed(2)}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Invoice Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{(activePurchase.subtotal || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-red-500">-₹{(activePurchase.totalDiscount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Total GST</span><span>₹{(activePurchase.totalGst || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-100"><span className="font-bold text-slate-800 text-lg">Grand Total</span><span className="font-black text-primary-600 text-xl">₹{(activePurchase.grandTotal || activePurchase.total || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</span></div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowViewModal(false)} className="btn-secondary px-6">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ADD INLINE SUPPLIER MODAL
      --------------------------------------------------------- */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddSupplier(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl">
              <h2 className="font-bold text-slate-800">Add Supplier</h2>
              <button onClick={() => setShowAddSupplier(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Supplier Name *</label>
                <input type="text" required className="input-field" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Company Name</label>
                <input type="text" className="input-field" value={supplierForm.company} onChange={e => setSupplierForm({...supplierForm, company: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mobile *</label>
                <input type="text" required className="input-field" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">GSTIN</label>
                <input type="text" className="input-field" value={supplierForm.gstin} onChange={e => setSupplierForm({...supplierForm, gstin: e.target.value})} />
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddSupplier(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary shadow-sm">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          PAYMENT MODAL
      --------------------------------------------------------- */}
      {showPaymentModal && activePurchase && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center rounded-t-xl bg-slate-50">
              <div>
                <h2 className="font-bold text-slate-800">Record Payment</h2>
                <p className="text-xs text-slate-500 mt-1">{activePurchase.invoiceNo}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4">
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Purchase Total</span><span className="font-bold">₹{(activePurchase.grandTotal || activePurchase.total).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Already Paid</span><span className="font-bold text-emerald-600">₹{(activePurchase.amountPaid || 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200 mt-1"><span className="font-bold">Outstanding Balance</span><span className="font-bold text-red-600">₹{(activePurchase.outstandingAmount ?? Math.max(0, (activePurchase.grandTotal || activePurchase.total) - (activePurchase.amountPaid || 0))).toFixed(2)}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Amount (₹) *</label>
                <input type="number" required min="1" step="0.01" max={activePurchase.outstandingAmount ?? Math.max(0, (activePurchase.grandTotal || activePurchase.total) - (activePurchase.amountPaid || 0))} className="input-field text-lg font-bold" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
                <select className="input-field" value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Reference No (Optional)</label>
                <input type="text" className="input-field" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700 shadow-sm border-emerald-700">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Purchases;
