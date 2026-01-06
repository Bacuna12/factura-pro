
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

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  city: string;
  municipality: string;
  zipCode: string;
}

export interface Product {
  id: string;
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
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

export interface Document {
  id: string;
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
}

export interface AppSettings {
  currency: string;
  companyName: string;
  companyId: string;
  companyAddress: string;
  defaultTaxRate: number;
  logo?: string;
  pdfTemplate?: PdfTemplate;
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
