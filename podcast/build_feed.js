const fs = require('fs');
const path = require('path');

const podcastDir = __dirname;
function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Load config
const configPath = path.join(podcastDir, 'config.json');
const config = loadJSON(configPath);

// Load episodes
const episodesDir = path.join(podcastDir, 'episodes');
let episodeFiles = [];
try {
  episodeFiles = fs.readdirSync(episodesDir).filter(f => f.endsWith('.json'));
} catch (e) {
  console.error('No episodes directory found:', episodesDir);
}
const episodes = episodeFiles.map(file => loadJSON(path.join(episodesDir, file)));

// Build RSS feed
let xml = '';
xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" ';
xml += 'xmlns:podcast="https://podcastindex.org/namespace/1.0">\n';
xml += '  <channel>\n';
xml += `    <title>${config.title}</title>\n`;
xml += `    <link>${config.link}</link>\n`;
xml += `    <language>${config.language}</language>\n`;
xml += `    <itunes:author>${config.author}</itunes:author>\n`;
// categories
if (Array.isArray(config.categories) && config.categories.length > 0) {
  xml += `    <itunes:category text="${config.categories[0]}">\n`;
  for (let i = 1; i < config.categories.length; i++) {
    xml += `      <itunes:category text="${config.categories[i]}"/>\n`;
  }
  xml += '    </itunes:category>\n';
}
xml += `    <description>${config.description}</description>\n`;
xml += `    <itunes:image href="${config.image}"/>\n`;
xml += `    <itunes:explicit>${config.explicit}</itunes:explicit>\n`;

// Add episodes
episodes.forEach(ep => {
  xml += '    <item>\n';
  xml += `      <title>${ep.title}</title>\n`;
  xml += `      <guid isPermaLink="false">${ep.guid}</guid>\n`;
  xml += `      <pubDate>${ep.pubDate}</pubDate>\n`;
  if (ep.enclosure) {
    xml += `      <enclosure url="${ep.enclosure.url}" length="${ep.enclosure.length}" type="${ep.enclosure.type}"/>\n`;
  }
  if (ep.duration) {
    xml += `      <itunes:duration>${ep.duration}</itunes:duration>\n`;
  }
  if (ep.description) {
    xml += '      <description><![CDATA[' + ep.description + ']]></description>\n';
  }
  if (ep.transcripts && Array.isArray(ep.transcripts)) {
    ep.transcripts.forEach(t => {
      xml += `      <podcast:transcript url="${t.url}" type="${t.type}" language="${t.language}"/>\n`;
    });
  }
  xml += '    </item>\n';
});

xml += '  </channel>\n';
xml += '</rss>\n';

// Ensure feed directory exists
const feedDir = path.join(podcastDir, 'feed');
if (!fs.existsSync(feedDir)) {
  fs.mkdirSync(feedDir);
}
const outputPath = path.join(feedDir, 'feed.xml');
fs.writeFileSync(outputPath, xml);
console.log(`Feed generated at ${outputPath}`);
