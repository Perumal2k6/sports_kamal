# FRONTEND & BACKEND SPECIFICATIONS AND REQUIREMENTS

This document provides a comprehensive, page-by-page technical specification of the existing frontend codebase for the **EVERYKADAI / Sports Shop Billing Application**. It is created as a single source of truth for developing the backend APIs, database models, business logic, authorization rules, and data schemas.

---

## 1. System Overview & Frontend Architecture

### 1.1 Project Structure
- **Frontend Framework**: React 19 (`react`, `react-dom`) with Vite 8.
- **Routing**: `react-router-dom` v7.
- **Styling**: TailwindCSS 3.4 with custom utility classes (`card`, `btn-primary`, `btn-secondary`, `input-field`).
- **Icons**: `lucide-react`.
- **Charts**: `recharts` (BarChart, LineChart, PieChart).
- **Date Handling**: Native JavaScript `Date` and `date-fns` v4.

### 1.2 Current State of Backend Integration
- **Existing API Fetchers / Axios**: **None**. There are currently no active remote HTTP API calls (`fetch` or `axios`) made to an external backend server.
- **Current Data Layer**: All data persistence, query logic, and state management are presently handled synchronously and asynchronously via a local storage abstraction module located at [`src/lib/db.js`](file:///e:/company_projects/sport_shop/frontend/src/lib/db.js).
- **Authentication**: Client-side demo token check stored under `localStorage.getItem('authSession')`.
- **Proposed Backend Requirement**: Every data interaction documented in this specification represents a **proposed backend endpoint** (`Proposed backend endpoint`) necessary to migrate the frontend to a client-server architecture (e.g., FastAPI + PostgreSQL/SQLAlchemy backend).

---

## 2. Global Application Shell & Layout

### Page Information
- **Page / Shell Name**: Application Root & Dashboard Layout
- **Frontend Route / URL**: `/` (wrapper for all authenticated routes)
- **Source File Path**: [`src/App.jsx`](file:///e:/company_projects/sport_shop/frontend/src/App.jsx), [`src/components/Layout.jsx`](file:///e:/company_projects/sport_shop/frontend/src/components/Layout.jsx), [`src/components/Pagination.jsx`](file:///e:/company_projects/sport_shop/frontend/src/components/Pagination.jsx)
- **Purpose**: Provides authentication guards, persistent navigation sidebar, top app header (theme toggling, fullscreen, user profile popover, logout), and global toast/modal anchors.
- **Components Used**: `SidebarItem`, `Layout`, `Pagination`, `NavLink`, `Outlet`, `Navigate`.
- **Whether Login is Required**: Yes (`isAuthenticated = !!localStorage.getItem('authSession')`). Unauthenticated users are redirected to `/login`.
- **Roles or Permissions Checked**: Frontend displays user name `"Admin User"` and ID `"EMP-001"` (or `#001`), with hardcoded role `"Admin"`. No granular role checks are enforced in the client routes yet.

### Navigation Items in Sidebar
| Label | Target Route | Lucide Icon |
|---|---|---|
| Dashboard | `/dashboard` | `LayoutDashboard` |
| Billing / POS | `/billing` | `ShoppingCart` |
| Products | `/products` | `Tags` |
| Inventory | `/inventory` | `Package` |
| Purchases | `/purchases` | `Store` |
| Customers | `/customers` | `Users` |
| Suppliers | `/suppliers` | `Truck` |
| Services | `/services` | `Wrench` |
| Expenses | `/expenses` | `Receipt` |
| Reports | `/reports` | `FileText` |
| Settings | `/settings` | `Settings` |

### Top Navigation & Global Header Actions
| Button / Control | Location | Click Handler | Expected Behavior | API / Backend Requirement |
|---|---|---|---|---|
| Sidebar Toggle (Mobile) | Header (Left) | `setSidebarOpen(prev => !prev)` | Opens mobile drawer overlay | None (UI state) |
| Sidebar Collapse (Desktop) | Header (Left) | `setSidebarCollapsed(prev => !prev)` | Collapses sidebar from 256px to 80px (also shortcut `Ctrl+B`) | User preference sync (optional) |
| Theme Toggle | Header (Right) | `setTheme(theme === 'light' ? 'dark' : 'light')` | Toggles `.dark-theme` CSS class, saved in `localStorage.theme` | User profile theme preference |
| Fullscreen Toggle | Header (Right) | `toggleFullscreen()` | Requests / exits browser fullscreen mode | None (Browser API) |
| Profile Avatar Popover | Header (Right) | `setProfileOpen(!profileOpen)` | Displays user popover with user details and settings/logout links | None (UI state) |
| Settings Link | Profile Popover | `navigate('/settings')` | Redirects to Settings page | None |
| Logout Button | Profile Popover | `handleLogout()` | Removes `authSession` from `localStorage` and redirects to `/login` | `POST /api/v1/auth/logout` |

---

## 3. Page-by-Page Specifications

---

### Page 1: Login Page

#### Page Information
- **Page Name**: User Sign In
- **Frontend Route / URL**: `/login`
- **Source File Path**: [`src/pages/Login.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Login.jsx)
- **Purpose**: Authenticates system users (administrators, cashiers, technicians) to access the store application.
- **Components Used**: Controlled form inputs, password visibility toggle.
- **Whether Login is Required**: No (Public route).
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Username or Mobile | `username` | `text` | Yes (`required`) | `'admin'` | Non-empty string | User input | Must support querying user by `username`, `email`, or `phone_number`. |
| 2 | Password | `password` | `password` / `text` | Yes (`required`) | `'demo123'` | Non-empty string | User input | BCrypt/Argon2 password hash verification. |
| 3 | Remember me | `checkbox` (uncontrolled) | `checkbox` | No | `checked` | None | User input | Determines session JWT expiration time (e.g., 24h vs. 30 days). |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Toggle Password | Inside Password Field | `setShowPassword(!showPassword)` | Toggles input type between `text` and `password` | None | None | None (Client-side) |
| Contact Admin | Below Form | Link (`#`) | Informational anchor | None | None | Optional helpdesk link |
| Sign In | Form Submit Button | `handleLogin(e)` | Validates credentials, sets `authSession`, redirects to `/dashboard` | `Proposed: /api/v1/auth/login` | `POST` | Authenticate credentials, return Bearer token and user payload. |

#### C. Forms and Request Payloads
- **Submit Handler**: `handleLogin(e)`
- **Expected Request Payload**:
```json
{
  "username": "admin",
  "password": "demo123",
  "rememberMe": true
}
```
- **Expected Response Fields**:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Admin User",
    "role": "Admin",
    "email": "admin@everykadai.com"
  }
}
```
- **Error Handling**: Currently none in UI; backend must return HTTP 401 Unauthorized on invalid credentials.

#### D. Page Workflow
1. User lands on `/login`.
2. User enters username (or mobile number) and password.
3. User clicks "Sign In".
4. Frontend validates required fields.
5. On success, writes session tokens to storage and forces reload to `/dashboard`.

---

### Page 2: Dashboard

#### Page Information
- **Page Name**: Business Dashboard
- **Frontend Route / URL**: `/dashboard` (and `/`)
- **Source File Path**: [`src/pages/Dashboard.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Dashboard.jsx)
- **Purpose**: Centralized analytics hub providing KPIs, sales bar charts, recent bills, critical inventory alerts, top-selling products, business profit overview, and quick-action navigation.
- **Components Used**: `StatCard`, Recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Cell`), `Lucide icons`.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None enforced in frontend.

#### A. Every Field on the Page
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Global Date Range Filter | `globalRange` | `select` dropdown | No | `'Today'` | Valid date range option | Hardcoded options: `Today`, `Yesterday`, `This Week`, `Last Week`, `This Month`, `Last Month`, `This Year` | Backend analytics endpoint must accept `date_range` or `start_date` and `end_date` query params. |
| 2 | Weekly Sales Chart Range | `chartRange` | `select` dropdown | No | `'This Week'` | Valid range option | Hardcoded options: `This Week`, `Last Week`, `This Month`, `Last Month` | Chart timeseries endpoint with grouping bucket (`day` or `date`). |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Refresh Data | Top-right header | `loadData()` | Re-fetches sales, purchases, products, customers, expenses | `Proposed: /api/v1/dashboard/metrics` | `GET` | Refresh live aggregated metrics |
| View All Bills | Recent Bills header | `Link to="/sales-history"` | Navigates to `/sales-history` (or `/sales`) | None | None | None |
| Bill Card Click | Recent Bill item | `navigate('/sales-history')` | Navigates to sales history | None | None | None |
| View All Low Stock | Low Stock Card header | `Link to="/inventory"` | Navigates to `/inventory` | None | None | None |
| Low Stock Product Click | Low Stock item | `navigate('/inventory')` | Navigates to `/inventory` | None | None | None |
| View All Top Selling | Top Products header | `Link to="/reports"` | Navigates to `/reports` | None | None | None |
| Top Selling Product Click | Top Product item | `navigate('/reports')` | Navigates to `/reports` | None | None | None |
| New Bill | Quick Action | `Link to="/billing"` | Navigates to POS billing page | None | None | None |
| Add Product | Quick Action | `Link to="/products"` | Navigates to products page | None | None | None |
| Add Purchase | Quick Action | `Link to="/purchases"` | Navigates to purchases page | None | None | None |
| Add Customer | Quick Action | `Link to="/customers"` | Navigates to customers page | None | None | None |
| Out of Stock Alert Click | Notifications list | `navigate('/inventory')` | Filters inventory for out of stock | None | None | None |
| Low Stock Alert Click | Notifications list | `navigate('/inventory')` | Filters inventory for low stock | None | None | None |
| Pending Customers Alert | Notifications list | `navigate('/customers')` | Filters customers with pending credit | None | None | None |
| Pending Suppliers Alert | Notifications list | `navigate('/purchases')` | Filters purchases with pending supplier payables | None | None | None |

#### C. Every Table or Data Grid
1. **Recent Bills List**:
   - Headings/Fields: `sale.invoiceNo`, customer type (`customerId ? 'Registered' : 'Walk-in'`), `sale.total`, `sale.date`, `sale.paymentMethod`.
   - Data Source: Latest 5 records from `getSales()`.
2. **Low Stock Items List**:
   - Headings/Fields: `product.name`, `product.stock`, status badge (`OUT OF STOCK` for 0, `CRITICAL` for <= 2, `LOW STOCK` for <= 5).
   - Data Source: Products filtered where `stock <= 5`.
3. **Top Selling Products List**:
   - Headings/Fields: Rank `#`, `product.name`, total `qty sold`.
   - Data Source: Aggregate item sales frequency, top 5.
4. **Business Overview Breakdown**:
   - Rows: Sales Total (`₹`), Purchases Total (`₹`), Expenses Total (`₹`), Estimated Profit (`Sales - Purchases - Expenses`).

#### D. Dropdowns and Data Dependencies
- `globalRange`: Controls the KPI calculation for Sales, Purchases, Expenses, and Profit.
- `chartRange`: Re-aggregates the timeseries data for the bar chart.

#### E. Page Workflow
1. On component mount, `loadData()` queries data models.
2. Filter ranges are computed via `getRangeDates(globalRange)`.
3. KPI figures (revenue, active products, low stock items, stock inventory value) are rendered.
4. Sales timeseries is calculated and displayed in Recharts BarChart.
5. Notification badges trigger immediate deep linking to Inventory, Customers, or Purchases.

---

### Page 3: Billing / POS (Point of Sale)

#### Page Information
- **Page Name**: Point of Sale & Billing Terminal
- **Frontend Route / URL**: `/billing`
- **Source File Path**: [`src/pages/Billing.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Billing.jsx)
- **Purpose**: Fast checkout terminal for searching products, managing a live shopping cart, attaching registered/walk-in customers, applying product offer discounts, calculating GST (CGST/SGST), processing split payments (Cash, UPI, Credit), issuing invoices, and generating printable tax invoice receipts.
- **Components Used**: Split-screen POS layout, modal dialogue (`CheckCircle`, `Printer`), print-only media CSS stylesheet (`#print-section`).
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Product Search | `searchQuery` | `text` | No | `''` | Auto-matches Name or SKU (stock > 0) | User input / Products table | Fast full-text search index on SKU, barcode, and name. |
| 2 | Cart Item Quantity | `item.qty` | `number` (+ / - buttons) | Yes | `1` | Min 1, Max <= `product.stock` | User input | Server-side concurrency stock locking / reservation. |
| 3 | Customer Mobile | `customerMobile` | `text` | No (for Cash/UPI), Yes (for Credit) | `''` | Min 10 digits triggers lookup | User input | Customer lookup by phone number endpoint. |
| 4 | New Customer Name | `newCustomer.name` | `text` | Yes (if adding inline) | `''` | Non-empty | User input | Customer entity creation. |
| 5 | New Customer Mobile | `newCustomer.phone` | `text` | Yes (if adding inline) | Matches `customerMobile` | Valid phone format | User input | Unique constraint on mobile. |
| 6 | Payment Method | `paymentMethod` | Buttons / Tabs | Yes | `'UPI'` | `'UPI'`, `'Cash'`, `'Card'`, `'Bank'`, `'Credit'` | User selection | Enum field in payment schema. |
| 7 | UPI Amount | `amountReceived` | `number` | Yes (for UPI) | Auto-filled to `grandTotal` | Must exactly equal `grandTotal` to verify | User input | Payment transaction record. |
| 8 | Cash Received | `amountReceived` | `number` | Yes (for Cash) | `''` | Must be >= `grandTotal` | User input | Change calculation (`amountReceived - grandTotal`). |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Add to Cart | Search dropdown list | `addToCart(product)` | Appends product or increments `qty`; enforces available stock | None | None | Client state / Stock check |
| Decrement Qty | Cart row | `updateQty(id, qty - 1)` | Decreases qty (min 1) | None | None | Client state |
| Increment Qty | Cart row | `updateQty(id, qty + 1)` | Increases qty up to stock | None | None | Client state |
| Remove Item | Cart row | `removeItem(id)` | Deletes row from cart | None | None | Client state |
| + Add (Customer) | Customer section | `setShowAddCustomer(true)` | Expands inline customer creation form | None | None | Client state |
| Cancel Add Customer | Inline form | `setShowAddCustomer(false)` | Dismisses inline customer form | None | None | Client state |
| Save Customer | Inline form | `handleSaveCustomer()` | Validates, creates new customer, auto-selects | `Proposed: /api/v1/customers/` | `POST` | Customer creation API |
| Payment Method Buttons | Payment section | `setPaymentMethod(method)` | Switches mode (Cash, UPI); resets verification | None | None | Client state |
| Verify Payment | UPI section | `handleConfirmPayment()` | Confirms UPI amount matches total | None | None | Client state (or UPI webhook) |
| Confirm Bill | Bottom right checkout panel | `completeSale()` | Validates credit limit / cash received, deducts stock, creates sale, creates customer ledger entry if credit, shows success modal | `Proposed: /api/v1/sales/` | `POST` | Atomic database transaction creating sale invoice, sale items, deducting stock movements, and logging credit ledger. |
| Print Bill | Success Modal | `window.print()` | Opens browser print dialog targeting `#print-section` | None | None | Printable PDF / HTML invoice generation. |
| New Bill | Success Modal | `resetBilling()` | Clears cart, customer, payment, closes modal | None | None | Ready for next sale. |

#### C. Every Table or Data Grid
1. **POS Shopping Cart Grid**:
   - Columns: `#`, `Product` (name, offer savings badge), `Price` (strikethrough MRP if offer active, effective price), `Qty` (stepper), `GST` (`tax %`), `Total` (`effPrice * qty`), `Actions` (Delete icon).
2. **Print Invoice Template Table** (`#print-section`):
   - Header: Shop name (`EVERYKADAI`), store address, contact, GSTIN (`33ABCDE1234F1Z5`), Tax Invoice title.
   - Customer Details: Name, phone, invoice number, date, time.
   - Line Items: Product name, SKU, Qty, MRP, Offer rate, Net rate, GST %, Line Amount.
   - Summary: Subtotal, Discount/Savings, Taxable Amount, CGST, SGST, Grand Total, Payment Method & Status.

#### D. Forms and Request Payloads
- **Invoice Submit Handler**: `completeSale()`
- **Validation Rules**:
  - Cart cannot be empty.
  - If `paymentMethod === 'Credit'`, customer must be registered (not "Walk-in"), active, and `(current_balance + grandTotal) <= creditLimit`.
  - If `paymentMethod === 'Cash'`, `amountReceived >= grandTotal`.
  - If `paymentMethod === 'UPI'`, payment must be verified (`paymentConfirmed === true`).
- **Expected Request Payload (`POST /api/v1/sales/`)**:
```json
{
  "customerId": 2,
  "date": "2026-10-14T07:30:00.000Z",
  "paymentMethod": "UPI",
  "amountReceived": 4200.00,
  "taxableValue": 3559.32,
  "taxAmount": 640.68,
  "cgst": 320.34,
  "sgst": 320.34,
  "total": 4200.00,
  "items": [
    {
      "productId": 1,
      "sku": "BAT-EW-001",
      "name": "Cricket Bat - English Willow",
      "qty": 1,
      "mrp": 5000.00,
      "price": 4500.00,
      "offerPrice": 4200.00,
      "effectivePrice": 4200.00,
      "tax": 18
    }
  ]
}
```
- **Expected Response Fields**:
```json
{
  "id": 1728900000000,
  "invoiceNo": "EK-000015",
  "customerId": 2,
  "total": 4200.00,
  "paymentStatus": "Paid",
  "createdAt": "2026-10-14T07:30:00.000Z"
}
```

#### E. Page Workflow
1. Cashier searches product by name, SKU, or scans barcode.
2. Clicking search result adds item to cart with effective pricing (checks `offerPrice || price`).
3. Cashier adjusts quantity; stock limit validation prevents over-selling.
4. Cashier enters customer mobile. If customer exists, details are loaded; if not, cashier can quickly create them inline.
5. Cart computes Taxable Value, CGST (50% of GST), SGST (50% of GST), and Grand Total.
6. Cashier selects payment method. For Cash, change is calculated. For Credit, credit limit is verified against balance.
7. Cashier clicks "Confirm Bill".
8. Backend records the sale invoice, decrements inventory stock (`type: 'SALE_OUT'`), and if credit is involved, increments customer balance and records customer ledger entry (`type: 'Credit Sale'`).
9. Success modal appears with option to print standard invoice.

---

### Page 4: Products Management

#### Page Information
- **Page Name**: Product Catalog & Categories
- **Frontend Route / URL**: `/products`
- **Source File Path**: [`src/pages/Products.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Products.jsx)
- **Purpose**: Comprehensive product inventory management, price configuration, category creation and hierarchy, stock threshold alerts, and product activation/deactivation.
- **Components Used**: Data table, `Pagination`, Modal forms (`Add/Edit Product`, `Product Details View`, `Category Management`, `Add/Edit Category`, `Confirmation Dialog`), Toast notification.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### 1. Add / Edit Product Form (`productForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Product Name | `productForm.name` | `text` | Yes | `''` | Non-empty string | User input | String column (max 255), indexed. |
| 2 | Category | `productForm.categoryId` | `select` | Yes | `''` | Must match valid category `id` | Categories table | Foreign Key to `categories.id`. |
| 3 | SKU | `productForm.sku` | `text` | Yes | `''` | Unique identifier string | User input | Unique constraint, indexed. |
| 4 | Barcode | `productForm.barcode` | `text` | No | `''` | Alphanumeric barcode | User input | Optional unique barcode string. |
| 5 | Brand | `productForm.brand` | `text` | No | `''` | Brand name string | User input | Brand column, indexed. |
| 6 | Unit | `productForm.unit` | `select` | No | `'Pcs'` | Options: `Pcs`, `Kgs`, `Box`, `Pair` | Hardcoded select | Unit string. |
| 7 | MRP | `productForm.mrp` | `number` (step 0.01) | Yes | `''` | Must be >= `price` | User input | Decimal/Numeric(10,2). |
| 8 | Selling Price | `productForm.price` | `number` (step 0.01) | Yes | `''` | Must be <= `mrp` | User input | Decimal/Numeric(10,2). |
| 9 | Offer Price | `productForm.offerPrice` | `number` (step 0.01) | No | `''` | If provided: > 0 and <= `price` | User input | Nullable Decimal/Numeric(10,2). |
| 10 | GST % | `productForm.tax` | `select` | Yes | `'18'` | Options: `0`, `5`, `12`, `18`, `28` | Hardcoded select | Integer/SmallInt tax percentage. |
| 11 | HSN Code | `productForm.hsnCode` | `text` | No | `''` | Valid tax HSN string | User input | Optional string column. |
| 12 | Current / Opening Stock | `productForm.stock` | `number` | Yes | `''` | Integer >= 0 | User input | Integer quantity. Triggers `OPENING_STOCK` movement on creation. |
| 13 | Minimum Stock Alert | `productForm.minStock` | `number` | No | `'5'` | Integer >= 0 | User input | Threshold for low stock alarms. |
| 14 | Status | `productForm.status` | `select` | No | `'Active'` | Options: `'Active'`, `'Inactive'` | Hardcoded select | Enum/String status flag. |

##### 2. Add / Edit Category Form (`categoryForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Category Name | `categoryForm.name` | `text` | Yes | `''` | Non-empty, unique | User input | Unique category name. |
| 2 | Description | `categoryForm.description` | `textarea` | No | `''` | None | User input | Text column. |
| 3 | Status | `categoryForm.status` | `select` | No | `'Active'` | `'Active'`, `'Inactive'` | Hardcoded select | Status enum. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Manage Categories | Page Header | `setShowCategoryManage(true)` | Opens category management modal | `Proposed: /api/v1/categories/` | `GET` | List all categories with product counts. |
| Add Product | Page Header | `openAddProduct()` | Clears form, opens Add Product modal | None | None | Client state |
| Search Input | Filter Bar | `setSearchQuery(e.target.value)` | Filters table by Name, SKU, Barcode, Brand | `Proposed: /api/v1/products/?q=...` | `GET` | Full text search param. |
| Filter Dropdowns | Filter Bar | `setCategoryFilter`, `setStockFilter`, `setOfferFilter`, `setStatusFilter` | Multi-criteria client/server filtering | `Proposed: /api/v1/products/` | `GET` | Query parameters for category, stock status, offer, active status. |
| Activate / Deactivate Toggle | Table Row Action | `toggleProductStatus(product)` | Switches status between `Active` and `Inactive` | `Proposed: /api/v1/products/{id}/status` | `PATCH` | Toggle status endpoint. |
| View Details | Table Row Action | `setViewingProduct(product); setShowProductView(true)` | Opens detailed product view modal | `Proposed: /api/v1/products/{id}` | `GET` | Product detail endpoint. |
| Edit Product | Table Row Action | `openEditProduct(product)` | Loads product into modal form for updating | `Proposed: /api/v1/products/{id}` | `PUT` | Update product endpoint. |
| Delete Product | Table Row Action | `deleteProduct(id)` | If product has transaction history, blocks hard delete and prompts Deactivate; otherwise prompts hard delete confirmation | `Proposed: /api/v1/products/{id}` | `DELETE` | Check foreign key relations (sales, purchases). Hard delete if none, soft delete/deactivate if in use. |
| Add Category | Category Modal Header | `openAddCategory()` | Opens Category creation modal | None | None | Client state |
| Edit Category | Category Table Row | `openEditCategory(cat)` | Opens Category edit modal | `Proposed: /api/v1/categories/{id}` | `PUT` | Update category endpoint. |
| Delete Category | Category Table Row | `deleteCategory(id)` | Validates whether products are assigned; blocks delete if count > 0; confirms deletion otherwise | `Proposed: /api/v1/categories/{id}` | `DELETE` | Enforce integrity check before category deletion. |

#### C. Every Table or Data Grid
1. **Products Catalog Grid**:
   - Columns: `Image` (placeholder icon), `Product Details` (Name, SKU, Brand), `Category` (Name), `Stock` (color-coded count), `Pricing` (MRP with strikethrough, Selling Price or Offer badge), `GST %`, `Status` (Active/Inactive badge), `Actions` (Power, View, Edit, Delete).
   - Pagination: Defaults to 10 items/page, adjustable to 25, 50, 100.
2. **Category Management Data Grid**:
   - Columns: `Category Name` & Description, `Products` (count badge), `Status` (Active/Inactive), `Actions` (Edit, Delete).

#### D. Forms and Request Payloads
- **Add Product Submit Handler**: `handleProductSubmit(e)`
- **Request Payload (`POST /api/v1/products/`)**:
```json
{
  "name": "Cricket Bat - English Willow",
  "sku": "BAT-EW-001",
  "barcode": "8901234567890",
  "categoryId": 1,
  "brand": "SS",
  "unit": "Pcs",
  "mrp": 5000.00,
  "price": 4500.00,
  "offerPrice": 4200.00,
  "tax": 18,
  "hsnCode": "9506",
  "stock": 10,
  "minStock": 5,
  "status": "Active"
}
```

#### E. Page Workflow
1. Page loads product list and categories.
2. User filters or searches products.
3. Adding a product checks: `mrp >= price`, and `offerPrice <= price`.
4. On creation, initial stock > 0 triggers an automated opening stock log in stock movements.
5. Deletion enforces referential integrity: items existing in sales or purchase lines cannot be deleted and must be deactivated instead.

---

### Page 5: Inventory Management

#### Page Information
- **Page Name**: Stock & Inventory Control
- **Frontend Route / URL**: `/inventory`
- **Source File Path**: [`src/pages/Inventory.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Inventory.jsx)
- **Purpose**: Stock level tracking, real-time inventory valuation, manual stock adjustments with audit reasons, and comprehensive chronological stock movement history.
- **Components Used**: KPI metrics cards, advanced table, `Pagination`, Modal forms (`Stock Details View`, `Adjust Stock`, `Stock Movement History`, `Confirmation Dialog`), Toast notifications.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### Stock Adjustment Form (`adjustForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Current Stock | Display only | Text / Number | N/A | `activeProduct.stock` | Readonly | Active Product | Current stock quantity. |
| 2 | Adjustment Type | `adjType` | `select` | Yes | `'Add Stock'` | Options: `'Add Stock'`, `'Remove Stock'`, `'Set Stock'` | Hardcoded select | Dictates stock delta calculation. |
| 3 | Quantity | `adjQty` | `number` | Yes | `''` | Min 0. If `'Remove Stock'`, cannot exceed `activeProduct.stock` | User input | Positive numeric adjustment amount. |
| 4 | Reason | `adjReason` | `select` | Yes | `'Manual Correction'` | Options: `Manual Correction`, `Purchase`, `Sales Return`, `Damage`, `Lost`, `Other` | Hardcoded select | Audit trail reason code. |
| 5 | Notes | `adjNotes` | `text` | No | `''` | Optional details | User input | Free text remarks. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| View Stock Details | Table Row Action | `openView(product)` | Displays complete stock breakdown and lifetime movement totals | `Proposed: /api/v1/inventory/{id}/details` | `GET` | Aggregate lifetime purchased, sold, returned, adjusted quantities. |
| Adjust Stock | Table Row Action | `openAdjust(product)` | Opens stock adjustment dialog | None | None | Client state |
| Review Changes | Adjustment Step 1 | `handleAdjustNext(e)` | Validates quantity, switches to Step 2 confirmation view | None | None | Client state validation |
| Confirm Adjustment | Adjustment Step 2 | `handleAdjustSubmit()` | Applies delta to product stock, creates stock movement log | `Proposed: /api/v1/inventory/{id}/adjust` | `POST` | Atomically adjust inventory and create `stock_movement` entry. |
| Stock History | Table Row Action | `openHistory(product)` | Opens chronological stock ledger for the product | `Proposed: /api/v1/inventory/{id}/movements` | `GET` | Returns history sorted newest first. |
| Delete / Deactivate | Table Row Action | `deleteProduct(id)` | Verifies transaction existence; prompts deactivation or deletion | `Proposed: /api/v1/products/{id}` | `DELETE` | Enforces referential checks. |

#### C. Every Table or Data Grid
1. **Inventory Summary Table**:
   - Columns: `Product & SKU`, `Category`, `Stock` (Quantity), `Selling Price` (with offer price if active), `Stock Value` (`stock * price`), `Status` (`In Stock`, `Low Stock`, `Out of Stock`, `Inactive`), `Actions` (View, Adjust, History, Delete).
2. **Stock Movement History Table** (Inside Modal):
   - Columns: `Date & Time`, `Type` badge (`SALE`, `PURCHASE`, `RETURN`, `ADJUSTMENT`, `OPENING STOCK`), `Previous Stock` (`beforeStock`), `Movement` (`+qty` or `-qty`), `New Stock` (`afterStock`), `Reference / Reason` (Invoice No, Return No, or reason string).

#### D. Page Workflow
1. User filters inventory by Category or Status (`In Stock`, `Low Stock`, `Out of Stock`, `Inactive`).
2. To adjust stock, user opens modal, selects adjustment type (`Add`, `Remove`, `Set`), enters quantity and reason.
3. System shows a 2-step verification modal displaying: Current Stock -> Adjustment Delta -> New Stock.
4. On confirmation, backend creates a record in `stock_movements` and updates `products.stock`.
5. Historical view provides full auditability of all inward/outward transactions.

---

### Page 6: Sales History & Returns

#### Page Information
- **Page Name**: Sales Invoices & Sales Returns
- **Frontend Route / URL**: `/sales`
- **Source File Path**: [`src/pages/SalesHistory.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/SalesHistory.jsx)
- **Purpose**: Historical sales invoice journal, invoice inspection, and processing partial or full sales returns with automated inventory restock.
- **Components Used**: Data table, `Pagination`, Modal form (`Sales Return Form`).
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### Sales Return Form (`returnForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Invoice Items | `returnItems[itemId]` | `number` | Yes (at least 1 item > 0) | `0` | Min 0, Max <= `(item.qty - returnedQty)` | Invoice Items list | Validates remaining eligible return quantity. |
| 2 | Reason for Return | `returnReason` | `select` | Yes | `'Customer Changed Mind'` | Options: `Customer Changed Mind`, `Damaged Product`, `Wrong Product`, `Wrong Size`, `Manufacturing Defect`, `Other` | Hardcoded select | Audit trail reason. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Search Invoices | Header Filter | `setSearchQuery(e.target.value)` | Filters invoices by invoice number or customer ID | `Proposed: /api/v1/sales/?q=...` | `GET` | Search endpoint. |
| Status Filter | Header Filter | `setStatusFilter(e.target.value)` | Filters by `all`, `completed`, `returned` | `Proposed: /api/v1/sales/?status=...` | `GET` | Status filter param. |
| View / Print Invoice | Table Row Action | Anchor / Button | Opens invoice preview | `Proposed: /api/v1/sales/{id}` | `GET` | Fetch sale details. |
| Sales Return | Table Row Action | `openReturn(sale)` | Opens return modal with item quantity inputs | None | None | Client state |
| Process Return | Return Modal Submit | `handleReturnSubmit(e)` | Restocks returned product quantities (`SALES_RETURN`), updates sale status to `Returned`, updates customer balance if applicable | `Proposed: /api/v1/sales/{invoiceNo}/returns` | `POST` | Atomic return transaction restocking inventory and logging return. |

#### C. Every Table or Data Grid
1. **Sales Invoices Table**:
   - Columns: `Invoice No`, `Date`, `Customer`, `Taxable` (`taxableValue`), `GST` (`taxAmount`), `Total` (`total`), `Payment` (`paymentMethod`), `Status` (`Completed`, `Returned`), `Actions` (View/Print, Edit, Delete, Return).
2. **Sales Return Item Stepper Table**:
   - Columns: `Product`, `Sold Qty`, `Already Ret.`, `Return Qty` (bounded numeric input).

#### D. Page Workflow
1. Cashier views all completed sales sorted newest first.
2. When customer requests a return, cashier clicks the Return button.
3. System loads invoice items and previously returned quantities.
4. Cashier inputs returned quantities for each item and selects reason.
5. On submit, backend updates product stock (`+qty` via `SALES_RETURN`), increments `item.returnedQty`, and marks invoice as `Returned`.

---

### Page 7: Purchases Management

#### Page Information
- **Page Name**: Purchase Orders & Supplier Inward Invoices
- **Frontend Route / URL**: `/purchases`
- **Source File Path**: [`src/pages/Purchases.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Purchases.jsx)
- **Purpose**: Manages supplier purchase invoices, goods received inward, product stock increases, purchase line item discounts and GST, supplier accounts payable balances, and recording supplier bill payments.
- **Components Used**: KPI cards, multi-column search & filter bar, dynamic multi-item invoice builder modal, Purchase View modal, Supplier Payment modal, Add Supplier inline modal, `Pagination`, Confirmation dialog.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### 1. Create / Edit Purchase Invoice Form (`purchaseForm` & `purchaseItems`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Supplier | `purchaseForm.supplierId` | `select` | Yes | `''` | Valid supplier `id` | Suppliers table | Foreign Key to `suppliers.id`. |
| 2 | Invoice Date | `purchaseForm.date` | `date` | Yes | Current date | Valid YYYY-MM-DD | User input | Date / Timestamp column. |
| 3 | Invoice Number | `purchaseForm.invoiceNo` | `text` | Yes | Auto-generated (`PUR-000001`) | Non-empty string | User input / Generated | Supplier invoice number / bill reference. |
| 4 | Product Search | `itemSearch` | `text` | No | `''` | Filters products for selection | User input | Product search endpoint. |
| 5 | Purchase Item Qty | `item.quantity` | `number` | Yes | `1` | Integer > 0 | User input | Inward quantity. |
| 6 | Purchase Rate | `item.purchaseRate` | `number` (step 0.01) | Yes | Auto-filled (e.g. `price * 0.7`) | Numeric >= 0 | User input | Cost price per unit. |
| 7 | Item Discount | `item.discount` | `number` (step 0.01) | No | `0` | Numeric >= 0 | User input | Line discount amount. |
| 8 | Item GST % | `item.gstPercent` | `select` | Yes | Matched from product tax | `0`, `5`, `12`, `18`, `28` | Product tax | Tax rate. |
| 9 | Amount Paid | `purchaseForm.amountPaid` | `number` (step 0.01) | No | `''` | Numeric >= 0, <= Grand Total | User input | Cash/Bank paid at time of invoice. |
| 10 | Payment Method | `purchaseForm.paymentMethod` | `select` | Yes | `'Cash'` | Options: `Cash`, `UPI`, `Card`, `Bank Transfer` | Hardcoded select | Payment mode. |
| 11 | Reference No | `purchaseForm.paymentReference` | `text` | No | `''` | None | User input | Bank / Cheque / UTR reference. |

##### 2. Record Payment Modal (`paymentForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Payment Amount | `paymentForm.amount` | `number` | Yes | Current outstanding | Min 1, Max <= `outstandingAmount` | Calculated | Payment amount towards purchase. |
| 2 | Payment Method | `paymentForm.method` | `select` | Yes | `'Cash'` | Options: `Cash`, `UPI`, `Card`, `Bank Transfer` | Hardcoded select | Mode of payment. |
| 3 | Reference No | `paymentForm.reference` | `text` | No | `''` | None | User input | UTR / Cheque reference. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Add Purchase | Page Header | `openAddPurchase()` | Opens purchase creator modal with prefilled invoice ID | None | None | Client state |
| User Plus Icon | Purchase Modal Header | `setShowAddSupplier(true)` | Opens inline Add Supplier modal | None | None | Client state |
| Add Product to Purchase | Product Search Dropdown | `addProductToPurchase(p)` | Appends line item with default rate & tax | None | None | Client state |
| Remove Item | Line item row | `removePurchaseItem(idx)` | Deletes line item from purchase | None | None | Client state |
| Save Purchase | Purchase Modal Footer | `handlePurchaseSubmit(e)` | Validates, increases product stock, updates supplier outstanding balance, creates supplier ledger entry | `Proposed: /api/v1/purchases/` | `POST` | Atomic transaction updating purchase, purchase items, inventory movements, and supplier ledger. |
| Edit Purchase | Table Row Action | `openEdit(purchase)` | Reverses prior stock & ledger effects, loads purchase into form for re-saving | `Proposed: /api/v1/purchases/{id}` | `PUT` | Atomic edit transaction with reversal audit. |
| Delete Purchase | Table Row Action | `triggerDelete(purchase)` | Prompts destructive warning; reverses stock, reverses ledger, removes purchase record | `Proposed: /api/v1/purchases/{id}` | `DELETE` | Atomic deletion & stock rollback. |
| Record Payment | Table Row Action | `openPayment(purchase)` | Opens payment modal for outstanding bills | `Proposed: /api/v1/purchases/{id}/payments` | `POST` | Supplier payment endpoint. |
| View Details | Table Row Action | `openView(purchase)` | Displays complete itemized purchase summary | `Proposed: /api/v1/purchases/{id}` | `GET` | Purchase details endpoint. |

#### C. Every Table or Data Grid
1. **Purchases Journal Grid**:
   - Columns: `Invoice No`, `Supplier` (name, mobile), `Date`, `Items` (count), `Total Amount`, `Paid`, `Outstanding`, `Status` (`Paid`, `Partial`, `Credit`), `Actions` (Record Payment, View, Edit, Delete).
2. **Purchase Items Multi-Row Entry Table**:
   - Columns: `#`, `Product & SKU`, `Qty *`, `Pur. Rate *`, `Disc`, `GST %`, `Taxable` (computed), `GST Amt` (computed), `Total` (computed), `Delete` action.

#### D. Page Workflow
1. User clicks "Add Purchase".
2. Selects supplier (or creates one inline without leaving the modal).
3. Searches and adds products.
4. Inputs purchase rate and quantity for each item; tax and totals auto-calculate.
5. If partial payment is made, user enters Amount Paid.
6. On submission, backend stores purchase, creates `stock_movements` with `type: 'PURCHASE_IN'`, increments supplier balance by outstanding amount, and creates a Credit entry in `supplier_ledger`.
7. Later, user can click Record Payment to pay off the outstanding bill.

---

### Page 8: Customers Management & Ledger

#### Page Information
- **Page Name**: Customer Master & Ledger (Customer 360)
- **Frontend Route / URL**: `/customers`
- **Source File Path**: [`src/pages/Customers.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Customers.jsx)
- **Purpose**: Customer directory, contact directory, credit limits, opening balance setup, recording credit repayments, and viewing Customer 360 profile with dedicated tabs for Sales history, Direct Payments history, and Account Statement Ledger.
- **Components Used**: KPI cards, multi-tab drawer modal (`Overview`, `Sales`, `Payments`, `Ledger`), Record Payment modal, Add/Edit modal, Confirmation dialog, `Pagination`.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### Add / Edit Customer Form (`customerForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Customer Name | `customerForm.name` | `text` | Yes | `''` | Non-empty string | User input | String (max 255), indexed. |
| 2 | Mobile Number | `customerForm.mobile` | `text` | Yes (on create) | `''` | Min 10 digits; unique | User input | Unique constraint on phone. |
| 3 | Alternate Mobile | `customerForm.alternateMobile` | `text` | No | `''` | Optional phone | User input | String column. |
| 4 | Email | `customerForm.email` | `email` | No | `''` | Email format | User input | Nullable email column. |
| 5 | Date of Birth | `customerForm.dob` | `date` | No | `''` | Date format | User input | Optional date column. |
| 6 | Gender | `customerForm.gender` | `select` | No | `'Male'` | Options: `Male`, `Female`, `Other` | Hardcoded select | String / Enum column. |
| 7 | Address | `customerForm.address` | `text` | No | `''` | Address text | User input | Text column. |
| 8 | City | `customerForm.city` | `text` | No | `''` | City name | User input | String column. |
| 9 | State | `customerForm.state` | `text` | No | `''` | State name | User input | String column. |
| 10 | Pincode | `customerForm.pincode` | `text` | No | `''` | Postal code | User input | String column. |
| 11 | GSTIN | `customerForm.gstin` | `text` | No | `''` | Optional customer GST | User input | String column. |
| 12 | Credit Limit (₹) | `customerForm.creditLimit` | `number` | No | `''` | Numeric >= 0 | User input | Credit boundary enforced at POS. |
| 13 | Opening Balance (₹)| `customerForm.openingBalance` | `number` | No (create only) | `''` | Numeric >= 0 | User input | Initial debit in customer ledger. |
| 14 | Status | `customerForm.status` | `select` | No | `'Active'` | `'Active'`, `'Inactive'` | Hardcoded select | Status flag. |
| 15 | Notes | `customerForm.notes` | `textarea` | No | `''` | Remarks | User input | Text column. |

##### Record Customer Payment Form (`paymentForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Payment Amount | `paymentForm.amount` | `number` | Yes | `activeCustomer.balance` | Min 1, Max <= `activeCustomer.balance` | Active Customer | Amount cannot exceed debt. |
| 2 | Date | `paymentForm.date` | `date` | Yes | Current date | Valid date | User input | Date of payment. |
| 3 | Method | `paymentForm.method` | `select` | Yes | `'Cash'` | `Cash`, `UPI`, `Card`, `Bank Transfer` | Hardcoded select | Payment mode. |
| 4 | Reference No | `paymentForm.reference` | `text` | No | `''` | None | User input | UTR / Receipt code. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Add Customer | Page Header | `openAddModal()` | Opens Customer creation dialog | None | None | Client state |
| Search Filter | Header Filter | `setSearchQuery(e.target.value)` | Searches by Name, Mobile, or Customer ID | `Proposed: /api/v1/customers/?q=...` | `GET` | Search endpoint. |
| Status Filter | Header Filter | `setStatusFilter(e.target.value)` | Filters by `active`, `inactive`, `credit`, `no_outstanding`, `over_limit` | `Proposed: /api/v1/customers/?status=...` | `GET` | Status query params. |
| Record Payment | Table Row Action | `openPaymentModal(c)` | Opens modal to record customer debt payment | `Proposed: /api/v1/customers/{id}/payments` | `POST` | Payment recording endpoint. |
| View Customer 360 | Table Row Action | `openViewModal(c)` | Opens Customer 360 profile with tabs: Overview, Sales, Payments, Ledger | `Proposed: /api/v1/customers/{id}/360` | `GET` | Composite 360 endpoint. |
| Edit Customer | Table Row Action | `openEditModal(c)` | Opens modal to update customer details | `Proposed: /api/v1/customers/{id}` | `PUT` | Update customer endpoint. |
| Delete Customer | Table Row Action | `triggerDelete(c)` | If customer has transaction history, prompts Deactivate; otherwise allows deletion | `Proposed: /api/v1/customers/{id}` | `DELETE` | Integrity check on customer sales/payments. |
| Print Statement | Customer 360 Ledger Tab | `window.print()` | Opens print dialog for customer statement | None | None | Account statement print view. |

#### C. Every Table or Data Grid
1. **Customer Master Table**:
   - Columns: `ID`, `Customer` (name, email), `Mobile`, `Total Purchases` (computed sum), `Outstanding` (color-coded balance), `Credit Limit`, `Status` (Active/Inactive), `Actions` (Record Payment, View, Edit, Delete).
2. **Customer 360 - Sales Tab Table**:
   - Columns: `Invoice`, `Date`, `Items` (count), `Grand Total`, `Paid`, `Status` (Paid/Credit).
3. **Customer 360 - Payments Tab Table**:
   - Columns: `Date`, `Method`, `Reference`, `Notes`, `Amount`.
4. **Customer 360 - Ledger / Account Statement Table**:
   - Columns: `Date`, `Description`, `Ref No`, `Debit (Dr)` (Credit sale or opening balance), `Credit (Cr)` (Payment received), `Balance`.

#### D. Page Workflow
1. User manages customer master records.
2. In the POS terminal, credit sales automatically link to registered customers and increase `balance`.
3. On this page, cashier records repayments.
4. Repayments reduce customer balance and add a `Credit` row to the customer ledger.
5. In Customer 360 View, cashier can inspect complete financial transactions and print an Account Statement.

---

### Page 9: Suppliers Management & Ledger

#### Page Information
- **Page Name**: Supplier Directory, Payables & Ledger (Supplier 360)
- **Frontend Route / URL**: `/suppliers`
- **Source File Path**: [`src/pages/Suppliers.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Suppliers.jsx)
- **Purpose**: Supplier relationship directory, tracking payables and credit terms (7, 15, 30 days), identifying overdue payments, recording payments to suppliers, processing purchase returns, and auditing supplier ledgers.
- **Components Used**: KPI cards, multi-tab modal (`Overview`, `Purchases`, `Payments`, `Ledger`, `Returns`), Record Payment modal, Purchase Return modal, Add/Edit modal, Confirmation dialog, `Pagination`.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### Add / Edit Supplier Form (`supplierForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Supplier Name | `supplierForm.name` | `text` | Yes | `''` | Non-empty string | User input | String column (max 255). |
| 2 | Company Name | `supplierForm.companyName` | `text` | No | `''` | None | User input | String column. |
| 3 | Mobile Number | `supplierForm.mobile` | `text` | Yes | `''` | Min 10 digits; unique | User input | Unique phone column. |
| 4 | Alternate Mobile | `supplierForm.alternateMobile` | `text` | No | `''` | None | User input | String column. |
| 5 | Email | `supplierForm.email` | `email` | No | `''` | Email format | User input | Email column. |
| 6 | PAN | `supplierForm.pan` | `text` | No | `''` | PAN format | User input | String column. |
| 7 | Address | `supplierForm.address` | `text` | No | `''` | Address text | User input | Text column. |
| 8 | City | `supplierForm.city` | `text` | No | `''` | None | User input | String column. |
| 9 | State | `supplierForm.state` | `text` | No | `''` | None | User input | String column. |
| 10 | Pincode | `supplierForm.pincode` | `text` | No | `''` | Postal code | User input | String column. |
| 11 | GSTIN | `supplierForm.gstin` | `text` | No | `''` | Valid Indian GSTIN format regex | User input | Verified GSTIN string. |
| 12 | Payment Terms | `supplierForm.paymentTerms` | `select` | No | `'Immediate'` | Options: `Immediate`, `7 Days`, `15 Days`, `30 Days`, `45 Days`, `60 Days`, `Custom` | Hardcoded select | Used to calculate payment due dates. |
| 13 | Custom Days | `supplierForm.customDays` | `number` | No | `''` | Required if terms is `'Custom'` | User input | Integer days. |
| 14 | Credit Limit | `supplierForm.creditLimit` | `number` | No | `''` | Numeric >= 0 | User input | Optional payable limit. |
| 15 | Opening Balance | `supplierForm.openingBalance` | `number` | No (create only) | `''` | Numeric >= 0 | User input | Initial payable balance in ledger. |
| 16 | Status | `supplierForm.status` | `select` | No | `'Active'` | `'Active'`, `'Inactive'` | Hardcoded select | Status flag. |
| 17 | Notes | `supplierForm.notes` | `textarea` | No | `''` | Remarks | User input | Text column. |

##### Purchase Return Form (`returnForm`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Product | `returnForm.productId` | `select` | Yes | First item in purchase | Must exist in purchase items | Purchase items | Item to return. |
| 2 | Quantity | `returnForm.quantity` | `number` | Yes | `1` | > 0 and <= purchased quantity | User input | Deducts stock. |
| 3 | Reason | `returnForm.reason` | `select` / `text` | Yes | `'Defective'` | Reason description | User input | Audit note. |
| 4 | Date | `returnForm.date` | `date` | Yes | Current date | Valid date | User input | Return date. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Add Supplier | Page Header | `openAddModal()` | Opens Supplier creation modal | None | None | Client state |
| Search Filter | Header Filter | `setSearchQuery(e.target.value)` | Searches by Name, Company, Mobile, Email | `Proposed: /api/v1/suppliers/?q=...` | `GET` | Search endpoint. |
| Status Filter | Header Filter | `setStatusFilter(e.target.value)` | Filters by `active`, `inactive`, `with_outstanding`, `no_outstanding`, `overdue` | `Proposed: /api/v1/suppliers/?status=...` | `GET` | Filter parameters. |
| Record Payment | Table Row Action | `openPaymentModal(s)` | Opens payment modal to record money paid to supplier | `Proposed: /api/v1/suppliers/{id}/payments` | `POST` | Supplier payment endpoint. |
| View Supplier 360 | Table Row Action | `openViewModal(s)` | Opens Supplier 360 profile with tabs: Overview, Purchases, Payments, Ledger | `Proposed: /api/v1/suppliers/{id}/360` | `GET` | Supplier composite details. |
| Edit Supplier | Table Row Action | `openEditModal(s)` | Opens modal to edit supplier info | `Proposed: /api/v1/suppliers/{id}` | `PUT` | Update supplier endpoint. |
| Delete Supplier | Table Row Action | `triggerDelete(s)` | Checks for transactions; deactivates if active transactions exist, deletes if none | `Proposed: /api/v1/suppliers/{id}` | `DELETE` | Referential integrity check. |
| Return Items | Supplier 360 Purchases Tab | `openReturnModal(purchase)` | Opens return dialog to send items back to supplier | `Proposed: /api/v1/purchases/{id}/returns` | `POST` | Deducts inventory stock, reduces payable, logs ledger debit. |

#### C. Every Table or Data Grid
1. **Suppliers Master Table**:
   - Columns: `Supplier` (name, company), `Mobile`, `Total Purchases`, `Paid`, `Outstanding`, `Due Date` (badge showing `OVERDUE` or date), `Status` (Active/Inactive), `Actions` (Record Payment, View, Edit, Delete).
2. **Supplier 360 Tabs**:
   - Purchases Tab: Invoice No, Date, Items, Grand Total, Paid, Outstanding, Actions (Return Items).
   - Payments Tab: Date, Method, Reference, Notes, Amount.
   - Ledger Tab: Date, Description, Ref No, Debit (Payment/Return), Credit (Purchase/Opening), Balance.

---

### Page 10: Expenses Management

#### Page Information
- **Page Name**: Store Operational Expenses
- **Frontend Route / URL**: `/expenses`
- **Source File Path**: [`src/pages/Expenses.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Expenses.jsx)
- **Purpose**: Records daily operational expenses (tea, electricity, rent, wages, packing, marketing), tracks paid vs credit expenses, categorizes costs, and calculates totals for P&L reporting.
- **Components Used**: KPI cards, multi-criteria filters, Modal dialogues (`Add Expense`, `Edit Expense`, `View Expense Details`, `Delete Confirmation Dialog`), `Pagination`, Toast notifications.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Expense Date | `formData.expenseDate` | `date` | Yes | Today | Valid date string | User input | Date column, indexed. |
| 2 | Category | `formData.category` | `select` | Yes | `''` | Options: `Tea & Coffee`, `Drinking Water`, `Food & Snacks`, `Electricity`, `Rent`, `Transport & Delivery`, `Packing Materials`, `Repairs & Maintenance`, `Salary & Wages`, `Marketing`, `Other` | Hardcoded select | Category string / enum. |
| 3 | Expense Name / Title | `formData.expenseName` | `text` | Yes | `''` | Non-empty string | User input | String column (max 255). |
| 4 | Description / Particulars | `formData.description` | `text` | No | `''` | None | User input | Text column. |
| 5 | Quantity | `formData.quantity` | `number` | No | `1` | Numeric > 0 | User input | Integer / Decimal. |
| 6 | Unit | `formData.unit` | `select` | No | `'Pcs'` | Options: `Pcs`, `Box`, `Kg`, `Month`, `Ltr`, `Day`, `Other` | Hardcoded select | Unit string. |
| 7 | Unit Price | `formData.unitPrice` | `number` | No | `''` | Numeric >= 0 | User input | Auto-calculates `totalAmount` (`qty * unitPrice`). |
| 8 | Total Amount (₹) | `formData.totalAmount` | `number` | Yes | `''` | Numeric > 0 | User input / Auto | Total expense amount. |
| 9 | Payment Method | `formData.paymentMethod` | `select` | Yes | `'Cash'` | Options: `Cash`, `UPI`, `Card`, `Bank Transfer`, `Credit / Pay Later` | Hardcoded select | Payment mode. |
| 10 | Paid By | `formData.paidBy` | `text` | No | `'Admin'` | Non-empty | User input | User who disbursed funds. |
| 11 | Receipt / Voucher No | `formData.receiptNumber` | `text` | No | `''` | None | User input | Optional physical voucher reference. |
| 12 | Payment Status | `formData.paymentStatus` | `select` | Yes | `'Paid'` | Options: `'Paid'`, `'Pending / Due'` | Hardcoded select | Status enum. |
| 13 | Notes | `formData.notes` | `textarea` | No | `''` | None | User input | Remarks text. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| Add Expense | Page Header | `setShowAddModal(true)` | Opens Expense creation modal | None | None | Client state |
| Search Filter | Filter Bar | `setSearchQuery(e.target.value)` | Searches by Name, Category, Description, Receipt, Paid By | `Proposed: /api/v1/expenses/?q=...` | `GET` | Search endpoint. |
| Category Filter | Filter Bar | `setCategoryFilter(e.target.value)` | Filters by expense category | `Proposed: /api/v1/expenses/?category=...` | `GET` | Category query parameter. |
| Date Preset Filter | Filter Bar | `setDateFilter(e.target.value)` | Filters by `Today`, `Yesterday`, `This Week`, `This Month`, `Custom` | `Proposed: /api/v1/expenses/?date_range=...` | `GET` | Date filtering endpoint. |
| View Details | Table Row Action | `setActiveExpense(item); setShowViewModal(true)` | Opens expense detail modal | `Proposed: /api/v1/expenses/{id}` | `GET` | Detail endpoint. |
| Edit Expense | Table Row Action | `openEditModal(item)` | Opens modal to edit expense | `Proposed: /api/v1/expenses/{id}` | `PUT` | Update endpoint. |
| Delete Expense | Table Row Action | `setConfirmDelete({ isOpen: true, item })` | Prompts deletion confirmation; removes expense record | `Proposed: /api/v1/expenses/{id}` | `DELETE` | Deletion endpoint. |

#### C. Every Table or Data Grid
1. **Expenses Journal Table**:
   - Columns: `Date`, `Expense Name & Category`, `Qty & Unit`, `Amount (₹)`, `Payment Method`, `Paid By`, `Status` (Paid / Due badge), `Actions` (View, Edit, Delete).
   - Pagination: Defaults to 10 items/page, adjustable to 25, 50.

---

### Page 11: Services & Repairs Management

#### Page Information
- **Page Name**: Sports Equipment Service & Repairs (Stringing, Bat Repair, Grip, Maintenance)
- **Frontend Route / URL**: `/services`
- **Source File Path**: [`src/pages/Services.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Services.jsx)
- **Purpose**: Manages racket stringing (gutting), bat knocking, equipment maintenance workflows, customer job tracking, tracking service statuses (Received, In Progress, Completed, Collected), taking advances, generating job cards, and recording service payments.
- **Components Used**: KPI cards, filter bar, modal dialogues (`Add/Edit Service Order`, `View Details`, `Record Payment`, `Quick Status Update`, `Print Service Job Card`, `Delete Confirmation`), `Pagination`, Toast notifications.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Every Field on the Page

##### Add / Edit Service Order Form (`formData`)
| No. | Field Label | Actual Variable / Property | Input Type | Required? | Default Value | Validation | Data Source | Backend Requirement |
|---|---|---|---|---|---|---|---|---|
| 1 | Customer Mobile | `formData.customerMobile` | `text` | Yes | `''` | Min 10 digits; auto-populates existing customer details | User input | Mobile lookup. |
| 2 | Customer Name | `formData.customerName` | `text` | Yes | `''` | Non-empty string | User input / Auto | Customer name. |
| 3 | Customer Address | `formData.customerAddress` | `text` | No | `''` | None | User input / Auto | Address string. |
| 4 | Equipment Type | `formData.equipmentType` | `select` | Yes | `'Badminton Racket'` | Options: `Badminton Racket`, `Net / Strings`, `Grip`, `Cricket Bat`, `Football`, `Sports Shoes`, `Other` | Hardcoded select | Equipment type enum. |
| 5 | Brand | `formData.brand` | `text` | No | `''` | e.g. Yonex, SS | User input | Brand name. |
| 6 | Model | `formData.model` | `text` | No | `''` | e.g. Astrox 99 | User input | Model name. |
| 7 | Condition at Receipt | `formData.conditionAtReceipt` | `text` | No | `''` | Notes on scratches, cracks | User input | Physical condition notes. |
| 8 | Service Type | `formData.serviceType` | `select` / `text` | Yes | `'Stringing / Gutting'` | e.g. Stringing, Grip Replacement | User input / select | Service classification. |
| 9 | Customer Complaint / Requirements | `formData.customerComplaint` | `textarea` | No | `''` | e.g. 26 lbs string tension | User input | Work instruction details. |
| 10 | Work Required | `formData.workRequired` | `text` | Yes | `''` | Non-empty summary | User input | Core service description. |
| 11 | Date Received | `formData.dateReceived` | `date` | Yes | Current date | Valid date | User input | Inward intake timestamp. |
| 12 | Expected Delivery Date | `formData.expectedCompletionDate` | `date` | Yes | Current date + 2 days | >= Date Received | User input | Promised delivery date. |
| 13 | Technician Assigned | `formData.technician` | `text` | No | `'Senior Technician'` | None | User input | Technician assignment. |
| 14 | Estimated Price (₹) | `formData.estimatedPrice` | `number` | No | `''` | Numeric >= 0 | User input | Initial quote. |
| 15 | Final Service Charge (₹) | `formData.finalServiceCharge`| `number` | Yes | `''` | Numeric >= 0 | User input | Billable labor/parts fee. |
| 16 | Discount (₹) | `formData.discount` | `number` | No | `'0'` | Numeric >= 0 | User input | Concession. |
| 17 | GST Rate (%) | `formData.gstRate` | `select` | No | `0` | `0`, `5`, `12`, `18`, `28` | Hardcoded select | Tax rate. |
| 18 | Advance Paid (₹) | `formData.advancePaid` | `number` | No | `'0'` | Numeric >= 0, <= Total | User input | Deposit taken at intake. |
| 19 | Total Amount (₹) | `formData.totalAmount` | `number` | Auto-calculated | `'0'` | Computed: `(charge - disc) * (1 + gst)` | Auto | Total order cost. |
| 20 | Balance Due (₹) | `formData.balanceDue` | `number` | Auto-calculated | `'0'` | Computed: `total - advance` | Auto | Outstanding debt. |
| 21 | Payment Method | `formData.paymentMethod` | `select` | Yes | `'Cash'` | `Cash`, `UPI`, `Card`, `Bank Transfer` | Hardcoded select | Payment mode. |
| 22 | Service Status | `formData.status` | `select` | Yes | `'Received'` | Options: `Received`, `Pending`, `In Progress`, `Completed`, `Collected`, `Cancelled` | Hardcoded select | Order lifecycle state. |
| 23 | Notes | `formData.notes` | `textarea` | No | `''` | None | User input | Internal notes. |

#### B. Every Button and Action
| Button/Action | Location | Click Handler | Expected Behavior | API Called | HTTP Method | Backend Requirement |
|---|---|---|---|---|---|---|
| New Service Order | Page Header | `setShowAddModal(true)` | Opens Service Order creation modal | None | None | Client state |
| Quick Status Update | Table Row Action | `openStatusModal(item)` | Opens quick popup to switch service status (e.g. to `In Progress`, `Completed`, `Collected`) | `Proposed: /api/v1/services/{id}/status` | `PATCH` | Order status transition endpoint. |
| Record Payment | Table Row Action | `openPaymentModal(item)` | Records advance or balance settlement payment | `Proposed: /api/v1/services/{id}/payments` | `POST` | Service payment logging endpoint. |
| Print Job Card | Table Row Action | `openPrintModal(item)` | Opens printable Job Card & Customer Receipt | `Proposed: /api/v1/services/{id}/jobcard` | `GET` | Printable job card data. |
| View Details | Table Row Action | `openViewModal(item)` | Displays full service history and payments | `Proposed: /api/v1/services/{id}` | `GET` | Full order details. |
| Edit Service Order | Table Row Action | `openEditModal(item)` | Opens modal to edit order details | `Proposed: /api/v1/services/{id}` | `PUT` | Update service order endpoint. |
| Delete Service Order | Table Row Action | `setConfirmDelete({ isOpen: true, item })` | Prompts deletion confirmation; deletes service and payments | `Proposed: /api/v1/services/{id}` | `DELETE` | Delete service order endpoint. |

#### C. Every Table or Data Grid
1. **Service Orders Grid**:
   - Columns: `Order ID` (`SRV-00001`), `Customer` (name, mobile), `Equipment & Brand`, `Service / Work Required`, `Received Date`, `Delivery Due Date`, `Total Amount`, `Balance Due`, `Status` (Received, Pending, In Progress, Completed, Collected, Cancelled), `Payment Status` (Unpaid, Partially Paid, Paid), `Actions`.
2. **Printable Job Card View**:
   - Customer Copy & Store Workshop Copy with shop branding, customer details, equipment details, tension/weight specifications, advance received, and terms.

---

### Page 12: Reports & Business Analytics

#### Page Information
- **Page Name**: Reports & Analytics
- **Frontend Route / URL**: `/reports/*`
- **Source File Path**: [`src/pages/Reports.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Reports.jsx)
- **Purpose**: Executive dashboard and detailed report views for financial health, sales performance, purchase audit, stock valuation, Profit & Loss statement, estimated GST liability, customer receivables, supplier payables, and operating expenses. Includes CSV export and browser printing.
- **Components Used**: KPI cards, Recharts (`BarChart`, `PieChart`, `ResponsiveContainer`), CSV download generator, Print stylesheets, 8 detailed report tables with `Pagination`.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Controls & Filter Bar
| Control | Variable | Options / Format | Expected Behavior | Backend Requirement |
|---|---|---|---|---|
| Date Preset Selector | `datePreset` | `Today`, `Yesterday`, `This Week`, `This Month`, `Last Month`, `This Year`, `Custom Date` | Shifts active date window and re-aggregates all report figures | Server-side date range filtering parameter on all report endpoints. |
| Custom Date Range Inputs | `customRange.start`, `customRange.end` | `YYYY-MM-DD` | Applies arbitrary date window | Date range query params (`start_date`, `end_date`). |
| Search Filter (in sub-reports) | `searchQuery` | `text` | Filters current active report table | Search query parameter. |
| Export CSV Button | N/A | Click handler | Generates client-side CSV file from table DOM and triggers download | Server-side CSV streaming endpoint (optional). |
| Print Dashboard / Report | N/A | `window.print()` | Opens printer dialog formatted for paper/PDF | Printer-friendly layouts. |

#### B. The 8 Detailed Sub-Reports

1. **Sales Report**:
   - Columns: `Date`, `Invoice`, `Customer`, `Items` (count), `GST (₹)`, `Grand Total (₹)`, `Payment Method`.
   - Footer: Total GST, Total Sales.
   - Backend Endpoint: `Proposed: /api/v1/reports/sales`
2. **Purchase Report**:
   - Columns: `Date`, `Invoice`, `Supplier`, `Items` (count), `Grand Total (₹)`, `Paid (₹)`, `Outstanding (₹)`, `Status`.
   - Footer: Total Purchases, Total Paid, Total Outstanding.
   - Backend Endpoint: `Proposed: /api/v1/reports/purchases`
3. **Inventory Valuation Report**:
   - Columns: `SKU`, `Product Name`, `Category`, `Stock`, `Cost Price (Est)`, `Selling Price`, `Stock Value`.
   - Footer: Total Stock Value (`SUM(stock * cost)`).
   - Backend Endpoint: `Proposed: /api/v1/reports/inventory`
4. **Profit & Loss Statement (P&L)**:
   - Sections:
     - **Revenue**: Gross Sales, Sales Returns/Discounts, **Net Revenue**.
     - **Cost of Goods Sold (COGS)**: Product Purchase Cost, **Total COGS**.
     - **Gross Profit**: Net Revenue - Total COGS.
     - **Operating Expenses**: Itemized list of expenses (Rent, Salary, Electricity, etc.), **Total Expenses**.
     - **Net Profit**: Gross Profit - Total Expenses.
   - Backend Endpoint: `Proposed: /api/v1/reports/profit-and-loss`
5. **GST Tax Liability Report**:
   - Sections:
     - **Output GST (Sales)**: Taxable Value, CGST, SGST, IGST, Total Output Tax.
     - **Input GST (Purchases)**: Taxable Value, CGST, SGST, IGST, Total Input Tax.
     - **Estimated GST Payable**: Output Tax - Input Tax.
   - Backend Endpoint: `Proposed: /api/v1/reports/gst`
6. **Customer Receivables Report**:
   - Columns: `Customer Name`, `Mobile`, `Outstanding Balance`, `Status`.
   - Footer: Total Outstanding Receivables.
   - Backend Endpoint: `Proposed: /api/v1/reports/customers`
7. **Supplier Payables Report**:
   - Columns: `Supplier / Company`, `Mobile`, `GSTIN`, `Outstanding Payable`, `Status`.
   - Footer: Total Outstanding Payables.
   - Backend Endpoint: `Proposed: /api/v1/reports/suppliers`
8. **Operating Expense Report**:
   - Columns: `Date`, `Category`, `Description`, `Method`, `Amount (₹)`.
   - Footer: Total Operating Expenses.
   - Backend Endpoint: `Proposed: /api/v1/reports/expenses`

---

### Page 13: Settings & Store Configuration

#### Page Information
- **Page Name**: Store Settings & Master Configuration
- **Frontend Route / URL**: `/settings/*`
- **Source File Path**: [`src/pages/Settings.jsx`](file:///e:/company_projects/sport_shop/frontend/src/pages/Settings.jsx)
- **Purpose**: Full store customization divided into 8 configuration panels: Shop Profile, Invoice Settings, GST & Tax, Payment Methods, Printer Configuration, Backup & Data Restore, General Display Preferences, and Security.
- **Components Used**: Horizontal tab bar, toggle switches, form fields, JSON export/import handlers, test print window, dirty-state floating action footer.
- **Whether Login is Required**: Yes.
- **Roles or Permissions Checked**: None.

#### A. Settings Fields by Tab

##### Tab 1: Shop Profile (`settings.store`)
| Field Label | Variable | Type | Required? | Validation / Options | Backend Requirement |
|---|---|---|---|---|---|
| Shop Name | `store.shopName` | `text` | Yes | Non-empty string | `store_settings.shop_name` |
| Owner Name | `store.ownerName` | `text` | No | None | `store_settings.owner_name` |
| Business Phone | `store.phone` | `text` | Yes | Min 10 digits | `store_settings.phone` |
| Alternate Phone | `store.alternatePhone` | `text` | No | None | `store_settings.alternate_phone` |
| Email Address | `store.email` | `email` | No | Email format | `store_settings.email` |
| Complete Address | `store.address` | `text` | No | None | `store_settings.address` |
| City | `store.city` | `text` | No | None | `store_settings.city` |
| District | `store.district` | `text` | No | None | `store_settings.district` |
| State | `store.state` | `text` | No | None | `store_settings.state` |
| Pincode | `store.pincode` | `text` | No | None | `store_settings.pincode` |
| GSTIN | `store.gstin` | `text` | No | Indian GST format | `store_settings.gstin` |
| PAN | `store.pan` | `text` | No | Indian PAN format | `store_settings.pan` |
| Business Type | `store.businessType` | `text` | No | e.g. `'Retail'` | `store_settings.business_type` |

##### Tab 2: Invoice Settings (`settings.invoice`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| Invoice Prefix | `invoice.prefix` | `text` | e.g. `'INV-'`, `'EK-'` | `invoice_settings.prefix` |
| Starting / Next Number | `invoice.nextNumber` | `number` | Integer (e.g. `1`) | `invoice_settings.next_number` |
| Invoice Template | `invoice.template` | Button selection | `'Classic'`, `'Modern'`, `'Compact'`, `'Thermal'` | `invoice_settings.template` |
| Show Logo Toggle | `invoice.showLogo` | `checkbox` | Boolean | `invoice_settings.show_logo` |
| Show Address Toggle | `invoice.showAddress` | `checkbox` | Boolean | `invoice_settings.show_address` |
| Show Phone Toggle | `invoice.showPhone` | `checkbox` | Boolean | `invoice_settings.show_phone` |
| Show GSTIN Toggle | `invoice.showGstin` | `checkbox` | Boolean | `invoice_settings.show_gstin` |
| Show Customer Mobile | `invoice.showCustomerMobile`| `checkbox`| Boolean | `invoice_settings.show_customer_mobile` |
| Show Customer GSTIN | `invoice.showCustomerGstin` | `checkbox` | Boolean | `invoice_settings.show_customer_gstin` |
| Show HSN / SAC | `invoice.showHsnSac` | `checkbox` | Boolean | `invoice_settings.show_hsn_sac` |
| Show Discount | `invoice.showDiscount` | `checkbox` | Boolean | `invoice_settings.show_discount` |
| Show GST Breakdown | `invoice.showGstBreakdown` | `checkbox` | Boolean | `invoice_settings.show_gst_breakdown` |
| Show Payment Method | `invoice.showPaymentMethod`| `checkbox` | Boolean | `invoice_settings.show_payment_method` |
| Show Terms Toggle | `invoice.showTerms` | `checkbox` | Boolean | `invoice_settings.show_terms` |
| Footer Message | `invoice.footerMessage` | `text` | e.g. `'Thank you for shopping with EVERYKADAI!'` | `invoice_settings.footer_message` |
| Terms & Conditions | `invoice.terms` | `textarea` | Terms text block | `invoice_settings.terms` |

##### Tab 3: GST & Tax Settings (`settings.gst`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| GST Registered | `gst.registered` | `checkbox` | Boolean | `gst_settings.registered` |
| Business State | `gst.state` | `text` | State name (for CGST/SGST vs IGST split) | `gst_settings.state` |
| GST Type | `gst.type` | `select` | `'Regular'`, `'Composition'` | `gst_settings.gst_type` |
| Tax Rates List | `gst.taxRates` | Dynamic Array | Array of integers, e.g. `[0, 5, 12, 18, 28]` | `gst_settings.tax_rates` |

##### Tab 4: Payments Configuration (`settings.payments`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| Cash Enabled | `payments.cash` | `checkbox` | Boolean | `payment_settings.cash_enabled` |
| UPI Enabled | `payments.upi` | `checkbox` | Boolean | `payment_settings.upi_enabled` |
| Bank Transfer Enabled| `payments.bank` | `checkbox` | Boolean | `payment_settings.bank_enabled` |
| Card Enabled | `payments.card` | `checkbox` | Boolean | `payment_settings.card_enabled` |
| Credit Enabled | `payments.credit` | `checkbox` | Boolean | `payment_settings.credit_enabled` |
| Default Payment Method | `payments.defaultMethod`| `select` | `'Cash'`, `'UPI'`, `'Bank'` | `payment_settings.default_method` |
| Store UPI ID | `payments.upiId` | `text` | e.g. `'everykadai@upi'` | `payment_settings.upi_id` |

##### Tab 5: Printer Configuration (`settings.printer`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| Printer Paper Type | `printer.type` | `select` | `'A4'`, `'Thermal 80mm'`, `'Thermal 58mm'` | `printer_settings.paper_type` |
| Auto Print | `printer.autoPrint` | `checkbox` | Boolean | `printer_settings.auto_print` |
| Show Print Preview | `printer.showPreview` | `checkbox` | Boolean | `printer_settings.show_preview` |
| Print Customer Copy | `printer.printCustomerCopy`| `checkbox` | Boolean | `printer_settings.print_customer_copy` |

##### Tab 6: Backup & Data Restore (`settings/backup`)
- **Export Backup Button**: Dumps all tables as a JSON document.
- **Import Backup File Picker**: Replaces database contents with a JSON file.
- **Reset Demo Data Button**: Purges transactional data and restores seeding.
- **Backend Requirement**: Endpoints for `POST /api/v1/system/backup/export` and `POST /api/v1/system/backup/import`.

##### Tab 7: General Display Settings (`settings.general`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| Currency | `general.currency` | `select` | `'₹'`, `'$'` | App-wide currency symbol |
| Date Format | `general.dateFormat` | `select` | `'DD/MM/YYYY'`, `'MM/DD/YYYY'` | Date presentation |
| Time Format | `general.timeFormat` | `select` | `'12 Hour'`, `'24 Hour'` | Time presentation |
| Theme | `general.theme` | `select` | `'Light'`, `'Dark'` | Theme preference |
| Default Landing Page | `general.defaultPage` | `select` | `'Dashboard'`, `'POS'` | Post-login redirect |
| Low Stock Threshold | `general.lowStockThreshold`| `number` | Integer (default 5) | Low stock trigger level |
| Default Items Per Page| `general.itemsPerPage` | `select` | `10`, `25`, `50`, `100` | Grid pagination default |

##### Tab 8: Security & Session (`settings.security`)
| Field Label | Variable | Type | Options / Format | Backend Requirement |
|---|---|---|---|---|
| Auto Logout | `security.autoLogout` | `select` | `'Yes'`, `'No'` | Client session auto-termination |
| Session Timeout | `security.sessionTimeout` | `select` | `'15 minutes'`, `'30 minutes'`, `'1 hour'`, `'4 hours'`, `'Never'` | JWT token lifespan / refresh policy |
| Change Password Button | N/A | Button | Triggers password update modal | `POST /api/v1/auth/change-password` |
| Logout Session Button | N/A | Button | Invalidates session and redirects to `/login` | `POST /api/v1/auth/logout` |

#### B. Buttons and Workflow
- **Dirty State Tracking**: Modifying any field sets `isDirty = true` and shows a fixed bottom bar with "Discard" and "Save Changes".
- **Discard**: Restores form from `originalSettings`.
- **Save Changes**: Validates `shopName` and `phone`, invokes `saveSettings(settings)`, and updates local theme if changed.

---

### Page 14: Placeholder & Generic Routes

The application router defines secondary placeholder routes rendered using `<GenericPage title="..." />`:
1. `/products/new` ("New Product")
2. `/products/:id` ("Product Details")
3. `/sales/returns` ("Sales Returns")
4. `/purchases/new` ("New Purchase")
5. `/customers/:id` ("Customer Details")
6. `/suppliers/:id` ("Supplier Details")
7. `/users` ("Users & Roles")

**Analysis**: In the existing frontend, the primary workflows for these entities are implemented via **modals** inside their parent pages (`/products`, `/purchases`, `/customers`, `/suppliers`, `/sales`). However, for backend REST compliance, full CRUD endpoints (including detail routes `/api/v1/{entity}/{id}`) must be implemented to support future standalone page migrations.

---

## 4. Backend Requirements Summary

### 4.1 Required API Inventory

| Page / Feature | Proposed Endpoint | Method | Request Payload / Params | Response Fields / Body | Auth Required | Status |
|---|---|---|---|---|---|---|
| **Authentication** | `/api/v1/auth/login` | `POST` | `username`, `password`, `rememberMe` | `access_token`, `token_type`, `user` object | No | Proposed backend endpoint |
| **Authentication** | `/api/v1/auth/logout` | `POST` | Empty / Bearer token | `{"message": "Logged out"}` | Yes | Proposed backend endpoint |
| **Authentication** | `/api/v1/auth/me` | `GET` | Bearer token | `id`, `name`, `username`, `role`, `email` | Yes | Proposed backend endpoint |
| **Authentication** | `/api/v1/auth/change-password` | `POST` | `currentPassword`, `newPassword` | `{"message": "Password updated"}` | Yes | Proposed backend endpoint |
| **Dashboard** | `/api/v1/dashboard/metrics` | `GET` | `date_range`, `start_date`, `end_date` | `todaySales`, `periodSales`, `todayPurchases`, `stockValue`, `lowStock`, `outOfStock`, `totalProducts`, `expenses`, `profit` | Yes | Proposed backend endpoint |
| **Dashboard** | `/api/v1/dashboard/sales-chart` | `GET` | `range` (`This Week`, `This Month`) | Timeseries array `[{name, sales}]` | Yes | Proposed backend endpoint |
| **Dashboard** | `/api/v1/dashboard/top-products` | `GET` | `limit` (default 5) | Array of `[{id, name, qty}]` | Yes | Proposed backend endpoint |
| **Categories** | `/api/v1/categories/` | `GET` | None | Array of category objects with `productCount` | Yes | Proposed backend endpoint |
| **Categories** | `/api/v1/categories/` | `POST` | `name`, `description`, `status` | Created category object with `id` | Yes | Proposed backend endpoint |
| **Categories** | `/api/v1/categories/{id}` | `PUT` | `name`, `description`, `status` | Updated category object | Yes | Proposed backend endpoint |
| **Categories** | `/api/v1/categories/{id}` | `DELETE` | None | 204 No Content / Error if products linked | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/` | `GET` | `q`, `categoryId`, `stockStatus`, `offerStatus`, `status`, `page`, `limit` | Paginated `{items: [...], total, page, limit}` | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/` | `POST` | `name`, `sku`, `barcode`, `categoryId`, `brand`, `unit`, `mrp`, `price`, `offerPrice`, `tax`, `hsnCode`, `stock`, `minStock`, `status` | Created product object | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/{id}` | `GET` | None | Product detail object | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/{id}` | `PUT` | Product update fields | Updated product object | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/{id}` | `DELETE` | None | 204 No Content / Soft-deletes if transactions exist | Yes | Proposed backend endpoint |
| **Products** | `/api/v1/products/{id}/status` | `PATCH` | `{"status": "Active" \| "Inactive"}` | Updated status object | Yes | Proposed backend endpoint |
| **Inventory** | `/api/v1/inventory/` | `GET` | `q`, `categoryId`, `status`, `page`, `limit` | Paginated product stock values | Yes | Proposed backend endpoint |
| **Inventory** | `/api/v1/inventory/{id}/adjust` | `POST` | `adjType` (`Add`, `Remove`, `Set`), `quantity`, `reason`, `notes` | Updated stock object and created movement | Yes | Proposed backend endpoint |
| **Inventory** | `/api/v1/inventory/{id}/movements` | `GET` | `page`, `limit` | Chronological array of stock movements | Yes | Proposed backend endpoint |
| **Sales (POS)** | `/api/v1/sales/` | `GET` | `q`, `status`, `date_range`, `page`, `limit` | Paginated list of sales invoices | Yes | Proposed backend endpoint |
| **Sales (POS)** | `/api/v1/sales/` | `POST` | `customerId`, `date`, `items: [{productId, qty, price, offerPrice, tax}]`, `taxableValue`, `taxAmount`, `cgst`, `sgst`, `total`, `paymentMethod`, `amountReceived` | Created invoice object (`invoiceNo`, `id`, `total`) | Yes | Proposed backend endpoint |
| **Sales (POS)** | `/api/v1/sales/{id}` | `GET` | None | Full sale invoice object with line items | Yes | Proposed backend endpoint |
| **Sales (POS)** | `/api/v1/sales/{invoiceNo}/returns` | `POST` | `items: [{id, qty}]`, `reason` | Return confirmation & updated stock | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/` | `GET` | `q`, `supplierId`, `status`, `dateFilter`, `page`, `limit` | Paginated list of purchase orders | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/` | `POST` | `invoiceNo`, `supplierId`, `date`, `items: [{productId, quantity, purchaseRate, discount, gstPercent}]`, `subtotal`, `totalDiscount`, `taxableValue`, `totalGst`, `grandTotal`, `amountPaid`, `paymentMethod`, `paymentReference` | Created purchase record | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/{id}` | `GET` | None | Itemized purchase detail object | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/{id}` | `PUT` | Purchase update fields & items | Re-calculated purchase & stock adjustments | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/{id}` | `DELETE` | None | Rollback stock, supplier ledger, delete record | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/{id}/payments` | `POST` | `amount`, `paymentMethod`, `reference`, `date`, `notes` | Recorded payment & updated balance | Yes | Proposed backend endpoint |
| **Purchases** | `/api/v1/purchases/{id}/returns` | `POST` | `productId`, `quantity`, `reason`, `date` | Return record, stock decrement, ledger debit | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/` | `GET` | `q`, `status`, `page`, `limit` | Paginated list of customer records | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/` | `POST` | `name`, `mobile`, `alternateMobile`, `email`, `dob`, `gender`, `address`, `city`, `state`, `pincode`, `gstin`, `creditLimit`, `openingBalance`, `status`, `notes` | Created customer object | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/{id}` | `GET` | None | Customer detail record | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/{id}` | `PUT` | Updated customer fields | Updated customer object | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/{id}` | `DELETE` | None | Delete or deactivate customer | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/{id}/payments` | `POST` | `amount`, `paymentMethod`, `reference`, `date`, `notes` | Recorded payment & updated balance | Yes | Proposed backend endpoint |
| **Customers** | `/api/v1/customers/{id}/360` | `GET` | None | `{overview, sales: [...], payments: [...], ledger: [...]}` | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/` | `GET` | `q`, `status`, `page`, `limit` | Paginated list of supplier records | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/` | `POST` | `name`, `companyName`, `mobile`, `alternateMobile`, `email`, `pan`, `address`, `city`, `state`, `pincode`, `gstin`, `paymentTerms`, `customDays`, `creditLimit`, `openingBalance`, `status`, `notes` | Created supplier object | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/{id}` | `GET` | None | Supplier detail record | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/{id}` | `PUT` | Updated supplier fields | Updated supplier object | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/{id}` | `DELETE` | None | Delete or deactivate supplier | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/{id}/payments` | `POST` | `amount`, `paymentMethod`, `reference`, `date`, `notes` | Recorded payment & updated balance | Yes | Proposed backend endpoint |
| **Suppliers** | `/api/v1/suppliers/{id}/360` | `GET` | None | `{overview, purchases: [...], payments: [...], ledger: [...], returns: [...]}` | Yes | Proposed backend endpoint |
| **Expenses** | `/api/v1/expenses/` | `GET` | `q`, `category`, `status`, `date_range`, `page`, `limit` | Paginated list of expenses | Yes | Proposed backend endpoint |
| **Expenses** | `/api/v1/expenses/` | `POST` | `expenseDate`, `category`, `expenseName`, `description`, `quantity`, `unit`, `unitPrice`, `totalAmount`, `paymentMethod`, `paidBy`, `receiptNumber`, `paymentStatus`, `notes` | Created expense record | Yes | Proposed backend endpoint |
| **Expenses** | `/api/v1/expenses/{id}` | `GET` | None | Expense detail record | Yes | Proposed backend endpoint |
| **Expenses** | `/api/v1/expenses/{id}` | `PUT` | Updated expense fields | Updated expense object | Yes | Proposed backend endpoint |
| **Expenses** | `/api/v1/expenses/{id}` | `DELETE` | None | 204 No Content | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/` | `GET` | `q`, `equipmentType`, `status`, `paymentStatus`, `page`, `limit` | Paginated list of service orders | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/` | `POST` | `customerMobile`, `customerName`, `customerAddress`, `equipmentType`, `brand`, `model`, `conditionAtReceipt`, `serviceType`, `customerComplaint`, `workRequired`, `dateReceived`, `expectedCompletionDate`, `technician`, `estimatedPrice`, `finalServiceCharge`, `discount`, `gstRate`, `advancePaid`, `totalAmount`, `balanceDue`, `paymentMethod`, `paymentStatus`, `status`, `notes` | Created service record | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/{id}` | `GET` | None | Service order details | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/{id}` | `PUT` | Updated service order fields | Updated service order object | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/{id}/status` | `PATCH` | `{"status": "Received" \| "Pending" \| "In Progress" \| "Completed" \| "Collected" \| "Cancelled"}` | Updated status record | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/{id}/payments` | `POST` | `amount`, `paymentMethod`, `date`, `notes` | Recorded payment & updated balance | Yes | Proposed backend endpoint |
| **Services** | `/api/v1/services/{id}` | `DELETE` | None | Deletes service & associated payments | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/sales` | `GET` | `date_range`, `start_date`, `end_date`, `page`, `limit` | Paginated sales report & totals | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/purchases` | `GET` | `date_range`, `start_date`, `end_date`, `page`, `limit` | Paginated purchase report & totals | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/inventory` | `GET` | `page`, `limit` | Stock valuation breakdown | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/profit-and-loss`| `GET` | `date_range`, `start_date`, `end_date` | Revenue, COGS, Gross Profit, Expenses, Net Profit | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/gst` | `GET` | `date_range`, `start_date`, `end_date` | Output GST, Input GST, Net Tax Payable | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/customers` | `GET` | `page`, `limit` | Customer receivables report | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/suppliers` | `GET` | `page`, `limit` | Supplier payables report | Yes | Proposed backend endpoint |
| **Reports** | `/api/v1/reports/expenses` | `GET` | `date_range`, `start_date`, `end_date`, `page`, `limit` | Paginated expense report & totals | Yes | Proposed backend endpoint |
| **Settings** | `/api/v1/settings/` | `GET` | None | Complete settings JSON object | Yes | Proposed backend endpoint |
| **Settings** | `/api/v1/settings/` | `PUT` | Complete settings payload | Updated settings object | Yes | Proposed backend endpoint |
| **System** | `/api/v1/system/backup/export` | `POST` | None | Complete JSON database export file | Yes | Proposed backend endpoint |
| **System** | `/api/v1/system/backup/import` | `POST` | Multipart JSON backup file | Import confirmation & count | Yes | Proposed backend endpoint |

---

### 4.2 Required Database Entities

#### 1. Entity: `User` (`users`)
- **Purpose**: Store operators, cashiers, technicians, and administrators.
- **Fields**:
  - `id`: Integer / UUID, Primary Key.
  - `username`: String(50), Unique, Not Null, Indexed.
  - `email`: String(255), Unique, Nullable.
  - `phone_number`: String(20), Unique, Nullable.
  - `password_hash`: String(255), Not Null.
  - `name`: String(100), Not Null.
  - `role`: Enum (`Admin`, `Cashier`, `Technician`, `Manager`), Not Null, Default `Admin`.
  - `is_active`: Boolean, Default `True`.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.
- **Relationships**:
  - `sales`: One-to-Many with `Sale`.
  - `expenses`: One-to-Many with `Expense`.
  - `services`: One-to-Many with `ServiceOrder`.

#### 2. Entity: `Category` (`categories`)
- **Purpose**: Product catalog groupings.
- **Fields**:
  - `id`: Integer, Primary Key, Auto-increment.
  - `name`: String(100), Unique, Not Null, Indexed.
  - `description`: Text, Nullable.
  - `status`: Enum (`Active`, `Inactive`), Default `Active`.
  - `created_at`: DateTime (UTC), Default `Now()`.
- **Relationships**:
  - `products`: One-to-Many with `Product`.

#### 3. Entity: `Product` (`products`)
- **Purpose**: Inventory items, sporting equipment, consumables.
- **Fields**:
  - `id`: Integer, Primary Key, Auto-increment.
  - `sku`: String(100), Unique, Not Null, Indexed.
  - `barcode`: String(100), Unique, Nullable, Indexed.
  - `name`: String(255), Not Null, Indexed.
  - `category_id`: Integer, ForeignKey(`categories.id`), Not Null.
  - `brand`: String(100), Nullable, Indexed.
  - `unit`: String(20), Default `'Pcs'`.
  - `mrp`: Decimal(10, 2), Not Null.
  - `price`: Decimal(10, 2), Not Null (Selling Price).
  - `offer_price`: Decimal(10, 2), Nullable.
  - `stock`: Integer, Not Null, Default `0`.
  - `min_stock`: Integer, Not Null, Default `5`.
  - `tax_rate`: Decimal(5, 2), Not Null, Default `18.00` (GST %).
  - `hsn_code`: String(20), Nullable.
  - `status`: Enum (`Active`, `Inactive`), Default `Active`.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.
- **Constraints / Indexes**:
  - Unique on `sku`.
  - Check constraint: `mrp >= price`.
  - Check constraint: `offer_price IS NULL OR (offer_price > 0 AND offer_price <= price)`.
- **Relationships**:
  - `category`: Many-to-One with `Category`.
  - `sale_items`: One-to-Many with `SaleItem`.
  - `purchase_items`: One-to-Many with `PurchaseItem`.
  - `stock_movements`: One-to-Many with `StockMovement`.

#### 4. Entity: `StockMovement` (`stock_movements`)
- **Purpose**: Immutable chronological audit ledger of inventory quantity changes.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `product_id`: Integer, ForeignKey(`products.id`), Not Null, Indexed.
  - `type`: Enum (`OPENING_STOCK`, `PURCHASE_IN`, `SALE_OUT`, `SALES_RETURN`, `PURCHASE_RETURN`, `ADJUSTMENT`), Not Null, Indexed.
  - `quantity`: Integer, Not Null (Positive for inward, negative for outward).
  - `before_stock`: Integer, Not Null.
  - `after_stock`: Integer, Not Null.
  - `reference`: String(100), Nullable (e.g. Invoice No, Reason code).
  - `notes`: Text, Nullable.
  - `created_at`: DateTime (UTC), Default `Now()`, Indexed.

#### 5. Entity: `Customer` (`customers`)
- **Purpose**: Retail & wholesale buyer directory.
- **Fields**:
  - `id`: Integer, Primary Key, Auto-increment.
  - `name`: String(255), Not Null, Indexed.
  - `phone`: String(20), Unique, Nullable, Indexed.
  - `alternate_phone`: String(20), Nullable.
  - `email`: String(255), Nullable.
  - `dob`: Date, Nullable.
  - `gender`: Enum (`Male`, `Female`, `Other`), Default `Male`.
  - `address`: Text, Nullable.
  - `city`: String(100), Nullable.
  - `district`: String(100), Nullable.
  - `state`: String(100), Nullable.
  - `pincode`: String(20), Nullable.
  - `gstin`: String(20), Nullable.
  - `credit_limit`: Decimal(10, 2), Default `0.00`.
  - `opening_balance`: Decimal(10, 2), Default `0.00`.
  - `balance`: Decimal(10, 2), Default `0.00` (Current outstanding debt).
  - `status`: Enum (`Active`, `Inactive`), Default `Active`.
  - `notes`: Text, Nullable.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.
- **Relationships**:
  - `sales`: One-to-Many with `Sale`.
  - `payments`: One-to-Many with `CustomerPayment`.
  - `ledger`: One-to-Many with `CustomerLedgerEntry`.

#### 6. Entity: `Sale` (`sales`)
- **Purpose**: POS checkout tax invoice headers.
- **Fields**:
  - `id`: BigInteger, Primary Key, Auto-increment.
  - `invoice_no`: String(50), Unique, Not Null, Indexed (e.g. `EK-000001`).
  - `customer_id`: Integer, ForeignKey(`customers.id`), Nullable (Null denotes Walk-in Customer).
  - `date`: DateTime (UTC), Not Null, Indexed.
  - `taxable_value`: Decimal(10, 2), Not Null.
  - `tax_amount`: Decimal(10, 2), Not Null.
  - `cgst`: Decimal(10, 2), Not Null.
  - `sgst`: Decimal(10, 2), Not Null.
  - `total`: Decimal(10, 2), Not Null (Grand Total).
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank`, `Credit`), Not Null.
  - `amount_received`: Decimal(10, 2), Not Null.
  - `status`: Enum (`Completed`, `Returned`, `Cancelled`), Default `Completed`.
  - `created_at`: DateTime (UTC), Default `Now()`.
- **Relationships**:
  - `customer`: Many-to-One with `Customer`.
  - `items`: One-to-Many with `SaleItem`.

#### 7. Entity: `SaleItem` (`sale_items`)
- **Purpose**: Individual products billed on a sale invoice.
- **Fields**:
  - `id`: BigInteger, Primary Key, Auto-increment.
  - `sale_id`: BigInteger, ForeignKey(`sales.id`), Not Null, Indexed.
  - `product_id`: Integer, ForeignKey(`products.id`), Not Null.
  - `product_name`: String(255), Not Null (Snapshotted).
  - `sku`: String(100), Not Null (Snapshotted).
  - `quantity`: Integer, Not Null.
  - `returned_quantity`: Integer, Default `0`.
  - `mrp`: Decimal(10, 2), Not Null.
  - `price`: Decimal(10, 2), Not Null.
  - `offer_price`: Decimal(10, 2), Nullable.
  - `effective_price`: Decimal(10, 2), Not Null.
  - `tax_rate`: Decimal(5, 2), Not Null.
  - `taxable_amount`: Decimal(10, 2), Not Null.
  - `tax_amount`: Decimal(10, 2), Not Null.
  - `total_amount`: Decimal(10, 2), Not Null.

#### 8. Entity: `CustomerPayment` (`customer_payments`)
- **Purpose**: Ledger cash/UPI receipts paying down outstanding credit sales.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `customer_id`: Integer, ForeignKey(`customers.id`), Not Null, Indexed.
  - `amount`: Decimal(10, 2), Not Null.
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank Transfer`), Not Null.
  - `reference`: String(100), Nullable.
  - `notes`: Text, Nullable.
  - `date`: DateTime (UTC), Not Null.
  - `created_at`: DateTime (UTC), Default `Now()`.

#### 9. Entity: `CustomerLedgerEntry` (`customer_ledger`)
- **Purpose**: Formal double-entry statement journal for customer receivables.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `customer_id`: Integer, ForeignKey(`customers.id`), Not Null, Indexed.
  - `type`: String(50), Not Null (`Opening Balance`, `Credit Sale`, `Payment`).
  - `reference_id`: String(100), Nullable (e.g. Invoice No).
  - `description`: String(255), Not Null.
  - `debit`: Decimal(10, 2), Default `0.00` (Increases customer debt).
  - `credit`: Decimal(10, 2), Default `0.00` (Decreases customer debt).
  - `balance`: Decimal(10, 2), Not Null (Cumulative running balance).
  - `date`: DateTime (UTC), Not Null, Indexed.

#### 10. Entity: `Supplier` (`suppliers`)
- **Purpose**: Wholesale vendors & goods distributors.
- **Fields**:
  - `id`: Integer, Primary Key, Auto-increment.
  - `name`: String(255), Not Null, Indexed.
  - `company_name`: String(255), Nullable, Indexed.
  - `phone`: String(20), Unique, Not Null, Indexed.
  - `alternate_phone`: String(20), Nullable.
  - `email`: String(255), Nullable.
  - `pan`: String(20), Nullable.
  - `gstin`: String(20), Nullable.
  - `address`: Text, Nullable.
  - `city`: String(100), Nullable.
  - `district`: String(100), Nullable.
  - `state`: String(100), Nullable.
  - `pincode`: String(20), Nullable.
  - `payment_terms`: Enum (`Immediate`, `7 Days`, `15 Days`, `30 Days`, `45 Days`, `60 Days`, `Custom`), Default `Immediate`.
  - `custom_days`: Integer, Nullable.
  - `credit_limit`: Decimal(10, 2), Default `0.00`.
  - `opening_balance`: Decimal(10, 2), Default `0.00`.
  - `balance`: Decimal(10, 2), Default `0.00` (Current accounts payable debt).
  - `status`: Enum (`Active`, `Inactive`), Default `Active`.
  - `notes`: Text, Nullable.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.
- **Relationships**:
  - `purchases`: One-to-Many with `Purchase`.
  - `payments`: One-to-Many with `SupplierPayment`.
  - `ledger`: One-to-Many with `SupplierLedgerEntry`.
  - `returns`: One-to-Many with `PurchaseReturn`.

#### 11. Entity: `Purchase` (`purchases`)
- **Purpose**: Inward supplier stock purchases.
- **Fields**:
  - `id`: BigInteger, Primary Key, Auto-increment.
  - `invoice_no`: String(100), Not Null, Indexed (e.g. `PUR-000001`).
  - `supplier_id`: Integer, ForeignKey(`suppliers.id`), Not Null, Indexed.
  - `date`: DateTime (UTC), Not Null, Indexed.
  - `subtotal`: Decimal(10, 2), Not Null.
  - `total_discount`: Decimal(10, 2), Default `0.00`.
  - `taxable_value`: Decimal(10, 2), Not Null.
  - `total_gst`: Decimal(10, 2), Not Null.
  - `grand_total`: Decimal(10, 2), Not Null.
  - `amount_paid`: Decimal(10, 2), Default `0.00`.
  - `outstanding_amount`: Decimal(10, 2), Default `0.00`.
  - `payment_status`: Enum (`Paid`, `Partial`, `Credit`, `Pending`), Not Null.
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank Transfer`), Default `Cash`.
  - `payment_reference`: String(100), Nullable.
  - `status`: Enum (`Active`, `Deleted`, `Cancelled`), Default `Active`.
  - `created_at`: DateTime (UTC), Default `Now()`.
- **Relationships**:
  - `supplier`: Many-to-One with `Supplier`.
  - `items`: One-to-Many with `PurchaseItem`.

#### 12. Entity: `PurchaseItem` (`purchase_items`)
- **Purpose**: Line items for inward goods purchase.
- **Fields**:
  - `id`: BigInteger, Primary Key, Auto-increment.
  - `purchase_id`: BigInteger, ForeignKey(`purchases.id`), Not Null, Indexed.
  - `product_id`: Integer, ForeignKey(`products.id`), Not Null.
  - `product_name`: String(255), Not Null.
  - `sku`: String(100), Not Null.
  - `quantity`: Integer, Not Null.
  - `purchase_rate`: Decimal(10, 2), Not Null.
  - `discount`: Decimal(10, 2), Default `0.00`.
  - `gst_percent`: Decimal(5, 2), Default `0.00`.
  - `taxable_amount`: Decimal(10, 2), Not Null.
  - `gst_amount`: Decimal(10, 2), Not Null.
  - `total`: Decimal(10, 2), Not Null.

#### 13. Entity: `SupplierPayment` (`supplier_payments`)
- **Purpose**: Disbursements paid to suppliers against payables.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `supplier_id`: Integer, ForeignKey(`suppliers.id`), Not Null, Indexed.
  - `purchase_id`: BigInteger, ForeignKey(`purchases.id`), Nullable.
  - `amount`: Decimal(10, 2), Not Null.
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank Transfer`), Not Null.
  - `reference`: String(100), Nullable.
  - `notes`: Text, Nullable.
  - `date`: DateTime (UTC), Not Null.
  - `created_at`: DateTime (UTC), Default `Now()`.

#### 14. Entity: `SupplierLedgerEntry` (`supplier_ledger`)
- **Purpose**: Supplier accounts payable journal statement.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `supplier_id`: Integer, ForeignKey(`suppliers.id`), Not Null, Indexed.
  - `type`: String(50), Not Null (`Purchase`, `Payment`, `Purchase Return`, `Reversal`, `Opening Balance`).
  - `reference_id`: String(100), Nullable.
  - `description`: String(255), Not Null.
  - `debit`: Decimal(10, 2), Default `0.00` (Decreases payable).
  - `credit`: Decimal(10, 2), Default `0.00` (Increases payable).
  - `balance`: Decimal(10, 2), Not Null (Running debt balance).
  - `date`: DateTime (UTC), Not Null, Indexed.

#### 15. Entity: `PurchaseReturn` (`purchase_returns`)
- **Purpose**: Inward purchase returns sent back to supplier.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `supplier_id`: Integer, ForeignKey(`suppliers.id`), Not Null.
  - `purchase_id`: BigInteger, ForeignKey(`purchases.id`), Not Null.
  - `purchase_invoice_no`: String(100), Not Null.
  - `product_id`: Integer, ForeignKey(`products.id`), Not Null.
  - `product_name`: String(255), Not Null.
  - `quantity`: Integer, Not Null.
  - `amount`: Decimal(10, 2), Not Null.
  - `reason`: String(255), Not Null.
  - `date`: DateTime (UTC), Not Null.

#### 16. Entity: `Expense` (`expenses`)
- **Purpose**: Overhead & operational expenditures.
- **Fields**:
  - `id`: String(50) / UUID, Primary Key (e.g. `EXP-00001`).
  - `expense_date`: Date, Not Null, Indexed.
  - `category`: String(100), Not Null, Indexed (`Tea & Coffee`, `Rent`, `Salary`, etc.).
  - `expense_name`: String(255), Not Null.
  - `description`: Text, Nullable.
  - `quantity`: Decimal(10, 2), Default `1.00`.
  - `unit`: String(50), Default `'Pcs'`.
  - `unit_price`: Decimal(10, 2), Default `0.00`.
  - `total_amount`: Decimal(10, 2), Not Null.
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank Transfer`, `Credit / Pay Later`), Default `Cash`.
  - `paid_by`: String(100), Default `'Admin'`.
  - `receipt_number`: String(100), Nullable.
  - `payment_status`: Enum (`Paid`, `Pending / Due`), Default `Paid`.
  - `notes`: Text, Nullable.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.

#### 17. Entity: `ServiceOrder` (`services`)
- **Purpose**: Customer sports equipment maintenance, stringing, and repair orders.
- **Fields**:
  - `id`: String(50), Primary Key (e.g. `SRV-00001`).
  - `customer_mobile`: String(20), Not Null, Indexed.
  - `customer_name`: String(255), Not Null.
  - `customer_address`: Text, Nullable.
  - `equipment_type`: String(100), Not Null (`Badminton Racket`, `Cricket Bat`, etc.).
  - `brand`: String(100), Nullable.
  - `model`: String(100), Nullable.
  - `condition_at_receipt`: Text, Nullable.
  - `service_type`: String(100), Not Null (`Stringing / Gutting`, etc.).
  - `customer_complaint`: Text, Nullable.
  - `work_required`: Text, Not Null.
  - `date_received`: Date, Not Null, Indexed.
  - `expected_completion_date`: Date, Not Null.
  - `technician`: String(100), Default `'Senior Technician'`.
  - `estimated_price`: Decimal(10, 2), Default `0.00`.
  - `final_service_charge`: Decimal(10, 2), Not Null.
  - `discount`: Decimal(10, 2), Default `0.00`.
  - `gst_rate`: Decimal(5, 2), Default `0.00`.
  - `advance_paid`: Decimal(10, 2), Default `0.00`.
  - `total_amount`: Decimal(10, 2), Not Null.
  - `balance_due`: Decimal(10, 2), Not Null.
  - `payment_method`: Enum (`Cash`, `UPI`, `Card`, `Bank Transfer`), Default `Cash`.
  - `payment_status`: Enum (`Unpaid`, `Partially Paid`, `Paid`), Default `Unpaid`.
  - `status`: Enum (`Received`, `Pending`, `In Progress`, `Completed`, `Collected`, `Cancelled`), Default `Received`, Indexed.
  - `notes`: Text, Nullable.
  - `created_at`: DateTime (UTC), Default `Now()`.
  - `updated_at`: DateTime (UTC), Nullable.
- **Relationships**:
  - `payments`: One-to-Many with `ServicePayment`.

#### 18. Entity: `ServicePayment` (`service_payments`)
- **Purpose**: Advance deposits and final settlement payments for repair orders.
- **Fields**:
  - `id`: BigInteger / UUID, Primary Key.
  - `service_id`: String(50), ForeignKey(`services.id`), Not Null, Indexed.
  - `amount`: Decimal(10, 2), Not Null.
  - `payment_method`: String(50), Not Null.
  - `type`: String(50), Default `'Payment'`.
  - `notes`: Text, Nullable.
  - `date`: DateTime (UTC), Not Null.
  - `created_at`: DateTime (UTC), Default `Now()`.

#### 19. Entity: `AppSetting` (`app_settings`)
- **Purpose**: System-wide key-value or grouped configuration documents (store, invoice, gst, payments, printer, general, security).
- **Fields**:
  - `id`: Integer, Primary Key (single row configuration).
  - `section`: String(50), Not Null (e.g. `'store'`, `'invoice'`, `'gst'`, `'payments'`, `'printer'`, `'general'`, `'security'`).
  - `config_data`: JSONB / JSON, Not Null.
  - `updated_at`: DateTime (UTC), Default `Now()`.

---

### 4.3 Authentication and Permissions Matrix

| Frontend Page / Workflow | Login Required | Frontend Checked Role | Proposed Backend Permission / Scope |
|---|---|---|---|
| `/login` | No | Public | Public |
| `/dashboard` | Yes | Authenticated (`Admin` shown) | `dashboard:read` |
| `/billing` (POS) | Yes | Authenticated | `sales:create`, `products:read`, `customers:read`, `customers:create` |
| `/products` | Yes | Authenticated | `products:read`, `products:write`, `categories:write` |
| `/inventory` | Yes | Authenticated | `inventory:read`, `inventory:adjust` |
| `/sales` | Yes | Authenticated | `sales:read`, `sales:return` |
| `/purchases` | Yes | Authenticated | `purchases:read`, `purchases:write`, `suppliers:write` |
| `/customers` | Yes | Authenticated | `customers:read`, `customers:write`, `customers:payment` |
| `/suppliers` | Yes | Authenticated | `suppliers:read`, `suppliers:write`, `suppliers:payment` |
| `/expenses` | Yes | Authenticated | `expenses:read`, `expenses:write` |
| `/services` | Yes | Authenticated | `services:read`, `services:write`, `services:payment` |
| `/reports/*` | Yes | Authenticated | `reports:read`, `reports:export` |
| `/settings/*` | Yes | Authenticated (`Admin` shown) | `settings:read`, `settings:write`, `system:backup` |

---

### 4.4 Backend Implementation Checklist

#### 1. Models & Database Layer
- [ ] Initialize SQLAlchemy 2.0 ORM models for all 19 entities.
- [ ] Configure PostgreSQL schema migrations with Alembic.
- [ ] Implement database indexes on search columns (`sku`, `barcode`, `name`, `phone`, `invoice_no`, `date`).
- [ ] Add check constraints (`mrp >= price`, `offer_price <= price`, `amount >= 0`).

#### 2. Schemas & Serialization (Pydantic v2)
- [ ] Auth schemas (`LoginRequest`, `TokenResponse`, `UserOut`).
- [ ] Category schemas (`CategoryCreate`, `CategoryUpdate`, `CategoryOut`).
- [ ] Product schemas (`ProductCreate`, `ProductUpdate`, `ProductOut`, `ProductFilterParams`).
- [ ] Inventory schemas (`StockAdjustmentCreate`, `StockMovementOut`).
- [ ] POS Billing & Sale schemas (`SaleCreate`, `SaleItemCreate`, `SaleOut`, `SaleReturnCreate`).
- [ ] Purchase schemas (`PurchaseCreate`, `PurchaseUpdate`, `PurchaseOut`, `PurchasePaymentCreate`, `PurchaseReturnCreate`).
- [ ] Customer schemas (`CustomerCreate`, `CustomerUpdate`, `CustomerOut`, `CustomerPaymentCreate`, `Customer360Out`).
- [ ] Supplier schemas (`SupplierCreate`, `SupplierUpdate`, `SupplierOut`, `SupplierPaymentCreate`, `Supplier360Out`).
- [ ] Expense schemas (`ExpenseCreate`, `ExpenseUpdate`, `ExpenseOut`).
- [ ] Service Order schemas (`ServiceCreate`, `ServiceUpdate`, `ServiceStatusUpdate`, `ServicePaymentCreate`, `ServiceOut`).
- [ ] Reports schemas (`SalesReportOut`, `ProfitAndLossOut`, `GstReportOut`).
- [ ] Settings schemas (`SettingsPayload`, `StoreSettings`, `InvoiceSettings`).

#### 3. Business Logic & Services
- [ ] **Sale Checkout Service**: Atomic transaction that locks products, decrements stock, records `SALE_OUT` movements, creates customer debt on credit, and generates unique sequential `invoiceNo` (`EK-000001`).
- [ ] **Sales Return Service**: Restocks product stock (`SALES_RETURN`), updates item returned counts, and marks sale status.
- [ ] **Purchase Inward Service**: Increases product stock (`PURCHASE_IN`), tracks outstanding payables, and logs double-entry supplier credit ledger.
- [ ] **Inventory Adjustment Service**: Implements `Add`, `Remove`, and `Set` arithmetic with `before_stock`/`after_stock` tracking.
- [ ] **Customer & Supplier Ledger Balancing**: Running balance integrity calculation.
- [ ] **P&L and GST Aggregation Service**: Accurate computation of Gross Profit (Revenue - COGS) and Net Tax Liability (Output GST - Input GST).

#### 4. API Routers
- [ ] `/api/v1/auth` (JWT bearer token handling, login, logout, password change).
- [ ] `/api/v1/dashboard` (Metrics, timeseries chart data).
- [ ] `/api/v1/categories` (CRUD).
- [ ] `/api/v1/products` (CRUD, status toggle, search).
- [ ] `/api/v1/inventory` (Stock levels, adjustment, history).
- [ ] `/api/v1/sales` (POS checkout, returns, history).
- [ ] `/api/v1/purchases` (Orders, inwarding, payments, returns).
- [ ] `/api/v1/customers` (Directory, payments, 360 view).
- [ ] `/api/v1/suppliers` (Directory, payments, 360 view).
- [ ] `/api/v1/expenses` (Daily expense tracking).
- [ ] `/api/v1/services` (Job card management, status workflow, advance/settlement).
- [ ] `/api/v1/reports` (P&L, GST, CSV exports).
- [ ] `/api/v1/settings` (Store profile, invoice format, printer).
- [ ] `/api/v1/system` (Backup export/import).

#### 5. Testing & Verification
- [ ] Unit tests for stock deduction and rollback.
- [ ] Concurrency testing on simultaneous sales of same SKU.
- [ ] P&L mathematical verification with expenses and returns.
- [ ] Authorization tests verifying protected endpoints reject unauthenticated requests.

---

### 4.5 Missing or Unclear Requirements

The following requirements cannot be determined definitively from the frontend source code and require confirmation:

1. **User Role Granularity**: The frontend UI displays `Admin User` with role `Admin`, and contains an unused route `/users` ("Users & Roles"). Does the backend require multi-user role-based access control (RBAC) with specific permission boundaries for `Cashier` vs `Manager` vs `Admin`?
2. **Barcode Scanner Protocol**: The frontend product search listens to keystroke inputs on `searchQuery` and supports searching by barcode. Does the hardware barcode scanner operate as a standard USB Keyboard Emulation (HID sending `Enter` suffix), or is a dedicated scanner webhook needed?
3. **Sequential Invoice Counter Reset**: The settings define an invoice prefix (e.g. `INV-` or `EK-`) and starting number `nextNumber`. Does the invoice sequence reset annually with financial years (e.g., `EK-26-27-0001`), or remain continuously monotonic?
4. **GST Tax Structure & Inter-State Invoicing**: The billing calculations currently split tax equally into 50% CGST and 50% SGST (intra-state Tamil Nadu). Is IGST (Integrated GST for out-of-state customers/suppliers) required when customer/supplier state differs from store state?
5. **Product Cost Price (COGS) Sourcing**: Currently, the P&L report estimates COGS as `price * 0.7` if a purchase rate is not snapshotted on the sale item. Should the backend maintain a true FIFO (First-In, First-Out) or Weighted Average Cost (WAC) inventory valuation engine?
6. **Hard Deletion vs Soft Deletion**: Several pages (Products, Customers, Suppliers, Purchases) enforce frontend checks that prevent deletion if transaction history exists. Should the backend implement soft-deletes (`deleted_at` timestamp / `is_deleted` flag) across all core entities?
7. **Multi-Store / Multi-Branch Readiness**: All frontend code operates on a single store configuration (`settings.store`). Is the backend intended for single-tenant / single-store deployment, or should database schemas include a `store_id` / `tenant_id` column from day one?

---

*Documentation generated by Antigravity Senior Software Analyst based directly on frontend source inspection.*
