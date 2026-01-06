
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings, Payment, Product } from '../types';
import { exportToPDF } from '../services/pdfService';
import ProductManager from './ProductManager';
import ConfirmModal from './ConfirmModal';

interface DocumentListProps {
  type: DocumentType;
  documents: Document[];
  clients: Client[];
  products: Product[];
  settings: AppSettings;
  onDelete: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
  onUpdateProducts: (products: Product[]) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  type, 
  documents, 
  clients, 
  products,
  settings, 
  onDelete, 
  onUpdateDocument,
  onUpdateProducts
}) => {
  const navigate = useNavigate();
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [newPayment, setNewPayment] = useState({ amount: 0, method: 'Transferencia', note: '' });

  const isInvoice = type === DocumentType.INVOICE;
  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;
  const isQuote = type === DocumentType.QUOTE;

  // Determinar la base de la URL según el tipo
  const getRouteBase = (docType: DocumentType) => {
    if (docType === DocumentType.INVOICE) return '/invoices';
    if (docType === DocumentType.ACCOUNT_COLLECTION) return '/collections';
    return '/quotes';
  };

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getClientName = (id: string) => getClient(id)?.name || 'Cliente desconocido';

  const calculateTotal = (doc: Document) => {
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const gross = subtotal + tax;
    const withholding = gross * ((doc.withholdingRate || 0) / 100);
    return gross - withholding;
  };

  const calculatePaid = (doc: Document) => {
    return (doc.payments || []).reduce((acc, p) => acc + p.amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportPDF = (doc: Document) => {
    const client = getClient(doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const openPaymentModal = (doc: Document) => {
    setSelectedDoc(doc);
    const balance = calculateTotal(doc) - calculatePaid(doc);
    setNewPayment({ amount: balance, method: 'Transferencia', note: '' });
    setShowPaymentModal(true);
  };

  const handleConfirmDelete = () => {
    if (docToDelete) {
      onDelete(docToDelete);
      setDocToDelete(null);
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    const payment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount: newPayment.amount,
      method: newPayment.method,
      note: newPayment.note
    };

    const updatedPayments = [...(selectedDoc.payments || []), payment];
    const total = calculateTotal(selectedDoc);
    const totalPaid = updatedPayments.reduce((acc, p) => acc + p.amount, 0);
    
    let newStatus = selectedDoc.status;
    if (totalPaid >= total) {
      newStatus = DocumentStatus.PAID;
    } else if (totalPaid > 0) {
      newStatus = DocumentStatus.PARTIAL;
    }

    onUpdateDocument({
      ...selectedDoc,
      payments: updatedPayments,
      status: newStatus
    });

    setShowPaymentModal(false);
    setSelectedDoc(null);
  };

  const filteredDocs = documents.filter(d => d.type === type);

  return (
    <div className="space-y-8 animate-fadeIn">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title={`Eliminar ${type}`}
        message="¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer."
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{type}S</h2>
          <p className="text-gray-500 font-medium">Historial de {type.toLowerCase()}s</p>
        </div>
        <button 
          onClick={() => navigate(`${getRouteBase(type)}/new`)}
          className={`w-full sm:w-auto px-6 py-3 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            isCollection ? 'bg-violet-600 shadow-violet-100 hover:bg-violet-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
          }`}
        >
          <span className="text-xl">+</span>
          <span>Crear {type}</span>
        </button>
      </div>

      <div className="hidden md:block bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Total a Pagar</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredDocs.map(doc => {
              const total = calculateTotal(doc);
              const balance = total - calculatePaid(doc);
              return (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className={`px-6 py-4 font-bold ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{getClientName(doc.clientId)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      doc.status === DocumentStatus.PAID || doc.status === DocumentStatus.ACCEPTED 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : doc.status === DocumentStatus.REJECTED 
                        ? 'bg-rose-100 text-rose-700'
                        : doc.status === DocumentStatus.PARTIAL
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-900">{formatCurrency(total)}</div>
                    {balance > 0 && !isQuote && (
                      <div className="text-[10px] text-amber-600 font-bold">Saldo: {formatCurrency(balance)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      {!isQuote && balance > 0 && (
                        <ActionButton onClick={() => openPaymentModal(doc)} icon="💸" color="text-emerald-600" title="Pagar" />
                      )}
                      <ActionButton onClick={() => handleExportPDF(doc)} icon="📥" color="text-indigo-600" title="PDF" />
                      <ActionButton onClick={() => navigate(`${getRouteBase(type)}/edit/${doc.id}`)} icon="✏️" color="text-blue-600" title="Editar" />
                      <ActionButton onClick={() => setDocToDelete(doc.id)} icon="🗑️" color="text-rose-600" title="Borrar" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* ... Rest of component ... */}
    </div>
  );
};

const ActionButton: React.FC<{ onClick: () => void; icon: string; color: string; title: string }> = ({ onClick, icon, color, title }) => (
  <button 
    onClick={onClick}
    className={`p-2.5 ${color} hover:bg-white hover:shadow-md rounded-xl transition-all active:scale-90 border border-transparent hover:border-gray-100`}
    title={title}
  >
    {icon}
  </button>
);

export default DocumentList;
