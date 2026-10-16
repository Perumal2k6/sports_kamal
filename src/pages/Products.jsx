import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Settings, AlertTriangle, CheckCircle, Image as ImageIcon, Power } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getProducts, saveProducts, getCategories, saveCategories, getSales, getPurchases } from '../lib/db';

const Products = () => {
  // Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: 'Yes', isDestructive: true });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [offerFilter, setOfferFilter] = useState('All');
  const [gstFilter, setGstFilter] = useState('All');

  // Modal Toggles
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductView, setShowProductView] = useState(false);
  const [showCategoryManage, setShowCategoryManage] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Edit / View State
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const defaultProduct = {
    name: '', sku: '', barcode: '', categoryId: '', brand: '', unit: 'Pcs',
    mrp: '', price: '', offerPrice: '', stock: '', minStock: '5',
    tax: '18', hsnCode: '', status: 'Active'
  };
  
  const defaultCategory = {
    name: '', description: '', status: 'Active'
  };

  const [productForm, setProductForm] = useState(defaultProduct);
  const [categoryForm, setCategoryForm] = useState(defaultCategory);

  const loadData = () => {
    setProducts(getProducts());
    setCategories(getCategories());
    setSales(getSales());
    setPurchases(getPurchases());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Filtering Logic ---
  const filteredProducts = products.filter(p => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || p.name.toLowerCase().includes(q) || 
                          p.sku.toLowerCase().includes(q) || 
                          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
                          (p.brand && p.brand.toLowerCase().includes(q));

    // Category
    const matchesCategory = categoryFilter === 'All' || p.categoryId.toString() === categoryFilter;
    
    // Stock
    let matchesStock = true;
    if (stockFilter === 'In Stock') matchesStock = p.stock > (p.minStock || 5);
    if (stockFilter === 'Low Stock') matchesStock = p.stock > 0 && p.stock <= (p.minStock || 5);
    if (stockFilter === 'Out of Stock') matchesStock = p.stock === 0;

    // Status
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    // Offer
    let matchesOffer = true;
    if (offerFilter === 'Offer Available') matchesOffer = !!p.offerPrice;
    if (offerFilter === 'No Offer') matchesOffer = !p.offerPrice;

    // GST
    const matchesGst = gstFilter === 'All' || p.tax.toString() === gstFilter;

    return matchesSearch && matchesCategory && matchesStock && matchesStatus && matchesOffer && matchesGst;
  });

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1); // Reset page on filter change
  }, [searchQuery, categoryFilter, stockFilter, statusFilter, offerFilter, gstFilter, itemsPerPage]);

  // --- PRODUCT CRUD ---
  
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm(defaultProduct);
    setShowProductModal(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      ...product,
      barcode: product.barcode || '',
      unit: product.unit || 'Pcs',
      hsnCode: product.hsnCode || '',
      minStock: product.minStock || '5',
      offerPrice: product.offerPrice || ''
    });
    setShowProductModal(true);
    setShowProductView(false);
  };

  const handleProductSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!productForm.name || !productForm.sku || !productForm.categoryId || !productForm.mrp || !productForm.price || productForm.stock === '') {
      return showToast("Please fill all required fields.", 'error');
    }

    const mrp = Number(productForm.mrp);
    const sellingPrice = Number(productForm.price);
    const offerPrice = productForm.offerPrice ? Number(productForm.offerPrice) : null;

    if (mrp < sellingPrice) {
      return showToast("Selling Price cannot be greater than MRP.", 'error');
    }
    
    if (offerPrice) {
      if (offerPrice <= 0) return showToast("Offer Price must be greater than 0.", 'error');
      if (offerPrice > sellingPrice) return showToast("Offer Price cannot be greater than Selling Price.", 'error');
    }

    const newProductData = {
      ...productForm,
      categoryId: Number(productForm.categoryId),
      mrp,
      price: sellingPrice,
      offerPrice,
      stock: Number(productForm.stock),
      minStock: Number(productForm.minStock),
      tax: Number(productForm.tax),
      updatedAt: new Date().toISOString()
    };

    let updatedProducts;
    if (editingProduct) {
      updatedProducts = products.map(p => p.id === editingProduct.id ? { ...newProductData, id: p.id, createdAt: p.createdAt } : p);
      showToast("Product updated successfully.");
    } else {
      newProductData.id = Date.now();
      newProductData.createdAt = new Date().toISOString();
      updatedProducts = [newProductData, ...products];
      showToast("Product created successfully.");
    }

    setProducts(updatedProducts);
    saveProducts(updatedProducts);
    setShowProductModal(false);
  };

  const deleteProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const hasTransactions = sales.some(s => s.items.some(i => i.id === id)) || purchases.some(p => p.items.some(i => i.id === id));

    if (hasTransactions) {
      setConfirmDialog({
        isOpen: true,
        title: 'Product In Use',
        message: `"${product.name}" has transaction history and cannot be permanently deleted.\n\nWould you like to DEACTIVATE it instead?`,
        confirmText: 'Deactivate',
        isDestructive: false,
        onConfirm: () => {
          const updated = products.map(p => p.id === id ? { ...p, status: 'Inactive' } : p);
          setProducts(updated);
          saveProducts(updated);
          showToast("Product deactivated successfully.");
          setConfirmDialog({ isOpen: false });
        }
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        title: 'Delete Product',
        message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        isDestructive: true,
        onConfirm: () => {
          const updated = products.filter(p => p.id !== id);
          setProducts(updated);
          saveProducts(updated);
          showToast("Product deleted successfully.");
          setConfirmDialog({ isOpen: false });
        }
      });
    }
  };

  const toggleProductStatus = (product) => {
    const newStatus = product.status === 'Active' ? 'Inactive' : 'Active';
    const updated = products.map(p => p.id === product.id ? { ...p, status: newStatus } : p);
    setProducts(updated);
    saveProducts(updated);
    showToast(`Product ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`);
  };

  // --- CATEGORY CRUD ---

  const openAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm(defaultCategory);
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ ...cat });
    setShowCategoryModal(true);
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    if (!categoryForm.name) return showToast("Category Name is required.", 'error');

    let updatedCats;
    if (editingCategory) {
      updatedCats = categories.map(c => c.id === editingCategory.id ? { ...categoryForm, id: c.id } : c);
      showToast("Category updated successfully.");
    } else {
      const newCat = { ...categoryForm, id: Date.now(), createdAt: new Date().toISOString() };
      updatedCats = [...categories, newCat];
      showToast("Category created successfully.");
      
      // If we are currently inside product add form, auto-select it
      if (showProductModal && !editingCategory) {
        setProductForm({ ...productForm, categoryId: newCat.id });
      }
    }

    setCategories(updatedCats);
    saveCategories(updatedCats);
    setShowCategoryModal(false);
  };

  const deleteCategory = (id) => {
    const cat = categories.find(c => c.id === id);
    const prodCount = products.filter(p => p.categoryId === id).length;
    
    if (prodCount > 0) {
      showToast(`Cannot delete category "${cat.name}". ${prodCount} products are assigned to it.`, 'error');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      message: `Are you sure you want to delete category "${cat.name}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: () => {
        const updated = categories.filter(c => c.id !== id);
        setCategories(updated);
        saveCategories(updated);
        showToast("Category deleted successfully.");
        setConfirmDialog({ isOpen: false });
      }
    });
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
              <button onClick={confirmDialog.onConfirm} className={`px-6 py-2 rounded-lg font-bold text-white shadow-md ${confirmDialog.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm">Manage your retail inventory, categories, and pricing.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            className="btn-secondary flex items-center bg-white border border-slate-300 text-slate-700 shadow-sm"
            onClick={() => setShowCategoryManage(true)}
          >
            <Settings size={18} className="mr-2 text-slate-500" /> Manage Categories
          </button>
          <button 
            className="btn-primary flex items-center shadow-md"
            onClick={openAddProduct}
          >
            <Plus size={18} className="mr-2" /> Add Product
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by Name, SKU, Barcode, Brand..." 
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          
          <select className="input-field text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select className="input-field text-sm" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          
          <select className="input-field text-sm" value={offerFilter} onChange={(e) => setOfferFilter(e.target.value)}>
            <option value="All">All Offers</option>
            <option value="Offer Available">Offer Available</option>
            <option value="No Offer">No Offer</option>
          </select>
          
          <select className="input-field text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold w-16 text-center">Image</th>
                <th className="py-3 px-4 font-semibold">Product Details</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Stock</th>
                <th className="py-3 px-4 font-semibold text-right">Pricing</th>
                <th className="py-3 px-4 font-semibold text-center">GST</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => {
                const cat = categories.find(c => c.id === product.categoryId);
                const isLowStock = product.stock > 0 && product.stock <= (product.minStock || 5);
                const isOutOfStock = product.stock === 0;
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                        <ImageIcon size={20} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{product.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium">SKU:</span> {product.sku} 
                        {product.brand && <span className="ml-2"><span className="font-medium">Brand:</span> {product.brand}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {cat ? cat.name : <span className="text-red-500">Uncategorized</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {product.offerPrice ? (
                        <div>
                          <div className="text-xs text-slate-400 line-through">MRP: ₹{product.mrp}</div>
                          <div className="font-bold text-primary-600 text-base">₹{product.offerPrice} <span className="inline-block ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded align-middle tracking-wider">OFFER</span></div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-slate-400 line-through">MRP: ₹{product.mrp}</div>
                          <div className="font-bold text-slate-800 text-base">₹{product.price}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-medium">{product.tax}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        product.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center items-center space-x-2">
                        <button onClick={() => toggleProductStatus(product)} className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${product.status === 'Active' ? 'bg-white border-slate-200 text-slate-600 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50' : 'bg-slate-100 border-slate-300 text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50'}`} title={product.status === 'Active' ? 'Deactivate' : 'Activate'}>
                          <Power size={16} />
                        </button>
                        <button onClick={() => { setViewingProduct(product); setShowProductView(true); }} className="w-8 h-8 rounded bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 flex items-center justify-center transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => openEditProduct(product)} className="w-8 h-8 rounded bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-colors" title="Edit">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteProduct(product.id)} className="w-8 h-8 rounded bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center">
                      <Search size={40} className="text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">No products found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
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
          PRODUCT DETAILS VIEW MODAL 
      --------------------------------------------------------- */}
      {showProductView && viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowProductView(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Product Details</h2>
                <p className="text-sm text-slate-500">{viewingProduct.name}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${viewingProduct.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                  {viewingProduct.status}
                </span>
                <button onClick={() => setShowProductView(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="flex space-x-6">
                <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon size={32} className="mb-2" />
                  <span className="text-xs font-medium">No Image</span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PRODUCT INFORMATION</h3>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Product Name</p>
                    <p className="font-bold text-slate-800 text-sm">{viewingProduct.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">SKU / Barcode</p>
                    <p className="font-bold text-slate-800 text-sm">{viewingProduct.sku} {viewingProduct.barcode ? `| ${viewingProduct.barcode}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Category</p>
                    <p className="font-bold text-slate-800 text-sm">{categories.find(c => c.id === viewingProduct.categoryId)?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Brand & Unit</p>
                    <p className="font-bold text-slate-800 text-sm">{viewingProduct.brand || 'N/A'} - {viewingProduct.unit || 'Pcs'}</p>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">PRICING</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">MRP</span>
                      <span className="font-medium text-slate-800 line-through">₹{viewingProduct.mrp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Selling Price</span>
                      <span className="font-medium text-slate-800">₹{viewingProduct.price}</span>
                    </div>
                    {viewingProduct.offerPrice && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-bold text-primary-600">Offer Price</span>
                          <span className="font-bold text-primary-600">₹{viewingProduct.offerPrice}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
                          <span className="font-bold text-emerald-600">Savings</span>
                          <span className="font-bold text-emerald-600">₹{viewingProduct.mrp - viewingProduct.offerPrice}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">TAX & INVENTORY</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">GST / Tax</span>
                      <span className="font-medium text-slate-800">{viewingProduct.tax}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HSN Code</span>
                      <span className="font-medium text-slate-800">{viewingProduct.hsnCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Current Stock</span>
                      <span className={`font-bold ${viewingProduct.stock === 0 ? 'text-red-600' : viewingProduct.stock <= (viewingProduct.minStock||5) ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {viewingProduct.stock} {viewingProduct.unit || 'Pcs'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Minimum Stock</span>
                      <span className="font-medium text-slate-800">{viewingProduct.minStock || 5}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowProductView(false)} className="btn-secondary px-6">Close</button>
              <button 
                type="button" 
                onClick={() => openEditProduct(viewingProduct)} 
                className="btn-primary px-6 flex items-center"
              >
                <Edit size={16} className="mr-2" /> Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ADD / EDIT PRODUCT MODAL 
      --------------------------------------------------------- */}
      {showProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowProductModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="productForm" onSubmit={handleProductSubmit} className="space-y-8">
                
                {/* Product Info Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Product Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Product Name *</label>
                      <input type="text" required className="w-full input-field py-2" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                      <div className="flex space-x-2">
                        <select 
                          required 
                          className="flex-1 input-field py-2" 
                          value={productForm.categoryId} 
                          onChange={e => setProductForm({...productForm, categoryId: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          {categories.filter(c => c.status === 'Active' || (editingProduct && c.id === productForm.categoryId)).map(c => (
                            <option key={c.id} value={c.id}>{c.name} {c.status === 'Inactive' ? '(Inactive)' : ''}</option>
                          ))}
                        </select>
                        <button 
                          type="button" 
                          onClick={openAddCategory}
                          className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                          title="Add new category"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">SKU *</label>
                      <input type="text" required className="w-full input-field py-2" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Barcode (Optional)</label>
                      <input type="text" className="w-full input-field py-2" value={productForm.barcode} onChange={e => setProductForm({...productForm, barcode: e.target.value})} />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-[2]">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Brand</label>
                        <input type="text" className="w-full input-field py-2" value={productForm.brand} onChange={e => setProductForm({...productForm, brand: e.target.value})} />
                      </div>
                      <div className="flex-[1]">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Unit</label>
                        <select className="w-full input-field py-2" value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})}>
                          <option>Pcs</option><option>Kgs</option><option>Box</option><option>Pair</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Pricing & Tax</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">MRP *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                        <input type="number" step="0.01" required className="w-full input-field py-2 pl-8" value={productForm.mrp} onChange={e => setProductForm({...productForm, mrp: e.target.value})} />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Selling Price *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                        <input type="number" step="0.01" required className="w-full input-field py-2 pl-8 border-primary-300 focus:ring-primary-500" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Offer Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                        <input type="number" step="0.01" className="w-full input-field py-2 pl-8 bg-emerald-50 border-emerald-200" placeholder="Optional" value={productForm.offerPrice} onChange={e => setProductForm({...productForm, offerPrice: e.target.value})} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">GST % *</label>
                      <select required className="w-full input-field py-2" value={productForm.tax} onChange={e => setProductForm({...productForm, tax: e.target.value})}>
                        <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">HSN Code</label>
                      <input type="text" className="w-full input-field py-2" value={productForm.hsnCode} onChange={e => setProductForm({...productForm, hsnCode: e.target.value})} />
                    </div>

                  </div>
                </div>

                {/* Inventory Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Inventory & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{editingProduct ? 'Current Stock *' : 'Opening Stock *'}</label>
                      <input type="number" required className="w-full input-field py-2" value={productForm.stock} onChange={e => setProductForm({...productForm, stock: e.target.value})} />
                      {editingProduct && <p className="text-[10px] text-amber-600 mt-1">Warning: Changing stock here forces an adjustment. Usually stock is updated via Purchases/Sales.</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Minimum Stock Alert</label>
                      <input type="number" required className="w-full input-field py-2" value={productForm.minStock} onChange={e => setProductForm({...productForm, minStock: e.target.value})} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                      <select className="w-full input-field py-2" value={productForm.status} onChange={e => setProductForm({...productForm, status: e.target.value})}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>

                  </div>
                </div>

              </form>
            </div>
            
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button type="button" onClick={() => setShowProductModal(false)} className="btn-secondary px-6">Cancel</button>
              <button type="submit" form="productForm" className="btn-primary px-8 shadow-md">
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          MANAGE CATEGORIES MODAL (LIST)
      --------------------------------------------------------- */}
      {showCategoryManage && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCategoryManage(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Manage Categories</h2>
                <p className="text-sm text-slate-500">Organize your products into logical groups.</p>
              </div>
              <button onClick={() => setShowCategoryManage(false)} className="text-slate-400 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 border-b border-slate-200 bg-white flex justify-end">
              <button onClick={openAddCategory} className="btn-primary flex items-center shadow-sm text-sm py-2">
                <Plus size={16} className="mr-2" /> Add Category
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-50 p-5">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold w-1/3">Category Name</th>
                      <th className="py-3 px-4 font-semibold text-center">Products</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((cat) => {
                      const prodCount = products.filter(p => p.categoryId === cat.id).length;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{cat.name}</div>
                            {cat.description && <div className="text-xs text-slate-500 mt-0.5 whitespace-normal">{cat.description}</div>}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 font-bold rounded-md text-xs">{prodCount}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                              cat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {cat.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center space-x-2">
                              <button onClick={() => openEditCategory(cat)} className="w-8 h-8 rounded border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-colors">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => deleteCategory(cat.id)} className="w-8 h-8 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center py-8 text-slate-500">No categories found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------
          ADD / EDIT CATEGORY MODAL 
      --------------------------------------------------------- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <h2 className="text-lg font-bold text-slate-800">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category Name *</label>
                <input type="text" required className="w-full input-field py-2" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                <textarea className="w-full input-field py-2 h-20 resize-none" value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                <select className="w-full input-field py-2" value={categoryForm.status} onChange={e => setCategoryForm({...categoryForm, status: e.target.value})}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="btn-secondary px-5">Cancel</button>
                <button type="submit" className="btn-primary px-6 shadow-md">{editingCategory ? 'Save Changes' : 'Save Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
