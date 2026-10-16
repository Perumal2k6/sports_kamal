import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, Trash2, Edit, FileText, Calendar, IndianRupee, Eye, 
  X, CheckCircle, AlertTriangle, Wrench, Printer, CreditCard, Clock, 
  User, Phone, MapPin, Check, RefreshCw, ChevronDown, ShieldAlert
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { 
  getServices, addService, updateService, deleteService, 
  getServicePayments, addServicePayment, getCustomers, getSettings 
} from '../lib/db';

const EQUIPMENT_TYPES = [
  'Badminton Racket',
  'Net / Strings',
  'Grip',
  'Cricket Bat',
  'Football',
  'Sports Shoes',
  'Other'
];

const SERVICE_STATUSES = [
  'Received',
  'Pending',
  'In Progress',
  'Completed',
  'Collected',
  'Cancelled'
];

const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Credit / Pay Later'
];

const GST_RATES = [0, 5, 12, 18, 28];

const Services = () => {
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, item: null });
  const [activeService, setActiveService] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Form State
  const initialFormState = {
    // Customer
    customerMobile: '',
    customerName: '',
    customerAddress: '',
    // Equipment
    equipmentType: '',
    brand: '',
    model: '',
    conditionAtReceipt: '',
    // Service
    serviceType: 'Stringing / Gutting',
    customerComplaint: '',
    workRequired: '',
    dateReceived: new Date().toISOString().split('T')[0],
    expectedCompletionDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    technician: 'Senior Technician',
    notes: '',
    // Price & Payment
    estimatedPrice: '',
    finalServiceCharge: '',
    discount: '0',
    gstRate: 0,
    advancePaid: '0',
    totalAmount: '0',
    balanceDue: '0',
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    status: 'Received'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Record Payment Modal State
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Quick Status Update Modal State
  const [newStatus, setNewStatus] = useState('In Progress');

  const loadData = () => {
    const sData = getServices() || [];
    sData.sort((a, b) => new Date(b.createdAt || b.dateReceived) - new Date(a.createdAt || a.dateReceived));
    setServices(sData);
    setPayments(getServicePayments() || []);
    setCustomers(getCustomers() || []);
    setShopSettings(getSettings() || {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auto-fill customer details by mobile
  const handleMobileChange = (mobile) => {
    const matchedCustomer = customers.find(c => String(c.phone || c.mobile || '').trim() === mobile.trim());
    if (matchedCustomer) {
      setFormData(prev => ({
        ...prev,
        customerMobile: mobile,
        customerName: matchedCustomer.name || prev.customerName,
        customerAddress: matchedCustomer.address || prev.customerAddress
      }));
    } else {
      setFormData(prev => ({ ...prev, customerMobile: mobile }));
    }
  };

  // Price calculation helper
  const calculateTotals = (chargeVal, discountVal, gstVal, advanceVal) => {
    const charge = parseFloat(chargeVal) || 0;
    const discount = parseFloat(discountVal) || 0;
    const gstRate = parseFloat(gstVal) || 0;
    const advance = parseFloat(advanceVal) || 0;

    const baseAmount = Math.max(0, charge - discount);
    const gstAmount = (baseAmount * gstRate) / 100;
    const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;
    const validAdvance = Math.min(advance, totalAmount);
    const balanceDue = Math.max(0, Math.round((totalAmount - validAdvance) * 100) / 100);

    let paymentStatus = 'Unpaid';
    if (totalAmount > 0 && balanceDue <= 0) {
      paymentStatus = 'Paid';
    } else if (validAdvance > 0) {
      paymentStatus = 'Partially Paid';
    }

    return {
      totalAmount: totalAmount.toFixed(2),
      balanceDue: balanceDue.toFixed(2),
      paymentStatus,
      advancePaid: validAdvance.toString()
    };
  };

  // Handle price fields change in form
  const handlePriceFieldChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      const computed = calculateTotals(
        field === 'finalServiceCharge' ? value : updated.finalServiceCharge,
        field === 'discount' ? value : updated.discount,
        field === 'gstRate' ? value : updated.gstRate,
        field === 'advancePaid' ? value : updated.advancePaid
      );
      return {
        ...updated,
        totalAmount: computed.totalAmount,
        balanceDue: computed.balanceDue,
        paymentStatus: computed.paymentStatus,
        advancePaid: field === 'advancePaid' ? value : updated.advancePaid
      };
    });
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const id = String(item.id || '').toLowerCase();
      const custName = String(item.customerName || '').toLowerCase();
      const mobile = String(item.customerMobile || '').toLowerCase();
      const equip = String(item.equipmentType || '').toLowerCase();
      const brand = String(item.brand || '').toLowerCase();
      const model = String(item.model || '').toLowerCase();
      const work = String(item.workRequired || item.serviceType || '').toLowerCase();
      const tech = String(item.technician || '').toLowerCase();

      const matchesSearch = !q || 
        id.includes(q) ||
        custName.includes(q) ||
        mobile.includes(q) ||
        equip.includes(q) ||
        brand.includes(q) ||
        model.includes(q) ||
        work.includes(q) ||
        tech.includes(q);

      const matchesEquip = equipmentFilter === 'All' || item.equipmentType === equipmentFilter;
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
      const matchesPayment = paymentStatusFilter === 'All' || item.paymentStatus === paymentStatusFilter;

      return matchesSearch && matchesEquip && matchesStatus && matchesPayment;
    });
  }, [services, searchQuery, equipmentFilter, statusFilter, paymentStatusFilter]);

  // KPI Calculations
  const totalServicesCount = services.length;
  const pendingCount = services.filter(s => s.status === 'Pending' || s.status === 'Received').length;
  const inProgressCount = services.filter(s => s.status === 'In Progress').length;
  const completedCount = services.filter(s => s.status === 'Completed' || s.status === 'Collected').length;

  // Pagination calculation
  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredServices, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, equipmentFilter, statusFilter, paymentStatusFilter, itemsPerPage]);

  // Handle Add Service Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerMobile.trim()) {
      showToast('Please provide customer name and mobile number', 'error');
      return;
    }
    if (!formData.workRequired.trim()) {
      showToast('Please specify the work required', 'error');
      return;
    }

    const finalCharge = parseFloat(formData.finalServiceCharge) || parseFloat(formData.estimatedPrice) || 0;
    const computed = calculateTotals(
      finalCharge,
      formData.discount,
      formData.gstRate,
      formData.advancePaid
    );

    const payload = {
      ...formData,
      customerName: formData.customerName.trim(),
      customerMobile: formData.customerMobile.trim(),
      customerAddress: formData.customerAddress.trim(),
      finalServiceCharge: finalCharge,
      estimatedPrice: parseFloat(formData.estimatedPrice) || finalCharge,
      discount: parseFloat(formData.discount) || 0,
      gstRate: parseFloat(formData.gstRate) || 0,
      advancePaid: parseFloat(formData.advancePaid) || 0,
      totalAmount: parseFloat(computed.totalAmount),
      balanceDue: parseFloat(computed.balanceDue),
      paymentStatus: computed.paymentStatus,
      status: formData.status || 'Received'
    };

    const saved = addService(payload);
    showToast(`Service order ${saved.id} created successfully!`);
    setShowAddModal(false);
    setFormData(initialFormState);
    loadData();
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setActiveService(item);
    setFormData({
      customerMobile: item.customerMobile || '',
      customerName: item.customerName || '',
      customerAddress: item.customerAddress || '',
      equipmentType: item.equipmentType || 'Badminton Racket',
      brand: item.brand || '',
      model: item.model || '',
      conditionAtReceipt: item.conditionAtReceipt || '',
      serviceType: item.serviceType || 'Stringing / Gutting',
      customerComplaint: item.customerComplaint || '',
      workRequired: item.workRequired || '',
      dateReceived: item.dateReceived || '',
      expectedCompletionDate: item.expectedCompletionDate || '',
      technician: item.technician || 'Senior Technician',
      notes: item.notes || '',
      estimatedPrice: item.estimatedPrice || '',
      finalServiceCharge: item.finalServiceCharge || '',
      discount: item.discount || '0',
      gstRate: item.gstRate || 0,
      advancePaid: item.advancePaid || '0',
      totalAmount: item.totalAmount || '0',
      balanceDue: item.balanceDue || '0',
      paymentMethod: item.paymentMethod || 'Cash',
      paymentStatus: item.paymentStatus || 'Unpaid',
      status: item.status || 'Received'
    });
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName.trim() || !formData.customerMobile.trim()) {
      showToast('Please provide customer name and mobile number', 'error');
      return;
    }

    const finalCharge = parseFloat(formData.finalServiceCharge) || parseFloat(formData.estimatedPrice) || 0;
    
    // Check existing payment total for this service to prevent balance overwriting
    const existingPayments = payments.filter(p => String(p.serviceId) === String(activeService.id));
    const totalPaymentsReceived = existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const advancePaidVal = Math.max(parseFloat(formData.advancePaid) || 0, totalPaymentsReceived);

    const computed = calculateTotals(
      finalCharge,
      formData.discount,
      formData.gstRate,
      advancePaidVal
    );

    const payload = {
      ...formData,
      customerName: formData.customerName.trim(),
      customerMobile: formData.customerMobile.trim(),
      customerAddress: formData.customerAddress.trim(),
      finalServiceCharge: finalCharge,
      estimatedPrice: parseFloat(formData.estimatedPrice) || finalCharge,
      discount: parseFloat(formData.discount) || 0,
      gstRate: parseFloat(formData.gstRate) || 0,
      advancePaid: advancePaidVal,
      totalAmount: parseFloat(computed.totalAmount),
      balanceDue: parseFloat(computed.balanceDue),
      paymentStatus: computed.paymentStatus,
      status: formData.status
    };

    updateService(activeService.id, payload);
    showToast(`Service order ${activeService.id} updated!`);
    setShowEditModal(false);
    setActiveService(null);
    loadData();
  };

  // Open View Modal
  const openViewModal = (item) => {
    setActiveService(item);
    setShowViewModal(true);
  };

  // Open Quick Status Modal
  const openStatusModal = (item) => {
    setActiveService(item);
    setNewStatus(item.status);
    setShowStatusModal(true);
  };

  // Handle Quick Status Update Submit
  const handleStatusUpdate = (e) => {
    e.preventDefault();
    if (activeService) {
      updateService(activeService.id, { status: newStatus });
      showToast(`Status updated to ${newStatus}`);
      setShowStatusModal(false);
      loadData();
    }
  };

  // Open Payment Modal
  const openPaymentModal = (item) => {
    setActiveService(item);
    setPaymentForm({
      amount: item.balanceDue > 0 ? item.balanceDue.toString() : '',
      paymentMethod: 'Cash',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowPaymentModal(true);
  };

  // Handle Record Payment Submit
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    const payAmt = parseFloat(paymentForm.amount);
    if (!payAmt || payAmt <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }
    if (payAmt > Number(activeService.balanceDue)) {
      showToast(`Payment exceeds outstanding balance of ₹${activeService.balanceDue}`, 'error');
      return;
    }

    addServicePayment({
      serviceId: activeService.id,
      amount: payAmt,
      paymentMethod: paymentForm.paymentMethod,
      date: paymentForm.date,
      type: 'Service Payment',
      notes: paymentForm.notes.trim() || 'Payment against service completion'
    });

    showToast(`Payment of ₹${payAmt} recorded successfully!`);
    setShowPaymentModal(false);
    loadData();
  };

  // Open Print Modal / Trigger Print
  const openPrintModal = (item) => {
    setActiveService(item);
    setShowPrintModal(true);
  };

  // Delete Service
  const confirmDeleteService = () => {
    if (confirmDelete.item) {
      deleteService(confirmDelete.item.id);
      showToast(`Service ${confirmDelete.item.id} deleted successfully`);
      setConfirmDelete({ isOpen: false, item: null });
      loadData();
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'In Progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Collected':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Payment Status Badge Helper
  const getPaymentStatusBadge = (pStatus) => {
    switch (pStatus) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'Partially Paid':
        return 'bg-amber-100 text-amber-800';
      case 'Unpaid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
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
          <h1 className="text-2xl font-bold text-slate-800">Services & Repairs</h1>
          <p className="text-slate-500">Manage sports equipment repairs, service progress and customer payments.</p>
        </div>
        <button 
          className="btn-primary flex items-center shadow-sm hover:shadow"
          onClick={() => {
            setFormData(initialFormState);
            setShowAddModal(true);
          }}
        >
          <Plus size={18} className="mr-2" /> + New Service
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Services</p>
              <h3 className="text-2xl font-black text-slate-800">{totalServicesCount}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <Wrench size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Pending Services</p>
              <h3 className="text-2xl font-black text-slate-800">{pendingCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">In Progress</p>
              <h3 className="text-2xl font-black text-slate-800">{inProgressCount}</h3>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
              <RefreshCw size={22} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Completed</p>
              <h3 className="text-2xl font-black text-slate-800">{completedCount}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, customer name, mobile, equipment, brand..." 
            className="input-field pl-10 w-full"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select 
            className="input-field w-full sm:w-48"
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
          >
            <option value="All">All Equipment</option>
            {EQUIPMENT_TYPES.map(eq => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <select 
            className="input-field w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            {SERVICE_STATUSES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <select 
            className="input-field w-full sm:w-40"
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
          >
            <option value="All">All Payments</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>

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

      {/* Working Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-24">Service ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Equipment</th>
                <th>Service Required</th>
                <th>Expected Date</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Balance Due</th>
                <th className="text-center">Status</th>
                <th className="text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedServices.map((s) => {
                const totalAmt = Number(s.totalAmount || 0);
                const balDue = Number(s.balanceDue || 0);

                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="font-mono text-xs font-bold text-primary-700 whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="text-xs text-slate-600 whitespace-nowrap">
                      {s.dateReceived}
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800 text-sm">{s.customerName}</div>
                      {s.customerAddress && (
                        <div className="text-xs text-slate-400 truncate max-w-[130px]">{s.customerAddress}</div>
                      )}
                    </td>
                    <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                      {s.customerMobile}
                    </td>
                    <td>
                      <div className="font-medium text-slate-700 text-xs">{s.equipmentType}</div>
                      {(s.brand || s.model) && (
                        <div className="text-xs text-slate-400">{[s.brand, s.model].filter(Boolean).join(' ')}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-xs font-medium text-slate-700 max-w-xs truncate" title={s.workRequired}>
                        {s.workRequired || s.serviceType}
                      </div>
                    </td>
                    <td className="text-xs text-slate-600 whitespace-nowrap">
                      {s.expectedCompletionDate || '-'}
                    </td>
                    <td className="text-right font-bold text-slate-800 whitespace-nowrap text-xs">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td className="text-right font-bold whitespace-nowrap text-xs">
                      <span className={balDue > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        ₹{balDue.toFixed(2)}
                      </span>
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <button 
                        onClick={() => openStatusModal(s)}
                        title="Click to update status"
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(s.status)} hover:opacity-80 transition-opacity`}
                      >
                        {s.status}
                      </button>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center items-center space-x-1.5 text-slate-400">
                        {/* View */}
                        <button 
                          className="hover:text-blue-600 p-1 transition-colors" 
                          title="View Service Details"
                          onClick={() => openViewModal(s)}
                        >
                          <Eye size={16} />
                        </button>
                        {/* Record Payment */}
                        <button 
                          className={`p-1 transition-colors ${balDue > 0 ? 'text-amber-500 hover:text-amber-600' : 'hover:text-slate-600'}`} 
                          title="Record Payment"
                          onClick={() => openPaymentModal(s)}
                        >
                          <CreditCard size={16} />
                        </button>
                        {/* Print Job Receipt */}
                        <button 
                          className="hover:text-slate-800 p-1 transition-colors" 
                          title="Print Job Receipt"
                          onClick={() => openPrintModal(s)}
                        >
                          <Printer size={16} />
                        </button>
                        {/* Edit */}
                        <button 
                          className="hover:text-primary-600 p-1 transition-colors" 
                          title="Edit Service"
                          onClick={() => openEditModal(s)}
                        >
                          <Edit size={16} />
                        </button>
                        {/* Delete */}
                        <button 
                          className="hover:text-red-600 p-1 transition-colors" 
                          title="Delete Service"
                          onClick={() => setConfirmDelete({ isOpen: true, item: s })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center py-12 text-slate-500">
                    <Wrench size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No service jobs found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || equipmentFilter !== 'All' || statusFilter !== 'All' || paymentStatusFilter !== 'All'
                        ? 'Try clearing your search or filter options.'
                        : 'Click "+ New Service" to book a sports equipment service job.'}
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
            Showing <span className="font-semibold">{filteredServices.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold">{Math.min(currentPage * itemsPerPage, filteredServices.length)}</span> of{' '}
            <span className="font-semibold">{filteredServices.length}</span> service jobs
          </div>
          <Pagination 
            currentPage={currentPage}
            totalItems={filteredServices.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* New Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Wrench size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">New Service & Repair Booking</h2>
                  <p className="text-xs text-slate-500">Register customer equipment, repairs required and advance payment</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>
            
            <form id="newServiceForm" onSubmit={handleAddSubmit} className="p-6 overflow-y-auto space-y-6">
              {/* SECTION 1: CUSTOMER DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <User size={15} className="text-primary-600" />
                  <span>Customer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="10-digit mobile" 
                      className="input-field" 
                      value={formData.customerMobile} 
                      onChange={e => handleMobileChange(e.target.value)} 
                    />
                    <span className="text-[10px] text-slate-400">Auto-fills existing customer details</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ramesh Kumar" 
                      className="input-field" 
                      value={formData.customerName} 
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Area</label>
                    <input 
                      type="text" 
                      placeholder="City or locality" 
                      className="input-field" 
                      value={formData.customerAddress} 
                      onChange={e => setFormData({ ...formData, customerAddress: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: EQUIPMENT DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Wrench size={15} className="text-primary-600" />
                  <span>Equipment Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Type *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Badminton Racket, Cricket Bat..." 
                      className="input-field" 
                      value={formData.equipmentType} 
                      onChange={e => setFormData({ ...formData, equipmentType: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                    <input 
                      type="text" 
                      placeholder="Yonex, Li-Ning, SS, SG..." 
                      className="input-field" 
                      value={formData.brand} 
                      onChange={e => setFormData({ ...formData, brand: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                    <input 
                      type="text" 
                      placeholder="Astrox 88D, Ton Reserve..." 
                      className="input-field" 
                      value={formData.model} 
                      onChange={e => setFormData({ ...formData, model: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Condition at Receipt</label>
                    <input 
                      type="text" 
                      placeholder="Frame scratch, broken strings..." 
                      className="input-field" 
                      value={formData.conditionAtReceipt} 
                      onChange={e => setFormData({ ...formData, conditionAtReceipt: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SERVICE DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <FileText size={15} className="text-primary-600" />
                  <span>Service & Job Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                    <input 
                      type="text" 
                      placeholder="Stringing / Gutting, Bat Knocking..." 
                      className="input-field" 
                      value={formData.serviceType} 
                      onChange={e => setFormData({ ...formData, serviceType: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date Received</label>
                    <input 
                      type="date" 
                      required
                      className="input-field" 
                      value={formData.dateReceived} 
                      onChange={e => setFormData({ ...formData, dateReceived: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Completion Date</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={formData.expectedCompletionDate} 
                      onChange={e => setFormData({ ...formData, expectedCompletionDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Complaint</label>
                    <input 
                      type="text" 
                      placeholder="String snapped during smash, loose handle..." 
                      className="input-field" 
                      value={formData.customerComplaint} 
                      onChange={e => setFormData({ ...formData, customerComplaint: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Work Required *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Yonex BG65 stringing at 26 lbs tension..." 
                      className="input-field" 
                      value={formData.workRequired} 
                      onChange={e => setFormData({ ...formData, workRequired: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Technician</label>
                    <input 
                      type="text" 
                      placeholder="Assigned technician name" 
                      className="input-field" 
                      value={formData.technician} 
                      onChange={e => setFormData({ ...formData, technician: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                    <select 
                      className="input-field" 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      {SERVICE_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                    <input 
                      type="text" 
                      placeholder="Special instructions..." 
                      className="input-field" 
                      value={formData.notes} 
                      onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: PRICE AND PAYMENT */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <IndianRupee size={15} className="text-primary-600" />
                  <span>Price and Payment Details</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="0.00" 
                      className="input-field bg-white" 
                      value={formData.estimatedPrice} 
                      onChange={e => handlePriceFieldChange('estimatedPrice', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Final Charge (₹) *</label>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="0.00" 
                      className="input-field bg-white font-semibold text-slate-800" 
                      value={formData.finalServiceCharge} 
                      onChange={e => handlePriceFieldChange('finalServiceCharge', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="0.00" 
                      className="input-field bg-white" 
                      value={formData.discount} 
                      onChange={e => handlePriceFieldChange('discount', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                    <select 
                      className="input-field bg-white" 
                      value={formData.gstRate} 
                      onChange={e => handlePriceFieldChange('gstRate', e.target.value)}
                    >
                      {GST_RATES.map(rate => (
                        <option key={rate} value={rate}>{rate}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Paid (₹)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      placeholder="0.00" 
                      className="input-field bg-white font-semibold text-emerald-700" 
                      value={formData.advancePaid} 
                      onChange={e => handlePriceFieldChange('advancePaid', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select 
                      className="input-field bg-white" 
                      value={formData.paymentMethod} 
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Amount</span>
                    <span className="text-base font-black text-slate-800">₹{formData.totalAmount}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Balance Due</span>
                    <span className="text-base font-black text-red-600">₹{formData.balanceDue}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Payment Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getPaymentStatusBadge(formData.paymentStatus)}`}>
                      {formData.paymentStatus}
                    </span>
                  </div>
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
                form="newServiceForm" 
                className="btn-primary"
              >
                Register Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Edit Service Job</h2>
                <p className="text-xs text-slate-500">Service ID: <span className="font-mono font-bold text-primary-600">{activeService.id}</span></p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>
            
            <form id="editServiceForm" onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-6">
              {/* SECTION 1: CUSTOMER DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <User size={15} className="text-primary-600" />
                  <span>Customer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                    <input 
                      type="tel" 
                      required
                      className="input-field" 
                      value={formData.customerMobile} 
                      onChange={e => handleMobileChange(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={formData.customerName} 
                      onChange={e => setFormData({ ...formData, customerName: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Address / Area</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.customerAddress} 
                      onChange={e => setFormData({ ...formData, customerAddress: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: EQUIPMENT DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Wrench size={15} className="text-primary-600" />
                  <span>Equipment Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment Type *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Badminton Racket, Cricket Bat..." 
                      className="input-field" 
                      value={formData.equipmentType} 
                      onChange={e => setFormData({ ...formData, equipmentType: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.brand} 
                      onChange={e => setFormData({ ...formData, brand: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.model} 
                      onChange={e => setFormData({ ...formData, model: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Condition at Receipt</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.conditionAtReceipt} 
                      onChange={e => setFormData({ ...formData, conditionAtReceipt: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SERVICE DETAILS */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <FileText size={15} className="text-primary-600" />
                  <span>Service Details & Status</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.serviceType} 
                      onChange={e => setFormData({ ...formData, serviceType: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date Received</label>
                    <input 
                      type="date" 
                      required
                      className="input-field" 
                      value={formData.dateReceived} 
                      onChange={e => setFormData({ ...formData, dateReceived: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Completion</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={formData.expectedCompletionDate} 
                      onChange={e => setFormData({ ...formData, expectedCompletionDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Complaint</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.customerComplaint} 
                      onChange={e => setFormData({ ...formData, customerComplaint: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Work Required *</label>
                    <input 
                      type="text" 
                      required
                      className="input-field" 
                      value={formData.workRequired} 
                      onChange={e => setFormData({ ...formData, workRequired: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Technician</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.technician} 
                      onChange={e => setFormData({ ...formData, technician: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Service Status</label>
                    <select 
                      className="input-field font-semibold" 
                      value={formData.status} 
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      {SERVICE_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={formData.notes} 
                      onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: PRICE AND PAYMENT */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2 pb-1 border-b border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <IndianRupee size={15} className="text-primary-600" />
                  <span>Price & Payment Update</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input-field bg-white" 
                      value={formData.estimatedPrice} 
                      onChange={e => handlePriceFieldChange('estimatedPrice', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Final Charge (₹) *</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input-field bg-white font-semibold" 
                      value={formData.finalServiceCharge} 
                      onChange={e => handlePriceFieldChange('finalServiceCharge', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discount (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input-field bg-white" 
                      value={formData.discount} 
                      onChange={e => handlePriceFieldChange('discount', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                    <select 
                      className="input-field bg-white" 
                      value={formData.gstRate} 
                      onChange={e => handlePriceFieldChange('gstRate', e.target.value)}
                    >
                      {GST_RATES.map(rate => (
                        <option key={rate} value={rate}>{rate}%</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Advance / Paid (₹)</label>
                    <input 
                      type="number" 
                      step="any"
                      className="input-field bg-white font-semibold text-emerald-700" 
                      value={formData.advancePaid} 
                      onChange={e => handlePriceFieldChange('advancePaid', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select 
                      className="input-field bg-white" 
                      value={formData.paymentMethod} 
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Amount</span>
                    <span className="text-base font-black text-slate-800">₹{formData.totalAmount}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Balance Due</span>
                    <span className="text-base font-black text-red-600">₹{formData.balanceDue}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Payment Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getPaymentStatusBadge(formData.paymentStatus)}`}>
                      {formData.paymentStatus}
                    </span>
                  </div>
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
                form="editServiceForm" 
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Service Modal */}
      {showViewModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <Wrench size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Service Order Details</h2>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-mono font-bold text-primary-600">{activeService.id}</span>
                    <span className="text-slate-400">•</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold border ${getStatusBadge(activeService.status)}`}>
                      {activeService.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Customer Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Customer Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Name</span>
                    <span className="font-bold text-slate-800">{activeService.customerName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Mobile Number</span>
                    <span className="font-mono font-semibold text-slate-700">{activeService.customerMobile}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Address</span>
                    <span className="font-medium text-slate-600">{activeService.customerAddress || 'None provided'}</span>
                  </div>
                </div>
              </div>

              {/* Equipment & Work Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Equipment & Job Specifications</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <span className="text-xs text-slate-400 block">Equipment</span>
                    <span className="font-semibold text-slate-800">{activeService.equipmentType}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Brand / Model</span>
                    <span className="font-medium text-slate-700">{[activeService.brand, activeService.model].filter(Boolean).join(' ') || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Received Date</span>
                    <span className="font-medium text-slate-700">{activeService.dateReceived}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Expected Date</span>
                    <span className="font-medium text-slate-700">{activeService.expectedCompletionDate || '-'}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                  {activeService.conditionAtReceipt && (
                    <div>
                      <span className="text-slate-400 font-semibold">Condition at Receipt: </span>
                      <span className="text-slate-700">{activeService.conditionAtReceipt}</span>
                    </div>
                  )}
                  {activeService.customerComplaint && (
                    <div>
                      <span className="text-slate-400 font-semibold">Customer Complaint: </span>
                      <span className="text-slate-700">{activeService.customerComplaint}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-semibold">Work Required: </span>
                    <span className="text-slate-800 font-bold">{activeService.workRequired}</span>
                  </div>
                  {activeService.technician && (
                    <div>
                      <span className="text-slate-400 font-semibold">Technician: </span>
                      <span className="text-slate-700">{activeService.technician}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & Billing Summary */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-2">Billing & Balance</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2 rounded-lg border border-red-100">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-base font-black text-slate-800">₹{Number(activeService.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-red-100">
                    <span className="text-xs text-slate-400 block">Advance / Paid</span>
                    <span className="text-base font-bold text-emerald-600">₹{Number(activeService.advancePaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-red-100">
                    <span className="text-xs text-slate-400 block">Balance Due</span>
                    <span className="text-base font-black text-red-600">₹{Number(activeService.balanceDue || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-red-100">
                    <span className="text-xs text-slate-400 block">Payment Status</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mt-1 ${getPaymentStatusBadge(activeService.paymentStatus)}`}>
                      {activeService.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History Log */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment History</span>
                  {Number(activeService.balanceDue) > 0 && (
                    <button 
                      onClick={() => {
                        setShowViewModal(false);
                        openPaymentModal(activeService);
                      }}
                      className="text-xs text-primary-600 hover:underline font-bold flex items-center"
                    >
                      <Plus size={14} className="mr-1" /> Add Payment
                    </button>
                  )}
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2 text-left">Date</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Method</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments
                        .filter(p => String(p.serviceId) === String(activeService.id))
                        .map(p => (
                          <tr key={p.id}>
                            <td className="p-2 font-mono text-slate-600">{p.date?.split('T')[0]}</td>
                            <td className="p-2 font-medium text-slate-700">{p.type || 'Payment'}</td>
                            <td className="p-2 text-slate-600">{p.paymentMethod || 'Cash'}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">₹{Number(p.amount).toFixed(2)}</td>
                            <td className="p-2 text-slate-500 italic">{p.notes || '-'}</td>
                          </tr>
                        ))}
                      {payments.filter(p => String(p.serviceId) === String(activeService.id)).length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-3 text-center text-slate-400">
                            No separate payment entries recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button 
                type="button" 
                onClick={() => {
                  setShowViewModal(false);
                  openPrintModal(activeService);
                }} 
                className="btn-secondary flex items-center"
              >
                <Printer size={16} className="mr-1.5" /> Print Job Sheet
              </button>
              
              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(activeService);
                  }} 
                  className="btn-primary"
                >
                  Edit Service
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
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Record Payment</h3>
                  <p className="text-xs text-slate-500">Service: <span className="font-mono font-bold text-primary-600">{activeService.id}</span></p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <form id="recordPaymentForm" onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Customer</span>
                  <span className="font-bold text-slate-800">{activeService.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Balance Due</span>
                  <span className="font-black text-red-600 text-base">₹{Number(activeService.balanceDue || 0).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Amount (₹) *</label>
                <input 
                  type="number" 
                  step="any"
                  required
                  min="0.01" 
                  max={Number(activeService.balanceDue || 0)}
                  placeholder="0.00" 
                  className="input-field text-lg font-bold text-emerald-600" 
                  value={paymentForm.amount} 
                  onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                  <select 
                    className="input-field" 
                    value={paymentForm.paymentMethod} 
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Date</label>
                  <input 
                    type="date" 
                    required 
                    className="input-field" 
                    value={paymentForm.date} 
                    onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes / Reference</label>
                <input 
                  type="text" 
                  placeholder="e.g. UPI Ref / Cash receipt" 
                  className="input-field" 
                  value={paymentForm.notes} 
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} 
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
              <button 
                type="button" 
                onClick={() => setShowPaymentModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="recordPaymentForm" 
                className="btn-primary bg-emerald-600 hover:bg-emerald-700"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Status Modal */}
      {showStatusModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm z-10 overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Update Service Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Update progress for <span className="font-mono font-bold text-slate-700">{activeService.id}</span> ({activeService.equipmentType}):
              </p>

              <div className="space-y-2">
                {SERVICE_STATUSES.map(st => (
                  <label 
                    key={st} 
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      newStatus === st 
                        ? 'border-primary-500 bg-red-50 text-primary-800 font-bold' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        name="statusRadio" 
                        value={st} 
                        checked={newStatus === st} 
                        onChange={() => setNewStatus(st)}
                        className="text-primary-600 focus:ring-primary-500" 
                      />
                      <span>{st}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] ${getStatusBadge(st)}`}>
                      {st}
                    </span>
                  </label>
                ))}
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowStatusModal(false)} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Job Receipt Modal */}
      {showPrintModal && activeService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPrintModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl z-10 overflow-hidden animate-fadeIn flex flex-col max-h-[95vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer size={18} className="text-slate-700" />
                <h3 className="text-base font-bold text-slate-800">Job Sheet & Receipt Preview</h3>
              </div>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-4 print:p-0 print:m-0" id="printableJobSheet">
              {/* Header */}
              <div className="text-center border-b pb-4 border-slate-200">
                <h2 className="text-xl font-black text-slate-900 tracking-wider">
                  {shopSettings?.store?.shopName || 'EVERYKADAI SPORTS'}
                </h2>
                <p className="text-xs text-slate-500">
                  {shopSettings?.store?.address || '123 Sports Complex, Market Road'}, {shopSettings?.store?.city || 'Chennai'}
                </p>
                <p className="text-xs text-slate-500">
                  Phone: {shopSettings?.store?.phone || '9998887777'} {shopSettings?.gst?.gstin && `| GSTIN: ${shopSettings.gst.gstin}`}
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-md font-bold text-xs uppercase tracking-widest text-slate-700">
                  Equipment Service Job Sheet / Receipt
                </div>
              </div>

              {/* Job & Customer Summary */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b pb-3 border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold">Service ID</span>
                  <span className="font-mono font-bold text-base text-slate-800">{activeService.id}</span>
                  <span className="text-slate-400 block mt-1 font-semibold">Date Received</span>
                  <span className="font-medium text-slate-700">{activeService.dateReceived}</span>
                  <span className="text-slate-400 block mt-1 font-semibold">Expected Completion</span>
                  <span className="font-medium text-slate-700">{activeService.expectedCompletionDate || 'Prompt'}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold">Customer Name</span>
                  <span className="font-bold text-slate-800 text-sm">{activeService.customerName}</span>
                  <span className="text-slate-400 block mt-1 font-semibold">Mobile</span>
                  <span className="font-mono font-semibold text-slate-700">{activeService.customerMobile}</span>
                  {activeService.customerAddress && (
                    <span className="text-slate-500 block mt-1">{activeService.customerAddress}</span>
                  )}
                </div>
              </div>

              {/* Equipment Specifications */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Equipment Type:</span>
                  <span className="font-bold text-slate-800">{activeService.equipmentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Brand / Model:</span>
                  <span className="font-medium text-slate-800">{[activeService.brand, activeService.model].filter(Boolean).join(' ') || 'N/A'}</span>
                </div>
                {activeService.conditionAtReceipt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Received Condition:</span>
                    <span className="text-slate-700">{activeService.conditionAtReceipt}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-500 font-semibold block mb-0.5">Work Description:</span>
                  <span className="font-bold text-slate-900 block">{activeService.workRequired}</span>
                </div>
              </div>

              {/* Financials */}
              <div className="space-y-1.5 text-xs border-t pt-3 border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Service Charge:</span>
                  <span>₹{Number(activeService.finalServiceCharge || 0).toFixed(2)}</span>
                </div>
                {Number(activeService.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{Number(activeService.discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(activeService.gstRate) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({activeService.gstRate}%):</span>
                    <span>Included in total</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-800 pt-1 border-t border-slate-200">
                  <span>Total Amount:</span>
                  <span>₹{Number(activeService.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Advance / Paid:</span>
                  <span>₹{Number(activeService.advancePaid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-red-600 pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span>₹{Number(activeService.balanceDue || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Terms & Footer */}
              <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-200 space-y-1">
                <p>• Please produce this receipt when collecting your serviced equipment.</p>
                <p>• Equipment must be collected within 15 days of completion date.</p>
                <p>• Goods left for service are at customer's risk after 30 days.</p>
              </div>

              <div className="flex justify-between pt-6 text-[10px] text-slate-500 font-semibold">
                <div>Customer Signature</div>
                <div>Authorised Signature</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 print:hidden">
              <button 
                type="button" 
                onClick={() => setShowPrintModal(false)} 
                className="btn-secondary"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="btn-primary flex items-center"
              >
                <Printer size={16} className="mr-1.5" /> Print Now
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
                <h3 className="text-lg font-bold text-slate-800">Confirm Service Deletion</h3>
                <p className="text-xs text-slate-500">This action will also remove associated payment records</p>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete service job{' '}
                <span className="font-bold text-slate-800 font-mono">{confirmDelete.item?.id}</span> for customer{' '}
                <span className="font-semibold text-slate-700">{confirmDelete.item?.customerName}</span>?
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
                onClick={confirmDeleteService} 
                className="btn-danger"
              >
                Delete Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
