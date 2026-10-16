import React, { useState, useEffect } from 'react';
import { Search, Trash2, User, CreditCard, Banknote, ShoppingCart, CheckCircle, Plus, Printer, ArrowRight } from 'lucide-react';
import { getProducts, addSale, getCustomers, saveCustomers } from '../lib/db';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [cart, setCart] = useState([]);
  
  const [customerMobile, setCustomerMobile] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [saleSuccess, setSaleSuccess] = useState(null);

  useEffect(() => {
    setProducts(getProducts());
    setCustomers(getCustomers());
  }, []);

  // Product Search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      const q = searchQuery.toLowerCase();
      const results = products.filter(p => 
        (p.name.toLowerCase().includes(q) || 
         p.sku.toLowerCase().includes(q)) && p.stock > 0
      );
      setSearchResults(results);
    }
  }, [searchQuery, products]);

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.qty >= product.stock) {
        alert(`Only ${product.stock} units available.`);
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      const effectivePrice = product.offerPrice || product.price;
      setCart([...cart, { ...product, qty: 1, effectivePrice }]);
    }
    setSearchQuery('');
    setSearchResults([]);
    setPaymentConfirmed(false); // require re-confirmation if cart changes
  };

  const updateQty = (id, newQty) => {
    if (newQty < 1) return;
    const product = products.find(p => p.id === id);
    if (product && newQty > product.stock) {
      alert(`Only ${product.stock} units available.`);
      return;
    }
    setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
    setPaymentConfirmed(false);
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
    setPaymentConfirmed(false);
  };

  const clearCart = () => {
    setCart([]);
    setAmountReceived('');
    setPaymentMethod('UPI');
    setPaymentConfirmed(false);
  };

  // Customer Flow
  const handleMobileChange = (e) => {
    const val = e.target.value;
    setCustomerMobile(val);
    if (val.length >= 10) {
      const found = customers.find(c => c.phone === val && c.status !== 'Inactive');
      if (found) {
        setSelectedCustomer(found);
        setShowAddCustomer(false);
      } else {
        setSelectedCustomer(null);
      }
    } else {
      setSelectedCustomer(null);
      setShowAddCustomer(false);
    }
  };

  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) {
      return alert("Name and Phone are required.");
    }
    const newCust = {
      id: Date.now(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      email: newCustomer.email,
      address: newCustomer.address,
      balance: 0,
      creditLimit: 0,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    const updatedCustomers = [...customers, newCust];
    saveCustomers(updatedCustomers);
    setCustomers(updatedCustomers);
    setSelectedCustomer(newCust);
    setCustomerMobile(newCust.phone);
    setShowAddCustomer(false);
  };

  // Calculations
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableValue = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;

  cart.forEach(item => {
    const effPrice = item.offerPrice || item.price;
    const itemSubtotal = item.price * item.qty;
    const itemTaxable = effPrice * item.qty;
    const itemDiscount = itemSubtotal - itemTaxable;
    
    // GST logic (assume intra-state for now)
    const taxRate = item.tax || 18;
    const itemGst = (itemTaxable * taxRate) / 100;
    
    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
    taxableValue += itemTaxable;
    cgstTotal += itemGst / 2;
    sgstTotal += itemGst / 2;
  });

  const totalGst = cgstTotal + sgstTotal;
  const grandTotal = taxableValue + totalGst;

  // Track if offer applied across cart
  const totalMrp = cart.reduce((sum, item) => sum + ((item.mrp || item.price) * item.qty), 0);
  const totalSavingFromMrp = totalMrp - taxableValue;
  const hasOffer = totalSavingFromMrp > 0;

  // Auto-fill UPI/Card amount
  useEffect(() => {
    if (paymentMethod === 'UPI' || paymentMethod === 'Card' || paymentMethod === 'Bank') {
      setAmountReceived(grandTotal.toFixed(2));
    } else if (paymentMethod === 'Credit') {
      setAmountReceived('0');
    }
  }, [grandTotal, paymentMethod]);

  const handleConfirmPayment = () => {
    if (Number(amountReceived) !== Number(grandTotal.toFixed(2))) {
      alert(`${paymentMethod} amount must exactly match the Grand Total.`);
      return;
    }
    setPaymentConfirmed(true);
  };

  const completeSale = () => {
    if (cart.length === 0) return alert('Cart is empty!');
    
    if (paymentMethod === 'Credit') {
      if (!selectedCustomer) return alert('Credit sales require a registered customer with a mobile number.');
      if (selectedCustomer.name === 'Walk-in Customer') return alert('Credit sales require a registered customer with a mobile number.');
      if (selectedCustomer.status === 'Inactive') return alert('Customer is inactive. Cannot process credit sale.');
      
      const outstanding = selectedCustomer.balance || 0;
      const limit = selectedCustomer.creditLimit || 0;
      if (limit > 0 && (outstanding + grandTotal) > limit) {
        return alert(`Credit limit exceeded.\nLimit: ₹${limit}\nOutstanding: ₹${outstanding}\nAvailable: ₹${limit - outstanding}`);
      }
    }
    
    if (paymentMethod === 'Cash') {
      if (Number(amountReceived) < grandTotal) return alert('Insufficient cash amount.');
    } else if (paymentMethod !== 'Credit' && !paymentConfirmed) {
      return alert(`Please confirm ${paymentMethod} payment first.`);
    }

    const saleData = addSale({
      date: new Date().toISOString(),
      customerId: selectedCustomer ? selectedCustomer.id : null,
      items: cart,
      total: grandTotal,
      taxableValue,
      taxAmount: totalGst,
      cgst: cgstTotal,
      sgst: sgstTotal,
      paymentMethod,
      amountReceived: paymentMethod === 'Credit' ? 0 : Number(amountReceived)
    });

    setSaleSuccess(saleData);
    setProducts(getProducts());
  };

  const resetBilling = () => {
    setSaleSuccess(null);
    clearCart();
    setCustomerMobile('');
    setSelectedCustomer(null);
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
        }
      `}</style>

      {/* SUCCESS MODAL */}
      {saleSuccess && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-[60] print:hidden">
          <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">SALE COMPLETED</h2>
            <div className="text-left bg-slate-50 p-5 rounded-lg mb-6 border border-slate-100">
              <p className="text-sm text-slate-600 mb-2 flex justify-between">
                <span>Invoice</span> <span className="font-bold text-slate-800">{saleSuccess.invoiceNo}</span>
              </p>
              <p className="text-sm text-slate-600 mb-2 flex justify-between">
                <span>Customer</span> <span className="font-bold text-slate-800">{selectedCustomer ? selectedCustomer.name : 'Walk-in'}</span>
              </p>
              <p className="text-sm text-slate-600 mb-2 flex justify-between">
                <span>Amount Paid</span> <span className="font-bold text-slate-800">₹{saleSuccess.total.toFixed(2)}</span>
              </p>
              <p className="text-sm text-slate-600 flex justify-between">
                <span>Payment</span> <span className="font-bold text-emerald-600">{saleSuccess.paymentMethod}</span>
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={() => window.print()} className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center justify-center transition-colors">
                <Printer size={18} className="mr-2" /> Print Bill
              </button>
              <button onClick={resetBilling} className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-bold transition-colors">
                New Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS MAIN LAYOUT */}
      <div className="h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 print:hidden">
        
        {/* LEFT SIDE: PRODUCT SEARCH & CART */}
        <div className="flex-1 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product by Name, SKU or Barcode..." 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-lg z-20 max-h-80 overflow-y-auto">
                  {searchResults.map(p => (
                    <div 
                      key={p.id} 
                      className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0"
                      onClick={() => addToCart(p)}
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-1">SKU: {p.sku} &nbsp;|&nbsp; Stock: <span className="font-semibold text-slate-700">{p.stock}</span></p>
                      </div>
                      <div className="text-right">
                        {p.offerPrice ? (
                          <>
                            <p className="text-xs text-slate-400 line-through">₹{p.price}</p>
                            <p className="font-bold text-primary-600">₹{p.offerPrice}</p>
                          </>
                        ) : (
                          <p className="font-bold text-slate-800">₹{p.price}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                  <th className="py-3 px-4 font-semibold">Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Price</th>
                  <th className="py-3 px-4 font-semibold text-center w-32">Qty</th>
                  <th className="py-3 px-4 font-semibold text-right">GST</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item, index) => {
                  const hasItemOffer = !!item.offerPrice;
                  const effPrice = item.offerPrice || item.price;
                  const itemTotal = effPrice * item.qty;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-center text-slate-500">{index + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        {hasItemOffer && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                            SAVE ₹{(item.price - effPrice) * item.qty}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasItemOffer ? (
                          <div>
                            <span className="text-xs text-slate-400 line-through block">₹{item.price}</span>
                            <span className="font-bold text-slate-800 block">₹{effPrice}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800">₹{effPrice}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                          <button 
                            className="w-7 h-7 rounded bg-white shadow-sm flex items-center justify-center hover:bg-slate-100 text-slate-600"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                          >-</button>
                          <span className="w-6 text-center font-semibold">{item.qty}</span>
                          <button 
                            className="w-7 h-7 rounded bg-white shadow-sm flex items-center justify-center hover:bg-slate-100 text-slate-600"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                          >+</button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">{item.tax || 0}%</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">₹{itemTotal.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-20 text-slate-400">
                      <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-base">Cart is empty.</p>
                      <p className="text-sm mt-1">Search products to add them to the bill.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SIDE: CUSTOMER & CHECKOUT */}
        <div className="w-full lg:w-96 flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
          
          {/* Customer Section */}
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <div className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider mb-3">Customer Mobile</div>
            <div className="relative mb-3">
              <input 
                type="text" 
                value={customerMobile}
                onChange={handleMobileChange}
                placeholder="+91" 
                className="w-full pl-3 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow text-sm"
              />
            </div>
            
            {customerMobile.length >= 10 && !selectedCustomer && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex justify-between items-center border border-red-100">
                <span>Customer not found</span>
                <button 
                  onClick={() => setShowAddCustomer(true)}
                  className="bg-white px-3 py-1 rounded text-red-600 font-bold shadow-sm hover:bg-red-50 text-xs"
                >
                  + Add
                </button>
              </div>
            )}

            {selectedCustomer && (
              <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{selectedCustomer.name}</p>
                  <p className="text-xs text-slate-500">📱 {selectedCustomer.phone}</p>
                  <p className="text-[10px] uppercase font-bold text-emerald-600 mt-1">Existing Customer</p>
                </div>
              </div>
            )}

            {/* Add Customer Inline Modal */}
            {showAddCustomer && (
              <div className="mt-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  className="input-field text-sm py-2"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Mobile Number" 
                  className="input-field text-sm py-2"
                  value={newCustomer.phone || customerMobile}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
                <div className="flex space-x-2">
                  <button onClick={() => setShowAddCustomer(false)} className="btn-secondary flex-1 py-1.5 text-sm">Cancel</button>
                  <button onClick={handleSaveCustomer} className="btn-primary flex-1 py-1.5 text-sm">Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Billing Summary */}
          <div className="p-4 flex-1 overflow-auto bg-white">
            <div className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider mb-3">Billing Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Items Total</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>-₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-100">
                <span>Amount Before Tax</span>
                <span>₹{taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>CGST Tax</span>
                <span>₹{cgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs">
                <span>SGST Tax</span>
                <span>₹{sgstTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-xs font-bold border-b border-slate-100 pb-2">
                <span>Total Tax</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {['UPI', 'Cash'].map(method => (
                  <button 
                    key={method}
                    onClick={() => { setPaymentMethod(method); setPaymentConfirmed(false); }}
                    className={`py-2 rounded-lg font-bold text-xs border transition-colors ${
                      paymentMethod === method 
                        ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Dynamic Payment Details */}
              {paymentMethod === 'UPI' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 mb-1">UPI Amount</label>
                  <input 
                    type="number" 
                    value={amountReceived} 
                    onChange={e => setAmountReceived(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm font-bold text-slate-800 mb-3"
                  />
                  {!paymentConfirmed ? (
                    <button onClick={handleConfirmPayment} className="w-full bg-slate-800 text-white rounded-md py-2 text-sm font-bold hover:bg-slate-900 transition-colors">
                      Verify Payment
                    </button>
                  ) : (
                    <div className="w-full bg-emerald-100 text-emerald-700 rounded-md py-2 text-sm font-bold flex items-center justify-center">
                      <CheckCircle size={16} className="mr-2" /> UPI Confirmed
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'Cash' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Cash Received</label>
                  <input 
                    type="number" 
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm font-bold text-slate-800"
                    placeholder="Enter amount"
                  />
                  {Number(amountReceived) > grandTotal && (
                    <div className="mt-3 flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500">Change:</span>
                      <span className="text-emerald-600">₹{(Number(amountReceived) - grandTotal).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grand Total & Complete Action */}
          <div className="bg-slate-800 text-white p-4 border-t-4 border-primary-500 rounded-b-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-300 font-bold text-sm">GRAND TOTAL</span>
              <span className="text-2xl font-bold text-emerald-400">₹{grandTotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={completeSale}
              className={`w-full py-2.5 rounded-lg text-base font-bold shadow flex justify-center items-center transition-all ${
                cart.length > 0 ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              Confirm Bill <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* PRINT INVOICE TEMPLATE */}
      <div id="print-section" className="hidden print:block">
        <div className="p-4 max-w-3xl mx-auto bg-white text-black font-sans">
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-1">EVERYKADAI</h1>
            <p className="text-sm font-medium">Sports & Retail Store</p>
            <p className="text-xs text-gray-600 mt-2">123 Market Street, Sample City, ST 12345</p>
            <p className="text-xs text-gray-600">Phone: +91 9876543210 | GSTIN: 33ABCDE1234F1Z5</p>
          </div>
          
          <div className="border-b-2 border-black pb-2 mb-4 text-center">
            <h2 className="text-xl font-bold uppercase tracking-widest">Tax Invoice</h2>
          </div>

          <div className="flex justify-between mb-6 text-sm">
            <div>
              <p className="mb-1"><strong>Invoice No:</strong> {saleSuccess?.invoiceNo}</p>
              <p className="mb-1"><strong>Date:</strong> {saleSuccess ? new Date(saleSuccess.date).toLocaleDateString('en-IN') : ''}</p>
              <p><strong>Time:</strong> {saleSuccess ? new Date(saleSuccess.date).toLocaleTimeString('en-IN') : ''}</p>
            </div>
            <div className="text-right">
              <p className="mb-1"><strong>Customer Details:</strong></p>
              <p className="font-bold">{selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}</p>
              {selectedCustomer?.phone && <p>Mobile: {selectedCustomer.phone}</p>}
            </div>
          </div>

          <table className="w-full mb-6 text-sm">
            <thead className="border-y-2 border-black bg-gray-50">
              <tr>
                <th className="py-2 px-1 text-left">Product</th>
                <th className="py-2 px-1 text-center">Qty</th>
                <th className="py-2 px-1 text-right">MRP</th>
                <th className="py-2 px-1 text-right">Offer</th>
                <th className="py-2 px-1 text-right">Rate</th>
                <th className="py-2 px-1 text-center">GST</th>
                <th className="py-2 px-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {saleSuccess?.items.map(item => {
                const effPrice = item.offerPrice || item.price;
                return (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-3 px-1">
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="py-3 px-1 text-center font-bold">{item.qty}</td>
                    <td className="py-3 px-1 text-right text-gray-600">₹{item.mrp || item.price}</td>
                    <td className="py-3 px-1 text-right font-medium">{item.offerPrice ? `₹${item.offerPrice}` : '-'}</td>
                    <td className="py-3 px-1 text-right">₹{effPrice}</td>
                    <td className="py-3 px-1 text-center">{item.tax || 0}%</td>
                    <td className="py-3 px-1 text-right font-bold">₹{(effPrice * item.qty).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="w-full flex justify-end mb-8">
            <div className="w-64 text-sm space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{(saleSuccess?.taxableValue + (hasOffer ? totalSavingFromMrp : 0) || 0).toFixed(2)}</span>
              </div>
              
              {hasOffer && (
                <div className="flex justify-between font-bold text-emerald-600">
                  <span>Discount</span>
                  <span>-₹{totalSavingFromMrp.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                <span>Taxable Amount</span>
                <span>₹{saleSuccess?.taxableValue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>CGST</span>
                <span>₹{saleSuccess?.cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST</span>
                <span>₹{saleSuccess?.sgst.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold pt-3 border-t-2 border-black">
                <span>GRAND TOTAL</span>
                <span>₹{saleSuccess?.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {hasOffer && (
            <div className="mb-6 p-4 border border-black border-dashed text-center rounded">
              <p className="font-bold text-lg mb-1">OFFER APPLIED</p>
              <p className="text-sm">Total MRP: ₹{(saleSuccess?.taxableValue + totalSavingFromMrp || 0).toFixed(2)} | Offer Price: ₹{saleSuccess?.taxableValue.toFixed(2)}</p>
              <p className="text-base font-bold mt-1">You Saved: ₹{totalSavingFromMrp.toFixed(2)} on this bill!</p>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold border-t border-b border-gray-300 py-3 mb-8 bg-gray-50 px-2">
            <div>Payment Method: {saleSuccess?.paymentMethod}</div>
            <div>Payment Status: {saleSuccess?.paymentMethod === 'Credit' ? 'CREDIT' : 'PAID'}</div>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p className="font-bold text-black mb-1">Thank you for shopping with EVERYKADAI</p>
            <p>Developed by Code Blaza Technology</p>
          </div>
          
        </div>
      </div>
      
    </>
  );
};

export default Billing;
