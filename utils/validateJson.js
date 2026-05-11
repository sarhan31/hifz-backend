const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, '../data/quran.json');
  console.log('Reading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File size:', (content.length / 1024 / 1024).toFixed(2), 'MB');

  try {
    const data = JSON.parse(content);
    console.log('JSON is valid.');
    console.log('Total items:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      console.log('First item keys:', Object.keys(first));
      console.log('First item sample:', JSON.stringify(first).substring(0, 100) + '...');
      
      // Check for required fields
      if (!first.id || !first.name_ar || !first.ayahs) {
        console.warn('Warning: First item missing expected fields (id, name_ar, ayahs)');
      }
    }
  } catch (e) {
    console.error('JSON Syntax Error:', e.message);
    process.exit(1);
  }

} catch (err) {
  console.error('System Error:', err.message);
  process.exit(1);
}
