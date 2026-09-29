/**
 * Boutique OS - Exporter
 */
class DataExporter {
  static toCSV(filename, rows) {
    const processRow = (row) => row.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(',');
    const csvContent = '\uFEFF' + rows.map(processRow).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportSalesCSV() {
    const invoices = Database.get('invoices');
    const headers = ['شماره فاکتور', 'تاریخ', 'ساعت', 'مبلغ کل', 'روش پرداخت', 'فروشنده'];
    const rows = [headers, ...invoices.map(i => [i.id, i.date, i.time, i.total, i.method, i.seller])];
    DataExporter.toCSV('sales_report.csv', rows);
  }

  static exportBackupJSON() {
    const backup = {
      timestamp: new Date().toISOString(),
      store: Database.store
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `boutique_backup_${Date.now()}.json`);
    link.click();
  }
}
