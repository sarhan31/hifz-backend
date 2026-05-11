const http = require('http');

http.get('http://localhost:5000/api/quran/surahs', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const surahs = JSON.parse(data);
      console.log('Surahs count:', surahs.length);
      console.log('First:', surahs[0].name);
      console.log('Last:', surahs[surahs.length - 1].name);
    } catch (e) {
      console.error('Error parsing JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
