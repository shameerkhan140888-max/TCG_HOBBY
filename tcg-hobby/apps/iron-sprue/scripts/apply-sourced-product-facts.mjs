import fs from 'node:fs';

const files = [
  'apps/iron-sprue/data/launch-products.json',
  'apps/iron-sprue/data/final-launch-catalogue-manifest.json',
];

const pieceFacts = new Map(Object.entries({
  'IS-PIN-S1009': 160,
  'IS-PIN-S1024': 160,
  'IS-PIN-S1025': 160,
  'IS-PIN-KC1005': 145,
  'IS-PIN-KC1007': 145,
  'IS-PIN-KC1046': 145,
  'IS-PIN-K1001': 80,
  'IS-PIN-K1002': 80,
  'IS-PIN-K1006': 80,
  'IS-PIN-Q1037': 192,
  'IS-PIN-Q1038': 192,
  'IS-PIN-Q1040': 192,
  'IS-PIN-BLUEMARBLE': 240,
  'IS-PIN-Q1035': 462,
  'IS-PIN-Q1061': 462,
  'IS-CUB-C007H': 70,
  'IS-CUB-T4008H': 113,
  'IS-CUB-MC106H': 155,
  'IS-CUB-C119H': 81,
  'IS-CUB-MC133H': 136,
  'IS-CUB-C712H': 31,
  'IS-CUB-MC092H': 144,
  'IS-CUB-MC093H': 173,
  'IS-CUB-MC139H': 116,
  'IS-CUB-C108H': 35,
  'IS-CUB-C114H': 72,
  'IS-CUB-C112H': 44,
  'IS-CUB-OM3603': 28,
}));

const unresolved = ['IS-CUB-OM3606'];
const sizeFacts = new Map(Object.entries({
  'IS-CUB-OM3603': '16cm x 16cm x 26cm',
  'IS-CUB-OM3606': '16cm x 16cm x 26cm',
}));

for (const file of files) {
  const document = JSON.parse(fs.readFileSync(file, 'utf8'));
  const products = Array.isArray(document) ? document : document.products;
  if (!Array.isArray(products)) throw new Error(`No products array in ${file}`);

  let changed = 0;
  for (const product of products) {
    const pieces = pieceFacts.get(product.sku);
    const size = sizeFacts.get(product.sku);
    if (!pieces && !size) continue;

    product.specifications = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
      ? product.specifications
      : {};

    if (String(product.specifications.pieces ?? '') !== String(pieces)) {
      product.specifications.pieces = String(pieces);
      changed += 1;
    }

    if (size && String(product.specifications.size ?? '') !== size) {
      product.specifications.size = size;
      changed += 1;
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
  console.log(`${file}: updated ${changed} product facts`);
}

console.log(`Left without a sourced piece count: ${unresolved.join(', ')}`);
