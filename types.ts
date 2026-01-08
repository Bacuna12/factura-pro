
export enum DocumentType {
  INVOICE = 'FACTURA',
  QUOTE = 'PRESUPUESTO',
  ACCOUNT_COLLECTION = 'CUENTA DE COBRO'
}

export enum DocumentStatus {
  DRAFT = 'Borrador',
  SENT = 'Enviado',
  PARTIAL = 'Parcial',
  PAID = 'Pagado',
  ACCEPTED = 'Aceptado',
  REJECTED = 'Rechazado'
}

export enum PdfTemplate {
  PROFESSIONAL = 'PROFESSIONAL',
  MINIMALIST = 'MINIMALIST',
  MODERN_DARK = 'MODERN_DARK',
  COMPACT_TICKET = 'COMPACT_TICKET'
}

export enum UserRole {
  ADMIN = 'ADMINISTRADOR',
  SELLER = 'VENDEDOR'
}

export enum CashSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum CashMovementType {
  IN = 'INGRESO',
  OUT = 'EGRESO'
}

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

export interface User {
  id: string;
  tenantId: string; 
  username: string;
  password?: string;
  name: string;
  role: UserRole;
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  taxIdType: 'Cédula' | 'NIT';
  taxId: string;
  address: string;
  city: string;
  municipality: string;
  zipCode: string;
}

export interface Product {
  id: string;
  tenantId: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  category?: string;
  sku?: string;
  barcode?: string;
  stock?: number;
  image?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  note?: string;
  received?: number; 
  change?: number;   
}

export interface Expense {
  id: string;
  tenantId: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  productId?: string; // Vinculación con inventario
}

export interface CashSession {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  expectedBalance: number; // Calculado: opening + cash sales + in - out
  actualBalance?: number;  // Contado por el usuario al cerrar
  difference?: number;     // actual - expected
  status: CashSessionStatus;
}

export interface CashMovement {
  id: string;
  tenantId: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  description: string;
  date: string;
}

export interface Document {
  id: string;
  tenantId: string;
  type: DocumentType;
  number: string;
  date: string;
  dueDate: string;
  clientId: string;
  items: LineItem[];
  status: DocumentStatus;
  notes: string;
  taxRate: number;
  withholdingRate?: number;
  logo?: string;
  payments?: Payment[];
  paymentMethod?: string;
  isPOS?: boolean;
  signature?: string; 
  createdByName?: string; 
  createdAt?: string;
  // Campos bancarios específicos por documento
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  bankCity?: string;
}

export interface AppSettings {
  tenantId: string;
  currency: string;
  companyName: string;
  companyId: string;
  companyAddress: string;
  defaultTaxRate: number;
  logo?: string;
  pdfTemplate?: PdfTemplate;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  bankCity?: string;
}

export interface BackupData {
  documents: Document[];
  expenses: Expense[];
  clients: Client[];
  products: Product[];
  settings: AppSettings;
  version: string;
  exportDate: string;
}
