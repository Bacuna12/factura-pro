
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
import Auth from './components/Auth';
import { Document, Client, Product, DocumentType, AppSettings, Expense, User } from './types';

const INITIAL_CLIENTS: Client[] = [
  { id: '1', name: 'Acme Corp', email: 'billing@acme.com', taxId: '900.123.456-1', address: 'Calle 100 #15-20, Bogotá' },
  { id: '2', name: 'Global Tech', email: 'finance@globaltech.co', taxId: '800.987.654-2', address: 'Cra 43A #1-50, Medellín' },
];

const INITIAL_SETTINGS: AppSettings = {
  currency: 'COP',
  companyName: 'Mi Empresa S.A.S.',
  companyId: '900.000.000-0',
  companyAddress: 'Calle Corporativa 123, Bogotá',
  defaultTaxRate: 19
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('facturapro_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('facturapro_docs');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('facturapro_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('facturapro_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('facturapro_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('facturapro_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('facturapro_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('facturapro_session');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('facturapro_docs', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('facturapro_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('facturapro_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('facturapro_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('facturapro_settings', JSON.stringify(settings));
  }, [settings]);

  const handleLogin = (newUser: User, newSettings?: AppSettings) => {
    setUser(newUser);
    if (newSettings) {
      setSettings(newSettings);
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleSaveDocument = (doc: Document) => {
    setProducts(prevProducts => {
      let updatedProducts = [...prevProducts];
      doc.items.forEach(item => {
        const desc = item.description.trim();
        if (!desc || desc.length < 3) return;
        
        const existingProductIndex = updatedProducts.findIndex(
          p => p.description.toLowerCase() === desc.toLowerCase()
        );

        if (existingProductIndex >= 0) {
          if (updatedProducts[existingProductIndex].unitPrice !== item.unitPrice) {
            updatedProducts[existingProductIndex] = {
              ...updatedProducts[existingProductIndex],
              unitPrice: item.unitPrice
            };
          }
        } else {
          updatedProducts.push({
            id: Math.random().toString(36).substr(2, 9),
            description: desc,
            unitPrice: item.unitPrice
          });
        }
      });
      return updatedProducts;
    });

    setDocuments(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) {
        return prev.map(d => d.id === doc.id ? doc : d);
      }
      return [doc, ...prev];
    });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateClients = (newClients: Client[]) => setClients(newClients);
  const handleUpdateProducts = (newProducts: Product[]) => setProducts(newProducts);
  const handleUpdateExpenses = (newExpenses: Expense[]) => setExpenses(newExpenses);
  const handleUpdateSettings = (newSettings: AppSettings) => setSettings(newSettings);

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout onLogout={handleLogout} user={user}>
        <Routes>
          <Route path="/" element={<Dashboard documents={documents} expenses={expenses} clientsCount={clients.length} settings={settings} />} />
          
          <Route path="/invoices" element={
            <DocumentList 
              type={DocumentType.INVOICE} 
              documents={documents} 
              clients={clients} 
              products={products}
              settings={settings}
              onDelete={handleDeleteDocument}
              onUpdateDocument={handleSaveDocument}
              onUpdateProducts={handleUpdateProducts}
            />
          } />
          <Route path="/invoices/new" element={
            <DocumentEditor 
              type={DocumentType.INVOICE} 
              clients={clients} 
              products={products}
              onSave={handleSaveDocument} 
              settings={settings}
            />
          } />
          <Route path="/invoices/edit/:id" element={<EditDocumentWrapper type={DocumentType.INVOICE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} />} />

          <Route path="/quotes" element={
            <DocumentList 
              type={DocumentType.QUOTE} 
              documents={documents} 
              clients={clients} 
              products={products}
              settings={settings}
              onDelete={handleDeleteDocument}
              onUpdateDocument={handleSaveDocument}
              onUpdateProducts={handleUpdateProducts}
            />
          } />
          <Route path="/quotes/new" element={
            <DocumentEditor 
              type={DocumentType.QUOTE} 
              clients={clients} 
              products={products}
              onSave={handleSaveDocument} 
              settings={settings}
            />
          } />
          <Route path="/quotes/edit/:id" element={<EditDocumentWrapper type={DocumentType.QUOTE} documents={documents} clients={clients} products={products} settings={settings} onSave={handleSaveDocument} />} />

          <Route path="/expenses" element={
            <ExpenseManager 
              expenses={expenses}
              onUpdateExpenses={handleUpdateExpenses}
              settings={settings}
            />
          } />

          <Route path="/products" element={
            <ProductManager 
              products={products} 
              onUpdateProducts={handleUpdateProducts}
              settings={settings}
            />
          } />

          <Route path="/clients" element={
            <ClientManager 
              clients={clients} 
              onUpdateClients={handleUpdateClients} 
            />
          } />

          <Route path="/settings" element={
            <Settings 
              settings={settings} 
              onUpdateSettings={handleUpdateSettings} 
            />
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

const EditDocumentWrapper: React.FC<{ 
  type: DocumentType, 
  documents: Document[], 
  clients: Client[], 
  products: Product[],
  settings: AppSettings, 
  onSave: (doc: Document) => void 
}> = ({ type, documents, clients, products, settings, onSave }) => {
  const { id } = useParams<{ id: string }>();
  const initialData = documents.find(d => d.id === id);
  if (!initialData) return <Navigate to={type === DocumentType.INVOICE ? '/invoices' : '/quotes'} />;
  return (
    <DocumentEditor 
      type={type} 
      clients={clients} 
      products={products}
      onSave={onSave} 
      settings={settings} 
      initialData={initialData} 
    />
  );
};

export default App;
