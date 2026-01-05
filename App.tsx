
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DocumentList from './components/DocumentList';
import DocumentEditor from './components/DocumentEditor';
import ClientManager from './components/ClientManager';
import ProductManager from './components/ProductManager';
import ExpenseManager from './components/ExpenseManager';
import Settings from './components/Settings';
import { database } from './services/databaseService';
import { Document, Client, Product, DocumentType, AppSettings, Expense, User, BackupData } from './types';

const DEFAULT_USER: User = {
  id: 'admin-id',
  username: 'admin@facturapro.com',
  name: 'Administrador'
};

const INITIAL_CLIENTS: Client[] = [
  { 
    id: '1', 
    name: 'Acme Corp', 
    email: 'billing@acme.com', 
    taxId: '900.123.456-1', 
    address: 'Calle 100 #15-20, Bogotá',
    city: 'Bogotá',
    municipality: 'Cundinamarca',
    zipCode: '110111'
  },
];

const INITIAL_SETTINGS: AppSettings = {
  currency: 'COP',
  companyName: 'FacturaPro S.A.S.',
  companyId: '900.000.000-0',
  companyAddress: 'Av. Empresarial 123',
  defaultTaxRate: 19
};

const App: React.FC = () => {
  const [user] = useState<User>(DEFAULT_USER);
  const [documents, setDocuments] = useState<Document[]>(() => JSON.parse(localStorage.getItem('facturapro_docs') || '[]'));
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

  useEffect(() => { database.save('facturapro_docs', documents); }, [documents]);
  useEffect(() => { database.save('facturapro_expenses', expenses); }, [expenses]);
  useEffect(() => { database.save('facturapro_clients', clients); }, [clients]);
  useEffect(() => { database.save('facturapro_products', products); }, [products]);
  useEffect(() => { database.save('facturapro_settings', settings); }, [settings]);

  const handleImportData = (data: BackupData) => database.restoreDatabase(data);

  const handleSaveDocument = (doc: Document) => {
    // Verificar si es un documento nuevo para deducir stock
    const isNew = !documents.find(d => d.id === doc.id);
    
    if (isNew && (doc.type === DocumentType.INVOICE || doc.type === DocumentType.ACCOUNT_COLLECTION)) {
      setProducts(currentProducts => {
        return currentProducts.map(p => {
          const matchedItem = doc.items.find(item => 
            item.description.toLowerCase() === p.description.toLowerCase() || 
            (p.barcode && item.description === p.barcode)
          );
          if (matchedItem) {
            return { ...p, stock: (p.stock || 0) - matchedItem.quantity };
          }
          return p;
        });
      });
    }

    setDocuments(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) return prev.map(d => d.id === doc.id ? doc : d);
      return [doc, ...prev];
    });
  };

  const handleDeleteDocument = (id: string) => setDocuments(prev => prev.filter(d => d.id !== id));
  const handleUpdateClients = (newClients: Client[]) => setClients(newClients);
  const handleUpdateProducts = (newProducts: Product[]) => setProducts(newProducts);
  const handleUpdateExpenses = (newExpenses: Expense[]) => setExpenses(newExpenses);
  const handleUpdateSettings = (newSettings: AppSettings) => setSettings(newSettings);

  return (
    <HashRouter>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Dashboard documents={documents} expenses={expenses} clientsCount={clients.length} settings={settings} />} />
          
          <Route path="/invoices" element={<DocumentList type={DocumentType.INVOICE} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/invoices/new" element={<DocumentEditor type={DocumentType.INVOICE} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/invoices/edit/:id" element={<EditDocumentWrapper type={DocumentType.INVOICE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} />} />
          
          <Route path="/collections" element={<DocumentList type={DocumentType.ACCOUNT_COLLECTION} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/collections/new" element={<DocumentEditor type={DocumentType.ACCOUNT_COLLECTION} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/collections/edit/:id" element={<EditDocumentWrapper type={DocumentType.ACCOUNT_COLLECTION} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} />} />

          <Route path="/quotes" element={<DocumentList type={DocumentType.QUOTE} documents={documents} clients={clients} products={products} settings={settings} onDelete={handleDeleteDocument} onUpdateDocument={handleSaveDocument} onUpdateProducts={handleUpdateProducts} />} />
          <Route path="/quotes/new" element={<DocumentEditor type={DocumentType.QUOTE} clients={clients} products={products} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/quotes/edit/:id" element={<EditDocumentWrapper type={DocumentType.QUOTE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} onUpdateClients={handleUpdateClients} onUpdateProducts={handleUpdateProducts} />} />
          
          <Route path="/expenses" element={<ExpenseManager expenses={expenses} onUpdateExpenses={handleUpdateExpenses} settings={settings} />} />
          <Route path="/products" element={<ProductManager products={products} onUpdateProducts={handleUpdateProducts} settings={settings} />} />
          <Route path="/clients" element={<ClientManager clients={clients} onUpdateClients={handleUpdateClients} />} />
          <Route path="/settings" element={<Settings settings={settings} onUpdateSettings={handleUpdateSettings} onImportData={handleImportData} allData={{ documents, expenses, clients, products, settings }} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const EditDocumentWrapper: React.FC<{ 
  type: DocumentType, documents: Document[], clients: Client[], products: Product[], settings: AppSettings, onSave: (doc: Document) => void, onUpdateClients: (clients: Client[]) => void, onUpdateProducts: (products: Product[]) => void 
}> = ({ type, documents, clients, products, settings, onSave, onUpdateClients, onUpdateProducts }) => {
  const { id } = useParams<{ id: string }>();
  const initialData = documents.find(d => d.id === id);
  if (!initialData) return <Navigate to={type === DocumentType.INVOICE ? '/invoices' : type === DocumentType.ACCOUNT_COLLECTION ? '/collections' : '/quotes'} />;
  return <DocumentEditor type={type} clients={clients} products={products} onSave={onSave} onUpdateClients={onUpdateClients} onUpdateProducts={onUpdateProducts} settings={settings} initialData={initialData} />;
};

export default App;
