
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
      setCart([...cart, { 
        id: product.id, 
        description: product.description, 
        quantity: 1, 
        unitPrice: product.salePrice,
        image: product.image 
      }]);
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
      alert("Producto no encontrado en el catálogo");
    }
    setIsScannerOpen(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckoutOpen(true);
  };

  const processSale = () => {
    const docNumber = `POS-${Math.floor(Math.random() * 90000 + 10000)}`;
    const newDoc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: DocumentType.INVOICE,
      number: docNumber,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      clientId: selectedClientId,
      items: cart,
      status: DocumentStatus.PAID,
      notes: 'Venta realizada desde el punto de venta (POS)',
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

    onSaveDocument(newDoc);
    
    // Auto descargar ticket
    const client = clients.find(c => c.id === selectedClientId);
    exportToPDF(newDoc, client, settings);

    // Reset
    setCart([]);
    setIsCheckoutOpen(false);
    alert(`¡Venta #${docNumber} exitosa!`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6 animate-fadeIn">
      {isScannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />}

      {/* Catálogo de Productos */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-gray-900">Venta Rápida</h2>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-sm active:scale-90 transition-all"
            >
              📷
            </button>
          </div>
          
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              type="text"
              placeholder="Nombre o código de barras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 scrollbar-hide">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="group flex flex-col bg-gray-50 rounded-[32px] p-3 border border-transparent hover:border-blue-200 hover:bg-blue-50/30 transition-all text-left relative overflow-hidden"
            >
              <div className="aspect-square rounded-2xl bg-white mb-3 overflow-hidden shadow-sm">
                {p.image ? (
                  <img src={p.image} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">📦</div>
                )}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter truncate">{p.category}</p>
              <h3 className="font-bold text-gray-900 text-sm truncate leading-tight mb-1">{p.description}</h3>
              <p className="font-black text-blue-600 text-sm">{formatCurrency(p.salePrice)}</p>
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                +
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito / Factura actual */}
      <div className="w-full lg:w-[400px] flex flex-col bg-slate-900 rounded-[40px] shadow-2xl text-white overflow-hidden border border-white/5">
        <div className="p-8 border-b border-white/10">
          <h3 className="text-xl font-black mb-6 flex justify-between items-center">
            Carrito de Venta
            <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] uppercase tracking-widest">{cart.length} ítems</span>
          </h3>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Cliente</label>
            <select 
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 font-bold text-sm outline-none focus:ring-1 focus:ring-blue-500"
            >
              {clients.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
              <span className="text-6xl mb-4">🛒</span>
              <p className="font-black uppercase tracking-widest text-xs">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 group">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex-shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="flex items-center justify-center h-full text-xl">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm truncate">{item.description}</h4>
                  <p className="text-blue-400 font-black text-xs">{formatCurrency(item.unitPrice)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-lg">-</button>
                  <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-lg">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-black/30 space-y-4">
          <div className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex justify-between text-white/50 text-sm font-bold">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/50 text-sm font-bold">
              <span>Impuesto ({settings.defaultTaxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline mb-6">
            <span className="text-xs font-black uppercase text-white/40 tracking-widest">Total a Cobrar</span>
            <span className="text-3xl font-black text-blue-400">{formatCurrency(total)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-white/10 disabled:text-white/20 text-white rounded-[24px] font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs"
          >
            Finalizar Venta
          </button>
        </div>
      </div>

      {/* Modal de Pago / Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden animate-slideUp shadow-2xl">
            <div className="bg-blue-600 p-8 text-white relative">
              <h3 className="text-2xl font-black">Cobro Express</h3>
              <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">Total: {formatCurrency(total)}</p>
              <button onClick={() => setIsCheckoutOpen(false)} className="absolute top-6 right-6 text-white/60 hover:text-white text-3xl p-2">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Método de Pago</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Efectivo', 'Transferencia', 'Nequi', 'Tarjeta'].map(method => (
                    <button 
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        paymentMethod === method ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={processSale}
                  className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Confirmar y Cobrar
                </button>
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-full py-2 font-bold text-gray-400 text-sm"
                >
                  Volver al carrito
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
