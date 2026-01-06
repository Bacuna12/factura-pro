
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Client, Document, DocumentType, DocumentStatus, AppSettings, LineItem, Payment } from '../types';
import BarcodeScanner from './BarcodeScanner';
import { exportToPDF } from '../services/pdfService';

interface POSProps {
  products: Product[];
  clients: Client[];
  settings: AppSettings;
  onSaveDocument: (doc: Document) => void;
}

const POS: React.FC<POSProps> = ({ products, clients, settings, onSaveDocument }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [cart, setCart] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isProcessing, setIsProcessing] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'General'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.barcode && p.barcode.includes(searchTerm));
      const matchesCat = activeCategory === 'Todas' || p.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, activeCategory]);

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
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0.1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (settings.defaultTaxRate / 100);
  const total = subtotal + tax;

  const handleScan = (code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) {
      addToCart(product);
    } else {
      alert("Producto no registrado: " + code);
    }
    setIsScannerOpen(false);
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
      const client = clients.find(c => c.id === selectedClientId);
      exportToPDF(newDoc, client, settings);
      
      setCart([]);
      setIsCheckoutOpen(false);
      alert(`Venta #${docNumber} Completada`);
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

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] md:h-[calc(100vh-60px)] gap-4 animate-fadeIn overflow-hidden">
      {isScannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}

      {/* Catálogo Principal */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100">
        {/* Header POS */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Terminal de Venta</h2>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="w-14 h-14 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center text-2xl shadow-xl shadow-indigo-100 active:scale-90 transition-all"
            >
              📸
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
              <input 
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-[24px] outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:max-w-[400px]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Productos Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group flex flex-col bg-white rounded-[32px] p-4 border border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all text-left relative overflow-hidden active:scale-95"
            >
              <div className="aspect-square rounded-[24px] bg-slate-50 mb-4 overflow-hidden relative">
                {p.image ? (
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl opacity-10">📦</div>
                )}
                <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[8px] font-black uppercase text-indigo-600">
                  Stock: {p.stock || 0}
                </div>
              </div>
              <h3 className="font-black text-slate-800 text-sm line-clamp-2 leading-tight mb-2 h-10">{p.description}</h3>
              <div className="mt-auto flex justify-between items-center">
                <p className="font-black text-indigo-600 text-base">{formatCurrency(p.salePrice)}</p>
                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">+</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar de Carrito */}
      <div className="w-full lg:w-[450px] flex flex-col bg-slate-900 rounded-[40px] shadow-2xl text-white overflow-hidden border border-white/5">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black tracking-tight">Venta Actual</h3>
            <span className="bg-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
              {cart.length} Ítems
            </span>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cliente Receptor</label>
            <select 
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-[20px] p-4 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              {clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 space-y-4 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-10">
              <span className="text-7xl mb-6">🛒</span>
              <p className="font-black uppercase tracking-[0.3em] text-xs">Escanea o selecciona<br/>un producto</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-[28px] border border-white/5 group relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex-shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-2xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate text-slate-100">{item.description}</h4>
                  <p className="text-indigo-400 font-black text-xs mt-1">{formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-xl">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-black text-lg">-</button>
                  <span className="font-black text-sm w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center font-black text-lg">+</button>
                </div>
                <button 
                   onClick={() => removeFromCart(item.id)} 
                   className="absolute -right-10 group-hover:right-4 transition-all w-8 h-8 text-rose-400 flex items-center justify-center"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-8 md:p-10 bg-black/40 space-y-6">
          <div className="space-y-3 border-b border-white/10 pb-6">
            <div className="flex justify-between text-slate-400 text-sm font-bold">
              <span>Subtotal</span>
              <span className="text-slate-200">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-sm font-bold">
              <span>IVA ({settings.defaultTaxRate}%)</span>
              <span className="text-slate-200">{formatCurrency(tax)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total de la Venta</span>
              <p className="text-4xl font-black text-indigo-400 leading-none">{formatCurrency(total)}</p>
            </div>
            <button 
              onClick={() => cart.length > 0 && setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="px-8 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/10 disabled:text-white/20 text-white rounded-[24px] font-black shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Pagar Ahora
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal Moderno */}
      {isCheckoutOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 md:p-10"
          style={{ position: 'fixed', zIndex: 2147483647 }}
        >
          <div 
            className="bg-white rounded-[48px] w-full max-w-xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-indigo-600 p-10 md:p-14 text-white relative">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-4xl">🧾</span>
                <h3 className="text-3xl font-black tracking-tight">Finalizar Compra</h3>
              </div>
              <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-[10px]">Documento Electrónico POS</p>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-10 right-10 text-white/50 hover:text-white text-4xl p-2 transition-all active:scale-75">✕</button>
            </div>

            <div className="p-10 md:p-14 space-y-10">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 text-center space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Monto Total a Recibir</p>
                <p className="text-5xl font-black text-slate-900">{formatCurrency(total)}</p>
              </div>

              <div className="space-y-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">¿Cómo paga el cliente?</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {id: 'Efectivo', icon: '💵'},
                    {id: 'Transferencia', icon: '📱'},
                    {id: 'Nequi', icon: '🟣'},
                    {id: 'Tarjeta', icon: '💳'}
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`group flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all active:scale-95 ${
                        paymentMethod === method.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xl shadow-indigo-500/10' 
                        : 'border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <span className={`text-2xl transition-transform ${paymentMethod === method.id ? 'scale-110' : ''}`}>{method.icon}</span>
                      <span className="font-black text-xs uppercase tracking-widest">{method.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 space-y-4">
                <button 
                  onClick={processSale}
                  disabled={isProcessing}
                  className="w-full py-6 bg-slate-900 text-white rounded-[30px] font-black shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar y Generar Recibo'}
                </button>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-full py-2 font-black text-slate-300 hover:text-slate-500 text-[10px] uppercase tracking-widest transition-colors"
                >
                  Seguir Comprando
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
