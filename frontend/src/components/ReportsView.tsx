import { useState, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatYMDHM } from '../utils/date';
import { formatLongDate } from '../utils/dates';
import { maskSensitive } from '../utils/security';
import PaginationControls from './PaginationControls';

export default function ReportsView() {
  const { projects, expenses, payments, teams, teamWork, teamPayments } = useApp();
  const [activeTab, setActiveTab] = useState<'projects' | 'teams'>('projects');

  const projectReports = useMemo(() => {
    return projects
      .filter(p => !p.deleted) // Only active projects
      .map((project) => {
        const projectExpenses = expenses.filter((e) => e.projectId === project.id && !e.deleted);
        const projectPayments = payments.filter((p) => p.projectId === project.id && !p.deleted);

        const totalExpenses = projectExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalPayments = projectPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const dueAmount = (project.projectAmount ?? project.quotationAmount ?? 0) || 0;
        const progressRaw = dueAmount > 0 ? (totalPayments / dueAmount) * 100 : 0;
        const progressPercent = Math.min(100, Math.max(0, progressRaw));
        const profitLoss = totalPayments - totalExpenses;

        return {
          project,
          totalExpenses,
          totalPayments,
          progressPercent,
          profitLoss,
          expenseCount: projectExpenses.length,
          paymentCount: projectPayments.length,
        };
      });
  }, [projects, expenses, payments]);

  const teamReports = useMemo(() => {
    return teams.map(member => {
      // Filter work: not deleted AND from active projects
      const myWork = teamWork.filter(w => {
        if (w.deleted) return false;
        if (w.teamMemberId !== member.id) return false;

        if (w.projectId) {
          const project = projects.find(p => p.id === w.projectId);
          if (!project || project.deleted) return false;
        }
        return true;
      });

      // Get valid work IDs
      const validWorkIds = new Set(myWork.map(w => w.id));

      // Filter payments: not deleted AND linked to active work
      const myPayments = teamPayments.filter(p => {
        if (p.deleted) return false;
        if (p.teamMemberId !== member.id) return false;

        if (p.workEntryIds && Array.isArray(p.workEntryIds) && p.workEntryIds.length > 0) {
          const hasValidWork = p.workEntryIds.some((id: string) => validWorkIds.has(id));
          if (!hasValidWork) return false;
        }
        return true;
      });

      const totalWorkValue = myWork.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
      const totalPaid = myPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingAmount = totalWorkValue - totalPaid;

      return {
        member,
        totalWorkValue,
        totalPaid,
        pendingAmount,
        workCount: myWork.length,
        paymentCount: myPayments.length
      };
    });
  }, [teams, teamWork, teamPayments, projects]);

  const filteredReports = useMemo(() => {
    return projectReports;
  }, [projectReports]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when tab changes
  useMemo(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Determine current items based on active tab
  const currentItems = activeTab === 'projects' ? filteredReports : teamReports;
  const totalItems = currentItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = currentPage * itemsPerPage;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => formatYMDHM(dateString);

  const generateProjectReport = (projectId: string) => {
    const report = projectReports.find((r) => r.project.id === projectId);
    if (!report) return;

    const project = report.project;
    const projectExpenses = expenses.filter((e) => e.projectId === projectId);
    const projectPayments = payments.filter((p) => p.projectId === projectId);

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Project Report - ${project.projectName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #64748b; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
          .project-details { margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; }
          .project-details table { width: 100%; }
          .project-details td { padding: 5px; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th { background-color: #1e293b; color: white; padding: 10px; text-align: left; font-size: 12px; }
          .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .items-table tr:hover { background-color: #f8fafc; }
          .summary-box { background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin-top: 30px; }
          .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #cbd5e1; }
          .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #1e293b; border-bottom: none; margin-top: 10px; }
          .profit { color: #059669; }
          .loss { color: #dc2626; }
          .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Artistic Engineers</div>
          <div class="company-tagline">Interior Design & Management</div>
        </div>

        <div class="report-title">Project Financial Report</div>

        <div class="project-details">
          <table>
            <tr>
              <td><strong>Project:</strong> ${project.projectName}</td>
              <td style="text-align: right;"><strong>Client:</strong> ${project.clientName}</td>
            </tr>
            <tr>
              <td><strong>Project Type:</strong> ${project.projectType}</td>
              <td style="text-align: right;"><strong>Status:</strong> ${project.status}</td>
            </tr>
            <tr>
              <td><strong>Start Date:</strong> ${formatLongDate(project.startDate)}</td>
              <td style="text-align: right;"><strong>Report Date:</strong> ${formatLongDate(new Date())}</td>
            </tr>
          </table>
        </div>

        ${projectPayments.length > 0 ? `
          <div class="section-title">Payments Received</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Type</th>
                <th style="width: 25%;">Amount</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${projectPayments.map((payment, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${payment.paymentType}</td>
                  <td>${formatCurrency(payment.amount)}</td>
                  <td>${formatLongDate(payment.paymentDate)}</td>
                  <td>${payment.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="text-align: right;">Total Payments:</td>
                <td colspan="3">${formatCurrency(report.totalPayments)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">Project Progress</div>
        <div class="summary-box" style="padding: 12px;">
          <div class="summary-row">
            <span>Project Amount:</span>
            <span>${formatCurrency((project.projectAmount ?? project.quotationAmount ?? 0) || 0)}</span>
          </div>
          <div class="summary-row">
            <span>Total Payments Received:</span>
            <span>${formatCurrency(report.totalPayments)}</span>
          </div>
          <div class="summary-row">
            <span>Progress:</span>
            <span>${(() => {
        const due = (project.projectAmount ?? project.quotationAmount ?? 0) || 0;
        const pct = due > 0 ? Math.min(100, Math.max(0, (report.totalPayments / due) * 100)) : 0;
        return pct.toFixed(2) + '%';
      })()}</span>
          </div>
        </div>

        ${projectExpenses.length > 0 ? `
          <div class="section-title">Other Expenses</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 35%;">Title</th>
                <th style="width: 20%;">Amount</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 15%;">Payment Mode</th>
                <th style="width: 10%;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${projectExpenses.map((expense, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${expense.title}</td>
                  <td>${formatCurrency(expense.amount)}</td>
                  <td>${formatDate(expense.expenseDate)}</td>
                  <td>${expense.paymentMode || '-'}</td>
                  <td>${expense.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="text-align: right;">Total Expenses:</td>
                <td colspan="4">${formatCurrency(report.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="summary-box">
          <div class="summary-row">
            <span>Total Payments Received:</span>
            <span>${formatCurrency(report.totalPayments)}</span>
          </div>
          <div class="summary-row">
            <span>Total Expenses:</span>
            <span>${formatCurrency(report.totalExpenses)}</span>
          </div>
          <div class="summary-row total ${report.profitLoss >= 0 ? 'profit' : 'loss'}">
            <span>${report.profitLoss >= 0 ? 'Profit' : 'Loss'}:</span>
            <span>${formatCurrency(Math.abs(report.profitLoss))}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report from Artistic Engineers</p>
          <p>Report generated on ${formatLongDate(new Date())} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generateClientReport = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectPayments = payments
      .filter((p) => p.projectId === projectId && !p.deleted)
      .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
      .map((p) => ({
        amount: p.amount,
        paymentDate: p.paymentDate,
        referenceNumber: maskSensitive(p.referenceNumber),
      }));

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Client Payment Report - ${project.projectName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #64748b; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
          .project-details { margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; }
          .project-details table { width: 100%; }
          .project-details td { padding: 5px; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th { background-color: #1e293b; color: white; padding: 10px; text-align: left; font-size: 12px; }
          .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .items-table tr:hover { background-color: #f8fafc; }
          .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Artistic Engineers</div>
          <div class="company-tagline">Interior Design & Management</div>
        </div>

        <div class="report-title">Client Payment Report</div>

        <div class="project-details">
          <table>
            <tr>
              <td><strong>Project:</strong> ${project.projectName}</td>
              <td style="text-align: right;"><strong>Client:</strong> ${project.clientName}</td>
            </tr>
            <tr>
              <td><strong>Status:</strong> ${project.status}</td>
              <td style="text-align: right;"><strong>Report Date:</strong> ${formatLongDate(new Date())}</td>
            </tr>
          </table>
        </div>

        <div class="section-title">Payments Received (${projectPayments.length})</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 10%;">#</th>
              <th style="width: 35%;">Amount</th>
              <th style="width: 30%;">Date</th>
              <th style="width: 25%;">Reference / Txn ID</th>
            </tr>
          </thead>
          <tbody>
            ${projectPayments.length > 0 ? projectPayments.map((p, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${formatLongDate(p.paymentDate)}</td>
                <td>${p.referenceNumber || '-'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="text-align: center; color: #64748b;">No payments recorded</td>
              </tr>
            `}
          </tbody>
        </table>

        <div class="footer">
          <p>This client report lists only payments received for your project.</p>
          <p>Generated on ${formatLongDate(new Date())} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generateTeamSummaryReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Team Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
            .report-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { background-color: #1e293b; color: white; padding: 10px; text-align: left; font-size: 12px; }
            .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .items-table tr:hover { background-color: #f8fafc; }
            .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Artistic Engineers</div>
            <div class="company-tagline">Team Financial Summary</div>
          </div>
  
          <div class="report-title">Team / Karagir Report</div>
  
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 25%;">Name</th>
                <th style="width: 15%;">Skill</th>
                <th style="width: 10%;">Status</th>
                <th style="width: 15%; text-align: right;">Total Work</th>
                <th style="width: 15%; text-align: right;">Total Paid</th>
                <th style="width: 15%; text-align: right;">Pending</th>
              </tr>
            </thead>
            <tbody>
              ${teamReports.map((r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.member.name}</td>
                  <td>${r.member.skill}</td>
                  <td>${r.member.status}</td>
                  <td style="text-align: right;">${formatCurrency(r.totalWorkValue)}</td>
                  <td style="text-align: right; color: #059669;">${formatCurrency(r.totalPaid)}</td>
                  <td style="text-align: right; color: #dc2626; font-weight: bold;">${formatCurrency(r.pendingAmount)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="4" style="text-align: right;">Grand Total:</td>
                <td style="text-align: right;">${formatCurrency(teamReports.reduce((s, r) => s + r.totalWorkValue, 0))}</td>
                <td style="text-align: right;">${formatCurrency(teamReports.reduce((s, r) => s + r.totalPaid, 0))}</td>
                <td style="text-align: right;">${formatCurrency(teamReports.reduce((s, r) => s + r.pendingAmount, 0))}</td>
              </tr>
            </tbody>
          </table>
  
          <div class="footer">
            <p>Generated on ${formatLongDate(new Date())} at ${new Date().toLocaleTimeString('en-IN')}</p>
          </div>
        </body>
        </html>
      `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reports</h2>
          <p className="text-slate-600 mt-1">
            Team members Reports
          </p>
        </div>
        {activeTab === 'teams' && (
          <button onClick={generateTeamSummaryReport} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            <FileText className="w-4 h-4" /> Print Summary
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'projects' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Project Reports
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teams' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Team Reports
        </button>
      </div>

      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.slice(startIndex, endIndex).map((report) => (
            <div
              key={report.project.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">
                    {report.project.projectName}
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">{report.project.clientName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${report.project.status === 'Ongoing'
                      ? 'bg-blue-100 text-blue-700'
                      : report.project.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-700'
                      }`}>
                      {report.project.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.project.projectType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Payments:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(report.totalPayments)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Expenses:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(report.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="font-medium text-slate-700">
                    {report.profitLoss >= 0 ? 'Profit' : 'Loss'}:
                  </span>
                  <span className={`font-semibold ${report.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(Math.abs(report.profitLoss))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-slate-200">
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-800">
                    {report.paymentCount}
                  </div>
                  <div className="text-xs text-slate-500">Payments</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-800">
                    {report.expenseCount}
                  </div>
                  <div className="text-xs text-slate-500">Expenses</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-slate-800">
                    {report.progressPercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-slate-500">Project Progress</div>
                </div>
              </div>

              <div className="flex flex-row gap-2">
                <button
                  onClick={() => generateProjectReport(report.project.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  aria-label="Generate full project report"
                >
                  Company Report
                </button>
                <button
                  onClick={() => generateClientReport(report.project.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  aria-label="Generate client-safe report"
                >
                  Client Report
                </button>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p>No project reports found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamReports.slice(startIndex, endIndex).map((report) => (
            <div key={report.member.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">{report.member.name}</h3>
                  <p className="text-sm text-slate-500">{report.member.skill}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${report.member.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {report.member.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Work:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(report.totalWorkValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Paid:</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(report.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="font-medium text-slate-700">Pending:</span>
                  <span className="font-bold text-red-600">{formatCurrency(report.pendingAmount)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-500">
                <div className="bg-slate-50 py-1 rounded">
                  <strong className="block text-slate-700 text-sm">{report.workCount}</strong> Entries
                </div>
                <div className="bg-slate-50 py-1 rounded">
                  <strong className="block text-slate-700 text-sm">{report.paymentCount}</strong> Payments
                </div>
              </div>
            </div>
          ))}
          {teamReports.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No team members found.
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}
