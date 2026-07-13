const https = require('https');
const brands = ['apple', 'nike', 'adidas', 'audi', 'bmw', 'mercedesbenz', 'gucci', 'rolex'];
brands.forEach(b => {
  https.get('https://raw.githubusercontent.com/simple-icons/simple-icons/master/icons/' + b + '.svg', (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      const match = data.match(/<path d="([^"]+)"/);
      if(match) console.log(b.toUpperCase() + '_PATH: ' + match[1]);
    });
  });
});
