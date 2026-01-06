
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings, Product } from '../types';
import { exportToPDF } from '../services/pdfService';
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
  settings, 
  onDelete, 
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const isCollection = type === DocumentType.ACCOUNT_COLLECTION;

  const getClient = (id: string) => clients.find(c => c.id === id);
  const getClientName = (id: string) => getClient(id)?.name || 'Cliente desconocido';

  const calculateTotal = (doc: Document) => {
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const gross = subtotal + tax;
    const withholding = gross * ((doc.withholdingRate || 0) / 100);
    return gross - withholding;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredDocs = useMemo(() => {
    return documents
      .filter(d => d.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(doc => {
        const name = getClientName(doc.clientId).toLowerCase();
        const num = doc.number.toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [documents, type, searchTerm, statusFilter, clients]);

  const handleExportPDF = (doc: Document) => {
    const client = getClient(doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const getRouteBase = (docType: DocumentType) => {
    if (docType === DocumentType.INVOICE) return '/invoices';
    if (docType === DocumentType.ACCOUNT_COLLECTION) return '/collections';
    return '/quotes';
  };

  const StatusBadge = ({ status }: { status: DocumentStatus }) => (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
      status === DocumentStatus.PAID || status === DocumentStatus.ACCEPTED 
        ? 'bg-emerald-100 text-emerald-700' 
        : status === DocumentStatus.REJECTED 
        ? 'bg-rose-100 text-rose-700'
        : 'bg-amber-100 text-amber-700'
    }`}>
      {status}
    </span>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20 md:pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title={`Eliminar ${type}`}
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible."
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">{type}S</h2>
          <p className="text-gray-500 font-medium">Historial y gestión de {type.toLowerCase()}s</p>
        </div>
        <button 
          onClick={() => navigate(`${getRouteBase(type)}/new`)}
          className={`w-full sm:w-auto px-6 py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 ${
            isCollection ? 'bg-violet-600 shadow-violet-100 hover:bg-violet-700' : 'bg-blue-600 shadow-blue-100 hover:bg-blue-700'
          }`}
        >
          <span className="text-xl">+</span>
          <span>Crear Nueva</span>
        </button>
      </div>

      <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input 
            type="text"
            placeholder="Buscar por número o cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-4 py-3 bg-gray-50 rounded-2xl font-black text-xs uppercase outline-none min-w-[160px]"
        >
          <option value="ALL">Todos los estados</option>
          {Object.values(DocumentStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* VISTA MÓVIL (CARDS) */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDocs.map(doc => (
          <div key={doc.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className={`font-black text-lg ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{doc.date}</p>
              </div>
              <StatusBadge status={doc.status} />
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
              <p className="font-bold text-gray-800">{getClientName(doc.clientId)}</p>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-gray-50">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(calculateTotal(doc))}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleExportPDF(doc)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">📥</button>
                <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-3 bg-blue-50 text-blue-600 rounded-xl">✏️</button>
                <button onClick={() => setDocToDelete(doc.id)} className="p-3 bg-rose-50 text-rose-600 rounded-xl">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="hidden md:block bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Cliente / Fecha</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total a Pagar</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className={`px-6 py-4 font-bold ${isCollection ? 'text-violet-700' : 'text-gray-900'}`}>#{doc.number}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-bold">{getClientName(doc.clientId)}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{doc.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900">
                    {formatCurrency(calculateTotal(doc))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="PDF">📥</button>
                      <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl" title="Editar">✏️</button>
                      <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl" title="Borrar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredDocs.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[32px] border border-gray-100">
          <p className="text-gray-400 font-medium">No se encontraron registros de {type.toLowerCase()}s.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
