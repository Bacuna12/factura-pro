
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Document, DocumentType, DocumentStatus, Client, AppSettings } from '../types';
import { exportToPDF } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface DocumentHistoryProps {
  documents: Document[];
  clients: Client[];
  settings: AppSettings;
  onDelete: (id: string) => void;
  onUpdateDocument: (doc: Document) => void;
}

const DocumentHistory: React.FC<DocumentHistoryProps> = ({ 
  documents, clients, settings, onDelete, onUpdateDocument 
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'ALL' | DocumentType>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | DocumentStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const getClient = (id: string) => clients.find(c => c.id === id);
  
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
    return documents.filter(doc => {
      const matchesType = filterType === 'ALL' || doc.type === filterType;
      const matchesStatus = filterStatus === 'ALL' || doc.status === filterStatus;
      const clientName = getClient(doc.clientId)?.name.toLowerCase() || '';
      const matchesSearch = doc.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           clientName.includes(searchTerm.toLowerCase());
      return matchesType && matchesStatus && matchesSearch;
    });
  }, [documents, filterType, filterStatus, searchTerm, clients]);

  const handleExportPDF = (doc: Document) => {
    const client = getClient(doc.clientId);
    exportToPDF(doc, client, settings);
  };

  const getRouteBase = (docType: DocumentType) => {
    if (docType === DocumentType.INVOICE) return '/invoices';
    if (docType === DocumentType.ACCOUNT_COLLECTION) return '/collections';
    return '/quotes';
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <ConfirmModal 
        isOpen={!!docToDelete}
        title="Eliminar Documento"
        message="¿Estás seguro de que deseas eliminar este registro histórico permanentemente?"
        onConfirm={() => {
          if (docToDelete) onDelete(docToDelete);
          setDocToDelete(null);
        }}
        onCancel={() => setDocToDelete(null)}
      />

      <header>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Historial General</h2>
        <p className="text-gray-500 font-medium">Todas las facturas, cuentas y presupuestos realizados</p>
      </header>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
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
          value={filterType} 
          onChange={e => setFilterType(e.target.value as any)}
          className="px-4 py-3 bg-gray-50 rounded-2xl font-black text-xs uppercase outline-none"
        >
          <option value="ALL">Todos los Tipos</option>
          <option value={DocumentType.INVOICE}>Facturas</option>
          <option value={DocumentType.ACCOUNT_COLLECTION}>Cuentas Cobro</option>
          <option value={DocumentType.QUOTE}>Presupuestos</option>
        </select>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value as any)}
          className="px-4 py-3 bg-gray-50 rounded-2xl font-black text-xs uppercase outline-none"
        >
          <option value="ALL">Cualquier Estado</option>
          {Object.values(DocumentStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">Ref / Fecha</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Total a Pagar</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-900">#{doc.number}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{doc.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                      doc.type === DocumentType.INVOICE ? 'bg-blue-50 text-blue-600' : 
                      doc.type === DocumentType.ACCOUNT_COLLECTION ? 'bg-violet-50 text-violet-600' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-700">{getClient(doc.clientId)?.name || 'S/N'}</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                      doc.status === DocumentStatus.PAID || doc.status === DocumentStatus.ACCEPTED 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : doc.status === DocumentStatus.REJECTED 
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-gray-900">
                    {formatCurrency(calculateTotal(doc))}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleExportPDF(doc)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Descargar PDF">📥</button>
                      <button onClick={() => navigate(`${getRouteBase(doc.type)}/edit/${doc.id}`)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl" title="Editar">✏️</button>
                      <button onClick={() => setDocToDelete(doc.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl" title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="text-5xl mb-4 opacity-20">📜</div>
                    <p className="text-gray-400 font-bold">No se encontraron documentos registrados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocumentHistory;
