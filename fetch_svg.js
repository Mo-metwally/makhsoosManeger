const https = require('https');

https.get('https://iconscout.com/free-icon/free-versace-icon_202706', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    // Look for SVG path data
    const pathRegex = /<path[^>]*d="([^"]+)"/g;
    let match;
    while ((match = pathRegex.exec(data)) !== null) {
      console.log("PATH_D:", match[1]);
    }
  });
});
