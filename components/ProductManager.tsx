
import React, { useState, useMemo, useRef } from 'react';
import { Product, AppSettings } from '../types';
import { optimizeProductListing } from '../services/geminiService';
import ConfirmModal from './ConfirmModal';
import BarcodeScanner from './BarcodeScanner';

interface ProductManagerProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  settings: AppSettings;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, onUpdateProducts, settings }) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category || 'Sin Categoría'));
    return ['Todas', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = p.description.toLowerCase().includes(lowerSearch) || 
                           (p.sku || '').toLowerCase().includes(lowerSearch) ||
                           (p.barcode || '').toLowerCase().includes(lowerSearch);
      const matchesCategory = activeCategory === 'Todas' || (p.category || 'Sin Categoría') === activeCategory;
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

  const handleScanResult = (code: string) => {
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, barcode: code });
    }
    setIsScannerOpen(false);
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
    <div className="space-y-6 animate-fadeIn pb-10">
      {isScannerOpen && <BarcodeScanner onScan={handleScanResult} onClose={() => setIsScannerOpen(false)} />}
      
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Catálogo e Inventario</h2>
          <p className="text-gray-500 font-medium">Gestiona existencias, precios de compra/venta e imágenes</p>
        </div>
        <button 
          onClick={openAddModal}
          className="w-full md:w-auto px-6 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          <span>+</span>
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="Buscar por nombre, SKU o código..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${
                activeCategory === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map(product => {
          const stock = product.stock || 0;
          const stockColor = stock <= 0 ? 'bg-rose-100 text-rose-600' : stock < 5 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600';
          const margin = product.salePrice - product.purchasePrice;
          const marginPercent = product.salePrice > 0 ? Math.round((margin / product.salePrice) * 100) : 0;
          
          return (
            <div key={product.id} className="bg-white rounded-[32px] shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all group overflow-hidden">
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {product.image ? (
                  <img src={product.image} alt={product.description} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">📦</div>
                )}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                  <div className="px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                    {product.category || 'General'}
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${stockColor.replace('bg-', 'bg-white/90 ')}`}>
                    Stock: {stock}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{product.sku || 'S/R'}</p>
                    <h3 className="font-black text-lg text-gray-900 line-clamp-2 leading-tight h-10">{product.description}</h3>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">✏️</button>
                    <button onClick={() => setProductToDelete(product.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl">🗑️</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-50">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Costo Compra</p>
                    <p className="text-sm font-bold text-gray-500">{formatCurrency(product.purchasePrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Precio Venta</p>
                    <p className="text-xl font-black text-blue-600">{formatCurrency(product.salePrice)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Margen: {marginPercent}%</span>
                  {product.barcode && <span className="text-slate-300">🏷️ {product.barcode}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-slideUp">
            <div className="bg-slate-900 p-8 text-white relative">
              <h3 className="text-2xl font-black">{products.find(p => p.id === editingProduct.id) ? 'Editar Producto' : 'Añadir al Catálogo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/40 hover:text-white text-2xl">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Lado de la Imagen */}
                <div className="md:col-span-1 space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Imagen del Producto</p>
                  <div className="relative group aspect-square">
                    <div className={`w-full h-full border-2 border-dashed rounded-3xl flex items-center justify-center overflow-hidden bg-gray-50 transition-colors ${editingProduct.image ? 'border-transparent' : 'border-slate-200 group-hover:border-blue-400'}`}>
                      {editingProduct.image ? (
                        <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <span className="text-4xl mb-2 block">📸</span>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Subir Foto</span>
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
                      className="w-full py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >Cambiar Imagen</button>
                  )}
                </div>

                {/* Lado de Datos */}
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Producto</label>
                      <button type="button" onClick={handleOptimizeWithAi} disabled={isAiLoading || !editingProduct.description} className="text-[10px] font-black text-blue-500 hover:underline">{isAiLoading ? '⌛' : '✨ Mejorar con IA'}</button>
                    </div>
                    <input type="text" required value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Costo de Compra</label>
                      <input type="number" required value={editingProduct.purchasePrice} onChange={e => setEditingProduct({...editingProduct, purchasePrice: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-slate-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Precio de Venta</label>
                      <input type="number" required value={editingProduct.salePrice} onChange={e => setEditingProduct({...editingProduct, salePrice: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-blue-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stock Actual</label>
                      <input type="number" required value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg text-emerald-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                      <input type="text" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Código de Barras</label>
                    <div className="flex gap-2">
                      <input type="text" value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" />
                      <button type="button" onClick={() => setIsScannerOpen(true)} className="w-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-200">📷</button>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:bg-blue-700 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">
                Guardar Cambios en Catálogo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManager;
