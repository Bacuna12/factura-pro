
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Client, Document, DocumentType, DocumentStatus, AppSettings, LineItem, Payment } from '../types';
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] md:h-[calc(100vh-60px)] gap-1.5 animate-fadeIn overflow-hidden bg-gray-50/50">
      {/* Catálogo Principal - Rediseñado para Alta Densidad */}
      <div className="flex-[3] flex flex-col min-h-0 bg-white rounded-[20px] md:rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
        {/* Header POS Ultra-Slim */}
        <div className="p-2 md:p-3 space-y-2 border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xs md:text-sm font-black text-slate-900 tracking-tight">CAJA / CATÁLOGO</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px]">🔍</span>
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-slate-50 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-[9px] text-slate-700"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide md:max-w-[180px]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded-md text-[6px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeCategory === cat ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Productos Grid Ultra Compacto - CORREGIDO EL ESTIRAMIENTO */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 scrollbar-hide content-start">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group flex flex-col bg-white rounded-lg p-1 border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all text-left relative overflow-hidden active:scale-95 h-fit"
            >
              <div className="aspect-square rounded-md bg-slate-50 mb-1 overflow-hidden relative">
                {p.image ? (
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base opacity-10">📦</div>
                )}
                {p.stock !== undefined && (
                  <div className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center text-[5px] font-black uppercase ${p.stock <= 0 ? 'bg-rose-500 text-white' : 'bg-white/80 text-indigo-700'}`}>
                    S: {p.stock}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-[8px] line-clamp-1 leading-none mb-0.5">{p.description}</h3>
              <p className="font-black text-indigo-600 text-[8px]">{formatCurrency(p.salePrice)}</p>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-10 text-center opacity-20">
              <span className="text-2xl">🔎</span>
              <p className="text-[8px] font-black uppercase mt-1">Sin resultados</p>
            </div>
          )}
        </div>
      </div>

      {/* Carrito Lateral Ultra-Compacto */}
      <div className="w-full lg:w-[260px] flex flex-col bg-slate-900 rounded-[20px] md:rounded-[28px] shadow-2xl text-white overflow-hidden border border-white/5">
        <div className="p-2.5 space-y-1.5">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black tracking-tight uppercase">Carrito</h3>
            <span className="bg-indigo-600 px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest">
              {cart.length}
            </span>
          </div>
          
          <div className="space-y-0.5">
            <label className="text-[6px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
            <select 
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-1 font-bold text-[8px] outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              {clients.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-4">
              <span className="text-xl mb-1">🛒</span>
              <p className="font-black uppercase tracking-widest text-[6px]">Vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 group relative">
                <div className="w-5 h-5 rounded-md bg-white/10 flex-shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-[8px]">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[7px] truncate text-slate-100 leading-tight">{item.description}</h4>
                  <p className="text-indigo-400 font-black text-[6px]">{formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-1 bg-black/30 p-0.5 rounded-md">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-3 h-3 rounded-sm bg-white/5 hover:bg-white/10 flex items-center justify-center font-black text-[7px]">-</button>
                  <span className="font-black text-[7px] w-1.5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-3 h-3 rounded-sm bg-white/5 hover:bg-white/10 flex items-center justify-center font-black text-[7px]">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-black/40 space-y-1.5">
          <div className="space-y-0.5 border-b border-white/10 pb-1.5">
            <div className="flex justify-between text-slate-400 text-[7px] font-bold">
              <span>Subtotal</span>
              <span className="text-slate-200">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[7px] font-bold">
              <span>IVA ({settings.defaultTaxRate}%)</span>
              <span className="text-slate-200">{formatCurrency(tax)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-0">
              <span className="text-[5px] font-black uppercase text-slate-500 tracking-widest">Total</span>
              <p className="text-base font-black text-indigo-400 leading-none">{formatCurrency(total)}</p>
            </div>
            <button 
              onClick={() => cart.length > 0 && setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-white/10 disabled:text-white/20 text-white rounded-md font-black shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[7px]"
            >
              Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal Slim */}
      {isCheckoutOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[99999] flex items-center justify-center p-3"
          style={{ position: 'fixed', zIndex: 2147483647 }}
        >
          <div 
            className="bg-white rounded-[24px] w-full max-w-[260px] overflow-hidden shadow-2xl animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-indigo-600 p-3 text-white relative text-center">
              <h3 className="text-xs font-black tracking-tight">Confirmar Venta</h3>
              <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-[6px]">{formatCurrency(total)}</p>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-2 right-2 text-white/50 hover:text-white text-base">✕</button>
            </div>

            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[6px] font-black text-slate-400 uppercase tracking-widest ml-1">Método</label>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    {id: 'Efectivo', icon: '💵'},
                    {id: 'Transferencia', icon: '📱'},
                    {id: 'Nequi', icon: '🟣'},
                    {id: 'Tarjeta', icon: '💳'}
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-1 p-1.5 rounded-lg border transition-all active:scale-95 ${
                        paymentMethod === method.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black' 
                        : 'border-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="text-[7px] uppercase">{method.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={processSale}
                disabled={isProcessing}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all uppercase tracking-widest text-[7px] flex items-center justify-center gap-2"
              >
                {isProcessing ? '⌛' : 'Finalizar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
