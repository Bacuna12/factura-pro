
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import ClientManager from './components/ClientManager';
import ProductManager from './components/ProductManager';
import ExpenseManager from './components/ExpenseManager';
import POS from './components/POS';
import Settings from './components/Settings';
import Auth from './components/Auth';
import { database } from './services/databaseService';
import { Document, Client, Product, DocumentType, AppSettings, Expense, User, BackupData, UserRole } from './types';

const INITIAL_CLIENTS: Client[] = [
  { 
    id: '1', 
    name: 'Consumidor Final', 
    email: 'cliente@final.com', 
    phone: '0000000000',
    taxId: '222222222222', 
    address: 'Caja Principal',
    city: 'Ventas Directas',
    municipality: 'General',
    zipCode: '000000'
  },
];

const INITIAL_SETTINGS: AppSettings = {
  currency: 'COP',
  companyName: 'FacturaPro S.A.S.',
  companyId: '900.000.000-0',
  companyAddress: 'Sede Principal',
  defaultTaxRate: 19
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('facturapro_current_user');
    if (saved) return JSON.parse(saved);
    return {
      id: 'admin-default',
      username: 'admin@facturapro.com',
      name: 'Administrador',
      role: UserRole.ADMIN
    };
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('facturapro_theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('facturapro_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('facturapro_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('facturapro_docs');
    return saved ? JSON.parse(saved) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => JSON.parse(localStorage.getItem('facturapro_expenses') || '[]'));
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('facturapro_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });
  const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('facturapro_products') || '[]'));
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('facturapro_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  useEffect(() => { localStorage.setItem('facturapro_docs', JSON.stringify(documents)); }, [documents]);
  useEffect(() => { localStorage.setItem('facturapro_expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('facturapro_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('facturapro_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('facturapro_settings', JSON.stringify(settings)); }, [settings]);

  const handleLogin = (loggedUser: User, customSettings?: AppSettings) => {
    setUser(loggedUser);
    localStorage.setItem('facturapro_current_user', JSON.stringify(loggedUser));
    if (customSettings) {
      setSettings(customSettings);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('facturapro_current_user');
    window.location.reload();
  };

  const handleImportData = (data: BackupData) => database.restoreDatabase(data);

  const adjustStock = useCallback((items: any[], multiplier: number) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(p => {
        const matchedItem = items.find(item => 
          item.description.toLowerCase().trim() === p.description.toLowerCase().trim() || 
          (p.barcode && item.description === p.barcode) ||
          item.id === p.id
        );
        return matchedItem ? { ...p, stock: (p.stock || 0) + (matchedItem.quantity * multiplier) } : p;
      });
      return updatedProducts;
    });
  }, []);

  const handleSaveDocument = useCallback((doc: Document) => {
    setDocuments(prevDocs => {
      const existingIndex = prevDocs.findIndex(d => d.id === doc.id);
      let updatedDocs;
      if (existingIndex >= 0) {
        updatedDocs = [...prevDocs];
        updatedDocs[existingIndex] = doc;
      } else {
        updatedDocs = [doc, ...prevDocs];
        if (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION) {
          adjustStock(doc.items, -1);
        }
      }
      return updatedDocs;
    });
  }, [adjustStock]);

  const handleDeleteDocument = useCallback((id: string) => {
    const docToDelete = documents.find(d => d.id === id);
    if (docToDelete) {
      if (docToDelete.type === DocumentType.INVOICE || docToDelete.type === DocumentType.ACCOUNT_COLLECTION) {
        adjustStock(docToDelete.items, 1);
      }
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  }, [documents, adjustStock]);

  const handleUpdateClients = (newClients: Client[]) => setClients(newClients);
  const handleUpdateProducts = (newProducts: Product[]) => setProducts(newProducts);
  const handleUpdateExpenses = (newExpenses: Expense[]) => setExpenses(newExpenses);
  const handleUpdateSettings = (newSettings: AppSettings) => setSettings(newSettings);

  const currentUser = user || { id: 'default', username: 'guest', name: 'Invitado', role: UserRole.ADMIN };

  return (
    <HashRouter>
      <Layout user={currentUser} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode}>
        <Routes>
          <Route path="/" element={<Dashboard user={currentUser} documents={documents} expenses={expenses} clientsCount={clients.length} settings={settings} onDeleteDoc={handleDeleteDocument} onUpdateDoc={handleSaveDocument} clients={clients} products={products} />} />
          <Route path="/pos" element={<POS products={products} clients={clients} settings={settings} onSaveDocument={handleSaveDocument} onUpdateClients={handleUpdateClients} />} />
          <Route path="/invoices" element={<DocumentList user={currentUser} type={DocumentType.INVOICE} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/invoices/new" element={<DocumentEditor key="new-invoice" type={DocumentType.INVOICE} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/invoices/edit/:id" element={<EditDocumentWrapper type={DocumentType.INVOICE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} onDelete={handleDeleteDocument} />} />
          <Route path="/collections" element={<DocumentList user={currentUser} type={DocumentType.ACCOUNT_COLLECTION} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/collections/new" element={<DocumentEditor key="new-collection" type={DocumentType.ACCOUNT_COLLECTION} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/collections/edit/:id" element={<EditDocumentWrapper type={DocumentType.ACCOUNT_COLLECTION} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} onDelete={handleDeleteDocument} />} />
          <Route path="/quotes" element={<DocumentList user={currentUser} type={DocumentType.QUOTE} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/quotes/new" element={<DocumentEditor key="new-quote" type={DocumentType.QUOTE} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/quotes/edit/:id" element={<EditDocumentWrapper type={DocumentType.QUOTE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} onDelete={handleDeleteDocument} />} />
          {currentUser.role === UserRole.ADMIN && (
            <>
              <Route path="/expenses" element={<ExpenseManager expenses={expenses} onUpdateExpenses={handleUpdateExpenses} settings={settings} />} />
              <Route path="/settings" element={<Settings settings={settings} onUpdateSettings={handleUpdateSettings} onImportData={handleImportData} allData={{ documents, expenses, clients, products, settings }} />} />
            </>
          )}
          <Route path="/products" element={<ProductManager user={currentUser} products={products} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/clients" element={<ClientManager user={currentUser} clients={clients} onUpdateClients={handleUpdateClients} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const EditDocumentWrapper: React.FC<{ 
  type: DocumentType, documents: Document[], clients: Client[], products: Product[], settings: AppSettings, onSave: (doc: Document) => void, onUpdateClients: (clients: Client[]) => void, onUpdateProducts: (products: Product[]) => void, onDelete: (id: string) => void
}> = ({ type, documents, clients, products, settings, onSave, onUpdateClients, onUpdateProducts, onDelete }) => {
  const { id } = useParams<{ id: string }>();
  const initialData = documents.find(d => d.id === id);
  if (!initialData) return <Navigate to={type === DocumentType.INVOICE ? '/invoices' : '/collections'} />;
  return <DocumentEditor key={id} type={type} clients={clients} products={products} onSave={onSave} onUpdateClients={onUpdateClients} onUpdateProducts={onUpdateProducts} settings={settings} initialData={initialData} onDelete={onDelete} />;
};

export default App;
