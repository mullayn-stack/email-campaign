import jsPDF from 'jspdf';
import { Recipient } from '@shared/schema';

interface PDFGenerationData {
  campaign: {
    title: string;
    subject: string;
    body: string;
  };
  personalInfo: {
    name: string;
    email: string;
    postcode?: string;
    personalNote?: string;
  };
  recipients: Recipient[];
}

export function generateLetterPDF(data: PDFGenerationData): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;

  // Generate one personalized letter per recipient
  data.recipients.forEach((recipient, recipientIndex) => {
    // Add new page for each recipient (except the first)
    if (recipientIndex > 0) {
      pdf.addPage();
    }

    let yPosition = margin;

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.campaign.title, margin, yPosition);
    yPosition += lineHeight * 2;

    // Date
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    pdf.text(today, margin, yPosition);
    yPosition += lineHeight * 2;

    // From address (sender)
    pdf.setFont('helvetica', 'bold');
    pdf.text('From:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition += lineHeight;
    pdf.text(data.personalInfo.name, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(data.personalInfo.email, margin, yPosition);
    if (data.personalInfo.postcode) {
      yPosition += lineHeight;
      pdf.text(data.personalInfo.postcode, margin, yPosition);
    }
    yPosition += lineHeight * 2;

    // To address (single recipient)
    pdf.setFont('helvetica', 'bold');
    pdf.text('To:', margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition += lineHeight;
    pdf.text(recipient.name, margin, yPosition);
    yPosition += lineHeight;
    // Note: Using email as contact info since physical addresses aren't available yet
    pdf.text(recipient.email, margin, yPosition);
    yPosition += lineHeight * 2;

    // Subject line
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subject: ' + data.campaign.subject, margin, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition += lineHeight * 2;

    // Letter body - personalized for this recipient
    let bodyText = data.campaign.body
      .replace(/\{\{name\}\}/g, data.personalInfo.name)
      .replace(/\{\{postcode\}\}/g, data.personalInfo.postcode || '[Your Postcode]');

    // Add personal note if provided
    if (data.personalInfo.personalNote) {
      bodyText += '\n\n' + data.personalInfo.personalNote;
    }

    // Split text into lines that fit the page width
    const textLines = pdf.splitTextToSize(bodyText, pageWidth - (margin * 2));
    
    textLines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Signature line
    yPosition += lineHeight * 2;
    if (yPosition > pageHeight - margin * 3) {
      pdf.addPage();
      yPosition = margin;
    }
    pdf.text('Sincerely,', margin, yPosition);
    yPosition += lineHeight * 2;
    pdf.text(data.personalInfo.name, margin, yPosition);
  });

  return pdf;
}

export function generateAddressLabelsPDF(data: PDFGenerationData, showBorders: boolean = false): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Standard Avery label dimensions (adjust as needed)
  const labelWidth = 63.5;  // Width of each label
  const labelHeight = 38.1; // Height of each label
  const labelsPerRow = 3;   // Number of labels per row
  const labelsPerColumn = 7; // Number of labels per column
  const leftMargin = 10;
  const topMargin = 10;
  const horizontalGap = 2.5;
  const verticalGap = 0;

  let currentLabel = 0;
  let currentPage = 1;

  // Add sender's return address on first label
  const senderLabel = {
    name: data.personalInfo.name,
    address: data.personalInfo.email,
    postcode: data.personalInfo.postcode || ''
  };

  // Draw sender label with "From:" prefix
  drawLabel(0, 'From:', senderLabel);
  currentLabel++;

  // Add recipient labels
  data.recipients.forEach((recipient) => {
    if (currentLabel >= labelsPerRow * labelsPerColumn) {
      pdf.addPage();
      currentPage++;
      currentLabel = 0;
    }

    const recipientLabel = {
      name: recipient.name,
      address: recipient.email || '',
      postcode: ''  // Recipients don't have postcodes in the current schema
    };

    drawLabel(currentLabel, 'To:', recipientLabel);
    currentLabel++;
  });

  function drawLabel(position: number, prefix: string, labelData: { name: string; address: string; postcode: string }) {
    const row = Math.floor(position / labelsPerRow);
    const col = position % labelsPerRow;
    
    const x = leftMargin + (col * (labelWidth + horizontalGap));
    const y = topMargin + (row * (labelHeight + verticalGap));
    
    // Draw label border (optional - for visualization)
    if (showBorders) {
      pdf.setDrawColor(200);
      pdf.rect(x, y, labelWidth, labelHeight);
    }
    
    // Add label content
    pdf.setFontSize(10);
    let yOffset = y + 10;
    
    // Prefix (From/To)
    pdf.setFont('helvetica', 'bold');
    pdf.text(prefix, x + 5, yOffset);
    pdf.setFont('helvetica', 'normal');
    yOffset += 6;
    
    // Name
    pdf.setFontSize(11);
    pdf.text(labelData.name, x + 5, yOffset);
    yOffset += 6;
    
    // Address/Email
    if (labelData.address) {
      pdf.setFontSize(9);
      const addressLines = pdf.splitTextToSize(labelData.address, labelWidth - 10);
      addressLines.forEach((line: string) => {
        pdf.text(line, x + 5, yOffset);
        yOffset += 5;
      });
    }
    
    // Postcode
    if (labelData.postcode) {
      pdf.setFontSize(10);
      pdf.text(labelData.postcode, x + 5, yOffset);
    }
  }

  return pdf;
}

export function downloadPDF(pdf: jsPDF, filename: string) {
  pdf.save(filename);
}