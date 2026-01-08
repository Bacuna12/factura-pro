
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense, AppSettings, Product } from '../types';
import ConfirmModal from './ConfirmModal';

interface PurchaseItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  cost: number;
  isNew: boolean;
  salePrice: number;
  category: string;
}

interface ExpenseManagerProps {
  expenses: Expense[];
  products: Product[];
  onSaveProduct: (product: Product) => void;
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  settings: AppSettings;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, products, onSaveProduct, onSaveExpense, onDeleteExpense, settings }) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Lógica de compra multi-producto
  const [isPurchase, setIsPurchase] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const categories = ['Proveedores', 'Servicios Públicos', 'Sueldos', 'Marketing', 'Alquiler', 'Otros'];
  const searchResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(e.target as Node)) {
        setActiveSearchId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = itemSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return products.filter(p => 
      p.description.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term))
    ).slice(0, 5);
  }, [products, itemSearchTerm]);

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

  const addPurchaseItem = () => {
    const newItem: PurchaseItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      cost: 0,
      isNew: false,
      salePrice: 0,
      category: 'General'
    };
    // Ahora insertamos al inicio (arriba)
    setPurchaseItems([newItem, ...purchaseItems]);
  };

  const removePurchaseItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(item => item.id !== id));
  };

  const updatePurchaseItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(purchaseItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
    if (field === 'description') {
      setItemSearchTerm(value);
      setActiveSearchId(id);
    }
  };

  const selectProductForItem = (itemId: string, p: Product) => {
    setPurchaseItems(purchaseItems.map(item => 
      item.id === itemId ? { 
        ...item, 
        productId: p.id, 
        description: p.description, 
        cost: p.purchasePrice || 0,
        isNew: false 
      } : item
    ));
    setActiveSearchId(null);
    setItemSearchTerm('');
  };

  const openAddModal = () => {
    setEditingExpense({
      id: Math.random().toString(36).substr(2, 9),
      tenantId: settings.tenantId,
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      category: 'Otros'
    });
    setIsPurchase(false);
    setPurchaseItems([{
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      cost: 0,
      isNew: false,
      salePrice: 0,
      category: 'General'
    }]);
    setIsModalOpen(true);
  };

  const totalPurchaseAmount = useMemo(() => {
    return purchaseItems.reduce((acc, item) => acc + (item.quantity * item.cost), 0);
  }, [purchaseItems]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    let finalExpense = { ...editingExpense };

    if (isPurchase) {
      finalExpense.amount = totalPurchaseAmount;
      finalExpense.category = 'Proveedores';
      
      // Resumen de descripción
      const summary = purchaseItems.map(i => `${i.quantity}x ${i.description.split(' ')[0]}`).join(', ');
      finalExpense.description = `Compra: ${summary}`.slice(0, 100);

      // Procesar cada ítem para el stock/catálogo
      purchaseItems.forEach(item => {
        if (item.productId) {
          // Producto existente
          const baseProd = products.find(p => p.id === item.productId);
          if (baseProd) {
            onSaveProduct({
              ...baseProd,
              stock: (baseProd.stock || 0) + item.quantity,
              purchasePrice: item.cost
            });
          }
        } else if (item.isNew && item.description.trim()) {
          // Crear nuevo
          const newProd: Product = {
            id: Math.random().toString(36).substr(2, 9),
            tenantId: settings.tenantId,
            description: item.description.trim(),
            purchasePrice: item.cost,
            salePrice: item.salePrice,
            stock: item.quantity,
            category: item.category,
            sku: `COM-${Math.floor(1000 + Math.random() * 9000)}`
          };
          onSaveProduct(newProd);
        }
      });
    }

    onSaveExpense(finalExpense);
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      onDeleteExpense(expenseToDelete);
      setExpenseToDelete(null);
    }
  };

  const canSave = isPurchase 
    ? purchaseItems.every(i => i.description.trim() !== '' && i.cost >= 0)
    : (editingExpense?.description && editingExpense?.amount > 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <ConfirmModal 
        isOpen={!!expenseToDelete}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este registro de gasto?"
        onConfirm={confirmDelete}
        onCancel={() => setExpenseToDelete(null)}
      />

      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Egresos</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium text-xs">Gestión de gastos y compras</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-6 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all flex items-center space-x-2 active:scale-95"
        >
          <span className="text-xl">+</span>
          <span className="text-[10px] uppercase tracking-widest">Registrar</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-5 w-24">Fecha</th>
                <th className="px-6 py-5">Concepto</th>
                <th className="px-6 py-5 w-28 hidden md:table-cell">Categoría</th>
                <th className="px-6 py-5 w-32 text-right">Valor</th>
                <th className="px-6 py-5 w-24 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-5 text-[11px] font-bold text-gray-500 dark:text-slate-400">{expense.date}</td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-gray-900 dark:text-slate-100 truncate max-w-[150px] md:max-w-none" title={expense.description}>
                      {expense.description}
                    </p>
                  </td>
                  <td className="px-6 py-5 hidden md:table-cell">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[8px] font-black uppercase tracking-widest">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => { setEditingExpense({...expense}); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setExpenseToDelete(expense.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center opacity-30">
                    <p className="text-5xl mb-4">💸</p>
                    <p className="font-black text-xs uppercase tracking-widest">Sin registros</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp relative max-h-[95vh] flex flex-col border border-white/10">
            <div className="bg-rose-600 p-6 md:p-8 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter">Registrar Egreso</h3>
                <p className="text-rose-100 text-[10px] font-bold uppercase tracking-widest">Factura de Compra / Gastos</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all text-xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700">
                 <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">¿Es una compra de mercancía?</p>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setIsPurchase(!isPurchase)}
                  className={`w-14 h-7 rounded-full transition-all relative ${isPurchase ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isPurchase ? 'left-8' : 'left-1'}`}></div>
                </button>
              </div>

              {isPurchase ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center px-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lista de Productos Comprados</p>
                    <button type="button" onClick={addPurchaseItem} className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-xl">+ Añadir Ítem</button>
                  </div>

                  <div className="space-y-4">
                    {purchaseItems.map((item) => (
                      <div key={item.id} className="p-5 border-2 border-slate-50 dark:border-slate-800 rounded-[32px] space-y-4 relative bg-slate-50/30 dark:bg-slate-800/20">
                        <button type="button" onClick={() => removePurchaseItem(item.id)} className="absolute top-4 right-4 text-rose-500 p-2 hover:bg-rose-50 rounded-full transition-colors">✕</button>
                        
                        <div className="relative">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-2">Producto</label>
                          <input 
                            type="text" 
                            placeholder="Nombre o SKU..." 
                            value={item.description}
                            onChange={e => updatePurchaseItem(item.id, 'description', e.target.value)}
                            onFocus={() => { setItemSearchTerm(item.description); setActiveSearchId(item.id); }}
                            className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
                          />
                          
                          {activeSearchId === item.id && filteredProducts.length > 0 && (
                            <div ref={searchResultsRef} className="absolute z-[160] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                              {filteredProducts.map(p => (
                                <button 
                                  key={p.id} 
                                  type="button" 
                                  onClick={() => selectProductForItem(item.id, p)} 
                                  className="w-full p-3 text-left hover:bg-rose-50 dark:hover:bg-rose-900/20 flex justify-between items-center border-b border-slate-50 dark:border-slate-700 last:border-none group"
                                >
                                  <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">{p.description}</span>
                                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">S: {p.stock || 0}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {!item.productId && item.description.trim().length > 2 && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl space-y-3 animate-fadeIn">
                             <div className="flex items-center justify-between">
                                <p className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-2">✨ ¿Añadir al catálogo?</p>
                                <button 
                                  type="button"
                                  onClick={() => updatePurchaseItem(item.id, 'isNew', !item.isNew)}
                                  className={`w-9 h-5 rounded-full transition-all relative ${item.isNew ? 'bg-emerald-600' : 'bg-slate-300'}`}
                                >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${item.isNew ? 'left-5' : 'left-1'}`}></div>
                                </button>
                             </div>
                             {item.isNew && (
                               <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[8px] font-black text-emerald-600 uppercase mb-1">P. Venta Sug.</label>
                                    <input type="number" value={item.salePrice} onChange={e => updatePurchaseItem(item.id, 'salePrice', parseFloat(e.target.value))} className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-black text-xs border-none shadow-sm" />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-black text-emerald-600 uppercase mb-1">Categoría</label>
                                    <input type="text" value={item.category} onChange={e => updatePurchaseItem(item.id, 'category', e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg font-black text-xs border-none shadow-sm" />
                                  </div>
                               </div>
                             )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-2">Cant.</label>
                            <input type="number" required value={item.quantity} onChange={e => updatePurchaseItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-full p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-xl font-black text-center text-sm outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 ml-2">Costo Unit.</label>
                            <input type="number" required value={item.cost} onChange={e => updatePurchaseItem(item.id, 'cost', parseFloat(e.target.value))} className="w-full p-3 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-100 dark:border-slate-700 rounded-xl font-black text-center text-sm outline-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-rose-600 rounded-[32px] text-white flex justify-between items-center shadow-xl shadow-rose-500/20 sticky bottom-0">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Factura Compra</p>
                      <p className="text-3xl font-black leading-none">{formatCurrency(totalPurchaseAmount)}</p>
                    </div>
                    <span className="text-3xl">🧾</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Fecha</label>
                      <input type="date" required value={editingExpense.date} onChange={e => setEditingExpense({...editingExpense, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none shadow-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Monto Total</label>
                      <input type="number" step="any" required value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-lg outline-none shadow-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Categoría</label>
                    <select value={editingExpense.category} onChange={e => setEditingExpense({...editingExpense, category: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-black uppercase text-xs outline-none shadow-sm cursor-pointer">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-2">Concepto del Gasto</label>
                    <input type="text" required value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none placeholder:text-slate-400 shadow-sm" placeholder="Ej: Pago de servicios públicos" />
                  </div>
                </div>
              )}
            </form>

            <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 shrink-0">
              <button 
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full py-5 text-white rounded-[28px] font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl ${canSave ? 'bg-rose-600 shadow-rose-500/20' : 'bg-slate-300 cursor-not-allowed'}`}
              >
                {isPurchase ? '✓ Confirmar e Ingresar Todo al Stock' : 'Guardar Egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
