// sync_variants.js
// Reads Shopify's exported products CSV and syncs into shopify_variants.json and src/variants_map.json
const fs = require('fs');
const path = require('path');

const csvFile = process.argv[2] || path.join(__dirname, 'products_export.csv');

if (!fs.existsSync(csvFile)) {
  console.log(`
PastForward Shopify Variant Sync Tool
======================================
Usage:
  node sync_variants.js [path/to/products_export.csv]

Steps:
  1. In Shopify Admin -> Products -> Click 'Export' (top right).
  2. Choose 'All products' (or 'Selected products') and 'CSV for Excel, Numbers, or other spreadsheet programs'.
  3. Save the downloaded CSV as 'products_export.csv' in this PastForward folder (or pass file path).
  4. Run: node sync_variants.js
  5. Run: python3 build.py
`);
  process.exit(1);
}

const content = fs.readFileSync(csvFile, 'utf8');
const lines = content.split(/\r?\n/);
if (lines.length < 2) {
  console.error('Error: CSV file is empty.');
  process.exit(1);
}

// Parse CSV header
function parseCSVLine(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;
  for (let c = 0; c < line.length; c++) {
    const ch = line[c];
    if (ch === '"') {
      if (inQuotes && line[c + 1] === '"') {
        current += '"';
        c++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      cols.push(current);
    }
  }
  cols.push(current.trim());
  return cols;
}

const headers = parseCSVLine(lines[0]);
const skuIdx = headers.indexOf('Variant SKU');
const idIdx = headers.indexOf('Variant ID');
const handleIdx = headers.indexOf('Handle');
const optValIdx = headers.indexOf('Option1 Value');

if (skuIdx === -1 || idIdx === -1) {
  console.error('Error: CSV must contain "Variant SKU" and "Variant ID" columns.');
  process.exit(1);
}

// Load existing variants if available to merge
const rootJsonPath = path.join(__dirname, 'shopify_variants.json');
let map = {};
if (fs.existsSync(rootJsonPath)) {
  try {
    map = JSON.parse(fs.readFileSync(rootJsonPath, 'utf8'));
  } catch (e) {
    map = {};
  }
}

let matched = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCSVLine(line);

  const sku = (cols[skuIdx] || '').trim();
  const rawId = (cols[idIdx] || '').trim();
  // Strip any URL prefix if present e.g. gid://shopify/ProductVariant/12345
  const idNumMatch = rawId.match(/\d+$/);
  const id = idNumMatch ? Number(idNumMatch[0]) : rawId;
  const handle = (cols[handleIdx] || '').trim();
  const optVal = (cols[optValIdx] || '').trim();

  if (sku && id) {
    map[sku] = id;
    matched++;
  }

  // Also map custom options if handle matches custom or custom-album-artwork
  if ((handle.includes('custom') || sku.startsWith('PF-CUSTOM-')) && id) {
    if (optVal.includes('Vinyl') || sku === 'PF-CUSTOM-VINYL') map['PF-CUSTOM-VINYL'] = id;
    else if (optVal.includes('A3') || sku === 'PF-CUSTOM-POSTER-A3') map['PF-CUSTOM-POSTER-A3'] = id;
    else if (optVal.includes('10×10') || optVal.includes('10x10') || sku === 'PF-CUSTOM-PRINT-10') map['PF-CUSTOM-PRINT-10'] = id;
    else if (optVal.includes('A5') || sku === 'PF-CUSTOM-POSTER-A5') map['PF-CUSTOM-POSTER-A5'] = id;
    else if (optVal.includes('Polaroid') || sku === 'PF-CUSTOM-POLAROID') map['PF-CUSTOM-POLAROID'] = id;
  }
}

fs.writeFileSync(rootJsonPath, JSON.stringify(map, null, 2), 'utf8');

const srcPath = path.join(__dirname, 'src', 'variants_map.json');
fs.writeFileSync(srcPath, JSON.stringify(map, null, 2), 'utf8');

console.log(`✓ Successfully synced ${matched} variants into shopify_variants.json (total mapped: ${Object.keys(map).length})!`);
console.log(`Next step: Run 'python3 build.py' to compile into docs/index.html.`);
