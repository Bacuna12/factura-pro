
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Client, Product, DocumentType, AppSettings, Expense, DocumentStatus } from '../types';

const formatCurrencyHelper = (amount: number, currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
};

const generatePdfHeader = (pdf: jsPDF, title: string, settings: AppSettings, startDate?: string, endDate?: string) => {
  pdf.setFillColor(30, 41, 59); // Slate 800
  pdf.rect(0, 0, 210, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(title, 15, 18);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(settings.companyName.toUpperCase(), 15, 26);
  pdf.text(`NIT: ${settings.companyId}`, 15, 31);
  
  if (startDate && endDate) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`PERIODO: ${startDate} al ${endDate}`, 195, 22, { align: 'right' });
  }
  
  pdf.setTextColor(30, 41, 59);
};

const generatePdfBlob = (doc: Document, client: Client | undefined, settings: AppSettings): jsPDF => {
  const isTicket = doc.isPOS;
  const isCollection = doc.type === DocumentType.ACCOUNT_COLLECTION;
  
  const pdf = isTicket 
    ? new jsPDF({ unit: 'mm', format: [80, 250] }) 
    : new jsPDF();
    
  const formatCurrency = (amount: number) => formatCurrencyHelper(amount, settings.currency);

  const colors = {
    primary: isCollection ? [124, 58, 237] : [37, 99, 235],
    secondary: [241, 245, 249],
    text: [30, 41, 59],
    lightText: [100, 116, 139],
    white: [255, 255, 255]
  };

  if (isTicket) {
    // --- DISEÑO TICKET POS (80mm) ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(settings.companyName.toUpperCase(), 40, 10, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`NIT: ${settings.companyId}`, 40, 14, { align: 'center' });
    pdf.text(settings.companyAddress, 40, 17, { align: 'center' });
    
    pdf.setLineWidth(0.1);
    pdf.line(5, 20, 75, 20);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${doc.type} No. ${doc.number}`, 40, 25, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha: ${doc.date}`, 5, 30);
    
    if (client) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLIENTE:', 5, 35);
      pdf.setFont('helvetica', 'normal');
      pdf.text(client.name.substring(0, 35), 5, 39);
      pdf.text(`ID/NIT: ${client.taxId}`, 5, 43);
    }
    
    autoTable(pdf, {
      startY: client ? 55 : 35,
      head: [['Descripción', 'Total']],
      body: doc.items.map(i => [
        `${i.description}\n${i.quantity} x ${formatCurrency(i.unitPrice)}`,
        formatCurrency(i.quantity * i.unitPrice)
      ]),
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1, textAlpha: 0.8 },
      headStyles: { fontStyle: 'bold', borderBottom: { lineWidth: 0.1 } },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 5, right: 5 }
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 5;
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const total = subtotal + tax;

    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL A PAGAR:', 5, finalY);
    pdf.text(formatCurrency(total), 75, finalY, { align: 'right' });
    
    // QR de validación en Ticket
    const qrText = `https://facturapro.app/v/${doc.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
    try { pdf.addImage(qrUrl, 'PNG', 30, finalY + 10, 20, 20); } catch(e) {}

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.text('Gracias por su confianza', 40, finalY + 35, { align: 'center' });

  } else {
    // --- DISEÑO CARTA PROFESIONAL ---
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(0, 0, 210, 45, 'F');
    if (settings.logo) {
      try { pdf.addImage(settings.logo, 'PNG', 15, 10, 25, 25); } catch (e) {}
    }
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(settings.companyName.toUpperCase(), 45, 22);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`NIT: ${settings.companyId}`, 45, 28);
    pdf.text(`Dir: ${settings.companyAddress}`, 45, 33);

    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(145, 10, 50, 25, 3, 3, 'F');
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.type, 170, 18, { align: 'center' });
    pdf.setFontSize(14);
    pdf.text(doc.number, 170, 27, { align: 'center' });

    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMACIÓN DEL CLIENTE', 15, 60);
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(0.8);
    pdf.line(15, 62, 50, 62);

    pdf.setFontSize(9);
    const clientY = 70;
    if (client) {
      pdf.setFont('helvetica', 'bold'); pdf.text('Nombre:', 15, clientY);
      pdf.setFont('helvetica', 'normal'); pdf.text(client.name || 'Consumidor Final', 40, clientY);
      pdf.setFont('helvetica', 'bold'); pdf.text('NIT/CC:', 15, clientY + 7);
      pdf.setFont('helvetica', 'normal'); pdf.text(client.taxId || 'N/A', 40, clientY + 7);
      pdf.setFont('helvetica', 'bold'); pdf.text('Dirección:', 15, clientY + 14);
      pdf.setFont('helvetica', 'normal'); pdf.text(client.address || 'N/A', 40, clientY + 14);
      pdf.setFont('helvetica', 'bold'); pdf.text('Teléfono:', 115, clientY);
      pdf.setFont('helvetica', 'normal'); pdf.text(client.phone || 'N/A', 140, clientY);
      pdf.setFont('helvetica', 'bold'); pdf.text('Fecha:', 115, clientY + 14);
      pdf.setFont('helvetica', 'normal'); pdf.text(doc.date, 140, clientY + 14);
    }

    autoTable(pdf, {
      startY: 100,
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Total']],
      body: doc.items.map(i => [
        i.description,
        i.quantity.toString(),
        formatCurrency(i.unitPrice),
        formatCurrency(i.quantity * i.unitPrice)
      ]),
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      alternateRowStyles: { fillColor: colors.secondary },
      margin: { left: 15, right: 15 }
    });

    let finalY = (pdf as any).lastAutoTable.finalY + 10;
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const total = subtotal + tax;

    pdf.setFillColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.roundedRect(130, finalY, 65, 35, 3, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('SUBTOTAL:', 135, finalY + 10);
    pdf.text(formatCurrency(subtotal), 190, finalY + 10, { align: 'right' });
    pdf.text(`IVA (${doc.taxRate}%):`, 135, finalY + 18);
    pdf.text(formatCurrency(tax), 190, finalY + 18, { align: 'right' });
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL:', 135, finalY + 28);
    pdf.text(formatCurrency(total), 190, finalY + 28, { align: 'right' });
    
    if (doc.notes) {
      pdf.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2]);
      pdf.setFontSize(8);
      pdf.text('OBSERVACIONES:', 15, finalY + 5);
      const splitNotes = pdf.splitTextToSize(doc.notes, 100);
      pdf.text(splitNotes, 15, finalY + 12);
    }

    // Firma Digital si existe
    if (doc.signature) {
      finalY = Math.max(finalY + 45, 250);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.line(15, finalY, 75, finalY);
      pdf.setFontSize(8);
      pdf.text('FIRMA AUTORIZADA / CLIENTE', 15, finalY + 5);
      try { pdf.addImage(doc.signature, 'PNG', 20, finalY - 25, 40, 20); } catch(e) {}
    }

    // QR de validación automático
    const qrText = `FacturaPro: ${settings.companyName} | Doc: ${doc.number} | Total: ${formatCurrency(total)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
    try { pdf.addImage(qrUrl, 'PNG', 160, finalY + 5, 25, 25); } catch(e) {}
  }
  return pdf;
};

export const exportToPDF = (doc: Document, client: Client | undefined, settings: AppSettings) => {
  try {
    const pdf = generatePdfBlob(doc, client, settings);
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error("Error al exportar PDF:", err);
  }
};

export const exportClientsReport = (clients: Client[], settings: AppSettings) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, 'REPORTE DE CLIENTES', settings);
  autoTable(pdf, {
    startY: 45,
    head: [['Nombre / Empresa', 'NIT / CC', 'Email', 'Teléfono', 'Ciudad']],
    body: clients.map(c => [c.name, c.taxId, c.email, c.phone, c.city]),
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 }
  });
  window.open(pdf.output('bloburl'), '_blank');
};

export const exportProductsReport = (products: Product[], settings: AppSettings) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, 'REPORTE DE INVENTARIO', settings);
  autoTable(pdf, {
    startY: 45,
    head: [['Descripción', 'SKU', 'Categoría', 'P. Venta', 'Rentabilidad (%)', 'Stock']],
    body: products.map(p => {
      const margin = p.salePrice > 0 ? ((p.salePrice - p.purchasePrice) / p.salePrice * 100).toFixed(1) : '0';
      return [
        p.description, 
        p.sku || 'N/A', 
        p.category || 'General', 
        formatCurrencyHelper(p.salePrice, settings.currency), 
        `${margin}%`,
        p.stock || 0
      ];
    }),
    headStyles: { fillColor: [5, 150, 105] },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'center' }, 5: { halign: 'center' } }
  });
  window.open(pdf.output('bloburl'), '_blank');
};

export const exportSalesReport = (documents: Document[], clients: Client[], settings: AppSettings, startDate: string, endDate: string) => {
  const filtered = documents.filter(d => 
    (d.type === DocumentType.INVOICE || d.type === DocumentType.ACCOUNT_COLLECTION) &&
    d.date >= startDate && d.date <= endDate
  );
  if (filtered.length === 0) {
    alert("No hay ventas registradas en el rango seleccionado.");
    return;
  }
  const pdf = new jsPDF();
  generatePdfHeader(pdf, 'REPORTE DE VENTAS', settings, startDate, endDate);
  const tableData = filtered.map(d => {
    const client = clients.find(c => c.id === d.clientId);
    const subtotal = d.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    const tax = subtotal * (d.taxRate / 100);
    const total = subtotal + tax;
    return [d.date, d.number, client?.name || 'Cliente Final', d.status, formatCurrencyHelper(total, settings.currency)];
  });
  autoTable(pdf, {
    startY: 45,
    head: [['Fecha', 'Ref', 'Cliente', 'Estado', 'Total']],
    body: tableData,
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8 },
    columnStyles: { 4: { halign: 'right' } }
  });
  const totalSales = filtered.reduce((acc, d) => {
    const sub = d.items.reduce((iAcc, i) => iAcc + (i.quantity * i.unitPrice), 0);
    return acc + sub + (sub * (d.taxRate / 100));
  }, 0);
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  pdf.text(`TOTAL VENTAS BRUTAS: ${formatCurrencyHelper(totalSales, settings.currency)}`, 15, (pdf as any).lastAutoTable.finalY + 10);
  window.open(pdf.output('bloburl'), '_blank');
};

export const exportExpensesReport = (expenses: Expense[], settings: AppSettings, startDate: string, endDate: string) => {
  const filtered = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  if (filtered.length === 0) {
    alert("No hay gastos registrados en el rango seleccionado.");
    return;
  }
  const pdf = new jsPDF();
  generatePdfHeader(pdf, 'REPORTE DE GASTOS', settings, startDate, endDate);
  autoTable(pdf, {
    startY: 45,
    head: [['Fecha', 'Descripción', 'Categoría', 'Valor']],
    body: filtered.map(e => [e.date, e.description, e.category, formatCurrencyHelper(e.amount, settings.currency)]),
    headStyles: { fillColor: [225, 29, 72] },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } }
  });
  const totalExpenses = filtered.reduce((acc, e) => acc + e.amount, 0);
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  pdf.text(`TOTAL EGRESOS: ${formatCurrencyHelper(totalExpenses, settings.currency)}`, 15, (pdf as any).lastAutoTable.finalY + 10);
  window.open(pdf.output('bloburl'), '_blank');
};

export const exportToCSV = (data: any[], fileName: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const val = row[header] === null || row[header] === undefined ? '' : row[header];
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = window.document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
};

export const shareViaWhatsApp = async (doc: Document, client: Client | undefined, settings: AppSettings, customPhone?: string) => {
  const formatCurrency = (amount: number) => formatCurrencyHelper(amount, settings.currency);
  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const total = subtotal + (subtotal * (doc.taxRate / 100));
  const fileName = `${doc.type}_${doc.number}.pdf`.replace(/\s+/g, '_');
  try {
    const pdf = generatePdfBlob(doc, client, settings);
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: `${doc.type} ${doc.number}`,
        text: `Hola, adjunto envío tu ${doc.type} por un total de ${formatCurrency(total)}.`,
      });
    } else {
      const cleanPhone = (customPhone || client?.phone || '').replace(/\D/g, '');
      const message = `Hola, te envío mi ${doc.type} No. ${doc.number} por un total de *${formatCurrency(total)}*.`;
      const whatsappUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      pdf.save(fileName);
      window.open(whatsappUrl, '_blank');
    }
  } catch (err) {
    const cleanPhone = (customPhone || client?.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Factura No. ${doc.number}`, '_blank');
  }
};
