// Centralized LocalStorage Service

const initialCategories = [
  { id: 1, name: 'Cricket', description: 'Cricket gear and equipment', status: 'Active' },
  { id: 2, name: 'Tennis', description: 'Tennis balls and rackets', status: 'Active' },
  { id: 3, name: 'Footwear', description: 'Sports shoes and cleats', status: 'Active' },
  { id: 4, name: 'Football', description: 'Football gear', status: 'Active' },
  { id: 5, name: 'Badminton', description: 'Badminton rackets and shuttlecocks', status: 'Active' },
  { id: 6, name: 'Apparel', description: 'Sports clothing and jerseys', status: 'Active' },
  { id: 7, name: 'Basketball', description: 'Basketballs and accessories', status: 'Active' },
  { id: 8, name: 'Volleyball', description: 'Volleyballs', status: 'Active' },
  { id: 9, name: 'Fitness', description: 'Gym and fitness equipment', status: 'Active' },
  { id: 10, name: 'Accessories', description: 'Bags and general sports accessories', status: 'Active' }
];
const initialProducts = [
  { id: 1, sku: 'BAT-EW-001', name: 'Cricket Bat - English Willow', categoryId: 1, brand: 'SS', stock: 10, mrp: 5000, price: 4500, offerPrice: 4200, status: 'Active', tax: 18, minStock: 5 },
  { id: 2, sku: 'BALL-TN-06', name: 'Tennis Ball (Box of 6)', categoryId: 2, brand: 'Nivia', stock: 120, mrp: 650, price: 600, offerPrice: 550, status: 'Active', tax: 12, minStock: 10 },
  { id: 3, sku: 'SH-RN-42', name: 'Running Shoes Men UK 8', categoryId: 3, brand: 'Puma', stock: 8, mrp: 3999, price: 3500, offerPrice: 3200, status: 'Active', tax: 18, minStock: 2 },
  { id: 4, sku: 'GLV-CR-M', name: 'Batting Gloves Men Medium', categoryId: 1, brand: 'SG', stock: 2, mrp: 1200, price: 1050, offerPrice: null, status: 'Active', tax: 12, minStock: 5 },
  { id: 5, sku: 'FTB-S5-01', name: 'Football Size 5', categoryId: 4, brand: 'Nivia', stock: 25, mrp: 850, price: 750, offerPrice: 700, status: 'Active', tax: 12, minStock: 5 },
  { id: 6, sku: 'RKT-BD-01', name: 'Badminton Racket Carbon', categoryId: 5, brand: 'Yonex', stock: 15, mrp: 2500, price: 2100, offerPrice: 1950, status: 'Active', tax: 18, minStock: 3 },
  { id: 7, sku: 'HLM-CR-01', name: 'Cricket Helmet', categoryId: 1, brand: 'Shrey', stock: 5, mrp: 2200, price: 1900, offerPrice: null, status: 'Active', tax: 18, minStock: 2 },
  { id: 8, sku: 'JSY-BL-M', name: 'Sports Jersey Blue M', categoryId: 6, brand: 'Generic', stock: 40, mrp: 600, price: 450, offerPrice: 400, status: 'Active', tax: 5, minStock: 10 },
  { id: 9, sku: 'SHT-YL-01', name: 'Nylon Shuttlecocks (Box of 10)', categoryId: 5, brand: 'Yonex', stock: 50, mrp: 800, price: 700, offerPrice: null, status: 'Active', tax: 12, minStock: 10 },
  { id: 10, sku: 'BSK-S7-01', name: 'Basketball Size 7', categoryId: 7, brand: 'Spalding', stock: 12, mrp: 1500, price: 1200, offerPrice: 1100, status: 'Active', tax: 12, minStock: 3 },
  { id: 11, sku: 'VLB-S5-01', name: 'Volleyball Size 5', categoryId: 8, brand: 'Cosco', stock: 18, mrp: 950, price: 800, offerPrice: null, status: 'Active', tax: 12, minStock: 4 },
  { id: 12, sku: 'SCK-WT-01', name: 'Sports Socks (Pack of 3)', categoryId: 6, brand: 'Puma', stock: 60, mrp: 400, price: 300, offerPrice: null, status: 'Active', tax: 5, minStock: 15 },
  { id: 13, sku: 'GLV-GM-01', name: 'Gym Gloves', categoryId: 9, brand: 'Nivia', stock: 30, mrp: 500, price: 400, offerPrice: 350, status: 'Active', tax: 12, minStock: 5 },
  { id: 14, sku: 'BAG-GYM-01', name: 'Gym Duffle Bag', categoryId: 10, brand: 'Generic', stock: 20, mrp: 1200, price: 900, offerPrice: 850, status: 'Active', tax: 18, minStock: 5 },
  { id: 15, sku: 'MAT-YG-01', name: 'Yoga Mat 6mm', categoryId: 9, brand: 'Generic', stock: 0, mrp: 800, price: 650, offerPrice: null, status: 'Inactive', tax: 12, minStock: 5 }
];

const initialCustomers = [
  { id: 1, name: 'Walk-in Customer', phone: '', balance: 0 },
  { id: 2, name: 'Rahul Sharma', phone: '9876543210', balance: 500 },
  { id: 3, name: 'Priya Patel', phone: '9876543211', balance: 0 },
  { id: 4, name: 'Amit Kumar', phone: '9876543212', balance: 1200 },
  { id: 5, name: 'Sneha Gupta', phone: '9876543213', balance: 0 },
  { id: 6, name: 'Vikram Singh', phone: '9876543214', balance: 0 },
  { id: 7, name: 'Anjali Desai', phone: '9876543215', balance: 0 },
  { id: 8, name: 'Rohan Joshi', phone: '9876543216', balance: 0 },
  { id: 9, name: 'Neha Verma', phone: '9876543217', balance: 0 },
  { id: 10, name: 'Karan Malhotra', phone: '9876543218', balance: 0 }
];

const initialSuppliers = [
  { id: 1, name: 'SS Sports India', phone: '9998887770', balance: 5000 },
  { id: 2, name: 'Nivia Official Dist.', phone: '9998887771', balance: 0 },
  { id: 3, name: 'Yonex Wholesalers', phone: '9998887772', balance: 12000 },
  { id: 4, name: 'Puma Regional', phone: '9998887773', balance: 0 },
  { id: 5, name: 'Generic Goods Co.', phone: '9998887774', balance: 0 }
];

export const initDb = () => {
  const defaults = {
    products: initialProducts,
    categories: initialCategories,
    customers: initialCustomers,
    suppliers: initialSuppliers,
    sales: [],
    purchases: [],
    stockMovements: [],
    expenses: [],
    customerPayments: [],
    customerLedger: [],
    supplierPayments: [],
    supplierLedger: [],
    supplierLedger: [],
    purchaseReturns: [],
    appSettings: {
      store: {
        shopName: 'EVERYKADAI Sports',
        ownerName: '',
        phone: '9998887777',
        alternatePhone: '',
        email: 'hello@everykadai.com',
        website: '',
        address: '123 Market Street',
        city: 'Chennai',
        district: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        gstin: '',
        pan: '',
        businessType: 'Retail',
        logo: '/Every Kadai Logo.png'
      },
      invoice: {
        prefix: 'INV-',
        nextNumber: 1,
        template: 'Modern',
        showLogo: true,
        showAddress: true,
        showPhone: true,
        showGstin: true,
        showCustomerMobile: true,
        showCustomerGstin: false,
        showHsnSac: false,
        showDiscount: true,
        showGstBreakdown: true,
        showPaymentMethod: true,
        showTerms: true,
        footerMessage: 'Thank you for shopping with EVERYKADAI!',
        terms: 'Goods once sold cannot be returned without valid proof of purchase.'
      },
      gst: {
        registered: true,
        gstin: '',
        state: 'Tamil Nadu',
        type: 'Regular',
        taxRates: [0, 5, 12, 18, 28]
      },
      payments: {
        cash: true,
        upi: true,
        card: true,
        bank: true,
        credit: true,
        defaultMethod: 'Cash',
        upiId: 'everykadai@upi',
        creditEnabled: true,
        defaultCreditLimit: 10000
      },
      printer: {
        type: 'A4',
        defaultPrinter: 'System Default',
        autoPrint: true,
        printCustomerCopy: true,
        printDuplicateCopy: false,
        showPreview: true
      },
      general: {
        currency: '₹',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12 Hour',
        language: 'English',
        timezone: 'Asia/Kolkata',
        theme: 'Light',
        defaultPage: 'Dashboard',
        lowStockThreshold: 5,
        itemsPerPage: 10
      },
      security: {
        autoLogout: false,
        sessionTimeout: 'Never'
      }
    }
  };

  // Run a migration to add categories if missing, and update existing products
  if (!localStorage.getItem('categories')) {
    localStorage.setItem('categories', JSON.stringify(initialCategories));
    
    const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
    if (existingProducts.length > 0 && existingProducts[0].category !== undefined && !existingProducts[0].categoryId) {
      const migratedProducts = existingProducts.map(p => {
        const found = initialCategories.find(c => c.name === p.category);
        return { ...p, categoryId: found ? found.id : 1, minStock: p.minStock || 5 };
      });
      localStorage.setItem('products', JSON.stringify(migratedProducts));
    }
  }

  Object.keys(defaults).forEach(key => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaults[key]));
    }
  });

  // Init stock movements if empty but products exist
  const moves = JSON.parse(localStorage.getItem('stockMovements') || '[]');
  if (moves.length === 0) {
    const prods = JSON.parse(localStorage.getItem('products') || '[]');
    const initialMoves = prods.filter(p => p.stock > 0).map(p => ({
      id: Date.now() + Math.random(),
      date: new Date().toISOString(),
      productId: p.id,
      type: 'OPENING_STOCK',
      qty: p.stock,
      beforeStock: 0,
      afterStock: p.stock,
      reference: 'System Init'
    }));
    localStorage.setItem('stockMovements', JSON.stringify(initialMoves));
  }
};

initDb();

// Generic helper
const getTable = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const saveTable = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Categories
export const getCategories = () => getTable('categories');
export const saveCategories = (data) => saveTable('categories', data);

// Products
export const getProducts = () => {
  const products = getTable('products');
  const categories = getCategories();
  // Inject category name for backward compatibility and easy display
  return products.map(p => {
    const cat = categories.find(c => c.id === p.categoryId);
    return { ...p, category: cat ? cat.name : 'Unknown' };
  });
};
export const saveProducts = (data) => {
  // Strip the injected category name before saving to keep DB clean
  const cleanData = data.map(({ category, ...rest }) => rest);
  saveTable('products', cleanData);
};
export const getProduct = (id) => getProducts().find(p => p.id === id);

export const addProduct = (p) => {
  const products = getProducts();
  p.id = Date.now();
  saveProducts([p, ...products]);
  if (p.stock > 0) {
    addStockMovement({
      productId: p.id,
      type: 'OPENING_STOCK',
      qty: p.stock,
      beforeStock: 0,
      afterStock: p.stock,
      reference: 'Product Creation'
    });
  }
};

export const updateProductStock = (id, change, type, reference) => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index > -1) {
    const beforeStock = products[index].stock;
    products[index].stock += change;
    saveProducts(products);
    
    addStockMovement({
      productId: id,
      type,
      qty: change,
      beforeStock,
      afterStock: products[index].stock,
      reference
    });
  }
};

// Stock Movements
export const getStockMovements = () => getTable('stockMovements');
export const addStockMovement = (movement) => {
  const moves = getStockMovements();
  movement.id = movement.id || Date.now() + Math.random();
  movement.date = movement.date || new Date().toISOString();
  saveTable('stockMovements', [movement, ...moves]);
};

// Sales
export const getSales = () => getTable('sales');
export const saveSales = (data) => saveTable('sales', data);
export const addSale = (sale) => {
  const sales = getSales();
  sale.id = Date.now();
  sale.invoiceNo = `EK-${(sales.length + 1).toString().padStart(6, '0')}`;
  saveSales([sale, ...sales]);
  
  sale.items.forEach(item => {
    updateProductStock(item.id, -item.qty, 'SALE_OUT', sale.invoiceNo);
  });

  if (sale.amountReceived < sale.total && sale.customerId) {
    const creditAmount = sale.total - sale.amountReceived;
    updateCustomerBalance(sale.customerId, creditAmount);
    
    const customers = getCustomers();
    const c = customers.find(x => x.id === sale.customerId);
    
    addCustomerLedgerEntry({
      customerId: sale.customerId,
      type: 'Credit Sale',
      referenceId: sale.invoiceNo,
      description: `Credit Sale Invoice ${sale.invoiceNo}`,
      debit: creditAmount,
      credit: 0,
      balance: c ? (c.balance || 0) : creditAmount, // after updateCustomerBalance, c.balance is updated because updateCustomerBalance reads/writes DB but wait, c is loaded after. Actually it's better to fetch after update.
      date: new Date().toISOString()
    });
  }
  return sale;
};

export const returnSale = (invoiceNo, returnedItems) => {
  const sales = getSales();
  const sale = sales.find(s => s.invoiceNo === invoiceNo);
  if (!sale) return;

  returnedItems.forEach(ret => {
    const item = sale.items.find(i => i.id === ret.id);
    if (item) {
      item.returnedQty = (item.returnedQty || 0) + ret.qty;
      updateProductStock(item.id, ret.qty, 'SALES_RETURN', `Ret: ${invoiceNo}`);
    }
  });

  sale.status = 'Returned';
  saveSales(sales);
};

// Purchases
export const getPurchases = () => getTable('purchases');
export const savePurchases = (data) => saveTable('purchases', data);
export const addPurchase = (purchase) => {
  const purchases = getPurchases();
  purchase.id = Date.now();
  saveTable('purchases', [purchase, ...purchases]);
  
  purchase.items.forEach(item => {
    updateProductStock(item.id, item.qty, 'PURCHASE_IN', purchase.invoiceNo);
  });

  if (purchase.amountPaid < purchase.total && purchase.supplierId) {
    const creditAmount = purchase.total - purchase.amountPaid;
    updateSupplierBalance(purchase.supplierId, creditAmount);

    const suppliers = getSuppliers();
    const s = suppliers.find(x => x.id === purchase.supplierId);

    addSupplierLedgerEntry({
      supplierId: purchase.supplierId,
      type: 'Purchase',
      referenceId: purchase.invoiceNo,
      description: `Purchase Invoice ${purchase.invoiceNo}`,
      debit: 0,
      credit: creditAmount,
      balance: s ? (s.balance || 0) : creditAmount,
      date: new Date().toISOString()
    });
  }
  return purchase;
};

// Customers
export const getCustomers = () => getTable('customers');
export const saveCustomers = (data) => saveTable('customers', data);
export const updateCustomerBalance = (id, amount) => {
  const customers = getCustomers();
  const c = customers.find(c => c.id === id);
  if (c) {
    c.balance = (c.balance || 0) + amount;
    saveCustomers(customers);
  }
};

// Customer Payments
export const getCustomerPayments = () => getTable('customerPayments');
export const saveCustomerPayments = (data) => saveTable('customerPayments', data);
export const addCustomerPayment = (payment) => {
  const payments = getCustomerPayments();
  payment.id = Date.now() + Math.random();
  saveCustomerPayments([payment, ...payments]);
};

// Customer Ledger
export const getCustomerLedger = () => getTable('customerLedger');
export const saveCustomerLedger = (data) => saveTable('customerLedger', data);
export const addCustomerLedgerEntry = (entry) => {
  const ledger = getCustomerLedger();
  entry.id = Date.now() + Math.random();
  saveCustomerLedger([entry, ...ledger]);
};

// Suppliers
export const getSuppliers = () => getTable('suppliers');
export const saveSuppliers = (data) => saveTable('suppliers', data);
export const updateSupplierBalance = (id, amount) => {
  const suppliers = getSuppliers();
  const s = suppliers.find(s => s.id === id);
  if (s) {
    s.balance = (s.balance || 0) + amount;
    saveSuppliers(suppliers);
  }
};

// Supplier Payments
export const getSupplierPayments = () => getTable('supplierPayments');
export const saveSupplierPayments = (data) => saveTable('supplierPayments', data);
export const addSupplierPayment = (payment) => {
  const payments = getSupplierPayments();
  payment.id = Date.now() + Math.random();
  saveSupplierPayments([payment, ...payments]);
};

// Supplier Ledger
export const getSupplierLedger = () => getTable('supplierLedger');
export const saveSupplierLedger = (data) => saveTable('supplierLedger', data);
export const addSupplierLedgerEntry = (entry) => {
  const ledger = getSupplierLedger();
  entry.id = Date.now() + Math.random();
  saveSupplierLedger([entry, ...ledger]);
};

// Purchase Returns
export const getPurchaseReturns = () => getTable('purchaseReturns');
export const savePurchaseReturns = (data) => saveTable('purchaseReturns', data);
export const addPurchaseReturn = (pr) => {
  const returns = getPurchaseReturns();
  pr.id = Date.now() + Math.random();
  savePurchaseReturns([pr, ...returns]);
};

// Expenses
export const getExpenses = () => getTable('expenses');
export const saveExpenses = (data) => saveTable('expenses', data);
export const addExpense = (expense) => {
  const expenses = getExpenses();
  if (!expense.id) {
    const nextNum = expenses.length + 1;
    expense.id = `EXP-${nextNum.toString().padStart(5, '0')}`;
  }
  expense.createdAt = expense.createdAt || new Date().toISOString();
  saveExpenses([expense, ...expenses]);
  return expense;
};
export const updateExpense = (id, updatedData) => {
  const expenses = getExpenses();
  const index = expenses.findIndex(e => String(e.id) === String(id));
  if (index > -1) {
    expenses[index] = { ...expenses[index], ...updatedData, updatedAt: new Date().toISOString() };
    saveExpenses(expenses);
    return expenses[index];
  }
  return null;
};
export const deleteExpense = (id) => {
  const expenses = getExpenses();
  const filtered = expenses.filter(e => String(e.id) !== String(id));
  saveExpenses(filtered);
  return filtered;
};

// Services & Repairs
export const getServices = () => getTable('services');
export const saveServices = (data) => saveTable('services', data);
export const getNextServiceId = () => {
  const services = getServices();
  const nextNum = services.length + 1;
  return `SRV-${nextNum.toString().padStart(5, '0')}`;
};
export const addService = (service) => {
  const services = getServices();
  if (!service.id) {
    service.id = getNextServiceId();
  }
  service.createdAt = service.createdAt || new Date().toISOString();
  saveServices([service, ...services]);

  // Record initial payment if advance was paid
  if (Number(service.advancePaid) > 0) {
    addServicePayment({
      serviceId: service.id,
      amount: Number(service.advancePaid),
      paymentMethod: service.paymentMethod || 'Cash',
      date: service.dateReceived || new Date().toISOString().split('T')[0],
      type: 'Advance Payment',
      notes: 'Initial advance paid at service booking'
    });
  }
  return service;
};
export const updateService = (id, updatedData) => {
  const services = getServices();
  const index = services.findIndex(s => String(s.id) === String(id));
  if (index > -1) {
    services[index] = { ...services[index], ...updatedData, updatedAt: new Date().toISOString() };
    saveServices(services);
    return services[index];
  }
  return null;
};
export const deleteService = (id) => {
  const services = getServices();
  const filtered = services.filter(s => String(s.id) !== String(id));
  saveServices(filtered);
  // Also clean up payments associated with this service
  const payments = getServicePayments().filter(p => String(p.serviceId) !== String(id));
  saveServicePayments(payments);
  return filtered;
};

// Service Payments
export const getServicePayments = () => getTable('servicePayments');
export const saveServicePayments = (data) => saveTable('servicePayments', data);
export const addServicePayment = (payment) => {
  const payments = getServicePayments();
  payment.id = payment.id || Date.now() + Math.random();
  payment.date = payment.date || new Date().toISOString();
  saveServicePayments([payment, ...payments]);

  // Recalculate service advancePaid / balanceDue
  const services = getServices();
  const sIndex = services.findIndex(s => String(s.id) === String(payment.serviceId));
  if (sIndex > -1) {
    const s = services[sIndex];
    const allPaymentsForService = [payment, ...payments.filter(p => String(p.serviceId) === String(s.id))];
    const totalPaid = allPaymentsForService.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, Number(s.totalAmount || 0) - totalPaid);
    const paymentStatus = balanceDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
    services[sIndex] = {
      ...s,
      advancePaid: totalPaid,
      balanceDue,
      paymentStatus
    };
    saveServices(services);
  }
  return payment;
};

// Settings
export const getSettings = () => {
  const defaults = {
    store: {
      shopName: 'EVERYKADAI Sports',
      ownerName: '',
      phone: '9998887777',
      alternatePhone: '',
      email: 'hello@everykadai.com',
      website: '',
      address: '123 Market Street',
      city: 'Chennai',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      gstin: '',
      pan: '',
      businessType: 'Retail',
      logo: '/Every Kadai Logo.png'
    },
    invoice: {
      prefix: 'INV-',
      nextNumber: 1,
      template: 'Modern',
      showLogo: true,
      showAddress: true,
      showPhone: true,
      showGstin: true,
      showCustomerMobile: true,
      showCustomerGstin: false,
      showHsnSac: false,
      showDiscount: true,
      showGstBreakdown: true,
      showPaymentMethod: true,
      showTerms: true,
      footerMessage: 'Thank you for shopping with EVERYKADAI!',
      terms: 'Goods once sold cannot be returned without valid proof of purchase.'
    },
    gst: {
      registered: true,
      gstin: '',
      state: 'Tamil Nadu',
      type: 'Regular',
      taxRates: [0, 5, 12, 18, 28]
    },
    payments: {
      cash: true,
      upi: true,
      card: true,
      bank: true,
      credit: true,
      defaultMethod: 'Cash',
      upiId: 'everykadai@upi',
      creditEnabled: true,
      defaultCreditLimit: 10000
    },
    printer: {
      type: 'A4',
      defaultPrinter: 'System Default',
      autoPrint: true,
      printCustomerCopy: true,
      printDuplicateCopy: false,
      showPreview: true
    },
    general: {
      currency: '₹',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12 Hour',
      language: 'English',
      timezone: 'Asia/Kolkata',
      theme: 'Light',
      defaultPage: 'Dashboard',
      lowStockThreshold: 5,
      itemsPerPage: 10
    },
    security: {
      autoLogout: false,
      sessionTimeout: 'Never'
    }
  };
  const current = getTable('appSettings') || {};
  return { ...defaults, ...current, 
    store: { ...defaults.store, ...(current.store || {}) },
    invoice: { ...defaults.invoice, ...(current.invoice || {}) },
    gst: { ...defaults.gst, ...(current.gst || {}) },
    payments: { ...defaults.payments, ...(current.payments || {}) },
    printer: { ...defaults.printer, ...(current.printer || {}) },
    general: { ...defaults.general, ...(current.general || {}) },
    security: { ...defaults.security, ...(current.security || {}) }
  };
};
export const saveSettings = (settings) => saveTable('appSettings', settings);

// Reports Helpers
export const getDashboardMetrics = () => {
  const sales = getSales();
  const products = getProducts();
  const purchases = getPurchases();
  
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date.startsWith(today)).reduce((sum, s) => sum + s.total, 0);
  const todayPurchases = purchases.filter(p => p.date && p.date.startsWith(today)).reduce((sum, p) => sum + p.total, 0);
  
  const stockValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lowStock = products.filter(p => p.stock <= 5 && p.stock > 0).length;
  const outOfStock = products.filter(p => p.stock === 0).length;
  
  return { 
    todaySales, 
    todayPurchases,
    stockValue, 
    lowStock, 
    outOfStock,
    totalProducts: products.length 
  };
};
