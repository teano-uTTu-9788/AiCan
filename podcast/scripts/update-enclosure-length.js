const fs = require('fs');
const path = require('path');

// Usage: node update-enclosure-length.js /path/to/audio/file
const audioPath = process.argv[2];
if (!audioPath) {
  console.error('Usage: node update-enclosure-length.js <path_to_audio_file>');
  process.exit(1);
}
// Determine file size in bytes
const size = fs.statSync(audioPath).size;

// Determine episodes directory relative to scripts folder
const episodesDir = path.join(__dirname, '..', 'episodes');
const episodeFiles = fs.readdirSync(episodesDir).filter(f => f.endsWith('.json'));
const audioFilename = path.basename(audioPath);

let updated = false;
episodeFiles.forEach(file => {
  const filePath = path.join(episodesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data.enclosure && data.enclosure.url && data.enclosure.url.includes(audioFilename)) {
    data.enclosure.length = String(size);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${file}: set enclosure.length = ${size}`);
    updated = true;
  }
});

if (!updated) {
  console.log('No episode JSON files were updated.');
}
