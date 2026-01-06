
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings, PdfTemplate } from '../types';

// Función auxiliar para generar el objeto jsPDF
const generatePdfBlob = (doc: Document, client: Client | undefined, settings: AppSettings): jsPDF => {
  const template = settings.pdfTemplate || PdfTemplate.PROFESSIONAL;
  const isTicket = template === PdfTemplate.COMPACT_TICKET;
  const isCollection = doc.type === DocumentType.ACCOUNT_COLLECTION;
  
  const pdf = isTicket 
    ? new jsPDF({ unit: 'mm', format: [80, 200] }) 
    : new jsPDF();
    
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  const colors = {
    primary: isCollection ? [124, 58, 237] : [37, 99, 235], // Violeta para Cobros, Azul para Facturas
    text: [30, 41, 59],
    lightText: [100, 116, 139],
    line: [200, 200, 200]
  };

  // --- DISEÑO ESPECIAL PARA CUENTA DE COBRO ---
  if (isCollection && !isTicket) {
    // Título Central
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('CUENTA DE COBRO', 105, 20, { align: 'center' });

    // No. y Fecha
    pdf.setFontSize(10);
    pdf.text(`No.: ${doc.number}`, 15, 30);
    pdf.line(22, 30.5, 60, 30.5); // Línea para No.
    
    pdf.text(`Fecha: ${doc.date.split('-').reverse().join(' / ')}`, 75, 30);
    pdf.line(88, 30.5, 120, 30.5); // Línea para Fecha

    // 1. DATOS DEL COBRADOR
    let currentY = 40;
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(15, currentY, 180, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.text('DATOS DEL COBRADOR', 17, currentY + 4.5);
    
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    currentY += 12;
    pdf.text(`Nombre / Razón Social: ${settings.companyName}`, 15, currentY);
    pdf.line(55, currentY + 0.5, 140, currentY + 0.5);
    
    currentY += 7;
    pdf.text(`Documento / NIT: ${settings.companyId}`, 15, currentY);
    pdf.line(45, currentY + 0.5, 100, currentY + 0.5);

    currentY += 7;
    pdf.text(`Dirección: ${settings.companyAddress}`, 15, currentY);
    pdf.line(32, currentY + 0.5, 140, currentY + 0.5);

    currentY += 7;
    pdf.text(`Teléfono: ${client?.phone || 'N/A'}`, 15, currentY); // Usando teléfono del sistema si aplica
    pdf.line(30, currentY + 0.5, 75, currentY + 0.5);
    pdf.text(`Correo: ${settings.companyName.includes('@') ? settings.companyName : ''}`, 80, currentY);
    pdf.line(93, currentY + 0.5, 160, currentY + 0.5);

    // 2. DATOS DEL CLIENTE
    currentY += 12;
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(15, currentY, 180, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('DATOS DEL CLIENTE', 17, currentY + 4.5);

    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    currentY += 12;
    pdf.text(`Nombre / Razón Social: ${client?.name || '___________________'}`, 15, currentY);
    pdf.line(55, currentY + 0.5, 140, currentY + 0.5);

    currentY += 7;
    pdf.text(`Documento / NIT: ${client?.taxId || '___________________'}`, 15, currentY);
    pdf.line(45, currentY + 0.5, 100, currentY + 0.5);

    currentY += 7;
    pdf.text(`Dirección: ${client?.address || '___________________'}`, 15, currentY);
    pdf.line(32, currentY + 0.5, 140, currentY + 0.5);

    // 3. CONCEPTO
    currentY += 12;
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(15, currentY, 180, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('CONCEPTO DEL COBRO', 17, currentY + 4.5);

    // 4. DETALLE DEL VALOR (TABLA)
    currentY += 12;
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(15, currentY, 180, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('DETALLE DEL VALOR', 17, currentY + 4.5);

    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const total = subtotal + tax - (subtotal * ((doc.withholdingRate || 0) / 100));

    autoTable(pdf, {
      startY: currentY + 8,
      head: [['Concepto', 'Valor']],
      body: [
        ...doc.items.map(i => [i.description, formatCurrency(i.quantity * i.unitPrice)]),
        ['TOTAL A PAGAR', formatCurrency(total)]
      ],
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold', minCellWidth: 40 } },
      margin: { left: 15, right: 15 },
      theme: 'grid'
    });

    currentY = (pdf as any).lastAutoTable.finalY + 12;

    // 5. FORMA DE PAGO
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.rect(15, currentY, 180, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('FORMA DE PAGO', 17, currentY + 4.5);

    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    currentY += 10;
    const isEfectivo = doc.paymentMethod === 'Efectivo';
    const isTransfer = !isEfectivo;
    
    pdf.rect(15, currentY - 3, 3, 3); // Check Efectivo
    if (isEfectivo) pdf.text('X', 15.5, currentY - 0.5);
    pdf.text('Efectivo', 20, currentY);

    pdf.rect(40, currentY - 3, 3, 3); // Check Transfer
    if (isTransfer) pdf.text('X', 40.5, currentY - 0.5);
    pdf.text('Transferencia', 45, currentY);

    pdf.text('Entidad bancaria: ________________________________', 15, currentY + 7);
    pdf.text(`Cuenta No.: ${doc.notes.includes('cuenta') ? 'Ver notas' : '________________'}`, 15, currentY + 14);
    pdf.text('Tipo:  [ ] Ahorros  [ ] Corriente', 80, currentY + 14);

    // 6. DECLARACIÓN Y FIRMAS
    currentY += 25;
    pdf.setFontSize(8);
    pdf.text('Declaro que el valor aquí cobrado corresponde a un servicio efectivamente prestado o producto entregado.', 15, currentY);

    currentY += 20;
    pdf.line(15, currentY, 80, currentY);
    pdf.text('Firma del cobrador', 15, currentY + 5);

    pdf.line(110, currentY, 175, currentY);
    pdf.text('Firma del cliente', 110, currentY + 5);

  } else {
    // --- LÓGICA ORIGINAL PARA FACTURAS Y TICKETS ---
    if (template === PdfTemplate.PROFESSIONAL) {
      pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.rect(0, 0, 210, 45, 'F');
      pdf.setTextColor(255, 255, 255);
      const logo = doc.logo || settings.logo;
      if (logo) pdf.addImage(logo, 'PNG', 15, 8, 28, 28);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(settings.companyName, 50, 20);
      pdf.setFontSize(9);
      pdf.text(`NIT: ${settings.companyId}`, 50, 26);
      pdf.text(settings.companyAddress, 50, 31);
      pdf.setFontSize(16);
      pdf.text(doc.type, 195, 20, { align: 'right' });
      pdf.setFontSize(10);
      pdf.text(`No. ${doc.number}`, 195, 26, { align: 'right' });
    } else if (isTicket) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(settings.companyName, 40, 10, { align: 'center' });
      pdf.setFontSize(8);
      pdf.text(doc.type + ' ' + doc.number, 40, 15, { align: 'center' });
    } else {
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text(doc.type, 15, 25);
      pdf.setFontSize(10);
      pdf.text(`No. ${doc.number}`, 15, 32);
    }

    const startY = isTicket ? 25 : 60;
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    if (client) {
      pdf.setFontSize(9);
      pdf.text(`CLIENTE: ${client.name}`, 15, startY);
    }

    const tableHeaders = isTicket ? [['Item', 'Total']] : [['Descripción', 'Cant.', 'Precio', 'Subtotal']];
    const tableData = doc.items.map(i => isTicket 
      ? [i.description, formatCurrency(i.quantity * i.unitPrice)]
      : [i.description, i.quantity.toString(), formatCurrency(i.unitPrice), formatCurrency(i.quantity * i.unitPrice)]
    );

    autoTable(pdf, {
      startY: startY + 10,
      head: tableHeaders,
      body: tableData,
      headStyles: { fillColor: colors.primary },
      margin: { left: isTicket ? 5 : 15, right: isTicket ? 5 : 15 }
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 10;
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const total = subtotal + (subtotal * (doc.taxRate / 100));

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL: ${formatCurrency(total)}`, isTicket ? 40 : 195, finalY, { align: isTicket ? 'center' : 'right' });
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

export const shareViaWhatsApp = async (doc: Document, client: Client | undefined, settings: AppSettings, customPhone?: string) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

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
      const message = `Hola, te envío mi ${doc.type} No. ${doc.number} por un total de *${formatCurrency(total)}*. El archivo PDF se ha descargado en tu dispositivo para que puedas adjuntarlo.`;
      const whatsappUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      pdf.save(fileName);
      window.open(whatsappUrl, '_blank');
    }
  } catch (err) {
    console.error("Error al compartir:", err);
    const cleanPhone = (customPhone || client?.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Hola, te envío mi ${doc.type} No. ${doc.number}`, '_blank');
  }
};
