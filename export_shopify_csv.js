// Export PastForward catalogue.json into Shopify Product CSV
const fs = require('fs');
const path = require('path');

const cat = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogue.json'), 'utf8'));

// Shopify Standard Product CSV Columns
const headers = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Status'
];

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const rows = [headers.join(',')];

// 1. Add the Single "Custom Design Piece" Product with 5 Variants
const customHandle = 'custom-album-artwork';
const customVariants = [
  { name: 'Vinyl (12-inch upcycled record)', price: 999, sku: 'PF-CUSTOM-VINYL' },
  { name: 'A3 Poster (297 × 420mm)', price: 299, sku: 'PF-CUSTOM-POSTER-A3' },
  { name: '10×10 Format (254 × 254mm)', price: 249, sku: 'PF-CUSTOM-PRINT-10' },
  { name: 'A5 Poster (148 × 210mm)', price: 199, sku: 'PF-CUSTOM-POSTER-A5' },
  { name: 'Polaroid Card', price: 99, sku: 'PF-CUSTOM-POLAROID' }
];

customVariants.forEach((v, idx) => {
  const row = [
    customHandle,
    idx === 0 ? 'Custom Album Artwork — Made to Order' : '',
    idx === 0 ? '<p>Custom album artwork made to order. Printed, inspected, and shipped by PastForward.</p>' : '',
    'PastForward',
    'Home & Garden > Decor > Artwork',
    'Custom Art',
    'custom, made-to-order',
    'TRUE',
    'Format',
    v.name,
    v.sku,
    '300',
    'shopify',
    'continue',
    'manual',
    v.price,
    '',
    'TRUE',
    'TRUE',
    '',
    '',
    '',
    'active'
  ];
  rows.push(row.map(escapeCSV).join(','));
});

// 2. Add all 67 Catalogue Products with their 130 Variants
for (const p of cat.products) {
  const title = `${p.album} — ${p.artist}`;
  const desc = `<p>Original artwork for ${p.album} by ${p.artist}. Designed from memory, made for now by PastForward.</p>`;
  const tags = p.tags.join(', ');

  p.variants.forEach((v, vIdx) => {
    const row = [
      p.slug,
      vIdx === 0 ? title : '',
      vIdx === 0 ? desc : '',
      'PastForward',
      'Home & Garden > Decor > Artwork',
      'Art Prints',
      tags,
      'TRUE',
      'Format',
      v.label,
      v.sku || `${p.slug}-${v.format}`.toUpperCase(),
      v.format === 'vinyl' ? '450' : '150',
      'shopify',
      'continue',
      'manual',
      v.price,
      v.format === 'vinyl' ? '1299' : '',
      'TRUE',
      'TRUE',
      v.image ? `https://pastforward.shop/img/${encodeURIComponent(v.image)}` : '',
      vIdx + 1,
      v.alt || `${p.album} by ${p.artist}`,
      'active'
    ];
    rows.push(row.map(escapeCSV).join(','));
  });
}

const outputPath = path.join(__dirname, 'shopify_products.csv');
fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
console.log(`✓ Successfully exported ${rows.length - 1} variant rows to ${outputPath}!`);
