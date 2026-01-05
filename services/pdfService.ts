
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings } from '../types';

export const exportToPDF = (doc: Document, client: Client | undefined, settings: AppSettings) => {
  const pdf = new jsPDF();
  const isInvoice = doc.type === DocumentType.INVOICE;
  const isCollection = doc.type === DocumentType.ACCOUNT_COLLECTION;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Colores Corporativos dinámicos
  let primaryColor = [71, 85, 105]; // Gris (Presupuesto)
  if (isInvoice) primaryColor = [37, 99, 235]; // Azul (Factura)
  if (isCollection) primaryColor = [124, 58, 237]; // Púrpura (Cuenta de Cobro)

  const accentColor = [241, 245, 249]; 
  
  // 1. Cabecera Estilo "Hero"
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, 210, 50, 'F');
  
  const logoToUse = doc.logo || settings.logo;
  if (logoToUse) {
    try {
      pdf.addImage(logoToUse, 'PNG', 15, 10, 30, 30);
    } catch (e) { /* fallback if image error */ }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(settings.companyName, 50, 25);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`ID/NIT: ${settings.companyId}`, 50, 32);
  pdf.text(settings.companyAddress, 50, 37);

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.type.toUpperCase(), 195, 25, { align: 'right' });
  pdf.setFontSize(12);
  pdf.text(`No. ${doc.number}`, 195, 32, { align: 'right' });

  // 2. Información Comercial
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CLIENTE / RECEPTOR:', 15, 65);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  if (client) {
    pdf.text([
      client.name,
      `NIT/CC: ${client.taxId}`,
      client.address,
      `${client.city}, ${client.municipality}`,
      `Email: ${client.email}`
    ], 15, 72);
  }

  pdf.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  pdf.roundedRect(135, 60, 60, 30, 3, 3, 'F');
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMEN:', 140, 68);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Emisión: ${doc.date}`, 140, 75);
  pdf.text(`Vence: ${doc.dueDate}`, 140, 82);

  // 3. Tabla de Productos/Servicios
  const tableHeaders = [['Descripción del Servicio / Producto', 'Cant.', 'V. Unitario', 'V. Total']];
  const tableData = doc.items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.quantity * item.unitPrice)
  ]);

  (pdf as any).autoTable({
    startY: 105,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 10, halign: 'center' },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
  });

  const finalY = (pdf as any).lastAutoTable.finalY || 130;

  // 4. Totales y Retenciones
  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (doc.taxRate / 100);
  const gross = subtotal + tax;
  const withholding = gross * ((doc.withholdingRate || 0) / 100);
  const net = gross - withholding;

  const totalX = 140;
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Subtotal:', totalX, finalY + 15);
  pdf.text(formatCurrency(subtotal), 195, finalY + 15, { align: 'right' });

  if (tax > 0) {
    pdf.text(`IVA (${doc.taxRate}%):`, totalX, finalY + 22);
    pdf.text(formatCurrency(tax), 195, finalY + 22, { align: 'right' });
  }

  if (withholding > 0) {
    pdf.setTextColor(153, 27, 27); // Rojo para retención
    pdf.text(`Retención (${doc.withholdingRate}%):`, totalX, finalY + 29);
    pdf.text(`-${formatCurrency(withholding)}`, 195, finalY + 29, { align: 'right' });
  }

  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setLineWidth(0.5);
  pdf.line(totalX, finalY + 34, 195, finalY + 34);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('NETO A PAGAR:', totalX, finalY + 42);
  pdf.text(formatCurrency(net), 195, finalY + 42, { align: 'right' });

  // 5. Notas Legales y Firma
  if (doc.notes) {
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTAS Y CONDICIONES:', 15, finalY + 60);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const splitNotes = pdf.splitTextToSize(doc.notes, 110);
    pdf.text(splitNotes, 15, finalY + 67);
  }

  // Línea de Firma (Crucial para Cuentas de Cobro)
  if (isCollection) {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(130, 250, 190, 250);
    pdf.setFontSize(8);
    pdf.text('FIRMA DEL PRESTADOR', 160, 255, { align: 'center' });
    pdf.text(`C.C./NIT. ${settings.companyId}`, 160, 259, { align: 'center' });
  }

  pdf.setFontSize(7);
  pdf.setTextColor(160, 160, 160);
  pdf.text(`Este documento fue generado electrónicamente por FacturaPro.`, 105, 285, { align: 'center' });

  pdf.save(`${doc.type}_${doc.number}.pdf`);
};
