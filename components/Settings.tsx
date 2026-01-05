
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, BackupData } from '../types';
import { database } from '../services/databaseService';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onImportData: (data: BackupData) => void;
  allData: {
    documents: any[];
    expenses: any[];
    clients: any[];
    products: any[];
    settings: AppSettings;
  };
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, onImportData, allData }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [dbStats, setDbStats] = useState(database.getStats());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDbStats(database.getStats());
  }, [allData]);

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

  const handleExport = () => {
    const backup = database.getAllData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `facturapro_database_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (confirm('¿Estás seguro? Se sobrescribirá TODA la base de datos actual con este respaldo.')) {
            onImportData(json as BackupData);
          }
        } catch (err) {
          alert('Error: El archivo no es un respaldo válido de FacturaPro.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    alert('Ajustes corporativos guardados');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Ajustes</h2>
        <p className="text-gray-500 font-medium">Consola de administración y configuración global</p>
      </header>

      {/* Monitor de Base de Datos */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-200">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xl font-black mb-1">Estado de la Base de Datos</h3>
            <p className="text-slate-400 text-sm">Registros almacenados localmente</p>
          </div>
          <div className="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
            Engine v2.5 Online
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DbStatItem label="Facturas" value={dbStats.facturas} icon="🧾" />
          <DbStatItem label="Presup." value={dbStats.presupuestos} icon="📄" />
          <DbStatItem label="Clientes" value={dbStats.clientes} icon="👥" />
          <DbStatItem label="Productos" value={dbStats.productos} icon="📦" />
          <DbStatItem label="Gastos" value={dbStats.gastos} icon="💸" />
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Total de registros: <span className="text-white">{dbStats.totalRecords}</span>
          </p>
          <button 
            onClick={database.clearDatabase}
            className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 transition-all"
          >
            🔥 Borrar Toda la Base de Datos
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50">
          <h3 className="text-xl font-black text-gray-800 mb-6">Perfil Corporativo</h3>
          
          <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-[24px] border border-slate-100">
            <div className="relative group">
              <div className={`w-32 h-32 border-2 border-dashed rounded-3xl flex items-center justify-center overflow-hidden bg-white transition-colors ${formData.logo ? 'border-transparent' : 'border-slate-200 group-hover:border-blue-400'}`}>
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-3xl mb-1 block">🖼️</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Logo</span>
                  </div>
                )}
              </div>
              {formData.logo && (
                <button 
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white w-8 h-8 rounded-full shadow-lg hover:bg-rose-600 transition-colors flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-lg font-black text-slate-800 mb-1">Logotipo de Marca</h4>
              <p className="text-sm text-slate-500 mb-4">Aparecerá en el encabezado de todos tus documentos.</p>
              <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs transition-all shadow-md"
              >
                {formData.logo ? 'Cambiar Imagen' : 'Subir Logotipo'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Legal</label>
              <input 
                type="text"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">NIT / RUT</label>
              <input 
                type="text"
                value={formData.companyId}
                onChange={e => setFormData({...formData, companyId: e.target.value})}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección Comercial</label>
              <input 
                type="text"
                value={formData.companyAddress}
                onChange={e => setFormData({...formData, companyAddress: e.target.value})}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Moneda Principal</label>
            <select 
              value={formData.currency}
              onChange={e => setFormData({...formData, currency: e.target.value})}
              className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            >
              {currencies.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">IVA General (%)</label>
            <input 
              type="number"
              value={formData.defaultTaxRate}
              onChange={e => setFormData({...formData, defaultTaxRate: parseFloat(e.target.value)})}
              className="w-full p-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>
        </div>

        <div className="p-8 bg-white border-t border-gray-100 flex justify-end">
          <button type="submit" className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* Backup Section */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <span className="text-2xl">💾</span>
          <h3 className="text-xl font-black text-gray-800">Copia de Seguridad Externo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={handleExport}
            className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 text-left hover:bg-blue-100 transition-all group"
          >
            <span className="text-2xl mb-2 block">📥</span>
            <h4 className="font-bold text-blue-900 mb-1">Exportar JSON</h4>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Descargar base de datos completa</p>
          </button>
          <button 
            onClick={() => importInputRef.current?.click()}
            className="p-6 bg-slate-50 rounded-[24px] border border-slate-200 text-left hover:bg-slate-100 transition-all group"
          >
            <span className="text-2xl mb-2 block">📤</span>
            <h4 className="font-bold text-slate-900 mb-1">Importar JSON</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Restaurar desde un archivo</p>
            <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DbStatItem: React.FC<{ label: string; value: number; icon: string }> = ({ label, value, icon }) => (
  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center space-x-3">
    <span className="text-xl">{icon}</span>
    <div>
      <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter leading-none mb-1">{label}</p>
      <p className="text-lg font-black leading-none">{value}</p>
    </div>
  </div>
);

export default Settings;
