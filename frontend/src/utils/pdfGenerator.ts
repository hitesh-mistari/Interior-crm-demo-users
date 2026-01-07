import { Supplier, Expense, SupplierPayment, Project } from '../types';
import { formatCurrency } from './formatters';
const fmtDate = (dateString: string): string => new Date(dateString).toLocaleDateString('en-IN');

type DateFilter = 'today' | 'week' | 'month' | '6months' | 'year' | 'all';

interface SupplierStats {
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  lastPurchase: Date | null;
  purchaseCount: number;
}

interface SystemSettings {
  company_name?: string;
  company_tagline?: string;
  company_address?: string;
  company_gst_number?: string;
  pdf_footer_text?: string;
}

const getDateRangeLabel = (filter: DateFilter): string => {
  switch (filter) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case '6months':
      return 'Last 6 Months';
    case 'year':
      return 'This Year';
    case 'all':
      return 'All Time';
  }
};

export const generateSupplierPDF = (
  supplier: Supplier,
  expenses: Expense[],
  payments: SupplierPayment[],
  projects: Project[],
  dateFilter: DateFilter,
  stats: SupplierStats,
  settings?: SystemSettings
): void => {
  const companyName = settings?.company_name || 'Artistic Engineers';
  const companyTagline = settings?.company_tagline || 'Smart Interior Solutions System';
  const footerText = settings?.pdf_footer_text || 'This is a computer-generated report. For queries, please contact your administrator.';
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to generate PDF');
    return;
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.projectName || 'Unknown Project';
  };

  const getExpensePaidAmount = (expenseId: string) => {
    return payments
      .filter((p) => p.expenseId === expenseId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Supplier Report - ${supplier.supplierName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      padding: 40px;
      color: #1e293b;
      line-height: 1.6;
    }

    .header {
      border-bottom: 3px solid #1e293b;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 5px;
    }

    .report-title {
      font-size: 20px;
      color: #64748b;
      margin-bottom: 10px;
    }

    .report-meta {
      font-size: 12px;
      color: #64748b;
    }

    .supplier-info {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }

    .supplier-name {
      font-size: 22px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 15px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
      font-weight: 600;
    }

    .info-value {
      font-size: 14px;
      color: #1e293b;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #1e293b;
    }

    .stat-value.positive {
      color: #059669;
    }

    .stat-value.warning {
      color: #d97706;
    }

    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    thead {
      background: #f8fafc;
    }

    th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }

    th.right {
      text-align: right;
    }

    th.center {
      text-align: center;
    }

    td {
      padding: 12px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }

    td.right {
      text-align: right;
    }

    td.center {
      text-align: center;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge.paid {
      background: #d1fae5;
      color: #065f46;
    }

    .badge.partial {
      background: #fef3c7;
      color: #92400e;
    }

    .badge.pending {
      background: #fee2e2;
      color: #991b1b;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }

    .summary {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .summary-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 16px;
    }

    @media print {
      body {
        padding: 20px;
      }

      .stat-card {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${companyName}</div>
    <div class="report-title">Supplier Report</div>
    <div class="report-meta">
      Generated on ${fmtDate(new Date().toISOString())} |
      Period: ${getDateRangeLabel(dateFilter)}
    </div>
  </div>

  <div class="supplier-info">
    <div class="supplier-name">${supplier.supplierName}</div>
    <div class="info-grid">
      ${
        supplier.companyName
          ? `
      <div class="info-item">
        <div class="info-label">Company Name</div>
        <div class="info-value">${supplier.companyName}</div>
      </div>
      `
          : ''
      }
      <div class="info-item">
        <div class="info-label">Phone</div>
        <div class="info-value">${supplier.phone}</div>
      </div>
      ${
        supplier.alternatePhone
          ? `
      <div class="info-item">
        <div class="info-label">Alternate Phone</div>
        <div class="info-value">${supplier.alternatePhone}</div>
      </div>
      `
          : ''
      }
      ${
        supplier.address
          ? `
      <div class="info-item">
        <div class="info-label">Address</div>
        <div class="info-value">${supplier.address}</div>
      </div>
      `
          : ''
      }
      ${
        supplier.gstNumber
          ? `
      <div class="info-item">
        <div class="info-label">GST Number</div>
        <div class="info-value">${supplier.gstNumber}</div>
      </div>
      `
          : ''
      }
      ${
        supplier.category
          ? `
      <div class="info-item">
        <div class="info-label">Category</div>
        <div class="info-value">${supplier.category}</div>
      </div>
      `
          : ''
      }
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Purchases</div>
      <div class="stat-value">${formatCurrency(stats.totalPurchases)}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 5px;">
        ${stats.purchaseCount} transaction${stats.purchaseCount !== 1 ? 's' : ''}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Paid</div>
      <div class="stat-value positive">${formatCurrency(stats.totalPaid)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Outstanding</div>
      <div class="stat-value ${stats.outstanding > 0 ? 'warning' : ''}">
        ${formatCurrency(stats.outstanding)}
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Last Purchase</div>
      <div class="stat-value" style="font-size: 14px;">
        ${stats.lastPurchase ? fmtDate(stats.lastPurchase.toISOString()) : 'N/A'}
      </div>
    </div>
  </div>

  <div class="section-title">Purchase History</div>

  ${
    expenses.length === 0
      ? '<p style="text-align: center; color: #64748b; padding: 40px;">No purchases found for the selected period.</p>'
      : `
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Project</th>
        <th>Description</th>
        <th class="right">Amount</th>
        <th class="right">Paid</th>
        <th class="right">Balance</th>
        <th class="center">Status</th>
      </tr>
    </thead>
    <tbody>
      ${expenses
        .map((expense) => {
          const paid = getExpensePaidAmount(expense.id);
          const balance = expense.amount - paid;
          const status = paid === 0 ? 'pending' : paid >= expense.amount ? 'paid' : 'partial';

          return `
        <tr>
          <td>${fmtDate(expense.expenseDate)}</td>
          <td>${getProjectName(expense.projectId)}</td>
          <td>
            <strong>${expense.title}</strong>
            ${expense.notes ? `<br><span style="font-size: 11px; color: #64748b;">${expense.notes}</span>` : ''}
          </td>
          <td class="right"><strong>${formatCurrency(expense.amount)}</strong></td>
          <td class="right" style="color: #059669;"><strong>${formatCurrency(paid)}</strong></td>
          <td class="right" style="color: #d97706;"><strong>${formatCurrency(balance)}</strong></td>
          <td class="center">
            <span class="badge ${status}">
              ${status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
            </span>
          </td>
        </tr>
      `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Total Purchases:</span>
      <span>${formatCurrency(stats.totalPurchases)}</span>
    </div>
    <div class="summary-row">
      <span>Total Paid:</span>
      <span style="color: #059669;">${formatCurrency(stats.totalPaid)}</span>
    </div>
    <div class="summary-row">
      <span>Outstanding Balance:</span>
      <span style="color: ${stats.outstanding > 0 ? '#d97706' : '#059669'};">
        ${formatCurrency(stats.outstanding)}
      </span>
    </div>
  </div>
  `
  }

  <div class="footer">
    <p><strong>${companyName}</strong> - ${companyTagline}</p>
    <p>${footerText}</p>
  </div>

  <script>
    window.onload = () => {
      window.print();
      window.onafterprint = () => window.close();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
