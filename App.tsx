import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList';
import DocumentEditor, { DocumentEditorProps } from './components/DocumentEditor';
import DocumentHistory from './components/DocumentHistory';
import ClientManager from './components/ClientManager';
import ProductManager from './components/ProductManager';
import UserManager from './components/UserManager';
import Settings from './components/Settings';
import Auth from './components/Auth';
import POS from './components/POS';
import CashRegister from './components/CashRegister';
import ExpenseManager from './components/ExpenseManager';
import Toast from './components/Toast';
import { database } from './services/databaseService';
import { supabase } from './services/supabaseClient';
import { Document, Client, Product, DocumentType, DocumentStatus, AppSettings, Expense, User, UserRole, CashSession, CashMovement, CashSessionStatus, NotificationType, Notification } from './types';

interface NotificationContextType {
  notify: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification debe usarse dentro de un NotificationProvider");
  return context;
};

const INITIAL_SETTINGS: AppSettings = {
  tenantId: 'default',
  currency: 'COP',
  companyName: 'Empresa Demo',
  companyId: '900000000-1',
  companyAddress: 'Calle Principal #123',
  defaultTaxRate: 19
};

const EditDocumentWrapper: React.FC<{ 
  user: User,
  documents: Document[], 
  clients: Client[], 
  products: Product[], 
  onSave: (doc: Document) => void | Promise<void>,
  onUpdateClients: (client: Client) => void | Promise<void>,
  onUpdateProducts: (product: Product) => void | Promise<void>,
  settings: AppSettings,
  hasActiveCashSession: boolean
}> = ({ documents, ...props }) => {
  const { id } = useParams();
  const doc = documents.find(d => d.id === id);
  if (!doc) return <Navigate to="/" />;
  return <DocumentEditor initialData={doc} type={doc.type} {...props} />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('facturapro_theme') === 'dark');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subUsers, setSubUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const notify = useCallback((message: string, type: NotificationType = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSyncFeedback = (result: { local: boolean, cloud: boolean }, entityName: string) => {
    if (result.cloud) {
      notify(`${entityName} sincronizado ✓`, "success");
    } else if (result.local) {
      notify(`${entityName} guardado localmente`, "info");
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const finalTenantId = session.user.user_metadata?.tenantId || session.user.id;
        setUser({
          id: session.user.id,
          tenantId: finalTenantId,
          username: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'Usuario Pro',
          role: session.user.user_metadata?.role || UserRole.ADMIN
        });
      } else {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('facturapro_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const loadAppData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const tId = user.tenantId;
    try {
      const [docs, exps, clis, prods, usrs, snds, movs, cloudSettings] = await Promise.all([
        database.fetchData<Document>('docs', tId),
        database.fetchData<Expense>('expenses', tId),
        database.fetchData<Client>('clients', tId),
        database.fetchData<Product>('products', tId),
        database.fetchData<User>('subusers', tId),
        database.fetchData<CashSession>('cash_sessions', tId),
        database.fetchData<CashMovement>('cash_movements', tId),
        database.fetchData<AppSettings>('settings', tId)
      ]);
      
      setDocuments(docs || []);
      setExpenses(exps || []);
      setProducts(prods || []);
      setSessions(snds || []);
      setMovements(movs || []);
      
      const finalClients = clis || [];
      if (finalClients.length === 0) {
        const defaultClient: Client = {
          id: 'general',
          tenantId: tId,
          name: 'CONSUMIDOR FINAL',
          email: '',
          phone: '',
          taxIdType: 'Cédula',
          taxId: '222222222222',
          address: 'CIUDAD',
          city: 'GENERAL',
          municipality: '',
          zipCode: ''
        };
        setClients([defaultClient]);
        database.saveData('clients', defaultClient, tId);
      } else {
        setClients(finalClients);
      }
      
      if (cloudSettings && cloudSettings.length > 0) {
        setSettings({ ...INITIAL_SETTINGS, ...cloudSettings[0] });
      } else {
        const localSettings = localStorage.getItem(`facturapro_settings_${tId}`);
        if (localSettings) setSettings({ ...INITIAL_SETTINGS, ...JSON.parse(localSettings) });
      }

      const updatedUserList = [...(usrs || [])];
      if (!updatedUserList.find(u => u.id === user.id)) updatedUserList.unshift(user);
      setSubUsers(updatedUserList);
    } catch (error) {
      notify("Error cargando datos de la nube", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, notify]);

  useEffect(() => {
    if (user) loadAppData();
  }, [user, loadAppData]);

  const hasActiveCashSession = useMemo(() => 
    sessions.some(s => s.status === CashSessionStatus.OPEN), 
  [sessions]);

  const handleLogin = (u: User) => {
    window.location.hash = '#/';
    setUser(u);
    notify(`¡Hola de nuevo, ${u.name.split(' ')[0]}!`, 'success');
  };

  const handleLogout = async () => { 
    await supabase.auth.signOut(); 
    setUser(null); 
    notify("Has salido del sistema", "info");
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    if (!user) return;
    setSettings(newSettings);
    const result = await database.saveData('settings', newSettings, user.tenantId);
    handleSyncFeedback(result, "Ajustes");
  };

  const handleSaveSession = async (session: CashSession) => {
    if (!user) return;
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        const up = [...prev];
        up[idx] = session;
        return up;
      }
      return [session, ...prev];
    });
    const result = await database.saveData('cash_sessions', session, user.tenantId);
    handleSyncFeedback(result, "Caja");
  };

  const handleSaveMovement = async (mov: CashMovement) => {
    if (!user) return;
    setMovements(prev => [mov, ...prev]);
    const result = await database.saveData('cash_movements', mov, user.tenantId);
    handleSyncFeedback(result, "Movimiento");
  };

  const handleSaveDocument = useCallback(async (doc: Document) => {
    if (!user) return;
    const docWithTenant = { ...doc, tenantId: user.tenantId };
    setDocuments(prev => {
      const exists = prev.findIndex(d => d.id === doc.id);
      if (exists < 0) return [docWithTenant, ...prev];
      const updated = [...prev];
      updated[exists] = docWithTenant;
      return updated;
    });
    
    if ((doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) && doc.status === DocumentStatus.PAID) {
      setProducts(currentProducts => {
        const updatedProducts = [...currentProducts];
        doc.items.forEach(item => {
          let productIndex = updatedProducts.findIndex(p => p.description === item.description);
          if (productIndex >= 0) {
            const p = updatedProducts[productIndex];
            const updatedProduct = { ...p, stock: Math.max(0, (p.stock || 0) - item.quantity) };
            updatedProducts[productIndex] = updatedProduct;
            database.saveData('products', updatedProduct, user.tenantId);
          }
        });
        return updatedProducts;
      });
    }
    const result = await database.saveData('docs', docWithTenant, user.tenantId);
    handleSyncFeedback(result, doc.type);
  }, [user, notify]);

  const handleSaveClient = async (client: Client) => {
    if (!user) return;
    const clientWithTenant = { ...client, tenantId: user.tenantId };
    setClients(prev => {
      const index = prev.findIndex(c => c.id === client.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = clientWithTenant;
        return updated;
      }
      return [clientWithTenant, ...prev];
    });
    const result = await database.saveData('clients', clientWithTenant, user.tenantId);
    handleSyncFeedback(result, "Cliente");
  };

  const handleSaveProduct = async (product: Product) => {
    if (!user) return;
    const productWithTenant = { ...product, tenantId: user.tenantId };
    setProducts(prev => {
      const index = prev.findIndex(p => p.id === product.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = productWithTenant;
        return updated;
      }
      return [productWithTenant, ...prev];
    });
    const result = await database.saveData('products', productWithTenant, user.tenantId);
    handleSyncFeedback(result, "Producto");
  };

  const handleSaveExpense = async (expense: Expense) => {
    if (!user) return;
    const expenseWithTenant = { ...expense, tenantId: user.tenantId };
    setExpenses(prev => {
      const index = prev.findIndex(e => e.id === expense.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = expenseWithTenant;
        return updated;
      }
      return [expenseWithTenant, ...prev];
    });
    const result = await database.saveData('expenses', expenseWithTenant, user.tenantId);
    handleSyncFeedback(result, "Gasto");
  };

  const handleSaveUser = async (newUser: User) => {
    if (!user) return;
    const userWithTenant = { ...newUser, tenantId: user.tenantId };
    setSubUsers(prev => {
      const index = prev.findIndex(u => u.id === newUser.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = userWithTenant;
        return updated;
      }
      return [userWithTenant, ...prev];
    });
    const result = await database.saveData('subusers', userWithTenant, user.tenantId);
    handleSyncFeedback(result, "Equipo");
  };

  const handleDeleteDoc = async (id: string) => {
    if (!user) return;
    setDocuments(prev => prev.filter(d => d.id !== id));
    await database.deleteRecord('docs', id, user.tenantId);
    notify("Documento eliminado", "info");
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 p-10 text-center">
      <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8"></div>
      <h2 className="text-white font-black text-xl uppercase tracking-tighter mb-2">FacturaPro Cloud</h2>
      <p className="font-black text-blue-500 text-[10px] uppercase tracking-[0.4em] animate-pulse">Sincronizando Base de Datos...</p>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  const commonEditorProps = {
    user,
    clients,
    products,
    onSave: handleSaveDocument,
    onUpdateClients: handleSaveClient,
    onUpdateProducts: handleSaveProduct,
    settings,
    hasActiveCashSession
  };

  const listProps = {
    user,
    documents,
    clients,
    products,
    settings,
    onDelete: handleDeleteDoc,
    onUpdateDocument: handleSaveDocument,
    onUpdateProduct: handleSaveProduct
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      <HashRouter>
        <Layout user={user} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}>
          {notifications.map(n => (
            <Toast key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
          ))}
          <Routes>
            <Route path="/" element={<Dashboard user={user} documents={documents} expenses={expenses} clientsCount={clients.length} settings={settings} onDeleteDoc={handleDeleteDoc} onUpdateDoc={handleSaveDocument} clients={clients} products={products} />} />
            <Route path="/search" element={<DocumentHistory user={user} documents={documents} clients={clients} settings={settings} onDelete={handleDeleteDoc} onUpdateDocument={handleSaveDocument} />} />
            <Route path="/cash" element={<CashRegister user={user} settings={settings} sessions={sessions} movements={movements} documents={documents} onSaveSession={handleSaveSession} onSaveMovement={handleSaveMovement} />} />
            <Route path="/pos" element={<POS user={user} products={products} clients={clients} settings={settings} onSaveDocument={handleSaveDocument} onSaveClient={handleSaveClient} hasActiveCashSession={hasActiveCashSession} />} />
            
            <Route path="/invoices" element={<DocumentList type={DocumentType.INVOICE} {...listProps} />} />
            <Route path="/invoices/new" element={<DocumentEditor type={DocumentType.INVOICE} {...commonEditorProps} />} />
            <Route path="/invoices/edit/:id" element={<EditDocumentWrapper documents={documents} {...commonEditorProps} />} />
            
            <Route path="/quotes" element={<DocumentList type={DocumentType.QUOTE} {...listProps} />} />
            <Route path="/quotes/new" element={<DocumentEditor type={DocumentType.QUOTE} {...commonEditorProps} />} />
            <Route path="/quotes/edit/:id" element={<EditDocumentWrapper documents={documents} {...commonEditorProps} />} />
            
            <Route path="/collections" element={<DocumentList type={DocumentType.ACCOUNT_COLLECTION} {...listProps} />} />
            <Route path="/collections/new" element={<DocumentEditor type={DocumentType.ACCOUNT_COLLECTION} {...commonEditorProps} />} />
            <Route path="/collections/edit/:id" element={<EditDocumentWrapper documents={documents} {...commonEditorProps} />} />
            
            <Route path="/clients" element={<ClientManager user={user} clients={clients} onSaveClient={handleSaveClient} onDeleteClient={(id) => { database.deleteRecord('clients', id, user.tenantId); setClients(prev => prev.filter(c => c.id !== id)); }} />} />
            <Route path="/products" element={<ProductManager user={user} products={products} onSaveProduct={handleSaveProduct} onDeleteProduct={(id) => { database.deleteRecord('products', id, user.tenantId); setProducts(prev => prev.filter(p => p.id !== id)); }} settings={settings} />} />
            <Route path="/expenses" element={<ExpenseManager expenses={expenses} products={products} onSaveProduct={handleSaveProduct} onSaveExpense={handleSaveExpense} onDeleteExpense={(id) => { database.deleteRecord('expenses', id, user.tenantId); setExpenses(prev => prev.filter(e => e.id !== id)); }} settings={settings} />} />
            <Route path="/users" element={<UserManager currentUser={user} users={subUsers} onUpdateUsers={handleSaveUser} onDeleteUser={(id) => { database.deleteRecord('subusers', id, user.tenantId); setSubUsers(prev => prev.filter(u => u.id !== id)); }} />} />
            <Route path="/settings" element={<Settings settings={settings} onUpdateSettings={handleUpdateSettings} onImportData={() => {}} allData={{ documents, expenses, clients, products, settings }} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </HashRouter>
    </NotificationContext.Provider>
  );
};

export default App;