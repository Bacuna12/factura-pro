
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Client, DocumentType, AppSettings, PdfTemplate } from '../types';

// Función auxiliar para generar el objeto jsPDF (reutilizable)
const generatePdfBlob = (doc: Document, client: Client | undefined, settings: AppSettings): jsPDF => {
  const template = settings.pdfTemplate || PdfTemplate.PROFESSIONAL;
  const isTicket = template === PdfTemplate.COMPACT_TICKET;
  
  const pdf = isTicket 
    ? new jsPDF({ unit: 'mm', format: [80, 200] }) 
    : new jsPDF();
    
  const isCollection = doc.type === DocumentType.ACCOUNT_COLLECTION;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  let colors = {
    primary: [37, 99, 235],
    text: [30, 41, 59],
    lightText: [100, 116, 139]
  };

  if (isCollection) colors.primary = [124, 58, 237];
  if (template === PdfTemplate.MINIMALIST || template === PdfTemplate.MODERN_DARK) {
    colors.primary = [15, 23, 42];
  }

  // Renderizado de cabecera según plantilla
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
    // Fallback simple para otras plantillas
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(doc.type, 15, 25);
    pdf.setFontSize(10);
    pdf.text(`No. ${doc.number}`, 15, 32);
  }

  // Contenido de la tabla
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

    // Intentar compartir el ARCHIVO REAL si el navegador lo permite
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: `${doc.type} ${doc.number}`,
        text: `Hola, adjunto envío tu ${doc.type} por un total de ${formatCurrency(total)}.`,
      });
    } else {
      // Fallback: Abrir chat con texto y descargar el archivo
      const cleanPhone = (customPhone || client?.phone || '').replace(/\D/g, '');
      const message = `Hola, te envío mi ${doc.type} No. ${doc.number} por un total de *${formatCurrency(total)}*. El archivo PDF se ha descargado en tu dispositivo para que puedas adjuntarlo.`;
      const whatsappUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      pdf.save(fileName); // Descarga automática para que el usuario la adjunte manualmente
      window.open(whatsappUrl, '_blank');
    }
  } catch (err) {
    console.error("Error al compartir:", err);
    // En caso de error crítico, al menos intentamos el flujo básico de texto
    alert("Iniciando envío de respaldo...");
    const cleanPhone = (customPhone || client?.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Hola, te envío mi ${doc.type} No. ${doc.number}`, '_blank');
  }
};
