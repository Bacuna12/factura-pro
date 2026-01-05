
import React, { useState, useRef } from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currencies = [
    { code: 'COP', label: 'Peso Colombiano ($)' },
    { code: 'USD', label: 'Dólar Estadounidense ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'MXN', label: 'Peso Mexicano ($)' },
    { code: 'CLP', label: 'Peso Chileno ($)' },
    { code: 'ARS', label: 'Peso Argentino ($)' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData({ ...formData, logo: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    alert('Ajustes guardados correctamente');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <header>
        <h2 className="text-3xl font-bold text-gray-800">Ajustes</h2>
        <p className="text-gray-500">Configura tu perfil de empresa y moneda por defecto</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Información de la Empresa</h3>
          
          {/* Logo Global Section */}
          <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="relative group">
              <div className={`w-32 h-32 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden bg-white transition-colors ${formData.logo ? 'border-transparent' : 'border-gray-200 group-hover:border-blue-400'}`}>
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo global preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-3xl mb-1 block">🖼️</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Logo Global</span>
                  </div>
                )}
              </div>
              {formData.logo && (
                <button 
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                  title="Quitar logo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-gray-800">Logo Predeterminado</h4>
              <p className="text-xs text-gray-500 mb-4">Este logo se aplicará automáticamente a todas tus nuevas facturas y presupuestos.</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors"
              >
                {formData.logo ? 'Cambiar Logo Global' : 'Seleccionar Logo Corporativo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Comercial</label>
              <input 
                type="text"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mi Empresa S.A.S."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">NIT / ID Fiscal</label>
              <input 
                type="text"
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="900.000.000-0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección Corporativa</label>
              <input 
                type="text"
                value={formData.companyAddress}
                onChange={e => setFormData({...formData, companyAddress: e.target.value})}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Calle 123, Ciudad, País"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Ajustes Regionales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Moneda del Sistema</label>
              <select 
                value={formData.currency}
                onChange={e => setFormData({...formData, currency: e.target.value})}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Esta moneda se usará en todos tus reportes y PDFs.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">IVA por defecto (%)</label>
              <input 
                type="number"
                value={formData.defaultTaxRate}
                onChange={e => setFormData({...formData, defaultTaxRate: parseFloat(e.target.value)})}
                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
          <button 
            type="submit"
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
