import fs from 'fs';
import path from 'path';

async function downloadIcon() {
  const url = 'https://cdn-icons-png.flaticon.com/512/1177/1177577.png';
  const targetDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const destPath = path.join(targetDir, 'icon-raw.png');

  console.log(`Downloading original icon from ${url}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destPath, buffer);
    console.log(`Successfully downloaded original icon to ${destPath}`);
  } catch (error) {
    console.error('Error downloading icon:', error);
  }
}

downloadIcon();
