const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'Users', 'guyoh', 'Desktop', 'SchoolSystenm', 'TEST DATA', 'GIAKANJA SCHOOL.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- WORKBOOK INFO ---');
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
  const ws = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`\n--- Sheet: ${name} ---`);
  console.log('Row count:', rows.length);
  if (rows.length > 0) {
    console.log('Sample Headers:', Object.keys(rows[0]));
    console.log('Row 0 ADM:', rows[0]['Adm Number'] || rows[0]['ADM NO'] || 'NOT FOUND');
  }
});
console.log('--- END ---');
