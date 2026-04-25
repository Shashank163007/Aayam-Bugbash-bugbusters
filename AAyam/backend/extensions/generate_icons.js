const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG as a base, we can just use a tiny valid PNG.
// Actually, let's just use a base64 encoded simple shield or square.
const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}

const buffer = Buffer.from(tinyPngBase64, 'base64');

fs.writeFileSync(path.join(iconDir, 'icon16.png'), buffer);
fs.writeFileSync(path.join(iconDir, 'icon48.png'), buffer);
fs.writeFileSync(path.join(iconDir, 'icon128.png'), buffer);

console.log("Icons generated successfully.");