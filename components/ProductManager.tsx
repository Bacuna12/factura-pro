
import React, { useState } from 'react';
import { Product, AppSettings } from '../types';
import ConfirmModal from './ConfirmModal';

interface ProductManagerProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  settings: AppSettings;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, onUpdateProducts, settings }) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct({
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      unitPrice: 0
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const exists = products.find(p => p.id === editingProduct.id);
    let newProducts;
    if (exists) {
      newProducts = products.map(p => p.id === editingProduct.id ? editingProduct : p);
    } else {
      newProducts = [editingProduct, ...products];
    }

    onUpdateProducts(newProducts);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onUpdateProducts(products.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
    }
  };

  const confirmClearAll = () => {
    onUpdateProducts([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Modales de Confirmación */}
      <ConfirmModal 
        isOpen={!!productToDelete}
        title="Eliminar Producto"
        message="¿Deseas quitar este producto de tu biblioteca de autocompletado?"
        onConfirm={confirmDelete}
        onCancel={() => setProductToDelete(null)}
      />

      <ConfirmModal 
        isOpen={showClearConfirm}
        title="Vaciar Biblioteca"
        message="¿Estás seguro de que deseas eliminar TODOS los productos guardados? Esta acción es irreversible."
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Catálogo de Productos</h2>
          <p className="text-gray-500">Gestiona tus servicios y precios guardados</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {products.length > 0 && (
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2.5 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl font-bold hover:bg-rose-100 transition-all text-sm"
            >
              Vaciar Lista
            </button>
          )}
          <button 
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
          >
            <span>+</span>
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Precio Base</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800">{product.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-bold">{formatCurrency(product.unitPrice)}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button 
                        onClick={() => openEditModal(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar producto"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setProductToDelete(product.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar de la biblioteca"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-gray-400 italic">
                    <div className="text-4xl mb-2">📦</div>
                    <p>No hay productos guardados.</p>
                    <p className="text-xs">Se guardan automáticamente al crear facturas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="bg-blue-600 p-6 text-white">
              <h3 className="text-xl font-bold">Gestionar Producto</h3>
              <p className="text-blue-100 text-sm">Define el nombre y precio base</p>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                <input 
                  type="text" 
                  required
                  value={editingProduct.description}
                  onChange={e => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Consultoría de Software"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Precio Unitario ({settings.currency})</label>
                <input 
                  type="number" 
                  required
                  value={editingProduct.unitPrice}
                  onChange={e => setEditingProduct({...editingProduct, unitPrice: parseFloat(e.target.value)})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
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

export default ProductManager;
