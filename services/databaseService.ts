
import { Document, Client, Product, Expense, AppSettings, CashSession, CashMovement } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const toSnakePayload = (data: any, tenantId: string) => {
  if (!data) return {};
  const payload: any = { tenantid: tenantId };
  Object.keys(data).forEach(key => {
    if (key === 'tenantId') return;
    const dbKey = key.toLowerCase();
    payload[dbKey] = data[key];
  });
  return payload;
};

const fromSnakeResponse = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(item => fromSnakeResponse(item));
  const mapped: any = { ...data };
  if (data.tenantid) mapped.tenantId = data.tenantid;
  if (data.taxidtype) mapped.taxIdType = data.taxidtype;
  if (data.taxid) mapped.taxId = data.taxid;
  if (data.zipcode) mapped.zipCode = data.zipcode;
  if (data.clientid) mapped.clientId = data.clientid;
  if (data.taxrate !== undefined) mapped.taxRate = data.taxrate;
  if (data.withholdingrate !== undefined) mapped.withholdingRate = data.withholdingrate;
  if (data.duedate) mapped.dueDate = data.duedate;
  if (data.paymentmethod) mapped.paymentMethod = data.paymentmethod;
  if (data.ispos !== undefined) mapped.isPOS = data.ispos;
  if (data.createdbyname) mapped.createdByName = data.createdbyname;
  if (data.createdat) mapped.createdAt = data.createdat;
  if (data.purchaseprice !== undefined) mapped.purchasePrice = data.purchaseprice;
  if (data.saleprice !== undefined) mapped.salePrice = data.saleprice;
  if (data.companyname) mapped.companyName = data.companyname;
  if (data.companyid) mapped.companyId = data.companyid;
  if (data.companyaddress) mapped.companyAddress = data.companyaddress;
  if (data.defaulttaxrate !== undefined) mapped.defaultTaxRate = data.defaulttaxrate;
  if (data.userid) mapped.userId = data.userid;
  if (data.username) mapped.userName = data.username;
  if (data.openedat) mapped.openedAt = data.openedat;
  if (data.closedat) mapped.closedAt = data.closedat;
  if (data.openingbalance !== undefined) mapped.openingBalance = data.openingbalance;
  if (data.expectedbalance !== undefined) mapped.expectedBalance = data.expectedbalance;
  if (data.actualbalance !== undefined) mapped.actualBalance = data.actualbalance;
  if (data.sessionid) mapped.sessionId = data.sessionid;
  return mapped;
};

export const database = {
  saveData: async (table: string, data: any, tenantId: string): Promise<{ local: boolean, cloud: boolean }> => {
    if (!tenantId) return { local: false, cloud: false };

    let localSuccess = false;
    let cloudSuccess = false;

    const localKey = table === 'settings' ? `facturapro_settings_${tenantId}` : `facturapro_${table}_${tenantId}`;
    try {
      if (table === 'settings') {
        localStorage.setItem(localKey, JSON.stringify({ ...data, id: tenantId }));
      } else if (!Array.isArray(data)) {
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        const index = existing.findIndex((item: any) => item.id === data.id);
        const record = { ...data, tenantId };
        if (index >= 0) existing[index] = record;
        else existing.unshift(record);
        localStorage.setItem(localKey, JSON.stringify(existing));
      }
      localSuccess = true;
    } catch (e) {
      console.error("Local Save Error:", e);
    }

    if (isSupabaseConfigured() && navigator.onLine) {
      const payload = toSnakePayload(data, tenantId);
      if (table === 'settings') payload.id = tenantId;
      try {
        const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
        if (!error) {
          cloudSuccess = true;
        } else {
          console.error(`Cloud Sync Error (${table}):`, error.message);
        }
      } catch (e) {
        console.error("Critical Cloud Failure:", e);
      }
    }

    return { local: localSuccess, cloud: cloudSuccess };
  },

  fetchData: async <T>(table: string, tenantId: string): Promise<T[]> => {
    const localKey = table === 'settings' ? `facturapro_settings_${tenantId}` : `facturapro_${table}_${tenantId}`;
    const localRaw = localStorage.getItem(localKey);
    let localData = JSON.parse(localRaw || (table === 'settings' ? '{}' : '[]'));
    if (isSupabaseConfigured() && navigator.onLine) {
      try {
        const { data, error } = await supabase.from(table).select('*').eq('tenantid', tenantId);
        if (!error && data && data.length > 0) {
          const mapped = fromSnakeResponse(data);
          localStorage.setItem(localKey, JSON.stringify(table === 'settings' ? mapped[0] : mapped));
          return (table === 'settings' ? mapped : mapped) as T[];
        }
      } catch (e) {
        console.warn(`Fetch Error (${table}), usando local.`);
      }
    }
    return (table === 'settings' ? [localData] : (Array.isArray(localData) ? localData : [])) as T[];
  },

  deleteRecord: async (table: string, id: string, tenantId: string) => {
    const localKey = `facturapro_${table}_${tenantId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      localStorage.setItem(localKey, JSON.stringify(existing.filter((i: any) => i.id !== id)));
    } catch(e) {}
    if (isSupabaseConfigured() && navigator.onLine) {
      await supabase.from(table).delete().eq('id', id).eq('tenantid', tenantId);
    }
  },

  clearAllTenantData: async (tenantId: string) => {
    const tables = ['docs', 'expenses', 'clients', 'products', 'cash_sessions', 'cash_movements', 'subusers'];
    tables.forEach(t => localStorage.removeItem(`facturapro_${t}_${tenantId}`));
    localStorage.removeItem(`facturapro_settings_${tenantId}`);
  }
};
