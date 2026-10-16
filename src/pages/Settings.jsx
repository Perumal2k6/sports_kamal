import React, { useState, useEffect } from 'react';
import { Store, FileText, Calculator, CreditCard, Printer, Database, Settings as SettingsIcon, Shield, Upload, Download, AlertTriangle, CheckCircle, LogOut } from 'lucide-react';
import { getSettings, saveSettings } from '../lib/db';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const data = getSettings();
    setSettings(data);
    setOriginalSettings(JSON.parse(JSON.stringify(data)));
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    if (activeTab === 'profile') {
      if (!settings.store.shopName) return showToast('Shop Name is required', 'error');
      if (!settings.store.phone || settings.store.phone.length < 10) return showToast('Enter a valid mobile number', 'error');
    }
    
    saveSettings(settings);
    setOriginalSettings(JSON.parse(JSON.stringify(settings)));
    setIsDirty(false);
    
    if (activeTab === 'general') {
      if (settings.general.theme === 'Dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    showToast('✓ Settings saved successfully.');
  };

  const handleDiscard = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setIsDirty(false);
  };

  const updateSection = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setIsDirty(true);
  };

  const handleTabChange = (tabId) => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Discard them?')) {
        handleDiscard();
        setActiveTab(tabId);
      }
    } else {
      setActiveTab(tabId);
    }
  };

  const exportBackup = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = JSON.parse(localStorage.getItem(key));
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `everykadai-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Backup exported successfully.');
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (window.confirm('Import Backup? This will replace current application data.')) {
          localStorage.clear();
          Object.keys(data).forEach(key => {
            localStorage.setItem(key, JSON.stringify(data[key]));
          });
          showToast('✓ Backup restored successfully.');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (err) {
        showToast('Invalid EVERYKADAI backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const resetDemoData = () => {
    if (window.confirm('Reset Demo Data? This will remove current demo transactions and restore the original dataset.')) {
      if (window.confirm('Are you absolutely sure? All your added sales and products will be lost.')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const testPrint = () => {
    const content = `
      <div style="width: 300px; padding: 20px; font-family: monospace; text-align: center;">
        <h2>${settings.store.shopName}</h2>
        <p>${settings.store.address}<br/>${settings.store.city}, ${settings.store.state}</p>
        <p>Ph: ${settings.store.phone}</p>
        <hr style="border-top: 1px dashed #000; my-4;" />
        <h3>TEST PRINT</h3>
        <p>Printer integration successful.</p>
        <hr style="border-top: 1px dashed #000; my-4;" />
        <p>${settings.invoice.footerMessage}</p>
      </div>
    `;
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    showToast('✓ Test print opened.');
  };

  const handleLogout = () => {
    window.location.href = '/login';
  };

  if (!settings) return null;

  const tabs = [
    { id: 'profile', label: 'Shop Profile', icon: Store },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'gst', label: 'GST & Tax', icon: Calculator },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'printer', label: 'Printer', icon: Printer },
    { id: 'backup', label: 'Backup', icon: Database },
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 w-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
          {toast.type === 'error' ? <AlertTriangle className="mr-2" size={20} /> : <CheckCircle className="mr-2" size={20} />}
          {toast.message}
        </div>
      )}

      {/* Header spanning full width */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your store, billing, tax and application preferences.</p>
        </div>
      </div>

      {/* Normal Horizontal Settings Navigation */}
      <div className="border-b-2 border-slate-200 overflow-x-auto hide-scrollbar w-full">
        <div className="flex w-full min-w-max">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => handleTabChange(tab.id)} 
              className={`flex-1 flex justify-center items-center px-4 py-4 font-bold text-sm transition-colors whitespace-nowrap border-b-2 -mb-[2px] ${
                activeTab === tab.id 
                  ? 'border-primary-600 text-primary-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Settings Content Area */}
      <div className="w-full">
        
        {/* SHOP PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Shop Profile</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Manage your business information used across invoices and reports.</p>
              
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Shop Name *</label>
                  <input type="text" className="input-field" value={settings.store.shopName} onChange={e => updateSection('store', 'shopName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Owner Name</label>
                  <input type="text" className="input-field" value={settings.store.ownerName} onChange={e => updateSection('store', 'ownerName', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Business Phone *</label>
                  <input type="text" className="input-field" value={settings.store.phone} onChange={e => updateSection('store', 'phone', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input type="email" className="input-field" value={settings.store.email} onChange={e => updateSection('store', 'email', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Complete Address</label>
                  <input type="text" className="input-field" value={settings.store.address} onChange={e => updateSection('store', 'address', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">City</label>
                  <input type="text" className="input-field" value={settings.store.city} onChange={e => updateSection('store', 'city', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">District</label>
                  <input type="text" className="input-field" value={settings.store.district} onChange={e => updateSection('store', 'district', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">State</label>
                  <input type="text" className="input-field" value={settings.store.state} onChange={e => updateSection('store', 'state', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pincode</label>
                  <input type="text" className="input-field" value={settings.store.pincode} onChange={e => updateSection('store', 'pincode', e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Tax Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">GSTIN</label>
                  <input type="text" className="input-field" value={settings.store.gstin} onChange={e => updateSection('store', 'gstin', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">PAN</label>
                  <input type="text" className="input-field" value={settings.store.pan} onChange={e => updateSection('store', 'pan', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INVOICE SETTINGS */}
        {activeTab === 'invoice' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Invoice Settings</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Configure how your receipts and invoices look.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Invoice Numbering</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Invoice Prefix</label>
                  <input type="text" className="input-field" value={settings.invoice.prefix} onChange={e => updateSection('invoice', 'prefix', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Starting Number</label>
                  <input type="number" className="input-field" value={settings.invoice.nextNumber} onChange={e => updateSection('invoice', 'nextNumber', parseInt(e.target.value)||1)} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Invoice Template</h3>
              <div className="flex flex-wrap gap-4">
                {['Classic', 'Modern', 'Compact', 'Thermal'].map(tpl => (
                  <button 
                    key={tpl} 
                    className={`px-6 py-3 rounded-lg border-2 font-bold ${settings.invoice.template === tpl ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                    onClick={() => updateSection('invoice', 'template', tpl)}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Invoice Display</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.keys(settings.invoice).filter(k => k.startsWith('show')).map(key => (
                  <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="sr-only" checked={settings.invoice[key]} onChange={e => updateSection('invoice', key, e.target.checked)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${settings.invoice[key] ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${settings.invoice[key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="font-bold text-slate-700">{key.replace('show', '').replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Invoice Footer</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Footer Message</label>
                  <input type="text" className="input-field" value={settings.invoice.footerMessage} onChange={e => updateSection('invoice', 'footerMessage', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Terms & Conditions</label>
                  <textarea className="input-field min-h-[100px]" value={settings.invoice.terms} onChange={e => updateSection('invoice', 'terms', e.target.value)}></textarea>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GST & TAX */}
        {activeTab === 'gst' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">GST & Tax</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Configure your GST registration and applicable tax rates.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Business GST</h3>
              <div className="space-y-8">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" className="sr-only" checked={settings.gst.registered} onChange={e => updateSection('gst', 'registered', e.target.checked)} />
                    <div className={`w-11 h-6 rounded-full transition-colors ${settings.gst.registered ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${settings.gst.registered ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <span className="font-bold text-slate-800 text-lg">GST Registered</span>
                </label>

                {settings.gst.registered && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">GSTIN</label>
                      <input type="text" className="input-field" value={settings.store.gstin} onChange={e => updateSection('store', 'gstin', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Business State</label>
                      <input type="text" className="input-field" value={settings.gst.state} onChange={e => updateSection('gst', 'state', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">GST Type</label>
                      <select className="input-field" value={settings.gst.type} onChange={e => updateSection('gst', 'type', e.target.value)}>
                        <option>Regular</option>
                        <option>Composition</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Tax Rates</h3>
              <div className="flex flex-wrap gap-3">
                {settings.gst.taxRates.map(rate => (
                  <div key={rate} className="px-5 py-2 bg-slate-100 border border-slate-300 rounded-lg text-lg font-black text-slate-700">
                    {rate}%
                  </div>
                ))}
                <button onClick={() => {
                  const nr = prompt('Enter new tax rate % (e.g. 5)');
                  if (nr && !isNaN(nr)) {
                    updateSection('gst', 'taxRates', [...new Set([...settings.gst.taxRates, Number(nr)])].sort((a,b)=>a-b));
                  }
                }} className="px-5 py-2 bg-white border-2 border-dashed border-primary-500 text-primary-600 rounded-lg text-lg font-bold hover:bg-primary-50">+ Add Rate</button>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Payments</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Manage payment options available in the POS.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Payment Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['cash', 'upi', 'bank'].map(method => (
                  <label key={method} className="flex items-center justify-between p-4 border border-slate-200 bg-white rounded-lg cursor-pointer hover:border-primary-400 transition-colors">
                    <span className="font-bold text-slate-700 capitalize text-lg">{method}</span>
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="sr-only" checked={settings.payments[method]} onChange={e => updateSection('payments', method, e.target.checked)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${settings.payments[method] ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${settings.payments[method] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Default Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Default Payment Method</label>
                  <select className="input-field" value={settings.payments.defaultMethod} onChange={e => updateSection('payments', 'defaultMethod', e.target.value)}>
                    {['Cash', 'UPI', 'Bank'].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Store UPI ID</label>
                  <input type="text" className="input-field" value={settings.payments.upiId} onChange={e => updateSection('payments', 'upiId', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRINTER */}
        {activeTab === 'printer' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Printer</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Configure receipt printing settings.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Printer Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Printer Paper Type</label>
                  <select className="input-field" value={settings.printer.type} onChange={e => updateSection('printer', 'type', e.target.value)}>
                    <option>A4</option>
                    <option>Thermal 80mm</option>
                    <option>Thermal 58mm</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Print Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {['autoPrint', 'showPreview', 'printCustomerCopy'].map(key => (
                  <label key={key} className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="sr-only" checked={settings.printer[key]} onChange={e => updateSection('printer', key, e.target.checked)} />
                      <div className={`w-11 h-6 rounded-full transition-colors ${settings.printer[key] ? 'bg-primary-600' : 'bg-slate-200'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform shadow-sm ${settings.printer[key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="font-bold text-slate-700">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  </label>
                ))}
              </div>
              <button onClick={testPrint} className="btn-secondary border-slate-300">Test Print</button>
            </div>
          </div>
        )}

        {/* BACKUP */}
        {activeTab === 'backup' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Backup & Restore</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Keep your data safe by exporting and importing system backups.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Backup</h3>
              <div className="bg-white p-6 border border-slate-200 rounded-xl mb-8 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Export Backup</h4>
                  <p className="text-slate-500 mt-1 text-sm">Download a complete JSON backup of all your products, sales, inventory, and settings.</p>
                </div>
                <button onClick={exportBackup} className="btn-primary flex items-center ml-4 whitespace-nowrap"><Download size={18} className="mr-2"/> Export Backup</button>
              </div>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Restore</h3>
              <div className="bg-white p-6 border border-slate-200 rounded-xl mb-8 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">Import Backup</h4>
                  <p className="text-slate-500 mt-1 text-sm">Restore your application data from a previously downloaded JSON backup file.</p>
                </div>
                <label className="btn-secondary flex items-center ml-4 whitespace-nowrap cursor-pointer">
                  <Upload size={18} className="mr-2"/> Import Backup
                  <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                </label>
              </div>

              <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Danger Zone</h3>
              <div className="bg-red-50 p-6 border border-red-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-red-800">Reset Demo Data</h4>
                  <p className="text-red-600 mt-1 text-sm">This will permanently delete all your data and restore the original demo products and customers.</p>
                </div>
                <button onClick={resetDemoData} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm ml-4 whitespace-nowrap">Reset Demo Data</button>
              </div>
            </div>
          </div>
        )}

        {/* GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">General</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Adjust the core application behavior and display.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Application</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                  <select className="input-field" value={settings.general.currency} onChange={e => updateSection('general', 'currency', e.target.value)}>
                    <option value="₹">₹ INR</option>
                    <option value="$">$ USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Date Format</label>
                  <select className="input-field" value={settings.general.dateFormat} onChange={e => updateSection('general', 'dateFormat', e.target.value)}>
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Time Format</label>
                  <select className="input-field" value={settings.general.timeFormat} onChange={e => updateSection('general', 'timeFormat', e.target.value)}>
                    <option>12 Hour</option>
                    <option>24 Hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Language</label>
                  <select className="input-field" disabled>
                    <option>English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Timezone</label>
                  <select className="input-field" disabled>
                    <option>Asia/Kolkata</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Display</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Theme</label>
                  <select className="input-field" value={settings.general.theme} onChange={e => updateSection('general', 'theme', e.target.value)}>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Default Page</label>
                  <select className="input-field" value={settings.general.defaultPage} onChange={e => updateSection('general', 'defaultPage', e.target.value)}>
                    <option>Dashboard</option>
                    <option>POS</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Inventory & Pagination</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Low Stock Threshold</label>
                  <input type="number" className="input-field" value={settings.general.lowStockThreshold} onChange={e => updateSection('general', 'lowStockThreshold', parseInt(e.target.value)||0)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Default Items Per Page</label>
                  <select className="input-field" value={settings.general.itemsPerPage} onChange={e => updateSection('general', 'itemsPerPage', parseInt(e.target.value))}>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Security</h2>
              <p className="text-slate-500 text-sm mb-6 pb-4 border-b border-slate-200">Manage your active session and passwords.</p>

              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Account</h3>
              <div className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-xl mb-6">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-2xl mr-4 border border-slate-200">AD</div>
                  <div>
                    <p className="font-bold text-slate-800 text-lg">Admin</p>
                    <p className="text-sm text-slate-500">User ID: #001</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Session</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Auto Logout</label>
                  <select className="input-field" value={settings.security.autoLogout ? 'Yes' : 'No'} onChange={e => updateSection('security', 'autoLogout', e.target.value === 'Yes')}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Session Timeout</label>
                  <select className="input-field" value={settings.security.sessionTimeout} onChange={e => updateSection('security', 'sessionTimeout', e.target.value)}>
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-200 pt-6">Authentication</h3>
              <div className="flex gap-4">
                <button className="btn-secondary font-bold text-slate-700" onClick={() => showToast('Password update disabled in demo mode.', 'error')}>Change Password</button>
                <button className="btn-primary" onClick={handleLogout}>Logout Session</button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Persistent Save Area at bottom */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex items-center justify-between z-20 animate-in slide-in-from-bottom-5">
          <div className="flex items-center text-orange-600 font-bold text-sm">
            <AlertTriangle size={18} className="mr-2"/> 
            You have unsaved changes.
          </div>
          <div className="flex space-x-3">
            <button onClick={handleDiscard} className="px-6 py-2 border border-slate-300 bg-white font-bold text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">Discard</button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary-600 font-bold text-white rounded-lg hover:bg-primary-700 transition-colors">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
