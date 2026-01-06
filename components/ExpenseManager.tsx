
import React, { useState } from 'react';
import { Expense, AppSettings } from '../types';
import ConfirmModal from './ConfirmModal';

interface ExpenseManagerProps {
  expenses: Expense[];
  onUpdateExpenses: (expenses: Expense[]) => void;
  settings: AppSettings;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ expenses, onUpdateExpenses, settings }) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const categories = ['Proveedores', 'Servicios Públicos', 'Sueldos', 'Marketing', 'Alquiler', 'Otros'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const openAddModal = () => {
    setEditingExpense({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: 0,
      category: 'Otros'
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    const exists = expenses.find(ex => ex.id === editingExpense.id);
    let newExpenses;
    if (exists) {
      newExpenses = expenses.map(ex => ex.id === editingExpense.id ? editingExpense : ex);
    } else {
      newExpenses = [editingExpense, ...expenses];
    }

    onUpdateExpenses(newExpenses);
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const confirmDelete = () => {
    if (expenseToDelete) {
      onUpdateExpenses(expenses.filter(ex => ex.id !== expenseToDelete));
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!expenseToDelete}
        title="Eliminar Gasto"
        message="¿Estás seguro de que deseas eliminar este registro de gasto? Afectará tu balance general."
        onConfirm={confirmDelete}
        onCancel={() => setExpenseToDelete(null)}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestión de Gastos</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Registra tus egresos y facturas de compra</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all flex items-center space-x-2"
        >
          <span>+</span>
          <span>Nuevo Gasto</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{expense.date}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-slate-100">{expense.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => { setEditingExpense({...expense}); setIsModalOpen(true); }}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setExpenseToDelete(expense.id)}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="text-5xl mb-4 opacity-20">💸</div>
                    <p className="text-gray-400 dark:text-slate-500 font-medium">No hay gastos registrados aún</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-950 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="bg-rose-600 p-8 text-white">
              <h3 className="text-2xl font-black">Registrar Gasto</h3>
              <p className="text-rose-100 text-xs font-bold">Controla tus salidas de dinero</p>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 bg-white dark:bg-slate-950">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Fecha</label>
                  <input 
                    type="date" required
                    value={editingExpense.date}
                    onChange={e => setEditingExpense({...editingExpense, date: e.target.value})}
                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Monto</label>
                  <input 
                    type="number" required
                    value={editingExpense.amount}
                    onChange={e => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})}
                    className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Descripción / Concepto</label>
                <input 
                  type="text" required
                  value={editingExpense.description}
                  onChange={e => setEditingExpense({...editingExpense, description: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Ej. Pago servicio internet"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">Categoría</label>
                <select 
                  value={editingExpense.category}
                  onChange={e => setEditingExpense({...editingExpense, category: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {categories.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-gray-400 dark:text-slate-500 font-bold hover:bg-gray-50 dark:hover:bg-slate-900 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 dark:shadow-none hover:bg-rose-700 transition-all active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
