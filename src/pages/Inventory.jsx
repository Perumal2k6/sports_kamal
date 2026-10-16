import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Package, TrendingUp, History, Edit, Eye, Trash2, X, CheckCircle, Image as ImageIcon } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getProducts, getDashboardMetrics, updateProductStock, getCategories, getSales, getPurchases, saveProducts, getStockMovements } from '../lib/db';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [metrics, setMetrics] = useState({ totalProducts: 0, stockValue: 0, lowStock: 0, outOfStock: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [activeProduct, setActiveProduct] = useState(null);
  
  // Adjustment Form State
  const [adjType, setAdjType] = useState('Add Stock');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('Manual Correction');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjConfirmStep, setAdjConfirmStep] = useState(false);
  
  // Global States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Yes', isDestructive: true });

  const loadData = () => {
    setProducts(getProducts());
    setCategories(getCategories());
    setSales(getSales());
    setPurchases(getPurchases());
    setStockMovements(getStockMovements());
    setMetrics(getDashboardMetrics());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) ||
                          p.sku.toLowerCase().includes(q) ||
                          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                          (p.brand && p.brand.toLowerCase().includes(q));
    
    let matchesStatus = true;
    if (statusFilter === 'In Stock') matchesStatus = p.stock > (p.minStock || 5);
    else if (statusFilter === 'Low Stock') matchesStatus = p.stock > 0 && p.stock <= (p.minStock || 5);
    else if (statusFilter === 'Out of Stock') matchesStatus = p.stock === 0;
    else if (statusFilter === 'Inactive') matchesStatus = p.status === 'Inactive';
    
    if (statusFilter !== 'Inactive' && p.status === 'Inactive' && statusFilter !== 'All Status') {
       matchesStatus = false;
    }

    const matchesCategory = categoryFilter === 'All Categories' || p.categoryId.toString() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  // --- ACTIONS ---

  const openView = (product) => {
    setActiveProduct(product);
    setShowViewModal(true);
  };

  const openAdjust = (product) => {
    setActiveProduct(product);
    setAdjType('Add Stock');
    setAdjQty('');
    setAdjReason('Manual Correction');
    setAdjNotes('');
    setAdjConfirmStep(false);
    setShowAdjustModal(true);
  };

  const openHistory = (product) => {
    setActiveProduct(product);
    setShowHistoryModal(true);
  };

  const handleAdjustNext = (e) => {
    e.preventDefault();
    const qty = Number(adjQty);
    if (!qty || qty <= 0) return showToast('Enter a valid quantity', 'error');

    if (adjType === 'Remove Stock' && activeProduct.stock - qty < 0) {
      showToast(`Insufficient stock. Available stock: ${activeProduct.stock}`, 'error');
      return;
    }
    
    setAdjConfirmStep(true);
  };

  const handleAdjustSubmit = () => {
    const qty = Number(adjQty);
    
    let change = 0;
    if (adjType === 'Add Stock') change = qty;
    if (adjType === 'Remove Stock') change = -qty;
    if (adjType === 'Set Stock') change = qty - activeProduct.stock;

    updateProductStock(activeProduct.id, change, 'ADJUSTMENT', adjReason);
    
    setShowAdjustModal(false);
    loadData();
    showToast('Stock updated successfully.');
  };

  const deleteProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const hasTransactions = sales.some(s => s.items.some(i => i.id === id)) || purchases.some(p => p.items.some(i => i.id === id)) || stockMovements.some(m => m.productId === id && m.type !== 'OPENING_STOCK' && m.type !== 'ADJUSTMENT');

    if (hasTransactions) {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Inventory Product?',
        message: `Product: ${product.name}\nCurrent Stock: ${product.stock}\n\nWarning: This product has transaction history and cannot be permanently deleted.\n\nYou can deactivate this product instead.`,
        confirmText: 'Deactivate Product',
        isDestructive: false,
        onConfirm: () => {
          const updated = products.map(p => p.id === id ? { ...p, status: 'Inactive' } : p);
          setProducts(updated);
          saveProducts(updated);
          showToast("Product deactivated successfully.");
          setConfirmDialog({ isOpen: false });
          loadData();
        }
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Product',
        message: `Are you sure you want to permanently delete "${product.name}"?`,
        confirmText: 'Delete Product',
        isDestructive: true,
        onConfirm: () => {
          const updated = products.filter(p => p.id !== id);
          setProducts(updated);
          saveProducts(updated);
          showToast("Product deleted successfully.");
          setConfirmDialog({ isOpen: false });
          loadData();
        }
      });
    }
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
              <button onClick={confirmDialog.onConfirm} className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500">Monitor stock levels, values and movements.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Total Products</p>
              <h3 className="text-xl font-bold text-slate-800">{products.filter(p=>p.status==='Active').length}</h3>
            </div>
            <Package size={18} className="text-blue-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Total Stock</p>
              <h3 className="text-xl font-bold text-slate-800">{totalStock}</h3>
            </div>
            <Package size={18} className="text-emerald-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Stock Value</p>
              <h3 className="text-xl font-bold text-slate-800">₹{metrics.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <TrendingUp size={18} className="text-purple-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Low Stock</p>
              <h3 className="text-xl font-bold text-slate-800">{metrics.lowStock}</h3>
            </div>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Out of Stock</p>
              <h3 className="text-xl font-bold text-slate-800">{metrics.outOfStock}</h3>
            </div>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by name, SKU, Barcode, Brand..." 
            className="input-field pl-10"
          />
        </div>
        <div className="flex space-x-2">
          <select 
            className="input-field w-36 text-sm"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="All Categories">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            className="input-field w-36 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option>All Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Product & SKU</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                <th className="py-3 px-4 font-semibold text-right">Stock Value</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => {
                const cat = categories.find(c => c.id === product.categoryId);
                const stockVal = product.stock * (product.price); // Valued at stored price 
                
                const minStock = product.minStock || 5;
                let status = 'In Stock';
                let statusColor = 'bg-emerald-100 text-emerald-800';
                
                if (product.status === 'Inactive') {
                  status = 'Inactive';
                  statusColor = 'bg-slate-100 text-slate-600';
                } else if (product.stock === 0) {
                  status = 'Out of Stock';
                  statusColor = 'bg-red-100 text-red-800';
                } else if (product.stock <= minStock) {
                  status = 'Low Stock';
                  statusColor = 'bg-amber-100 text-amber-800';
                }

                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.sku}</div>
                    </td>
                    <td className="py-3 px-4">{cat ? cat.name : 'Unknown'}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">{product.stock}</td>
                    <td className="py-3 px-4 text-right">
                      {product.offerPrice ? (
                        <div>
                          <div className="font-bold text-slate-800">₹{product.offerPrice} <span className="inline-block ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded align-middle tracking-wider">OFFER</span></div>
                          <div className="text-xs text-slate-400 line-through">₹{product.price}</div>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-800">₹{product.price}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">₹{stockVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center items-center space-x-2 text-slate-400">
                        <button onClick={() => openView(product)} className="w-8 h-8 rounded hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors" title="View Details"><Eye size={18} /></button>
                        <button onClick={() => openAdjust(product)} className="w-8 h-8 rounded hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-colors" title="Adjust Stock"><Edit size={18} /></button>
                        <button onClick={() => openHistory(product)} className="w-8 h-8 rounded hover:bg-purple-50 hover:text-purple-600 flex items-center justify-center transition-colors" title="Stock History"><History size={18} /></button>
                        <button onClick={() => deleteProduct(product.id)} className="w-8 h-8 rounded hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" title="Delete / Deactivate"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center">
                      <Package size={40} className="text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No inventory found.</p>
                      <p className="text-sm">Add products to start managing your stock.</p>
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
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
        <div className="px-4 pb-4 flex items-center text-sm text-slate-500 bg-white">
            <span>Items per page:</span>
            <select 
              className="ml-2 border border-slate-300 rounded text-sm p-1 outline-none focus:border-primary-500"
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
        </div>
      </div>

      {/* ---------------------------------------------------------
          VIEW PRODUCT STOCK MODAL
      --------------------------------------------------------- */}
      {showViewModal && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Product Stock Details</h2>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex space-x-6">
                <div className="w-24 h-24 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon size={32} className="mb-2" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-lg mb-1">{activeProduct.name}</p>
                  <p className="text-sm text-slate-500 mb-2">SKU: {activeProduct.sku} {activeProduct.barcode ? `| Barcode: ${activeProduct.barcode}` : ''}</p>
                  <div className="flex space-x-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{categories.find(c => c.id === activeProduct.categoryId)?.name}</span>
                    {activeProduct.brand && <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{activeProduct.brand}</span>}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${activeProduct.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{activeProduct.status}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">CURRENT STOCK</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Stock</span>
                      <span className="font-bold text-lg text-slate-800">{activeProduct.stock} {activeProduct.unit || 'Units'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Minimum Stock</span>
                      <span className="font-medium text-slate-800">{activeProduct.minStock || 5}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stock Status</span>
                      <span className={`font-bold ${activeProduct.stock === 0 ? 'text-red-600' : activeProduct.stock <= (activeProduct.minStock||5) ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {activeProduct.stock === 0 ? 'Out of Stock' : activeProduct.stock <= (activeProduct.minStock||5) ? 'Low Stock' : 'In Stock'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">PRICING & VALUE</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">MRP</span>
                      <span className="font-medium text-slate-800 line-through">₹{activeProduct.mrp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Selling Price</span>
                      <span className="font-medium text-slate-800">₹{activeProduct.price}</span>
                    </div>
                    {activeProduct.offerPrice && (
                      <div className="flex justify-between">
                        <span className="font-bold text-primary-600">Offer Price</span>
                        <span className="font-bold text-primary-600">₹{activeProduct.offerPrice}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
                      <span className="text-slate-500 font-bold">Total Stock Value</span>
                      <span className="font-bold text-slate-800">₹{(activeProduct.stock * activeProduct.price).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">STOCK INFORMATION (ALL TIME)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Purchased</p>
                    <p className="font-bold text-emerald-600 text-lg">
                      {stockMovements.filter(m => m.productId === activeProduct.id && m.type === 'PURCHASE_IN').reduce((sum, m) => sum + m.qty, 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Sold</p>
                    <p className="font-bold text-red-600 text-lg">
                      {stockMovements.filter(m => m.productId === activeProduct.id && m.type === 'SALE_OUT').reduce((sum, m) => sum + Math.abs(m.qty), 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Returned</p>
                    <p className="font-bold text-purple-600 text-lg">
                      {stockMovements.filter(m => m.productId === activeProduct.id && m.type === 'SALES_RETURN').reduce((sum, m) => sum + m.qty, 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Adjusted</p>
                    <p className="font-bold text-blue-600 text-lg">
                      {stockMovements.filter(m => m.productId === activeProduct.id && m.type === 'ADJUSTMENT').reduce((sum, m) => sum + m.qty, 0)}
                    </p>
                  </div>
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => { setShowViewModal(false); openHistory(activeProduct); }} className="btn-secondary px-4 flex items-center">
                <History size={16} className="mr-2" /> View Stock History
              </button>
              <button type="button" onClick={() => { setShowViewModal(false); openAdjust(activeProduct); }} className="btn-primary px-4 flex items-center">
                <Edit size={16} className="mr-2" /> Adjust Stock
              </button>
              <button type="button" onClick={() => setShowViewModal(false)} className="btn-secondary px-6 bg-white">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ADJUST STOCK MODAL
      --------------------------------------------------------- */}
      {showAdjustModal && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAdjustModal(false)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-lg">
              <h2 className="text-xl font-bold text-slate-800">Adjust Stock</h2>
              <p className="text-sm text-slate-500 mt-1">{activeProduct.name} ({activeProduct.sku})</p>
            </div>
            
            <div className="p-5">
              {!adjConfirmStep ? (
                <>
                  <div className="mb-5 flex justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 items-center">
                    <span className="text-sm text-slate-600 font-medium">Current Stock</span>
                    <span className="font-bold text-2xl text-slate-800">{activeProduct.stock}</span>
                  </div>

                  <form id="adjustForm" onSubmit={handleAdjustNext} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Adjustment Type</label>
                        <select className="input-field py-2.5 font-medium" value={adjType} onChange={e => setAdjType(e.target.value)}>
                          <option>Add Stock</option>
                          <option>Remove Stock</option>
                          <option>Set Stock</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Quantity</label>
                        <input type="number" required min="0" className="input-field py-2.5 font-bold" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Reason</label>
                      <select className="input-field py-2.5" value={adjReason} onChange={e => setAdjReason(e.target.value)}>
                        <option>Manual Correction</option>
                        <option>Purchase</option>
                        <option>Sales Return</option>
                        <option>Damage</option>
                        <option>Lost</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Notes (Optional)</label>
                      <input type="text" className="input-field py-2" value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Additional details..." />
                    </div>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle size={32} className="mx-auto text-amber-500 mb-2" />
                    <h3 className="font-bold text-slate-800 text-lg mb-1">Stock Adjustment Confirmation</h3>
                    <p className="text-sm text-slate-600">Please review the changes below.</p>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Product</span>
                      <span className="font-bold text-sm text-slate-800">{activeProduct.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Current Stock</span>
                      <span className="font-medium text-sm text-slate-800">{activeProduct.stock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-sm">Adjustment</span>
                      <span className={`font-bold text-sm ${adjType === 'Add Stock' ? 'text-emerald-600' : adjType === 'Remove Stock' ? 'text-red-600' : 'text-blue-600'}`}>
                        {adjType === 'Add Stock' ? `+${adjQty}` : adjType === 'Remove Stock' ? `-${adjQty}` : `Set to ${adjQty}`}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-slate-200">
                      <span className="font-bold text-slate-800">New Stock</span>
                      <span className="font-bold text-lg text-slate-800">
                        {adjType === 'Add Stock' ? activeProduct.stock + Number(adjQty) : adjType === 'Remove Stock' ? activeProduct.stock - Number(adjQty) : Number(adjQty)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-2">
                      <span className="text-slate-500">Reason</span>
                      <span className="font-medium text-slate-600">{adjReason}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-lg">
              {!adjConfirmStep ? (
                <>
                  <button type="button" onClick={() => setShowAdjustModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" form="adjustForm" className="btn-primary">Review Changes</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setAdjConfirmStep(false)} className="btn-secondary">Back</button>
                  <button type="button" onClick={handleAdjustSubmit} className="btn-primary bg-amber-500 hover:bg-amber-600">Confirm Adjustment</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          STOCK MOVEMENT HISTORY MODAL
      --------------------------------------------------------- */}
      {showHistoryModal && activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Stock Movement History</h2>
                <p className="text-sm text-slate-500 mt-1">{activeProduct.name} - Current Stock: <span className="font-bold text-slate-800">{activeProduct.stock}</span></p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-5">
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Date & Time</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold text-right">Previous</th>
                      <th className="py-3 px-4 font-semibold text-center">Movement</th>
                      <th className="py-3 px-4 font-semibold text-right">New Stock</th>
                      <th className="py-3 px-4 font-semibold">Reference / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stockMovements.filter(m => m.productId === activeProduct.id).sort((a,b) => new Date(b.date) - new Date(a.date)).map((m) => {
                      let typeColor = 'bg-slate-100 text-slate-800';
                      let typeLabel = m.type;
                      
                      if (m.type === 'SALE_OUT') { typeColor = 'bg-red-100 text-red-800'; typeLabel = 'SALE'; }
                      if (m.type === 'PURCHASE_IN') { typeColor = 'bg-emerald-100 text-emerald-800'; typeLabel = 'PURCHASE'; }
                      if (m.type === 'SALES_RETURN') { typeColor = 'bg-purple-100 text-purple-800'; typeLabel = 'RETURN'; }
                      if (m.type === 'ADJUSTMENT') { typeColor = 'bg-blue-100 text-blue-800'; typeLabel = 'ADJUSTMENT'; }
                      if (m.type === 'OPENING_STOCK') { typeColor = 'bg-amber-100 text-amber-800'; typeLabel = 'OPENING STOCK'; }

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{new Date(m.date).toLocaleDateString()}</div>
                            <div className="text-xs text-slate-500">{new Date(m.date).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${typeColor}`}>{typeLabel}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-medium">{m.beforeStock}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${m.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {m.qty > 0 ? `+${m.qty}` : m.qty}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">{m.afterStock}</td>
                          <td className="py-3 px-4 text-slate-600 text-sm">
                            {m.reference || m.reason || 'System'}
                          </td>
                        </tr>
                      );
                    })}
                    {stockMovements.filter(m => m.productId === activeProduct.id).length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-slate-500">No stock history available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
