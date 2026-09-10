const fs = require('fs');
const data = fs.readFileSync('logonew.png');
const encoded = data.toString('base64');
console.log(`const LOGO_DATA_URI = 'data:image/png;base64,${encoded}';`);
