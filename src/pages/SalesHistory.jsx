import React, { useState, useEffect } from 'react';
import { Search, Eye, CornerDownLeft, FileText, IndianRupee, Edit, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';
import { getSales, returnSale } from '../lib/db';

const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState(null);
  
  // Return form state
  const [returnItems, setReturnItems] = useState({});
  const [returnReason, setReturnReason] = useState('Customer Changed Mind');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = () => {
    const allSales = getSales();
    setSales(allSales.sort((a, b) => new Date(b.date) - new Date(a.date)));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.customerId && String(s.customerId).includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'returned' ? s.status === 'Returned' : s.status !== 'Returned');
    return matchesSearch && matchesStatus;
  });

  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openReturn = (sale) => {
    setReturnInvoice(sale);
    // Init return items
    const initItems = {};
    sale.items.forEach(i => {
      initItems[i.id] = 0; // Default 0 returned qty
    });
    setReturnItems(initItems);
    setShowReturnModal(true);
  };

  const handleReturnItemChange = (itemId, maxQty, value) => {
    const qty = Math.min(Math.max(0, Number(value)), maxQty);
    setReturnItems({ ...returnItems, [itemId]: qty });
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const itemsToReturn = returnInvoice.items.map(item => {
      const returningQty = returnItems[item.id] || 0;
      return { id: item.id, qty: returningQty };
    }).filter(i => i.qty > 0);

    if (itemsToReturn.length === 0) {
      alert('Select at least 1 item to return');
      return;
    }

    if (confirm('Process this return? Stock will be updated and refund recorded.')) {
      returnSale(returnInvoice.invoiceNo, itemsToReturn);
      alert('Return processed successfully!');
      setShowReturnModal(false);
      loadData();
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500">View past invoices and process sales returns.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-primary-600">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Invoices</p>
            <h3 className="text-xl font-bold text-slate-800">{sales.length}</h3>
          </div>
          <FileText className="text-slate-300" size={24} />
        </div>
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <h3 className="text-xl font-bold text-slate-800">
              ₹{sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}
            </h3>
          </div>
          <IndianRupee className="text-slate-300" size={24} />
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
            placeholder="Search by Invoice No..." 
            className="input-field pl-10"
          />
        </div>
        <div className="flex space-x-2">
          <input type="date" className="input-field text-sm" />
          <select 
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th className="text-right">Taxable</th>
                <th className="text-right">GST</th>
                <th className="text-right">Total</th>
                <th className="text-center">Payment</th>
                <th className="text-center">Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="font-medium text-primary-600">{sale.invoiceNo}</td>
                  <td>{new Date(sale.date).toLocaleString()}</td>
                  <td>{sale.customerId ? `Customer #${sale.customerId}` : 'Walk-in Customer'}</td>
                  <td className="text-right">₹{sale.taxableValue.toFixed(2)}</td>
                  <td className="text-right">₹{sale.taxAmount.toFixed(2)}</td>
                  <td className="text-right font-bold">₹{sale.total.toFixed(2)}</td>
                  <td className="text-center">
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">{sale.paymentMethod}</span>
                  </td>
                  <td className="text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'Returned' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sale.status || 'Completed'}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center items-center space-x-3 text-slate-400">
                      <button className="hover:text-primary-600" title="View/Print"><Eye size={18} /></button>
                      <button className="hover:text-primary-600" title="Edit"><Edit size={18} /></button>
                      <button className="hover:text-red-600" title="Delete"><Trash2 size={18} /></button>
                      <button 
                        className="hover:text-amber-600" 
                        title="Sales Return"
                        onClick={() => openReturn(sale)}
                      >
                        <CornerDownLeft size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-slate-500">No sales history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage}
          totalItems={filteredSales.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Return Modal */}
      {showReturnModal && returnInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReturnModal(false)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Sales Return - {returnInvoice.invoiceNo}</h2>
              <p className="text-sm text-slate-500 mt-1">Select items and quantities to return</p>
            </div>
            
            <div className="p-5 flex-1 overflow-auto">
              <form id="returnForm" onSubmit={handleReturnSubmit} className="space-y-4">
                <table className="data-table w-full mb-4 border border-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Sold Qty</th>
                      <th className="text-center">Already Ret.</th>
                      <th className="text-center">Return Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnInvoice.items.map(item => {
                      const maxRet = item.qty - (item.returnedQty || 0);
                      return (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td className="text-center">{item.qty}</td>
                          <td className="text-center text-slate-500">{item.returnedQty || 0}</td>
                          <td className="text-center">
                            <input 
                              type="number" 
                              min="0" 
                              max={maxRet}
                              disabled={maxRet === 0}
                              className="input-field py-1 text-center w-20 mx-auto"
                              value={returnItems[item.id]}
                              onChange={(e) => handleReturnItemChange(item.id, maxRet, e.target.value)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Return</label>
                  <select className="input-field" value={returnReason} onChange={e => setReturnReason(e.target.value)}>
                    <option>Customer Changed Mind</option>
                    <option>Damaged Product</option>
                    <option>Wrong Product</option>
                    <option>Wrong Size</option>
                    <option>Manufacturing Defect</option>
                    <option>Other</option>
                  </select>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-lg">
              <button type="button" onClick={() => setShowReturnModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" form="returnForm" className="btn-primary flex items-center">
                <CornerDownLeft size={16} className="mr-2" /> Process Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
