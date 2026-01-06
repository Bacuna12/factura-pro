
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Client, Document, DocumentType, DocumentStatus, AppSettings, LineItem } from '../types';
import { exportToPDF, shareViaWhatsApp } from '../services/pdfService';

interface POSProps {
  products: Product[];
  clients: Client[];
  settings: AppSettings;
  onSaveDocument: (doc: Document) => void;
  onUpdateClients: (clients: Client[]) => void;
}

const POS: React.FC<POSProps> = ({ products, clients, settings, onSaveDocument, onUpdateClients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [cart, setCart] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(true);
  const [successDoc, setSuccessDoc] = useState<Document | null>(null);

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientResultsOpen, setIsClientResultsOpen] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const [isWhatsAppConfirmOpen, setIsWhatsAppConfirmOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState<Client>({
    id: '', name: '', email: '', phone: '', taxId: '', address: '', city: '', municipality: '', zipCode: ''
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientResultsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'General'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = p.description.toLowerCase().includes(lowerSearch) || 
                           (p.barcode && p.barcode.includes(searchTerm)) ||
                           (p.sku && p.sku.toLowerCase().includes(lowerSearch));
      const matchesCat = activeCategory === 'Todas' || (p.category || 'General') === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, activeCategory]);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients.slice(0, 5);
    return clients.filter(c => 
      c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
      c.taxId.includes(clientSearchTerm)
    );
  }, [clients, clientSearchTerm]);

  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [clients, selectedClientId]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([{ 
        id: product.id, 
        description: product.description, 
        quantity: 1, 
        unitPrice: product.salePrice,
        image: product.image 
      }, ...cart]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return { ...item, quantity: newQty };
        }
        return item;
      });
      return updatedCart.filter(item => item.quantity > 0);
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (settings.defaultTaxRate / 100);
  const total = subtotal + tax;

  const handleOpenClientModal = (client?: Client) => {
    if (client) {
      setClientForm({ ...client });
    } else {
      setClientForm({
        id: Math.random().toString(36).substr(2, 9),
        name: '', email: '', phone: '', taxId: '', address: 'General', city: 'Principal', municipality: 'Principal', zipCode: '0000'
      });
    }
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    const exists = clients.find(c => c.id === clientForm.id);
    let newClients;
    if (exists) {
      newClients = clients.map(c => c.id === clientForm.id ? clientForm : c);
    } else {
      newClients = [clientForm, ...clients];
    }
    onUpdateClients(newClients);
    setSelectedClientId(clientForm.id);
    setIsClientModalOpen(false);
  };

  const processSale = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const docNumber = `POS-${Date.now().toString().slice(-6)}`;
    const newDoc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: DocumentType.INVOICE,
      number: docNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      clientId: selectedClientId,
      items: cart,
      status: DocumentStatus.PAID,
      notes: 'Venta rápida POS',
      taxRate: settings.defaultTaxRate,
      logo: settings.logo,
      paymentMethod,
      isPOS: true,
      payments: [{
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        amount: total,
        method: paymentMethod
      }]
    };

    try {
      onSaveDocument(newDoc);
      if (shouldPrint) {
        const client = clients.find(c => c.id === selectedClientId);
        exportToPDF(newDoc, client, settings);
      }
      setSuccessDoc(newDoc);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      alert("Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleOpenWhatsAppConfirm = () => {
    const client = clients.find(c => c.id === successDoc?.clientId);
    setWhatsappPhone(client?.phone || '');
    setIsWhatsAppConfirmOpen(true);
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (successDoc) {
      const client = clients.find(c => c.id === successDoc.clientId);
      shareViaWhatsApp(successDoc, client, settings, whatsappPhone);
      setIsWhatsAppConfirmOpen(false);
      setSuccessDoc(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-100px)] gap-4 bg-slate-50/50 p-2 md:p-4 overflow-hidden">
      <div className="flex-[2.5] flex flex-col min-h-0 space-y-4">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-[32px] border border-white shadow-xl shadow-slate-200/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Explorar</h2>
            <div className="flex gap-2">
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {filteredProducts.length} Ítems
              </span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input type="text" placeholder="¿Qué estás buscando hoy?" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-100 text-slate-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm transition-all" />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:max-w-md">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3 content-start scrollbar-hide pb-20 lg:pb-0">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => addToCart(p)} className="group relative flex flex-col bg-white rounded-[24px] p-2 border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left active:scale-95">
              <div className="aspect-square rounded-[20px] bg-slate-50 mb-3 overflow-hidden relative">
                {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" /> : <div className="w-full h-full flex items-center justify-center text-3xl opacity-10">📦</div>}
                <div className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-blue-600 font-bold">+</span>
                </div>
              </div>
              <div className="px-1">
                <h3 className="font-bold text-slate-800 text-[10px] line-clamp-1 leading-tight mb-1">{p.description}</h3>
                <p className="font-black text-blue-600 text-xs">{formatCurrency(p.salePrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[320px] flex flex-col bg-slate-900 rounded-[32px] md:rounded-[40px] shadow-2xl text-white overflow-hidden border border-white/5 relative">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black tracking-tighter uppercase">RESUMEN</h3>
            <button onClick={() => setCart([])} className="text-[10px] font-black text-slate-500 hover:text-rose-400">VACIAR</button>
          </div>
          <div className="space-y-1 relative" ref={clientSearchRef}>
            <div className="flex justify-between items-center px-1 mb-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cliente Receptor</label>
              <div className="flex gap-2">
                <button onClick={() => handleOpenClientModal()} className="text-blue-400 text-[10px] font-black hover:text-blue-300">+ NUEVO</button>
                <button onClick={() => handleOpenClientModal(selectedClient)} className="text-amber-400 text-[10px] font-black hover:text-amber-300">✏️ EDITAR</button>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder={selectedClient ? selectedClient.name : "Buscar cliente..."} value={clientSearchTerm} onFocus={() => setIsClientResultsOpen(true)} onChange={(e) => { setClientSearchTerm(e.target.value); setIsClientResultsOpen(true); }} className="w-full bg-white/10 border border-white/5 rounded-2xl p-3 pl-10 font-bold text-xs outline-none text-white focus:ring-1 focus:ring-blue-500/50" />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm opacity-30">🔍</span>
            </div>
            {isClientResultsOpen && (
              <div className="absolute z-[100] bottom-full left-0 right-0 mb-2 bg-slate-800 border border-white/10 rounded-[20px] shadow-2xl overflow-hidden animate-fadeIn">
                <div className="max-h-48 overflow-y-auto scrollbar-hide">
                  {filteredClients.map(c => (
                    <button key={c.id} type="button" onClick={() => { setSelectedClientId(c.id); setClientSearchTerm(''); setIsClientResultsOpen(false); }} className={`w-full p-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between group ${selectedClientId === c.id ? 'bg-blue-600/20' : ''}`}>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-100 text-xs truncate">{c.name}</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{c.taxId}</p>
                      </div>
                      {selectedClientId === c.id && <span className="text-blue-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-3 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">🛒</div>
              <p className="font-black uppercase tracking-widest text-[10px]">Sin productos</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-[24px] border border-white/5 animate-slideIn">
                <div className="w-10 h-10 rounded-xl bg-white/10 overflow-hidden flex-shrink-0">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-lg">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[10px] truncate text-slate-100">{item.description}</h4>
                  <p className="text-blue-400 font-black text-[10px]">{formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20">-</button>
                  <span className="font-black text-xs w-3 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded-lg bg-white/10 hover:bg-white/20">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-rose-500/50 hover:text-rose-500">✕</button>
              </div>
            ))
          )}
        </div>
        <div className="p-6 bg-black/50 backdrop-blur-xl border-t border-white/5 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-slate-400 text-[10px] font-bold"><span>SUBTOTAL</span><span className="text-slate-200">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-slate-400 text-[10px] font-bold"><span>IMPUESTOS ({settings.defaultTaxRate}%)</span><span className="text-slate-200">{formatCurrency(tax)}</span></div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">TOTAL A PAGAR</span>
              <p className="text-2xl font-black text-blue-400 leading-none">{formatCurrency(total)}</p>
            </div>
            <button onClick={() => cart.length > 0 && setIsCheckoutOpen(true)} disabled={cart.length === 0} className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-white/5 text-white rounded-2xl font-black shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">COBRAR</button>
          </div>
        </div>
      </div>

      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-sm:max-w-sm overflow-hidden shadow-2xl animate-slideUp">
            <div className="bg-blue-600 p-8 text-white relative">
              <h3 className="text-2xl font-black">Datos del Cliente</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white text-2xl transition-all">✕</button>
            </div>
            <form onSubmit={handleSaveClient} className="p-8 space-y-5 bg-white dark:bg-slate-950">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest px-1">Nombre / Empresa</label>
                <input required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest px-1">NIT / CC</label>
                <input required value={clientForm.taxId} onChange={e => setClientForm({...clientForm, taxId: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest px-1">Dirección</label>
                <input required value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest px-1">WhatsApp</label>
                <input required type="tel" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Guardar Cliente</button>
            </form>
          </div>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-sm:max-w-xs max-w-sm overflow-hidden shadow-2xl animate-slideUp">
            <div className="bg-blue-600 p-8 text-white relative text-center">
              <h3 className="text-3xl font-black tracking-tight">{formatCurrency(total)}</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white text-2xl transition-all">✕</button>
            </div>
            <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {id: 'Efectivo', icon: '💵', isImage: false},
                    {id: 'Transferencia', icon: '📱', isImage: false},
                    {id: 'Nequi', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Nequi_Logo.svg/1024px-Nequi_Logo.svg.png', isImage: true},
                    {id: 'Tarjeta', icon: '💳', isImage: false}
                  ].map(method => (
                    <button key={method.id} onClick={() => setPaymentMethod(method.id)} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl border-2 transition-all h-24 ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-50 dark:border-slate-800 text-slate-400'}`}>
                      {method.isImage ? <img src={method.icon} alt={method.id} className="h-12 w-auto object-contain brightness-110 contrast-125" /> : <span className="text-2xl">{method.icon}</span>}
                      <span className="font-black text-[8px] uppercase tracking-widest text-slate-900 dark:text-slate-400">{method.id}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3"><span className="text-xl">🖨️</span><div><p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">Generar Recibo</p></div></div>
                <button onClick={() => setShouldPrint(!shouldPrint)} className={`w-12 h-6 rounded-full transition-all relative ${shouldPrint ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${shouldPrint ? 'left-7' : 'left-1'}`}></div></button>
              </div>
              <button onClick={processSale} disabled={isProcessing} className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                {isProcessing ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>✓ COMPLETAR VENTA</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {successDoc && !isWhatsAppConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[999999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-[40px] w-full max-w-sm p-10 text-center animate-slideUp">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Venta Exitosa</h3>
            <div className="space-y-3">
              <button onClick={handleOpenWhatsAppConfirm} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Compartir WhatsApp</button>
              <button onClick={() => setSuccessDoc(null)} className="w-full py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isWhatsAppConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[9999999]" onClick={() => setIsWhatsAppConfirmOpen(false)}>
          <div className="bg-white dark:bg-slate-950 rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-600 p-8 text-white text-center"><h3 className="text-xl font-black">Enviar Factura</h3></div>
            <form onSubmit={handleSendWhatsApp} className="p-8 space-y-6 bg-white dark:bg-slate-950">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest">Número de WhatsApp</label>
                <input type="tel" autoFocus required value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-transparent focus:border-emerald-500 rounded-2xl font-black text-lg outline-none" />
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">ENVIAR AHORA</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default POS;
