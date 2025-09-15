import * as XLSX from 'xlsx';

export interface VendorExportData {
  id: string;
  name: string;
  revenue: number;
  aov: number;
  conversion: number;
  visitors: number;
  productCount: number;
  growth: number;
}

export interface ExportOptions {
  filename?: string;
  dateRange?: string;
  includeHeaders?: boolean;
}

// Format data for export
export const formatVendorDataForExport = (vendors: VendorExportData[], options: ExportOptions = {}) => {
  const { includeHeaders = true } = options;
  
  const formattedData = vendors.map(vendor => ({
    'Vendor Name': vendor.name,
    'Revenue ($)': vendor.revenue,
    'Average Order Value ($)': vendor.aov,
    'Conversion Rate (%)': vendor.conversion,
    'Visitors': vendor.visitors,
    'Product Count': vendor.productCount,
    'Growth Rate (%)': vendor.growth
  }));

  return formattedData;
};

// Export to CSV
export const exportToCSV = (vendors: VendorExportData[], options: ExportOptions = {}) => {
  const { filename = 'vendor-analytics', dateRange } = options;
  const formattedData = formatVendorDataForExport(vendors, options);
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Add metadata row at the top if date range is provided
  if (dateRange) {
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Vendor Analytics Report - ${dateRange}`],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [] // Empty row before headers
    ], { origin: 'A1' });
    
    // Shift the data down to accommodate metadata
    XLSX.utils.sheet_add_json(worksheet, formattedData, { 
      origin: 'A4',
      skipHeader: false 
    });
  }
  
  // Auto-size columns
  const colWidths = [
    { wch: 15 }, // Vendor Name
    { wch: 12 }, // Revenue
    { wch: 18 }, // AOV
    { wch: 15 }, // Conversion Rate
    { wch: 10 }, // Visitors
    { wch: 12 }, // Product Count
    { wch: 12 }  // Growth Rate
  ];
  worksheet['!cols'] = colWidths;
  
  // Create workbook and download
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendor Analytics');
  
  const finalFilename = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  XLSX.writeFile(workbook, finalFilename, { bookType: 'csv' });
  
  return finalFilename;
};

// Export to Excel
export const exportToExcel = (vendors: VendorExportData[], options: ExportOptions = {}) => {
  const { filename = 'vendor-analytics', dateRange } = options;
  const formattedData = formatVendorDataForExport(vendors, options);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Main data worksheet
  const mainWorksheet = XLSX.utils.json_to_sheet(formattedData);
  
  // Add metadata and styling
  if (dateRange) {
    XLSX.utils.sheet_add_aoa(mainWorksheet, [
      [`Vendor Analytics Report`],
      [`Date Range: ${dateRange}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [`Total Vendors: ${vendors.length}`],
      [] // Empty row
    ], { origin: 'A1' });
    
    // Add formatted data starting from row 6
    XLSX.utils.sheet_add_json(mainWorksheet, formattedData, { 
      origin: 'A6',
      skipHeader: false 
    });
  }
  
  // Auto-size columns
  const colWidths = [
    { wch: 20 }, // Vendor Name
    { wch: 15 }, // Revenue
    { wch: 20 }, // AOV
    { wch: 18 }, // Conversion Rate
    { wch: 12 }, // Visitors
    { wch: 15 }, // Product Count
    { wch: 15 }  // Growth Rate
  ];
  mainWorksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Vendor Analytics');
  
  // Add summary worksheet
  const summaryData = [
    ['Metric', 'Total', 'Average'],
    ['Total Revenue', vendors.reduce((sum, v) => sum + v.revenue, 0), Math.round(vendors.reduce((sum, v) => sum + v.revenue, 0) / vendors.length)],
    ['Average AOV', '', Math.round((vendors.reduce((sum, v) => sum + v.aov, 0) / vendors.length) * 100) / 100],
    ['Average Conversion Rate', '', Math.round((vendors.reduce((sum, v) => sum + v.conversion, 0) / vendors.length) * 100) / 100],
    ['Total Visitors', vendors.reduce((sum, v) => sum + v.visitors, 0), Math.round(vendors.reduce((sum, v) => sum + v.visitors, 0) / vendors.length)],
    ['Total Products', vendors.reduce((sum, v) => sum + v.productCount, 0), Math.round(vendors.reduce((sum, v) => sum + v.productCount, 0) / vendors.length)],
    ['Average Growth Rate', '', Math.round((vendors.reduce((sum, v) => sum + v.growth, 0) / vendors.length) * 100) / 100]
  ];
  
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
  
  const finalFilename = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, finalFilename, { bookType: 'xlsx' });
  
  return finalFilename;
};

// Export chart data
export const exportChartData = (chartData: any[], options: ExportOptions = {}) => {
  const { filename = 'chart-data', dateRange } = options;
  
  const worksheet = XLSX.utils.json_to_sheet(chartData);
  const workbook = XLSX.utils.book_new();
  
  if (dateRange) {
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Chart Data Export - ${dateRange}`],
      [`Generated: ${new Date().toLocaleString()}`],
      []
    ], { origin: 'A1' });
    
    XLSX.utils.sheet_add_json(worksheet, chartData, { 
      origin: 'A4',
      skipHeader: false 
    });
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart Data');
  
  const finalFilename = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, finalFilename, { bookType: 'xlsx' });
  
  return finalFilename;
};