
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Client, Document, DocumentType, DocumentStatus, AppSettings, LineItem, User, Payment } from '../types';
import { exportToPDF } from '../services/pdfService';
import BarcodeScanner from './BarcodeScanner';

interface POSProps {
  user: User;
  products: Product[];
  clients: Client[];
  settings: AppSettings;
  onSaveDocument: (doc: Document) => void;
  onSaveClient: (client: Client) => void;
  hasActiveCashSession: boolean;
}

const POS: React.FC<POSProps> = ({ user, products, clients, settings, onSaveDocument, onSaveClient, hasActiveCashSession }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [cart, setCart] = useState<LineItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [cashReceived, setCashReceived] = useState<string>('');

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: settings.currency || 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return (settings.currency || '$') + ' ' + amount.toLocaleString('es-CO');
    }
  };

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(products.map(p => p.category || 'General')))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const low = searchTerm.toLowerCase();
      return (p.description.toLowerCase().includes(low) || (p.barcode && p.barcode.includes(searchTerm))) && 
             (activeCategory === 'Todas' || (p.category || 'General') === activeCategory);
    });
  }, [products, searchTerm, activeCategory]);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([{ id: product.id, description: product.description, quantity: 1, unitPrice: product.salePrice, image: product.image }, ...cart]);
    }
  };

  const handleBarcodeScan = (code: string) => {
    const product = products.find(p => p.barcode === code || p.sku === code);
    if (product) {
      addToCart(product);
      setIsScannerOpen(false);
    } else {
      alert(`Producto con código ${code} no encontrado.`);
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const total = subtotal + (subtotal * (settings.defaultTaxRate / 100));

  const processSale = async () => {
    const now = new Date();
    const newDoc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      tenantId: settings.tenantId,
      type: DocumentType.INVOICE,
      number: `POS-${now.getTime().toString().slice(-6)}`,
      date: now.toISOString().split('T')[0],
      dueDate: now.toISOString().split('T')[0],
      clientId: selectedClientId,
      items: cart,
      status: DocumentStatus.PAID,
      notes: 'Venta rápida POS',
      taxRate: settings.defaultTaxRate,
      paymentMethod,
      isPOS: true,
      payments: [{
        id: Math.random().toString(36).substr(2, 9),
        date: now.toISOString().split('T')[0],
        amount: total,
        method: paymentMethod
      }],
      createdByName: user.name,
      createdAt: now.toISOString()
    };
    onSaveDocument(newDoc);
    exportToPDF(newDoc, clients.find(c => c.id === selectedClientId), settings);
    setCart([]);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-120px)] gap-4 bg-slate-50/50 p-2 md:p-4 overflow-hidden relative">
      {isScannerOpen && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScannerOpen(false)} />}
      
      {!hasActiveCashSession && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[48px] shadow-2xl text-center max-w-sm space-y-6">
            <div className="text-6xl">🔒</div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Caja Cerrada</h3>
            <p className="text-slate-500 font-medium">Debes abrir turno para vender.</p>
            <button onClick={() => navigate('/cash')} className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Ir a Caja</button>
          </div>
        </div>
      )}

      <div className="flex-[2.5] flex flex-col min-h-0 space-y-4">
        <div className="bg-white p-4 rounded-[32px] border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-2xl outline-none font-bold text-sm" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
          </div>
          <button onClick={() => setIsScannerOpen(true)} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <span>📷</span> Escáner
          </button>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{cat}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start pb-20 lg:pb-0">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => addToCart(p)} className="bg-white rounded-3xl p-3 border border-slate-100 hover:border-blue-300 transition-all text-left group active:scale-95">
              <div className="aspect-square rounded-2xl bg-slate-50 mb-3 overflow-hidden">
                {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10 text-3xl">📦</div>}
              </div>
              <h3 className="font-bold text-slate-800 text-[11px] line-clamp-2 leading-tight mb-1">{p.description}</h3>
              <p className="font-black text-blue-600 text-xs">{formatCurrency(p.salePrice)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[360px] flex flex-col bg-slate-900 rounded-[40px] shadow-2xl text-white overflow-hidden">
        <div className="p-8 pb-4 shrink-0 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-tighter">Carrito</h3>
          <button onClick={() => setCart([])} className="text-[10px] font-black text-slate-500">Vaciar</button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 space-y-3 custom-scrollbar">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-[24px] border border-white/5">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[10px] truncate">{item.description}</h4>
                <p className="text-blue-400 font-black text-[10px]">{formatCurrency(item.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-3 bg-black/40 p-1.5 rounded-2xl">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">-</button>
                <span className="font-black text-sm">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-bold">+</button>
              </div>
              <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-rose-500 ml-1">✕</button>
            </div>
          ))}
        </div>

        <div className="p-8 bg-black/50 backdrop-blur-xl border-t border-white/5 space-y-4">
          <div className="flex justify-between items-end">
            <div>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Compra</p>
               <p className="text-3xl font-black text-blue-400 leading-none">{formatCurrency(total)}</p>
            </div>
            <button onClick={() => cart.length > 0 && setIsCheckoutOpen(true)} disabled={cart.length === 0} className="px-8 py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">Pagar</button>
          </div>
        </div>
      </div>

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="bg-blue-600 p-8 text-white text-center">
              <h3 className="text-4xl font-black">{formatCurrency(total)}</h3>
              <p className="text-[10px] font-black uppercase mt-1 opacity-70">Confirmar Cobro</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {['Efectivo', 'Tarjeta', 'Nequi', 'Transferencia'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${paymentMethod === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400'}`}>{m}</button>
                ))}
              </div>
              <button onClick={processSale} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Completar Venta</button>
              <button onClick={() => setIsCheckoutOpen(false)} className="w-full text-center text-slate-400 text-[10px] font-black uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
