
import React, { useState, useMemo } from 'react';
import { 
  CashSession, 
  CashMovement, 
  CashSessionStatus, 
  CashMovementType, 
  User, 
  AppSettings,
  Document,
  DocumentType
} from '../types';
import { exportCashSessionReport } from '../services/pdfService';
import ConfirmModal from './ConfirmModal';

interface CashRegisterProps {
  user: User;
  settings: AppSettings;
  sessions: CashSession[];
  movements: CashMovement[];
  documents: Document[];
  onSaveSession: (session: CashSession) => void;
  onSaveMovement: (movement: CashMovement) => void;
}

const CashRegister: React.FC<CashRegisterProps> = ({ 
  user, settings, sessions, movements, documents, onSaveSession, onSaveMovement 
}) => {
  const [isOpeningModal, setIsOpeningModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isMovementModal, setIsMovementModal] = useState(false);
  
  const [openingBalance, setOpeningBalance] = useState('0');
  const [countedBalance, setCountedBalance] = useState('0');
  
  const [movAmount, setMovAmount] = useState('0');
  const [movDesc, setMovDesc] = useState('');
  const [movType, setMovType] = useState<CashMovementType>(CashMovementType.IN);

  const activeSession = useMemo(() => 
    sessions.find(s => s.status === CashSessionStatus.OPEN), 
  [sessions]);

  const activeMovements = useMemo(() => 
    activeSession ? movements.filter(m => m.sessionId === activeSession.id) : [],
  [activeSession, movements]);

  const activeSalesCash = useMemo(() => {
    if (!activeSession) return 0;
    return documents
      .filter(d => 
        (d.type === DocumentType.INVOICE || d.type === DocumentType.ACCOUNT_COLLECTION) && 
        d.paymentMethod === 'Efectivo' &&
        new Date(d.createdAt || d.date) >= new Date(activeSession.openedAt)
      )
      .reduce((acc, d) => {
        const cashPayment = d.payments?.find(p => p.method === 'Efectivo');
        return acc + (cashPayment?.amount || 0);
      }, 0);
  }, [activeSession, documents]);

  const currentExpected = useMemo(() => {
    if (!activeSession) return 0;
    const movsTotal = activeMovements.reduce((acc, m) => 
      m.type === CashMovementType.IN ? acc + m.amount : acc - m.amount, 0);
    return activeSession.openingBalance + activeSalesCash + movsTotal;
  }, [activeSession, activeSalesCash, activeMovements]);

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: settings.currency || 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return (settings.currency || '$') + ' ' + amount.toLocaleString('es-CO');
    }
  };

  const handleOpenCash = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: CashSession = {
      id: Math.random().toString(36).substr(2, 9),
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.name,
      openedAt: new Date().toISOString(),
      openingBalance: parseFloat(openingBalance),
      expectedBalance: parseFloat(openingBalance),
      status: CashSessionStatus.OPEN
    };
    onSaveSession(newSession);
    setIsOpeningModal(false);
    setOpeningBalance('0');
  };

  const handleCloseCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const actual = parseFloat(countedBalance);
    const diff = actual - currentExpected;
    
    const closedSession: CashSession = {
      ...activeSession,
      closedAt: new Date().toISOString(),
      expectedBalance: currentExpected,
      actualBalance: actual,
      difference: diff,
      status: CashSessionStatus.CLOSED
    };
    onSaveSession(closedSession);
    setIsClosingModal(false);
    setCountedBalance('0');
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const newMov: CashMovement = {
      id: Math.random().toString(36).substr(2, 9),
      tenantId: user.tenantId,
      sessionId: activeSession.id,
      type: movType,
      amount: parseFloat(movAmount),
      description: movDesc,
      date: new Date().toISOString()
    };
    onSaveMovement(newMov);
    setIsMovementModal(false);
    setMovAmount('0');
    setMovDesc('');
  };

  const handleDownloadSessionReport = (session: CashSession) => {
    // Filtrar movimientos específicos de esta sesión
    const sessionMovs = movements.filter(m => m.sessionId === session.id);
    // Exportar reporte usando el servicio de PDF
    exportCashSessionReport(session, sessionMovs, documents, settings);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Caja y Arqueos</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Control diario de efectivo y movimientos.</p>
        </div>
        {!activeSession ? (
          <button 
            onClick={() => setIsOpeningModal(true)}
            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all uppercase tracking-widest text-xs"
          >
            Abrir Caja del Día
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => setIsMovementModal(true)}
              className="px-6 py-4 bg-slate-800 text-white rounded-2xl font-black shadow-lg hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]"
            >
              Movimiento +/-
            </button>
            <button 
              onClick={() => setIsClosingModal(true)}
              className="px-6 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all uppercase tracking-widest text-[10px]"
            >
              Realizar Arqueo y Cerrar
            </button>
          </div>
        )}
      </header>

      {activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox title="Base Inicial" value={formatCurrency(activeSession.openingBalance)} icon="🏁" color="text-slate-400" />
          <StatBox title="Ventas Efectivo" value={formatCurrency(activeSalesCash)} icon="💰" color="text-emerald-500" />
          <StatBox title="Efectivo en Caja" value={formatCurrency(currentExpected)} icon="🏦" color="text-blue-600" isLarge />
        </div>
      ) : (
        <div className="bg-slate-100 dark:bg-slate-900/50 p-20 rounded-[40px] text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
          <span className="text-6xl mb-4 block">🔒</span>
          <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Caja Cerrada</h3>
          <p className="text-slate-500 text-sm mt-2">Abre la caja para empezar a registrar ventas en efectivo.</p>
        </div>
      )}

      {activeSession && (
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Movimientos de la Sesión</h3>
            <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-50 px-3 py-1 rounded-full">En Curso</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-4">Hora</th>
                  <th className="px-8 py-4">Descripción</th>
                  <th className="px-8 py-4">Tipo</th>
                  <th className="px-8 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {activeMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-8 py-4 text-xs font-bold text-slate-400">{new Date(m.date).toLocaleTimeString()}</td>
                    <td className="px-8 py-4 font-bold text-slate-700 dark:text-slate-200">{m.description}</td>
                    <td className="px-8 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${m.type === CashMovementType.IN ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className={`px-8 py-4 text-right font-black ${m.type === CashMovementType.IN ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.type === CashMovementType.IN ? '+' : '-'}{formatCurrency(m.amount)}
                    </td>
                  </tr>
                ))}
                {activeMovements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-xs font-bold">No hay movimientos manuales registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase px-2">Arqueos Finalizados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.filter(s => s.status === CashSessionStatus.CLOSED).map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center group hover:border-blue-300 transition-all">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(s.openedAt).toLocaleDateString()}</p>
                <h4 className="font-black text-slate-800 dark:text-white">Arqueo #{s.id.toUpperCase()}</h4>
                <p className="text-xs font-bold text-slate-500 italic">Por: {s.userName}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(s.actualBalance || 0)}</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${
                    (s.difference || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    { (s.difference || 0) >= 0 ? `Sobrante: ${formatCurrency(s.difference || 0)}` : `Faltante: ${formatCurrency(s.difference || 0)}` }
                  </span>
                </div>
                <button 
                  onClick={() => handleDownloadSessionReport(s)}
                  className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  title="Descargar Reporte PDF"
                >
                  📥
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOpeningModal && (
        <Modal title="Apertura de Caja" onClose={() => setIsOpeningModal(false)}>
          <form onSubmit={handleOpenCash} className="p-8 space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Base en Efectivo (Sencillo)</label>
              <input type="number" required value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-3xl font-black text-3xl text-emerald-600 outline-none" autoFocus />
            </div>
            <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest text-xs">Abrir Turno</button>
          </form>
        </Modal>
      )}

      {isClosingModal && (
        <Modal title="Arqueo y Cierre" onClose={() => setIsClosingModal(false)}>
          <form onSubmit={handleCloseCash} className="p-8 space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl text-center border border-blue-100 dark:border-blue-800">
               <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">Efectivo Esperado (Calculado)</p>
               <p className="text-3xl font-black text-blue-900 dark:text-blue-100">{formatCurrency(currentExpected)}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Efectivo Contado Real</label>
              <input type="number" required value={countedBalance} onChange={e => setCountedBalance(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-3xl font-black text-3xl outline-none" autoFocus />
            </div>
            <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest text-xs">Cerrar Sesión de Caja</button>
          </form>
        </Modal>
      )}

      {isMovementModal && (
        <Modal title="Nuevo Movimiento" onClose={() => setIsMovementModal(false)}>
          <form onSubmit={handleAddMovement} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMovType(CashMovementType.IN)} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${movType === CashMovementType.IN ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400'}`}>Ingreso</button>
              <button type="button" onClick={() => setMovType(CashMovementType.OUT)} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${movType === CashMovementType.OUT ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-400'}`}>Egreso</button>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Monto</label>
              <input type="number" required value={movAmount} onChange={e => setMovAmount(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Concepto / Descripción</label>
              <input type="text" required value={movDesc} onChange={e => setMovDesc(e.target.value)} placeholder="Ej: Pago de almuerzos, Compra papelería..." className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl font-bold outline-none" />
            </div>
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs">Registrar Movimiento</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

const StatBox = ({ title, value, icon, color, isLarge = false }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
    <div className="flex items-center gap-3 mb-4">
       <span className="text-2xl">{icon}</span>
       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h4>
    </div>
    <p className={`font-black tracking-tighter ${isLarge ? 'text-4xl text-blue-600' : 'text-2xl text-slate-900 dark:text-white'}`}>{value}</p>
  </div>
);

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white dark:bg-slate-950 rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl animate-slideUp" onClick={e => e.stopPropagation()}>
      <div className="bg-slate-900 p-8 text-white text-center relative">
        <h3 className="text-xl font-black uppercase tracking-widest">{title}</h3>
        <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white">✕</button>
      </div>
      {children}
    </div>
  </div>
);

export default CashRegister;
