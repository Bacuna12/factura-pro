
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings } from '../types';

export const exportToPDF = (doc: Document, client: Client | undefined, settings: AppSettings) => {
  try {
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

    // Colores Corporativos
    let primaryColor: [number, number, number] = [71, 85, 105]; // Gris
    if (isInvoice) primaryColor = [37, 99, 235]; // Azul
    if (isCollection) primaryColor = [124, 58, 237]; // Púrpura

    // Cabecera
    pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.rect(0, 0, 210, 50, 'F');
    
    const logoToUse = doc.logo || settings.logo;
    if (logoToUse && logoToUse.startsWith('data:image')) {
      try {
        pdf.addImage(logoToUse, 'PNG', 15, 10, 30, 30);
      } catch (e) {
        console.warn("PDF Logo Error:", e);
      }
    }

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(settings.companyName, 50, 22);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`ID/NIT: ${settings.companyId}`, 50, 28);
    pdf.text(settings.companyAddress, 50, 33);

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.type.toUpperCase(), 195, 22, { align: 'right' });
    pdf.setFontSize(11);
    pdf.text(`No. ${doc.number}`, 195, 28, { align: 'right' });

    // Cliente e Info Comercial
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
      ], 15, 71);
    }

    // Método de Pago (Nueva Sección en PDF)
    if (doc.paymentMethod) {
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MÉTODO DE PAGO:', 140, 65);
      pdf.setFont('helvetica', 'normal');
      pdf.text(doc.paymentMethod, 140, 71);
    }

    // Tabla de Contenido
    const tableHeaders = [['Ref', 'Descripción', 'Cant.', 'Unitario', 'Total']];
    const tableData = doc.items.map((item, idx) => [
      (idx + 1).toString(),
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.quantity * item.unitPrice)
    ]);

    autoTable(pdf, {
      startY: 100,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 9 },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 
        2: { halign: 'center' }, 
        3: { halign: 'right' }, 
        4: { halign: 'right' } 
      }
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 10;

    // Totales
    const subtotal = doc.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (doc.taxRate / 100);
    const gross = subtotal + tax;
    const withholding = gross * ((doc.withholdingRate || 0) / 100);
    const net = gross - withholding;

    const totalX = 140;
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Subtotal:', totalX, finalY);
    pdf.text(formatCurrency(subtotal), 195, finalY, { align: 'right' });

    let currentY = finalY;
    if (tax > 0) {
      currentY += 6;
      pdf.text(`IVA (${doc.taxRate}%):`, totalX, currentY);
      pdf.text(formatCurrency(tax), 195, currentY, { align: 'right' });
    }

    if (withholding > 0) {
      currentY += 6;
      pdf.text(`Retención (${doc.withholdingRate}%):`, totalX, currentY);
      pdf.text(`-${formatCurrency(withholding)}`, 195, currentY, { align: 'right' });
    }

    currentY += 10;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text('TOTAL A PAGAR:', totalX, currentY);
    pdf.text(formatCurrency(net), 195, currentY, { align: 'right' });

    // Notas
    if (doc.notes) {
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NOTAS Y CONDICIONES:', 15, currentY + 15);
      pdf.setFont('helvetica', 'normal');
      const splitNotes = pdf.splitTextToSize(doc.notes, 110);
      pdf.text(splitNotes, 15, currentY + 20);
    }

    pdf.save(`${doc.type}_${doc.number}.pdf`);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    alert("Error al generar el PDF.");
  }
};
