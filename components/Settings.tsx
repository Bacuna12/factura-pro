
import React, { useState, useRef } from 'react';
import { AppSettings, BackupData, PdfTemplate } from '../types';
import { database } from '../services/databaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { 
  exportSalesReport, 
  exportExpensesReport,
  exportProductsReport,
  exportClientsReport
} from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

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

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, allData }) => {
  const [formData, setFormData] = useState<AppSettings>({
    ...settings,
    pdfTemplate: settings.pdfTemplate || PdfTemplate.PROFESSIONAL,
    bankName: settings.bankName || '',
    accountType: settings.accountType || 'Ahorros',
    accountNumber: settings.accountNumber || '',
    bankCity: settings.bankCity || ''
  });
  
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isReseting, setIsReseting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    alert('Configuración actualizada correctamente.');
  };

  const handleClearAllData = async () => {
    setIsReseting(true);
    try {
      await database.clearAllTenantData(settings.tenantId);
      alert("Todos los datos han sido eliminados correctamente. La aplicación se reiniciará.");
      window.location.reload();
    } catch (e) {
      alert("Hubo un error al intentar eliminar los datos.");
      setIsReseting(false);
    }
  };

  // Funciones de Reportes
  const handleExportSales = () => exportSalesReport(allData.documents, allData.clients, settings, startDate, endDate);
  const handleExportExpenses = () => exportExpensesReport(allData.expenses, settings, startDate, endDate);
  const handleExportInventory = () => exportProductsReport(allData.products, settings);
  const handleExportClients = () => exportClientsReport(allData.clients, settings);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 max-w-5xl mx-auto">
      <ConfirmModal 
        isOpen={isResetConfirmOpen}
        title="BORRADO TOTAL DE DATOS"
        message="¿Estás completamente seguro? Esta acción eliminará permanentemente todas tus facturas, gastos, productos y clientes tanto de este dispositivo como de la nube. Esta acción NO se puede deshacer."
        confirmText={isReseting ? "Borrando..." : "SÍ, BORRAR TODO"}
        cancelText="CANCELAR"
        isDanger={true}
        onConfirm={handleClearAllData}
        onCancel={() => !isReseting && setIsResetConfirmOpen(false)}
      />

      <header>
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Ajustes</h2>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Configuración del Sistema</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* EMPRESA */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 p-10 space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <span className="text-3xl">🏢</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Empresa e Identidad</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-full md:w-48 space-y-4">
               <div className="relative aspect-square w-full bg-slate-50 dark:bg-slate-800 rounded-[32px] flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {formData.logo ? <img src={formData.logo} className="w-full h-full object-contain p-4" alt="Logo" /> : <span className="text-4xl opacity-20">🖼️</span>}
                  <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 bg-white rounded-full">✏️</button>
                    {formData.logo && <button type="button" onClick={removeLogo} className="p-2 bg-rose-500 text-white rounded-full">✕</button>}
                  </div>
               </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Comercial / Profesional</label>
                <input required value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">C.C. / NIT</label>
                <input required value={formData.companyId} onChange={e => setFormData({...formData, companyId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">IVA (%) por Defecto</label>
                <input required type="number" value={formData.defaultTaxRate} onChange={e => setFormData({...formData, defaultTaxRate: parseFloat(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección de Contacto</label>
                <input required value={formData.companyAddress} onChange={e => setFormData({...formData, companyAddress: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* BANCARIO */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 p-10 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <span className="text-3xl">🏦</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Información Bancaria (Para Cobros)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Banco</label>
              <input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="Ej: BANCOLOMBIA" className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Cuenta</label>
              <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm">
                <option value="Ahorros">Ahorros</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Número de Cuenta</label>
              <input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} placeholder="Ej: 226-430236-48" className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Ciudad de la Cuenta / Origen</label>
              <input value={formData.bankCity} onChange={e => setFormData({...formData, bankCity: e.target.value})} placeholder="Ej: Medellín - Antioquia" className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
            </div>
          </div>
        </div>

        {/* REPORTES */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 p-10 space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-50 dark:border-slate-800 pb-6">
            <span className="text-3xl">📊</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Reportes y Exportación</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Inicio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Fin</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl border-none font-bold outline-none shadow-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button type="button" onClick={handleExportSales} className="p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-blue-100 transition-all border border-blue-100 dark:border-blue-800">
              <span className="text-2xl">💰</span>
              Ventas
            </button>
            <button type="button" onClick={handleExportExpenses} className="p-6 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-rose-100 transition-all border border-rose-100 dark:border-rose-800">
              <span className="text-2xl">💸</span>
              Gastos
            </button>
            <button type="button" onClick={handleExportInventory} className="p-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-emerald-100 transition-all border border-emerald-100 dark:border-emerald-800">
              <span className="text-2xl">📦</span>
              Inventario
            </button>
            <button type="button" onClick={handleExportClients} className="p-6 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-[32px] font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-3 hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-800">
              <span className="text-2xl">👤</span>
              Clientes
            </button>
          </div>
        </div>

        <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest text-sm">
          Guardar Cambios de Configuración
        </button>

        {/* ZONA DE PELIGRO */}
        <div className="bg-rose-50 dark:bg-rose-900/10 rounded-[40px] border-2 border-dashed border-rose-200 dark:border-rose-900/30 p-10 space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="text-xl font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">Zona de Peligro</h3>
              <p className="text-rose-600 dark:text-rose-500 text-[11px] font-bold uppercase tracking-widest mt-1">Acciones irreversibles</p>
            </div>
          </div>
          
          <div className="p-6 bg-white dark:bg-slate-950 rounded-3xl border border-rose-100 dark:border-rose-900/30 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex-1 text-center md:text-left">
                <h4 className="font-black text-slate-900 dark:text-white text-sm">Borrado Definitivo de Datos</h4>
                <p className="text-slate-500 text-xs font-medium">Esta acción eliminará todos los documentos, clientes, catálogo y gastos de forma permanente de este dispositivo y de la nube.</p>
             </div>
             <button 
              type="button" 
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 dark:shadow-none hover:bg-rose-700 transition-all active:scale-95"
            >
              Borrar todos los datos
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
