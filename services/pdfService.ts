import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings, Expense, Product, CashSession, CashMovement, CashMovementType } from '../types';

const numeroALetras = (num: number): string => {
  const Unidades = (num: number) => {
    switch (num) {
      case 1: return 'un'; case 2: return 'dos'; case 3: return 'tres';
      case 4: return 'cuatro'; case 5: return 'cinco'; case 6: return 'seis';
      case 7: return 'siete'; case 8: return 'ocho'; case 9: return 'nueve';
    }
    return '';
  };
  const Decenas = (num: number): string => {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return 'diez'; case 1: return 'once'; case 2: return 'doce';
          case 3: return 'trece'; case 4: return 'catorce'; case 5: return 'quince';
          default: return 'dieci' + Unidades(unidad);
        }
      case 2: return unidad === 0 ? 'veinte' : 'veinti' + Unidades(unidad);
      case 3: return DecenasY('treinta', unidad);
      case 4: return DecenasY('cuarenta', unidad);
      case 5: return DecenasY('cincuenta', unidad);
      case 6: return DecenasY('sesenta', unidad);
      case 7: return DecenasY('setenta', unidad);
      case 8: return DecenasY('ochenta', unidad);
      case 9: return DecenasY('noventa', unidad);
      case 0: return Unidades(unidad);
    }
    return '';
  };
  const DecenasY = (str: string, unidad: number) => unidad > 0 ? str + ' y ' + Unidades(unidad) : str;
  const Centenas = (num: number): string => {
    const centenasInt = Math.floor(num / 100);
    const decenas = num - (centenasInt * 100);
    switch (centenasInt) {
      case 1: return decenas > 0 ? 'ciento ' + Decenas(decenas) : 'cien';
      case 2: return 'doscientos ' + Decenas(decenas);
      case 3: return 'trescientos ' + Decenas(decenas);
      case 4: return 'cuatrocientos ' + Decenas(decenas);
      case 5: return 'quinientos ' + Decenas(decenas);
      case 6: return 'seiscientos ' + Decenas(decenas);
      case 7: return 'setecientos ' + Decenas(decenas);
      case 8: return 'ochocientos ' + Decenas(decenas);
      case 9: return 'novecientos ' + Decenas(decenas);
    }
    return Decenas(decenas);
  };
  const Seccion = (num: number, divisor: number, strSingular: string, strPlural: string) => {
    const puntero = Math.floor(num / divisor);
    const resto = num - (puntero * divisor);
    let letras = '';
    if (puntero > 0) {
      if (puntero === 1) letras = strSingular;
      else letras = Centenas(puntero) + ' ' + strPlural;
    } else {
      letras = Centenas(resto);
    }
    return letras;
  };
  const Miles = (num: number): string => {
    const divisor = 1000;
    const puntero = Math.floor(num / divisor);
    const resto = num - (puntero * divisor);
    const strMiles = Seccion(num, divisor, 'mil', 'mil');
    const strCentenas = Centenas(resto);
    if (strMiles === '') return strCentenas;
    return strMiles + ' ' + strCentenas;
  };
  const Millones = (num: number): string => {
    const divisor = 1000000;
    const puntero = Math.floor(num / divisor);
    const resto = num - (puntero * divisor);
    const strMillones = Seccion(num, divisor, 'un millón', 'millones');
    const strMiles = Miles(resto);
    if (strMillones === '') return strMiles;
    return strMillones + ' ' + strMiles;
  };
  if (num === 0) return 'cero';
  if (num < 0) return 'menos ' + numeroALetras(Math.abs(num));
  const final = Millones(Math.floor(num));
  return (final.charAt(0).toUpperCase() + final.slice(1)).trim();
};

export const formatCurrencyHelper = (amount: number, currency?: string) => {
  const validCurrency = (currency && currency.length === 3) ? currency : 'COP';
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 0
    }).format(amount);
  } catch (e) {
    return `${validCurrency} ${amount.toLocaleString('es-CO')}`;
  }
};

const generatePdfHeader = (pdf: jsPDF, title: string, settings: AppSettings, startDate?: string, endDate?: string) => {
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 45, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(title, 105, 20, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(settings.companyName.toUpperCase(), 105, 28, { align: 'center' });
  pdf.text(`IDENTIFICACIÓN: ${settings.companyId}`, 105, 33, { align: 'center' });
  if (startDate && endDate) {
    pdf.setFontSize(9);
    pdf.text(`PERIODO SELECCIONADO: ${startDate} al ${endDate}`, 105, 38, { align: 'center' });
  }
};

const generatePdfBlob = (doc: Document, client: Client | undefined, settings: AppSettings): jsPDF => {
  const isTicket = doc.isPOS;
  const isCollection = doc.type === DocumentType.ACCOUNT_COLLECTION;
  const formatCurrency = (amount: number) => formatCurrencyHelper(amount, settings.currency);
  
  const pdf = isTicket 
    ? new jsPDF({ unit: 'mm', format: [80, 200] }) 
    : new jsPDF();

  if (isCollection) {
    const mid = 105;
    let cursorY = 35;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(`CUENTA DE COBRO No ${doc.number.split('-').pop()}`, mid, cursorY, { align: 'center' });
    cursorY += 20;
    pdf.setFontSize(12);
    pdf.text((client?.name || 'CONSUMIDOR FINAL').toUpperCase(), mid, cursorY, { align: 'center' });
    cursorY += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`NIT/C.C: ${client?.taxId || 'N/A'}`, mid, cursorY, { align: 'center' });
    cursorY += 6;
    pdf.setFontSize(10);
    pdf.text(`${client?.address || ''} ${client?.city || ''}`, mid, cursorY, { align: 'center' });
    cursorY += 25;
    pdf.setFontSize(11);
    pdf.text("DEBE A:", mid, cursorY, { align: 'center' });
    cursorY += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(settings.companyName.toUpperCase(), mid, cursorY, { align: 'center' });
    cursorY += 6;
    pdf.setFontSize(11);
    pdf.text(`NIT/C.C: ${settings.companyId}`, mid, cursorY, { align: 'center' });
    cursorY += 25;
    pdf.setFont('helvetica', 'normal');
    const total_calc = doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    const concept = doc.items.map(i => i.description).join(', ');
    const bodyText = `Por concepto de: ${concept}. La suma de ${formatCurrency(total_calc)} (${numeroALetras(total_calc).toUpperCase()} PESOS M/CTE).`;
    const splitBody = pdf.splitTextToSize(bodyText, 170);
    pdf.text(splitBody, 20, cursorY, { align: 'justify' });
    cursorY += (splitBody.length * 7) + 20;
    pdf.setDrawColor(220);
    pdf.roundedRect(20, cursorY, 170, 35, 3, 3, 'D');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text("INFORMACIÓN DE PAGO", 25, cursorY + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`BANCO: ${doc.bankName || settings.bankName || 'N/A'}`, 25, cursorY + 15);
    pdf.text(`CUENTA: ${doc.accountNumber || settings.accountNumber || 'N/A'} (${doc.accountType || settings.accountType || 'Ahorros'})`, 25, cursorY + 22);
    pdf.text(`CIUDAD: ${doc.bankCity || settings.bankCity || 'N/A'}`, 25, cursorY + 29);
    cursorY += 50;
    if (doc.signature) {
      try { 
        // Se castea a any para evadir conflictos de sobrecarga de métodos en el build server de Vercel
        (pdf as any).addImage(doc.signature, 'PNG', 20 as any, (cursorY - 15) as any, 40 as any, 15 as any); 
      } catch(e) {}
    }
    pdf.line(20, cursorY, 90, cursorY);
    pdf.setFont('helvetica', 'bold');
    pdf.text("FIRMA DEL EMISOR", 20, cursorY + 5);
    return pdf;
  }

  if (isTicket) {
    const center = 40;
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(10);
    pdf.text(settings.companyName.toUpperCase(), center, 10, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('courier', 'normal');
    pdf.text(`NIT: ${settings.companyId}`, center, 14, { align: 'center' });
    pdf.text(settings.companyAddress, center, 18, { align: 'center' });
    pdf.line(5, 22, 75, 22);
    pdf.text(`TICKET: ${doc.number}`, 5, 27);
    pdf.text(`FECHA: ${doc.date}`, 5, 31);
    pdf.text(`CLIENTE: ${client?.name || 'GENERAL'}`, 5, 35);
    autoTable(pdf, {
      startY: 40,
      head: [['ITEM', 'CANT', 'TOTAL']],
      body: doc.items.map(i => [i.description.substring(0, 15), i.quantity, (i.quantity * i.unitPrice).toLocaleString()]),
      theme: 'plain',
      styles: { fontSize: 7, font: 'courier' },
      margin: { left: 5, right: 5 }
    });
    const finalY = (pdf as any).lastAutoTable.finalY + 5;
    const total = doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
    pdf.setFont('courier', 'bold');
    pdf.text(`TOTAL: ${formatCurrency(total)}`, 75, finalY, { align: 'right' });
    return pdf;
  }

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 40, 'F');
  pdf.setTextColor(255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text(settings.companyName.toUpperCase(), 15, 20);
  pdf.setFontSize(10);
  pdf.text(`NIT: ${settings.companyId}`, 15, 28);
  pdf.text(settings.companyAddress, 15, 33);
  
  pdf.setFillColor(255);
  pdf.roundedRect(150, 10, 45, 25, 2, 2, 'F');
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(9);
  pdf.text(doc.type, 172.5, 18, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(doc.number, 172.5, 27, { align: 'center' });

  pdf.setTextColor(60);
  pdf.setFontSize(10);
  pdf.text(`EMISIÓN: ${doc.date}`, 150, 48);
  pdf.text(`VENCIMIENTO: ${doc.dueDate}`, 150, 53);

  autoTable(pdf, {
    startY: 65,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: doc.items.map(i => [i.description, i.quantity, formatCurrency(i.unitPrice), formatCurrency(i.quantity * i.unitPrice)]),
    headStyles: { fillColor: [15, 23, 42] }
  });

  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  const total = doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TOTAL A PAGAR: ${formatCurrency(total)}`, 195, finalY, { align: 'right' });
  
  return pdf;
};

export const exportToPDF = (doc: Document, client: Client | undefined, settings: AppSettings) => {
  try {
    const pdf = generatePdfBlob(doc, client, settings);
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error("PDF Export Error:", err);
  }
};

export const shareViaWhatsApp = (doc: Document, client: Client | undefined, settings: AppSettings, phone: string) => {
  const total = doc.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
  const message = `Hola ${client?.name || 'Cliente'},\n\nTe adjuntamos el detalle de tu ${doc.type} No. ${doc.number} por un valor de ${formatCurrencyHelper(total, settings.currency)}.\n\nGracias por tu confianza.\n${settings.companyName}`;
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
};

export const exportSalesReport = (documents: Document[], clients: Client[], settings: AppSettings, startDate: string, endDate: string) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, "REPORTE DE VENTAS", settings, startDate, endDate);
  
  const filteredDocs = documents.filter(d => 
    d.date >= startDate && d.date <= endDate && 
    (d.type === DocumentType.INVOICE || d.type === DocumentType.ACCOUNT_COLLECTION)
  );
  
  autoTable(pdf, {
    startY: 50,
    head: [['Fecha', 'Ref', 'Cliente', 'Total']],
    body: filteredDocs.map(d => [
      d.date, 
      d.number, 
      clients.find(c => c.id === d.clientId)?.name || 'N/A', 
      formatCurrencyHelper(d.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0), settings.currency)
    ])
  });
  
  const total = filteredDocs.reduce((acc, d) => 
    acc + d.items.reduce((iAcc, i) => iAcc + (i.quantity * i.unitPrice), 0), 0
  );
  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TOTAL VENTAS: ${formatCurrencyHelper(total, settings.currency)}`, 195, finalY, { align: 'right' });
  
  pdf.save(`reporte-ventas-${startDate}-a-${endDate}.pdf`);
};

export const exportExpensesReport = (expenses: Expense[], settings: AppSettings, startDate: string, endDate: string) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, "REPORTE DE GASTOS", settings, startDate, endDate);
  
  const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  
  autoTable(pdf, {
    startY: 50,
    head: [['Fecha', 'Descripción', 'Categoría', 'Valor']],
    body: filteredExpenses.map(e => [
      e.date, 
      e.description, 
      e.category, 
      formatCurrencyHelper(e.amount, settings.currency)
    ])
  });
  
  const total = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const finalY = (pdf as any).lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TOTAL GASTOS: ${formatCurrencyHelper(total, settings.currency)}`, 195, finalY, { align: 'right' });
  
  pdf.save(`reporte-gastos-${startDate}-a-${endDate}.pdf`);
};

export const exportProductsReport = (products: Product[], settings: AppSettings) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, "INVENTARIO DE PRODUCTOS", settings);
  
  autoTable(pdf, {
    startY: 50,
    head: [['SKU', 'Descripción', 'Categoría', 'Stock', 'Precio Venta']],
    body: products.map(p => [
      p.sku || 'N/A', 
      p.description, 
      p.category || 'General', 
      p.stock || 0, 
      formatCurrencyHelper(p.salePrice, settings.currency)
    ])
  });
  
  pdf.save(`reporte-inventario.pdf`);
};

export const exportClientsReport = (clients: Client[], settings: AppSettings) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, "DIRECTORIO DE CLIENTES", settings);
  
  autoTable(pdf, {
    startY: 50,
    head: [['Nombre', 'Identificación', 'Teléfono', 'Correo']],
    body: clients.map(c => [
      c.name, 
      `${c.taxIdType} ${c.taxId}`, 
      c.phone || 'N/A', 
      c.email || 'N/A'
    ])
  });
  
  pdf.save(`reporte-clientes.pdf`);
};

export const exportCashSessionReport = (session: CashSession, movements: CashMovement[], documents: Document[], settings: AppSettings) => {
  const pdf = new jsPDF();
  generatePdfHeader(pdf, "REPORTE DE CIERRE DE CAJA", settings);
  
  let cursorY = 55;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`SESIÓN ID: ${session.id.toUpperCase()}`, 15, cursorY);
  pdf.text(`CAJERO: ${session.userName}`, 15, cursorY + 5);
  pdf.text(`APERTURA: ${new Date(session.openedAt).toLocaleString()}`, 15, cursorY + 10);
  if (session.closedAt) {
    pdf.text(`CIERRE: ${new Date(session.closedAt).toLocaleString()}`, 15, cursorY + 15);
  }
  
  cursorY += 25;
  
  const movInTotal = movements.filter(m => m.type === CashMovementType.IN).reduce((acc, m) => acc + m.amount, 0);
  const movOutTotal = movements.filter(m => m.type === CashMovementType.OUT).reduce((acc, m) => acc + m.amount, 0);
  
  const cashSales = session.expectedBalance - session.openingBalance - (movInTotal - movOutTotal);

  const summary = [
    ['BASE INICIAL', formatCurrencyHelper(session.openingBalance, settings.currency)],
    ['VENTAS EN EFECTIVO', formatCurrencyHelper(cashSales, settings.currency)],
    ['INGRESOS MANUALES', formatCurrencyHelper(movInTotal, settings.currency)],
    ['EGRESOS MANUALES', formatCurrencyHelper(movOutTotal, settings.currency)],
    ['TOTAL ESPERADO', formatCurrencyHelper(session.expectedBalance, settings.currency)],
    ['TOTAL CONTADO', formatCurrencyHelper(session.actualBalance || 0, settings.currency)],
    ['DIFERENCIA', formatCurrencyHelper(session.difference || 0, settings.currency)]
  ];

  autoTable(pdf, {
    startY: cursorY,
    head: [['CONCEPTO', 'VALOR']],
    body: summary,
    headStyles: { fillColor: [15, 23, 42] }
  });

  if (movements.length > 0) {
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY + 10,
      head: [['TIPO', 'DESCRIPCIÓN', 'MONTO']],
      body: movements.map(m => [
        m.type,
        m.description,
        formatCurrencyHelper(m.amount, settings.currency)
      ]),
      headStyles: { fillColor: [71, 85, 105] }
    });
  }

  pdf.save(`arqueo-${session.id}.pdf`);
};