const XLSX = require('xlsx');

const filePath = 'C:\\Users\\guyoh\\Desktop\\SchoolSystenm\\TEST DATA\\CHINGA BOYS\\Chinga_Boys_High_School.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  console.log('--- EXCEL WORKBOOK INSPECTION ---');
  console.log('Sheets:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(name => {
    console.log('\n--- Sheet: ' + name + ' ---');
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Row count:', data.length);
    if (data.length > 0) {
      console.log('Sample Headers:', Object.keys(data[0]));
      // Check first 5 rows for ADM and Subject info
      data.slice(0, 5).forEach((row, i) => {
        console.log('Row ' + i + ':', JSON.stringify(row));
      });
    }
  });
} catch (err) {
  console.error('Error reading excel:', err.message);
}
