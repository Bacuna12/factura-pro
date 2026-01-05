
import { Document, Client, Product, Expense, AppSettings, BackupData } from '../types';

const STORAGE_KEYS = {
  DOCUMENTS: 'facturapro_docs',
  CLIENTS: 'facturapro_clients',
  PRODUCTS: 'facturapro_products',
  EXPENSES: 'facturapro_expenses',
  SETTINGS: 'facturapro_settings',
  SESSION: 'facturapro_session'
};

export const database = {
  // Genéricos de guardado
  save: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Error saving to database:", e);
      return false;
    }
  },

  // Obtención de todos los datos (Database Dump)
  getAllData: (): BackupData => {
    return {
      documents: JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS) || '[]'),
      expenses: JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]'),
      clients: JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]'),
      products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'),
      settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
      version: "2.5",
      exportDate: new Date().toISOString()
    };
  },

  // Restauración total (Database Restore)
  restoreDatabase: (data: BackupData) => {
    if (!data.version) throw new Error("Formato de base de datos no válido");
    
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents || []));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses || []));
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.clients || []));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products || []));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings || {}));
    
    window.location.reload(); // Recargar para aplicar cambios globales
  },

  // Estadísticas de la base de datos
  getStats: () => {
    const data = database.getAllData();
    return {
      facturas: data.documents.filter(d => d.type === 'FACTURA').length,
      presupuestos: data.documents.filter(d => d.type === 'PRESUPUESTO').length,
      clientes: data.clients.length,
      productos: data.products.length,
      gastos: data.expenses.length,
      totalRecords: data.documents.length + data.clients.length + data.products.length + data.expenses.length
    };
  },

  // Limpieza de base de datos
  clearDatabase: () => {
    if (confirm("¿ESTÁS COMPLETAMENTE SEGURO? Esta acción borrará TODA la base de datos de FacturaPro.")) {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key !== STORAGE_KEYS.SESSION) localStorage.removeItem(key);
      });
      window.location.reload();
    }
  }
};
