const XLSX = require('xlsx');
const workbook = XLSX.readFile('/home/tynel/projetosSMECEL/02-CADASTRO_TRANSPORTE/src/docs/DADOS CARCERES.xlsx');
const sheetName = '02-ESCOLAS';
const worksheet = workbook.Sheets[sheetName];
if (!worksheet) {
  console.error('Sheet not found', sheetName);
  process.exit(1);
}
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log('headers:', rows[0]);
console.log('sample rows:');
console.log(rows.slice(1, 21));
