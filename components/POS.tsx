
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] md:h-[calc(100vh-60px)] gap-3 animate-fadeIn overflow-hidden bg-gray-50/50">
      {isScannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}

      {/* Catálogo Principal - Ahora más compacto */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        {/* Header POS Slim */}
        <div className="p-4 md:p-6 space-y-4 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Caja de Venta</h2>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg shadow-lg active:scale-90 transition-all"
            >
              📸
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm">🔍</span>
              <input 
                type="text"
                placeholder="Nombre o código..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-700"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide md:max-w-[300px]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Productos Grid Ultra denso */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-3 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group flex flex-col bg-white rounded-2xl p-2 border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all text-left relative overflow-hidden active:scale-95"
            >
              <div className="aspect-square rounded-xl bg-slate-50 mb-2 overflow-hidden relative">
                {p.image ? (
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl opacity-10">📦</div>
                )}
                {p.stock !== undefined && (
                  <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${p.stock <= 0 ? 'bg-rose-500 text-white' : 'bg-white/90 text-indigo-600'}`}>
                    S: {p.stock}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-[10px] line-clamp-2 leading-tight mb-1 h-6">{p.description}</h3>
              <div className="mt-auto">
                <p className="font-black text-indigo-600 text-[11px]">{formatCurrency(p.salePrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito Lateral Slim */}
      <div className="w-full lg:w-[380px] flex flex-col bg-slate-900 rounded-[32px] shadow-2xl text-white overflow-hidden border border-white/5">
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black tracking-tight">Carrito</h3>
            <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
              {cart.length} Ítems
            </span>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
            <select 
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 font-bold text-xs outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              {clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-2.5 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-6">
              <span className="text-4xl mb-3">🛒</span>
              <p className="font-black uppercase tracking-widest text-[10px]">Sin productos</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 group relative">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-lg">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[10px] truncate text-slate-100">{item.description}</h4>
                  <p className="text-indigo-400 font-black text-[9px]">{formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center font-black">-</button>
                  <span className="font-black text-[10px] w-3 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-5 h-5 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center font-black">+</button>
                </div>
                <button 
                   onClick={() => removeFromCart(item.id)} 
                   className="ml-1 text-rose-400 opacity-30 hover:opacity-100 transition-opacity text-sm"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-black/40 space-y-4">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex justify-between text-slate-400 text-[10px] font-bold">
              <span>Subtotal</span>
              <span className="text-slate-200">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[10px] font-bold">
              <span>IVA ({settings.defaultTaxRate}%)</span>
              <span className="text-slate-200">{formatCurrency(tax)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0.5">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Total</span>
              <p className="text-2xl font-black text-indigo-400 leading-none">{formatCurrency(total)}</p>
            </div>
            <button 
              onClick={() => cart.length > 0 && setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/10 disabled:text-white/20 text-white rounded-xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[10px]"
            >
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal Moderno Slim */}
      {isCheckoutOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[99999] flex items-center justify-center p-4"
          style={{ position: 'fixed', zIndex: 2147483647 }}
        >
          <div 
            className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-indigo-600 p-6 text-white relative">
              <h3 className="text-xl font-black tracking-tight">Confirmar Pago</h3>
              <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-[8px]">Total: {formatCurrency(total)}</p>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white text-2xl p-1">✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto a Recibir</p>
                <p className="text-4xl font-black text-slate-900">{formatCurrency(total)}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {id: 'Efectivo', icon: '💵'},
                    {id: 'Transferencia', icon: '📱'},
                    {id: 'Nequi', icon: '🟣'},
                    {id: 'Tarjeta', icon: '💳'}
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                        paymentMethod === method.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="text-lg">{method.icon}</span>
                      <span className="font-black text-[9px] uppercase">{method.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={processSale}
                  disabled={isProcessing}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Procesando...' : 'Finalizar Venta'}
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
