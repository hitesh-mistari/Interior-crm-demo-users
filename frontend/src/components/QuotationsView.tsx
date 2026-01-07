import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download, Eye, CheckCircle, FileText, Search, Copy, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import QuotationModal from './QuotationModal';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate } from '../utils/dates';
import { useSystemSettings } from '../context/SettingsContext';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import PaginationControls from './PaginationControls';


export default function QuotationsView() {
  const { quotations, deleteQuotation, duplicateQuotation, convertQuotationToProject, hasPermission, bankAccounts } = useApp();
  const { getSetting } = useSystemSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | undefined>();
  const [viewingQuotationId, setViewingQuotationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [confirmConvert, setConfirmConvert] = useState<{ id: string; title: string } | null>(null);


  // Local date formatter to avoid named export mismatch and ensure consistency
  const fmtDate = (dateString: string) => formatLongDate(dateString);

  const canCreate = hasPermission('quotations', 'create');
  const canUpdate = hasPermission('quotations', 'update');
  const canDelete = hasPermission('quotations', 'delete');
  const canConvertToProject = hasPermission('projects', 'create');

  const openCreateModal = () => {
    setSelectedQuotationId(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setIsModalOpen(true);
  };

  const handleDelete = (quotationId: string) => {
    const q = quotations.find((x) => x.id === quotationId);
    const label = q ? `${q.quotationNumber} • ${q.clientName}` : '';
    setConfirmDelete({ id: quotationId, title: label });
  };

  const handleConvertToProject = (quotationId: string) => {
    const q = quotations.find((x) => x.id === quotationId);
    const label = q ? `${q.quotationNumber} • ${q.clientName}` : '';
    setConfirmConvert({ id: quotationId, title: label });
  };

  const handleDuplicate = async (quotationId: string) => {
    if (!window.confirm("Are you sure you want to duplicate this quotation?")) return;
    try {
      await duplicateQuotation(quotationId);
      // Optional: could notify success here if not handled globally
    } catch (err) {
      console.error("Failed to duplicate:", err);
      alert("Failed to duplicate quotation");
    }
  };

  const handleWhatsAppShare = (quotationId: string) => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation) return;

    // Check if customer phone exists
    if (!quotation.clientPhone) {
      alert("Customer phone number is missing. Please add it in the quotation details.");
      return;
    }

    // Format phone number - remove spaces, dashes, and special characters
    let phone = quotation.clientPhone.replace(/[\s\-\(\)]/g, '');

    // Add country code if not present (assuming India +91)
    if (!phone.startsWith('+')) {
      if (!phone.startsWith('91')) {
        phone = '91' + phone;
      }
      phone = '+' + phone;
    }

    // Validate minimum length (should be at least 10 digits + country code)
    if (phone.length < 12) {
      alert("Invalid phone number format. Please check the customer's phone number.");
      return;
    }

    // Create WhatsApp message
    const message = encodeURIComponent(
      `Hello ${quotation.clientName},\n\n` +
      `Please find your quotation ${quotation.quotationNumber} for ${quotation.projectName}.\n\n` +
      `Total Amount: ${formatCurrency(quotation.total)}\n\n` +
      `Thank you!`
    );

    // Open WhatsApp Web
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };



  const generatePDF = (quotationId: string) => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation) return;

    // Prepare a clean, user-friendly title so the saved PDF includes client name
    const sanitizedClientName = quotation.clientName
      .replace(/[<>:"/\\|?*]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fileTitle = `${sanitizedClientName}_Quotation_${quotation.quotationNumber}`;

    // Load branding and contact details
    // companyName removed as it is no longer used in the template
    // companyTagline removed as it is no longer used in the template
    const companyPhone = getSetting('company_phone', '');
    const companyEmail = getSetting('company_email', '');
    const companyAddress = getSetting('company_address', '1, Kothari Plaza, Nashik');
    const logoUrl = '/logoforqoute.png';
    const companyName = getSetting('pdf_company_name', 'Artistic Engineers');
    const footerText = getSetting('pdf_footer_text', 'This is a computer-generated document.');

    // ... (rest of the setup variables)

    const accentColor = getSetting('brand_secondary_color', '#DC2626');
    const termsConditions = getSetting('pdf_terms_conditions', '');
    const signatureImage = getSetting('pdf_signature_image', '');
    const amountInWords = amountToWords(quotation.total);
    const selectedBank = quotation.includeBankDetails && quotation.bankAccountId ? bankAccounts.find(b => b.id === quotation.bankAccountId) : undefined;

    // Extract styles separate from body to prevent innerHTML stripping
    const styleContent = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          .pdf-container {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            line-height: 1.5;
            background: white;
            width: 794px;
            min-height: 1123px;
            position: relative;
            overflow: hidden;
          }
          
          /* Header Layout */
          /* Fixed Redesign */
           .header-wrapper {
             position: relative;
             height: 160px; /* Slightly taller to accommodate the curve */
             width: 100%;
             overflow: hidden;
             background: white; 
             margin-bottom: 20px;
           }
           /* Red Shape: Top-Right, partial height, curved bottom-left */
           .red-shape { 
             position: absolute; 
             top: 0; 
             right: 0; 
             width: 75%; 
             height: 110px; 
             background-color: ${accentColor}; 
             border-bottom-left-radius: 80px; 
             z-index: 1; 
             display: flex; 
             align-items: center; 
             justify-content: flex-end; 
             padding-right: 40px; 
             padding-bottom: 10px; /* Adjust for content centering within the shape */
             color: white; 
           }
           /* Dark Shape: Left, full height, curved bottom-right */
           .dark-shape { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 45%; 
            height: 160px; 
            background-color: #1F2937; 
            border-bottom-right-radius: 90px; 
            padding: 30px 40px; 
            box-sizing: border-box; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            z-index: 2; 
           }
           
           .logo-box { 
             background: white; 
             width: 60px; 
             height: 60px; 
             display: flex; 
             align-items: center; 
             justify-content: center; 
             margin-bottom: 15px; 
             padding: 4px; 
             box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
           }
           .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
           
           .company-title { 
             color: white; 
             font-size: 22px; 
             font-weight: 400; 
             text-transform: uppercase; 
             letter-spacing: 0.5px; 
             line-height: 1.1; 
           }
           
           .contact-list { 
             display: flex; 
             flex-direction: column; 
             align-items: flex-end; 
             gap: 6px; 
             font-size: 11px; 
             color: white; 
             list-style: none; 
             padding: 0; 
             margin: 0; 
           }
           .contact-item { 
             display: flex; 
             align-items: center; 
             gap: 8px; 
           }
           /* Removed border-right and padding-right to fix dash issue */
           
           .contact-icon { display: none; }
           .contact-text { display: flex; flex-direction: column; justify-content: center; text-align: left;}
           .address-item { max-width: 250px; line-height: 1.3; }

          /* Main Content */
          .main-content {
            padding: 0 40px;
          }

          /* Meta Section */
          .meta-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            margin-top: 0px; /* Reduced top margin as requested */
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 20px;
          }
          
          .left-meta { text-align: left; }
          .meta-label-sm { color: ${accentColor}; font-size: 14px; font-weight: 500; margin-bottom: 4px; }
          .client-name-lg { font-size: 24px; font-weight: 700; color: #000; line-height: 1.2; margin-bottom: 8px; }
          .client-detail-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4b5563; margin-bottom: 2px; }
          .right-meta {
            text-align: right;
            min-width: 200px;
          }
          .doc-title {
             font-size: 32px;
             font-weight: 400;
             color: #000;
             margin-bottom: 15px;
          }
          .meta-row {
             display: flex;
             justify-content: space-between;
             margin-bottom: 6px;
             font-size: 13px;
             font-weight: 700;
             color: #000;
             gap: 20px;
          }

          /* Tables */
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
          .items-table th { 
            background-color: ${accentColor}; 
            color: white; 
            padding: 12px 8px; 
            text-align: left; 
            font-weight: 600; 
            border: 1px solid #e2e8f0; 
            text-transform: capitalize;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .items-table td { 
            padding: 12px 8px; 
            border: 1px solid #e5e7eb; 
            color: #1f2937; 
            vertical-align: middle;
          }
          .items-table th:first-child, .items-table td:first-child { padding-left: 10px; } 
          .items-table th:last-child, .items-table td:last-child { padding-right: 10px; }
          .items-table .col-center { text-align: center; }
          .items-table .col-right { text-align: right; }
          /* Footer absolute placement REMOVED */
          
          /* Terms and Conditions */
          .terms-section { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; page-break-inside: avoid; }
          .terms-title { font-size: 14px; font-weight: 700; color: #000; margin-bottom: 8px; text-transform: uppercase; }
          .terms-content { font-size: 11px; color: #4b5563; line-height: 1.5; white-space: pre-wrap; }

          /* Totals */
          .totals { 
             margin-left: auto; 
             width: 40%; 
             min-width: 350px; 
             margin-top: 20px; 
             page-break-inside: avoid;
          }
          .totals table { width: 100%; border-collapse: collapse; }
          .totals td { padding: 8px; font-size: 13px; text-align: right; color: #374151; }
          .totals td:first-child { color: #6b7280; padding-right: 20px; font-weight: 500; }
          .total-row td { 
             font-weight: 800; 
             font-size: 16px; 
             border-top: 1px solid #e5e7eb; 
             border-bottom: 1px solid #e5e7eb;
             color: #000;
             padding-top: 12px;
             padding-bottom: 12px;
          }
    `;

    // Body content wrapped in a container class
    const bodyContent = `
      <div class="pdf-container">
        <!-- Header -->
        <div class="header-wrapper">
          <div class="red-shape">
             <div class="contact-list">
               ${companyPhone ? `
               <div class="contact-item">
                  <div class="contact-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.05 12.05 0 0 0 .57 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.05 12.05 0 0 0 2.81.57A2 2 0 0 1 22 16.92z"></path></svg>
                  </div>
                  <div class="contact-text">${companyPhone}</div>
               </div>` : ''}
               
               ${companyEmail ? `
               <div class="contact-item">
                   <div class="contact-icon">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                   </div>
                   <div class="contact-text">${companyEmail}</div>
               </div>` : ''}

               ${companyAddress ? `
               <div class="contact-item">
                  <div class="contact-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div class="contact-text address-item">${companyAddress}</div>
               </div>` : ''}
             </div>
          </div>
          <div class="dark-shape">
            <div class="logo-box">
              <img src="${logoUrl}" alt="Logo" />
            </div>
            <div class="company-title">${companyName}</div>
          </div>
        </div>

        <!-- Table Wrapper -->
        <table style="width: 100%; border: none; border-spacing: 0; min-height: 100%;">
          <thead>
            <tr>
              <td style="height: 20px; border: none;">&nbsp;</td>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td style="height: 30px; border: none;">&nbsp;</td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td style="border: none; vertical-align: top;">
                <div class="main-content">
                  <div class="meta-container">
                    <div class="left-meta">
                      <div class="meta-label-sm">Quotation For</div>
                      <div class="client-name-lg">${quotation.clientName || 'Client Name'}</div>
                      ${quotation.clientPhone ? `<div class="client-detail-row">${quotation.clientPhone}</div>` : ''}
                      ${quotation.projectName ? `<div class="client-detail-row">${quotation.projectName}</div>` : ''}
                    </div>
                    <div class="right-meta">
                      <div class="doc-title">Quotation</div>
                      <div class="meta-row">
                         <span>Quotation No.:</span>
                         <span>${quotation.quotationNumber}</span>
                      </div>
                      <div class="meta-row">
                         <span>Date:</span>
                         <span>${fmtDate(quotation.quotationDate)}</span>
                      </div>
                    </div>
                  </div>

                  <table class="items-table">
                    <thead>
                      <tr>
                        <th style="width: 5%;" class="col-center">#</th>
                        <th style="width: 45%;">Item name</th>
                        <th style="width: 10%;" class="col-center">Quantity</th>
                        <th style="width: 10%;" class="col-center">Unit</th>
                        <th style="width: 15%;" class="col-right">Price/ unit</th>
                        <th style="width: 15%;" class="col-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${quotation.items.map((item: any, index: number) => `
                        <tr>
                          <td class="col-center">${index + 1}</td>
                          <td><strong>${item.item || ''}</strong></td>
                          <td class="col-center">${item.quantity}</td>
                          <td class="col-center">${item.unit}</td>
                          <td class="col-right">${formatCurrency(item.rate)}</td>
                          <td class="col-right">${formatCurrency(item.amount)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  ${quotation.additionalWork && quotation.additionalWork.length > 0 ? `
                    <div class="section-title">Additional Work</div>
                    <table class="items-table">
                       <thead>
                         <tr>
                           <th style="width: 5%;" class="col-center">#</th>
                           <th style="width: 45%;">Item name</th>
                           <th style="width: 10%;" class="col-center">Quantity</th>
                           <th style="width: 10%;" class="col-center">Unit</th>
                           <th style="width: 15%;" class="col-right">Price/ unit</th>
                           <th style="width: 15%;" class="col-right">Amount</th>
                         </tr>
                       </thead>
                       <tbody>
                         ${quotation.additionalWork.map((item: any, index: number) => `
                           <tr>
                             <td class="col-center">${index + 1}</td>
                             <td><strong>${item.item || ''}</strong></td>
                             <td class="col-center">${item.quantity}</td>
                             <td class="col-center">${item.unit}</td>
                             <td class="col-right">${formatCurrency(item.rate)}</td>
                             <td class="col-right">${formatCurrency(item.amount)}</td>
                           </tr>
                         `).join('')}
                       </tbody>
                    </table>
                  ` : ''}

                  <div class="totals">
                    <table>
                      <tr>
                        <td>Subtotal</td>
                        <td>${formatCurrency(quotation.subtotal)}</td>
                      </tr>
                      ${quotation.taxPercent > 0 ? `
                      <tr>
                        <td>GST (${quotation.taxPercent}%)</td>
                        <td>${formatCurrency(quotation.taxAmount)}</td>
                      </tr> ` : ''}
                       ${(quotation.discountAmount && quotation.discountAmount > 0) || (quotation.discountPercent && quotation.discountPercent > 0) ? `
                      <tr>
                        <td>Discount ${quotation.discountPercent ? `(${quotation.discountPercent}%)` : ''}</td>
                        <td style="color: #DC2626;">-${formatCurrency(Number(quotation.discountAmount || 0))}</td>
                      </tr>` : ''}
                      <tr class="total-row">
                        <td>Total</td>
                        <td>${formatCurrency(quotation.total)}</td>
                      </tr>
                    </table>
                    <div style="text-align: right; margin-top: 12px; border-top: 1px dashed #e5e7eb; padding-top: 8px;">
                       <span style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Amount in words</span><br/>
                       <span style="font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.4;">${amountInWords}</span>
                    </div>
                  </div>

                  ${quotation.notes ? `
                    <div class="notes" style="margin-top: 30px; margin-bottom: 20px;">
                      <strong>Notes:</strong><br>
                      ${quotation.notes.replace(/\n/g, '<br>')}
                    </div>
                  ` : ''}

                  ${selectedBank ? `
                    <div style="margin-top: 24px; margin-bottom: 60px;">
                      <div class="section-title">Bank Details</div>
                      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr>
                          <td style="padding: 4px; width: 30%;"><strong>Bank Name:</strong></td>
                          <td style="padding: 4px;">${selectedBank.bankName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px;"><strong>Account Holder:</strong></td>
                          <td style="padding: 4px;">${selectedBank.accountHolderName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px;"><strong>Branch:</strong></td>
                          <td style="padding: 4px;">${selectedBank.branchName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px;"><strong>Account Number:</strong></td>
                          <td style="padding: 4px;">${selectedBank.accountNumber}</td>
                        </tr>
                        <tr>
                          <td style="padding: 4px;"><strong>IFSC Code:</strong></td>
                          <td style="padding: 4px;">${selectedBank.ifscCode}</td>
                        </tr>
                      </table>
                    </div>
                  ` : ''}

                  <div class="signature-block">
                     <div>
                     <div class="signature-line" style="border:none;">
                        ${signatureImage ? `<img src="${signatureImage}" alt="Signature" style="height: 60px; object-fit: contain; display: block; margin-bottom: 5px;" />` : `<div style="height: 60px;"></div>`}
                     </div>
                       <div class="auth-signatory">
                       <div class="sign-label">Authorized Signatory</div>
                    </div>
                  </div>

                  ${termsConditions ? `
                  <div class="terms-section">
                    <div class="terms-title">Terms & Conditions</div>
                    <div class="terms-content">${termsConditions}</div>
                  </div>` : ''}

                </div>
              </td>
            </tr>
          </tbody>
        </table>
       <!-- Graphical footer removed -->
      </div>
    `;

    // ULTRA MODE: Direct html2canvas + jsPDF approach
    const container = document.createElement('div');
    container.innerHTML = `<style>${styleContent}</style>${bodyContent}`;

    // Position container visibly but off to the side temporarily
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = 'white';
    container.style.visibility = 'visible'; // Must be visible for rendering

    document.body.appendChild(container);

    // Wait for all images to load
    const images = container.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(imagePromises).then(() => {
      // PRE-PROCESS PAGINATION
      // This logic calculates where page breaks will occur and inserts "spacers"
      // to force content to the next page if it would otherwise be cut.
      const preprocessPagination = () => {
        const A4_HEIGHT_PX = 1123; // @ 96 DPI approx
        const PADDING_BOTTOM_PX = 60; // Safety buffer (approx 15mm)
        const PAGE_HEIGHT = A4_HEIGHT_PX - PADDING_BOTTOM_PX;

        // Current rendering Y position in the "continuous" document
        let currentY = 0;

        // 1. Account for Header
        const header = container.querySelector('.header-wrapper') as HTMLElement;
        if (header) {
          currentY += header.offsetHeight;
        }

        // 2. Process Main Content
        const mainContent = container.querySelector('.main-content');
        if (mainContent) {
          const children = Array.from(mainContent.children) as HTMLElement[];

          for (const child of children) {
            // A. Handle Tables (Row by Row)
            if (child.tagName === 'TABLE' && child.classList.contains('items-table')) {
              const thead = child.querySelector('thead') as HTMLElement;
              const tbody = child.querySelector('tbody') as HTMLElement;

              // Header check
              if (thead) {
                const headerHeight = thead.offsetHeight;
                if (currentY + headerHeight > PAGE_HEIGHT) {
                  // Push whole table
                  const spacerHeight = PAGE_HEIGHT - currentY;
                  const spacer = document.createElement('div');
                  spacer.style.height = `${spacerHeight}px`;
                  mainContent.insertBefore(spacer, child);
                  currentY = 0; // New Page
                }
                currentY += headerHeight;
              }

              // Rows check
              if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr')) as HTMLElement[];
                for (const row of rows) {
                  const rowHeight = row.offsetHeight;

                  // If row fits, add it. If not, spacer.
                  // Note: We check if it fits in remaining space.
                  // If row is HUGE (larger than page), we can't help it, let it cut.
                  if (rowHeight < PAGE_HEIGHT && (currentY + rowHeight > PAGE_HEIGHT)) {
                    // Add spacer row
                    const spacerRow = document.createElement('tr');
                    // Spacer height is remaining space
                    const spacerHeight = PAGE_HEIGHT - currentY;

                    // We need a cell to hold the height
                    // Assuming max 6 columns usually
                    spacerRow.innerHTML = `<td colspan="10" style="height: ${spacerHeight}px; padding: 0; border: none !important; background: transparent;"></td>`;

                    tbody.insertBefore(spacerRow, row);
                    currentY = 0; // New Page starts here
                  }
                  currentY += rowHeight;
                }
              }
            }
            // B. Handle Normal Blocks (Totals, Bank Details, Signature, etc.)
            else {
              const blockHeight = child.offsetHeight;

              // Special case: signature block should never break
              // If block doesn't fit, push to next page
              if (blockHeight < PAGE_HEIGHT && (currentY + blockHeight > PAGE_HEIGHT)) {
                const spacerHeight = PAGE_HEIGHT - currentY;
                const spacer = document.createElement('div');
                spacer.style.height = `${spacerHeight}px`;
                spacer.style.width = '100%';
                mainContent.insertBefore(spacer, child);
                currentY = 0; // New page
              }
              currentY += blockHeight;
            }
          }
        }
      };

      // Run the pre-processor
      try {
        preprocessPagination();
      } catch (e) {
        console.error("Pagination Pre-process failed", e);
      }

      // Give extra time for fonts and rendering
      setTimeout(async () => {
        try {
          // Import html2canvas and jsPDF directly
          const html2canvas = (await import('html2canvas')).default;
          const { jsPDF } = await import('jspdf');

          // Capture the container as canvas with maximum quality
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            height: container.scrollHeight,
            windowWidth: 794,
            windowHeight: container.scrollHeight
          });

          // Create PDF with A4 dimensions
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
          });

          // PDF Dimensions and Margins
          const pageWidth = 210;
          const pageHeight = 297;
          const marginTop = 0;
          const marginBottom = 15;
          const marginLeft = 0;
          const marginRight = 0;

          // Safe content area dimensions
          const contentWidth = pageWidth - marginLeft - marginRight;
          const contentHeight = pageHeight - marginTop - marginBottom;

          // Calculate scaled image dimensions
          // We scale the image to fit the content width exactly
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let yOffset = marginTop; // Start drawing at the top margin

          // Helper: Add Footer Text in bottom margin
          const addFooterText = () => {
            if (footerText) {
              pdf.setFontSize(8);
              pdf.setTextColor(107, 114, 128); // gray-500
              // Place vertically in the middle of the bottom margin
              const footerY = pageHeight - (marginBottom / 2) + 1;
              pdf.text(footerText, pageWidth / 2, footerY, { align: 'center' });
            }
          };

          // Helper: Mask margins with white rectangles to hide spillover content
          const maskMargins = () => {
            pdf.setFillColor(255, 255, 255);

            // Top Margin Mask
            pdf.rect(0, 0, pageWidth, marginTop, 'F');

            // Bottom Margin Mask
            pdf.rect(0, pageHeight - marginBottom, pageWidth, marginBottom, 'F');

            // Left Margin Mask (optional, mostly for cleanliness)
            pdf.rect(0, 0, marginLeft, pageHeight, 'F');

            // Right Margin Mask
            pdf.rect(pageWidth - marginRight, 0, marginRight, pageHeight, 'F');
          };

          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          // Loop to generate pages
          while (heightLeft > 0) {
            // Add Image positioned at current offset
            // The image is huge, so it will spill off the page boundaries, which is fine
            // because we mask it.
            pdf.addImage(imgData, 'JPEG', marginLeft, yOffset, imgWidth, imgHeight);

            // Hide the parts of the image that shouldn't be seen on this page
            maskMargins();

            // Add Footer on top of the mask
            addFooterText();

            // Prepare for next page
            heightLeft -= contentHeight;
            yOffset -= contentHeight; // Shift the image UP for the next page 'window'

            // If more content remains, add a new page
            if (heightLeft > 0) {
              pdf.addPage();
            }
          }

          // Save the PDF
          pdf.save(`${fileTitle}.pdf`);

          // Cleanup
          document.body.removeChild(container);
        } catch (error) {
          console.error('PDF Generation Error:', error);
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          alert('Failed to generate PDF. Please check console for details.');
        }
      }, 1500);
    });
  };

  const filteredQuotations = quotations
    .filter((quotation) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        quotation.quotationNumber.toLowerCase().includes(searchLower) ||
        quotation.clientName.toLowerCase().includes(searchLower) ||
        quotation.projectName.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.quotationDate).getTime() - new Date(a.quotationDate).getTime());

  const viewingQuotation = viewingQuotationId ? quotations.find((q) => q.id === viewingQuotationId) : null;

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalItems = filteredQuotations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedQuotations = filteredQuotations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quotations</h2>
          <p className="text-slate-600 mt-1">Manage project estimates</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Quotation
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by quotation number, project, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {paginatedQuotations.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            {searchTerm ? 'No quotations found matching your search.' : 'No quotations yet. Create your first quotation.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Quotation No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedQuotations.map((quotation: { id: string; quotationNumber: string; quotationDate: string; projectName: string; clientName: string; total: number; status: 'Draft' | 'Sent' | 'Approved' | 'Converted'; }) => {
                    const statusColors = {
                      Draft: 'bg-slate-100 text-slate-700',
                      Sent: 'bg-blue-100 text-blue-700',
                      Approved: 'bg-green-100 text-green-700',
                      Converted: 'bg-purple-100 text-purple-700',
                    };

                    return (
                      <tr key={quotation.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-slate-800">{quotation.quotationNumber}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {fmtDate(quotation.quotationDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{quotation.projectName}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{quotation.clientName}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">
                          {formatCurrency(quotation.total)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[quotation.status]}`}>
                            {quotation.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => setViewingQuotationId(quotation.id)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Items"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => generatePDF(quotation.id)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleWhatsAppShare(quotation.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            {canCreate && (
                              <button
                                onClick={() => handleDuplicate(quotation.id)}
                                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                            {(canUpdate || canConvertToProject || canDelete) && (
                              <>
                                {canUpdate && (
                                  <button
                                    onClick={() => openEditModal(quotation.id)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {canConvertToProject && (
                                  <button
                                    onClick={() => handleConvertToProject(quotation.id)}
                                    disabled={quotation.status === 'Converted'}
                                    className={`p-2 rounded-lg transition-colors ${quotation.status === 'Converted'
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-green-600 hover:bg-green-50'
                                      }`}
                                    title={quotation.status === 'Converted' ? 'Already Converted' : 'Convert to Project'}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(quotation.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-4 space-y-4">
              {paginatedQuotations.map((quotation: { id: string; quotationNumber: string; projectName: string; quotationDate: string; status: 'Draft' | 'Sent' | 'Approved' | 'Converted'; clientName: string; total: number; }) => {
                const statusColors = {
                  Draft: 'bg-slate-100 text-slate-700',
                  Sent: 'bg-blue-100 text-blue-700',
                  Approved: 'bg-green-100 text-green-700',
                  Converted: 'bg-purple-100 text-purple-700',
                };

                return (
                  <div key={quotation.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <h4 className="font-semibold text-slate-800">
                            {quotation.quotationNumber}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {quotation.projectName}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {fmtDate(quotation.quotationDate)}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[quotation.status]}`}>
                        {quotation.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Client:</span>
                        <span className="font-medium text-slate-800">
                          {quotation.clientName}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-600 font-medium">Amount:</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(quotation.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => setViewingQuotationId(quotation.id)}
                        className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Items"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => generatePDF(quotation.id)}
                        className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleWhatsAppShare(quotation.id)}
                        className="p-2.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                        title="Share via WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => openEditModal(quotation.id)}
                          className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Quotation"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {canConvertToProject && (
                        <button
                          onClick={() => handleConvertToProject(quotation.id)}
                          disabled={quotation.status === 'Converted'}
                          className={`p-2.5 rounded-lg transition-colors ${quotation.status === 'Converted'
                            ? 'text-slate-400 bg-slate-50 cursor-not-allowed'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                            }`}
                          title={quotation.status === 'Converted' ? 'Already Converted' : 'Convert to Project'}
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(quotation.id)}
                          className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </div>

      {viewingQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Quotation Details</h3>
                <p className="text-sm text-slate-600 mt-1">{viewingQuotation.quotationNumber} • {viewingQuotation.clientName}</p>
              </div>
              <button
                onClick={() => setViewingQuotationId(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-slate-600">Project Name</p>
                  <p className="font-medium text-slate-800">{viewingQuotation.projectName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Date</p>
                  <p className="font-medium text-slate-800">{fmtDate(viewingQuotation.quotationDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${viewingQuotation.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                    viewingQuotation.status === 'Sent' ? 'bg-blue-100 text-blue-700' :
                      viewingQuotation.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                    }`}>
                    {viewingQuotation.status}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Item</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Qty</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase">Unit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {viewingQuotation.items.map((item: any, index: number) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-slate-800">{item.item}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-800">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">{item.unit}</td>
                        <td className="px-4 py-3 text-sm text-right text-slate-800">{formatCurrency(item.rate)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-80">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-medium text-slate-800">{formatCurrency(viewingQuotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">GST ({viewingQuotation.taxPercent}%):</span>
                      <span className="font-medium text-slate-800">{formatCurrency(viewingQuotation.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-800">Total:</span>
                      <span className="font-bold text-lg text-slate-900">{formatCurrency(viewingQuotation.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingQuotation.notes && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border-l-4 border-slate-800">
                  <p className="text-sm font-medium text-slate-800 mb-1">Notes:</p>
                  <p className="text-sm text-slate-600">{viewingQuotation.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <QuotationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        quotationId={selectedQuotationId}
      />

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation?"
        detail={confirmDelete?.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { deleteQuotation(confirmDelete.id); setConfirmDelete(null); } }}
      />

      <ConfirmDeleteModal
        open={!!confirmConvert}
        title="Convert Quotation"
        message="Convert this quotation to a project? This action cannot be undone."
        detail={confirmConvert?.title}
        confirmLabel="Convert"
        variant="success"
        onCancel={() => setConfirmConvert(null)}
        onConfirm={() => { if (confirmConvert) { convertQuotationToProject(confirmConvert.id); setConfirmConvert(null); } }}
      />
    </div>
  );
}

const amountToWords = (amount: number): string => {
  if (!Number.isFinite(amount)) return '';
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const twoDigits = (num: number): string => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return `${tens[t]}${o ? ' ' + ones[o] : ''} `.trim();
  };
  const threeDigits = (num: number): string => {
    if (num === 0) return '';
    const h = Math.floor(num / 100);
    const r = num % 100;
    if (h && r) return `${ones[h]} Hundred and ${twoDigits(r)} `;
    if (h && !r) return `${ones[h]} Hundred`;
    return twoDigits(r);
  };
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} ${crore === 1 ? 'Crore' : 'Crores'} `);
  if (lakh) parts.push(`${twoDigits(lakh)} ${lakh === 1 ? 'Lakh' : 'Lakhs'} `);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return `${parts.join(' ')} Rupees Only`;
};
