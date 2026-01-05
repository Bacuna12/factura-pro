
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings } from '../types';

export const exportToPDF = (doc: Document, client: Client | undefined, settings: AppSettings) => {
  const pdf = new jsPDF();
  const isInvoice = doc.type === DocumentType.INVOICE;

  // Formateador dinámico basado en los ajustes
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Colores Corporativos
  const primaryColor = isInvoice ? [37, 99, 235] : [71, 85, 105]; // Azul para Factura, Gris para Presupuesto
  const accentColor = [241, 245, 249]; // Fondo suave para bloques de info
  
  // 1. Cabecera con Logo y Branding
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, 210, 50, 'F');
  
  // Usar el logo del documento o el global por defecto
  const logoToUse = doc.logo || settings.logo;

  if (logoToUse) {
    try {
      pdf.addImage(logoToUse, 'PNG', 15, 8, 35, 35);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(26);
      pdf.text(settings.companyName || 'FacturaPro', 55, 28);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Gestión Inteligente de Negocios', 55, 35);
    } catch (e) {
      renderDefaultBranding(pdf, settings.companyName);
    }
  } else {
    renderDefaultBranding(pdf, settings.companyName);
  }

  // Título del Documento y Número
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.type.toUpperCase(), 195, 28, { align: 'right' });
  pdf.setFontSize(14);
  pdf.text(`#${doc.number}`, 195, 36, { align: 'right' });

  // 2. Bloque de Fechas PROMINENTE
  pdf.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  pdf.roundedRect(140, 55, 55, 30, 3, 3, 'F');
  
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FECHA EMISIÓN:', 145, 65);
  pdf.text('VENCIMIENTO:', 145, 78);
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.date, 190, 65, { align: 'right' });
  pdf.text(doc.dueDate, 190, 78, { align: 'right' });

  // 3. Información de las Partes
  pdf.setTextColor(40, 40, 40);
  pdf.setFontSize(10);
  
  // Mi Empresa (Desde settings)
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('DE:', 15, 65);
  pdf.setTextColor(40, 40, 40);
  pdf.setFont('helvetica', 'normal');
  pdf.text([
    settings.companyName,
    `NIT/ID: ${settings.companyId}`,
    settings.companyAddress
  ], 15, 72);

  // Cliente con Ubicación Extendida
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('PARA:', 80, 65);
  pdf.setTextColor(40, 40, 40);
  pdf.setFont('helvetica', 'normal');
  if (client) {
    const clientLines = [
      client.name,
      `NIT/CC: ${client.taxId}`,
      `${client.city}, ${client.municipality} CP: ${client.zipCode}`,
      client.address,
      client.email
    ];
    pdf.text(clientLines, 80, 72);
  } else {
    pdf.text('Cliente No Especificado', 80, 72);
  }

  // 4. Tabla de Ítems
  const tableHeaders = [['Descripción', 'Cantidad', 'Precio Unit.', 'Total']];
  const tableData = doc.items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.quantity * item.unitPrice)
  ]);

  (pdf as any).autoTable({
    startY: 100,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: 255, 
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center'
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 5,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 40 }
    }
  });

  const finalY = (pdf as any).lastAutoTable.finalY || 120;

  // 5. Resumen de Totales
  const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const tax = subtotal * (doc.taxRate / 100);
  const total = subtotal + tax;

  const summaryX = 135;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Subtotal:', summaryX, finalY + 15);
  pdf.text(formatCurrency(subtotal), 195, finalY + 15, { align: 'right' });
  
  pdf.text(`IVA (${doc.taxRate}%):`, summaryX, finalY + 22);
  pdf.text(formatCurrency(tax), 195, finalY + 22, { align: 'right' });

  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setLineWidth(0.5);
  pdf.line(summaryX, finalY + 26, 195, finalY + 26);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('TOTAL:', summaryX, finalY + 34);
  pdf.text(formatCurrency(total), 195, finalY + 34, { align: 'right' });

  if (doc.notes) {
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('NOTAS Y CONDICIONES:', 15, finalY + 50);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const splitNotes = pdf.splitTextToSize(doc.notes, 110);
    pdf.text(splitNotes, 15, finalY + 57);
  }

  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text('Gracias por su confianza en nuestros servicios.', 105, 285, { align: 'center' });
  pdf.text(`Generado por ${settings.companyName}.`, 105, 290, { align: 'center' });

  pdf.save(`${doc.type}_${doc.number}.pdf`);
};

const renderDefaultBranding = (pdf: jsPDF, name: string) => {
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.text(name || 'FacturaPro', 15, 30);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Gestión Inteligente de Negocios', 15, 38);
};
