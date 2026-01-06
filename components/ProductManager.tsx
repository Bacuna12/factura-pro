
import React, { useState, useMemo, useRef } from 'react';
import { Product, AppSettings, User } from '../types';
import { optimizeProductListing } from '../services/geminiService';
import ConfirmModal from './ConfirmModal';

interface ProductManagerProps {
  user: User;
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  settings: AppSettings;
}

const ProductManager: React.FC<ProductManagerProps> = ({ user, products, onUpdateProducts, settings }) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'General'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = p.description.toLowerCase().includes(lowerSearch) || 
                           (p.sku || '').toLowerCase().includes(lowerSearch) ||
                           (p.barcode || '').toLowerCase().includes(lowerSearch);
      const matchesCategory = activeCategory === 'Todas' || (p.category || 'General') === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleOptimizeWithAi = async () => {
    if (!editingProduct?.description) return;
    setIsAiLoading(true);
    const optimized = await optimizeProductListing(editingProduct.description);
    setEditingProduct({
      ...editingProduct,
      description: optimized.description,
      salePrice: optimized.suggestedPrice || editingProduct.salePrice,
      category: optimized.category
    });
    setIsAiLoading(false);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingProduct({
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      purchasePrice: 0,
      salePrice: 0,
      sku: `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'General',
      barcode: '',
      stock: 0,
      image: undefined
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingProduct) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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

  return (
    <div className="space-y-6 animate-fadeIn pb-24 md:pb-10">
      <ConfirmModal 
        isOpen={!!productToDelete}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto de tu catálogo?"
        onConfirm={() => {
          onUpdateProducts(products.filter(p => p.id !== productToDelete));
          setProductToDelete(null);
        }}
        onCancel={() => setProductToDelete(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Inventario</h2>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Gestión compacta de productos y existencias</p>
        </div>
        <button 
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>+</span>
          <span className="text-xs uppercase tracking-widest">Añadir Producto</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="Buscar por nombre, SKU o código..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 w-16">Item</th>
                <th className="px-6 py-4">Descripción / SKU</th>
                <th className="px-6 py-4 hidden md:table-cell">Categoría</th>
                <th className="px-6 py-4">Precio Venta</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredProducts.map(product => {
                const stock = product.stock || 0;
                const stockColor = stock <= 0 ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : stock < 10 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xl opacity-20">📦</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-slate-100 text-sm line-clamp-1">{product.description}</p>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{product.sku || 'SIN SKU'}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase">
                        {product.category || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600 dark:text-blue-400 text-sm">
                      {formatCurrency(product.salePrice)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black ${stockColor}`}>
                        {stock} uds.
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all">✏️</button>
                        <button onClick={() => setProductToDelete(product.id)} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="text-5xl mb-4 opacity-10">📦</div>
                    <p className="text-gray-400 dark:text-slate-500 font-bold">No hay productos que coincidan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-950 rounded-t-[40px] sm:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp">
            <div className="bg-slate-900 dark:bg-slate-900 p-8 text-white relative">
              <h3 className="text-2xl font-black">{products.find(p => p.id === editingProduct.id) ? 'Editar Producto' : 'Añadir al Catálogo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/40 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide bg-white dark:bg-slate-950">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                  <p className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest">Imagen del Producto</p>
                  <div className="relative group aspect-square">
                    <div className={`w-full h-full border-2 border-dashed rounded-3xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors ${editingProduct.image ? 'border-transparent' : 'border-slate-200 dark:border-slate-800 group-hover:border-blue-400'}`}>
                      {editingProduct.image ? (
                        <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-4xl mb-2 block">📸</span>
                          <span className="text-[9px] text-slate-900 dark:text-slate-500 font-black uppercase tracking-widest">Subir Foto</span>
                        </div>
                      )}
                    </div>
                    {editingProduct.image && (
                      <button 
                        type="button"
                        onClick={() => setEditingProduct({...editingProduct, image: undefined})}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold"
                      >✕</button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    {!editingProduct.image && (
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 w-full h-full cursor-pointer"
                      />
                    )}
                  </div>
                  {editingProduct.image && (
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >Cambiar Imagen</button>
                  )}
                </div>

                <div className="md:col-span-2 space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest ml-2">Nombre del Producto</label>
                      <button type="button" onClick={handleOptimizeWithAi} disabled={isAiLoading || !editingProduct.description} className="text-[10px] font-black text-blue-500 hover:underline">{isAiLoading ? '⌛' : '✨ Mejorar con IA'}</button>
                    </div>
                    <input type="text" required value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Costo de Compra</label>
                      <input type="number" required value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Precio de Venta</label>
                      <input type="number" required value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Stock Actual</label>
                      <input type="number" required value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Categoría</label>
                      <input type="text" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest mb-2 ml-2">Código de Barras / SKU</label>
                    <input type="text" value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="w-full p-4 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 rounded-2xl font-bold" />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">
                Guardar Producto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
