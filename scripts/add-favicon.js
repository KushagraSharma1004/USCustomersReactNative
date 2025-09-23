const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, '../dist/index.html');

fs.readFile(htmlFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading index.html:', err);
    return;
  }

  const headCloseTag = '</head>';
  const links = `
    <link rel="icon" href="/favicon.png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-icon.png" />
    <link rel="manifest" href="/manifest.json" />
  `;

  if (!data.includes(links)) {
    const updated = data.replace(headCloseTag, `${links}\n${headCloseTag}`);
    fs.writeFile(htmlFile, updated, 'utf8', (err) => {
      if (err) console.error('Error writing index.html:', err);
      else console.log('Favicon, Apple icon, and manifest added successfully!');
    });
  } else {
    console.log('Links already exist in index.html');
  }
});
