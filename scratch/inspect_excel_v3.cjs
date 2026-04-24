const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'Users', 'guyoh', 'Desktop', 'SchoolSystenm', 'TEST DATA', 'GIAKANJA SCHOOL.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(worksheet);

console.log('--- SHEET1 SAMPLE DATA ---');
rows.slice(0, 10).forEach((r, i) => {
  console.log(`Row ${i}:`, JSON.stringify(r));
});
console.log('--- END ---');
