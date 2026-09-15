# Approved Workshop Image Quality Audit

Generated: 2026-09-14T22:54:50.538Z

Scope: live storefront PDP gallery images from the Railway catalogue API. Workshop images are the currently displayed approved `/workshop/` media rows.

## Summary

- Catalogue products checked: 59
- Products with live workshop image: 47
- Workshop image pixel range: 1571840 to 1573564
- Workshop file-size range: 90 KB to 2.58 MB
- Contact sheet: C:\Users\Shameer\Documents\Codex\2026-07-02\you-are-the-lead-software-engineer\tcg-hobby\apps\iron-sprue\reports\approved-workshop-image-quality-contact-sheet-2026-09-14.jpg

## Flag Counts

| Flag | Count |
| --- | ---: |
| ok | 43 |
| small-file | 4 |
| much-smaller-file-than-gallery-peers | 2 |

## Visual Appearance Notes

All 47 live workshop images use a broadly consistent large canvas of roughly 1.57 MP, so the issue is not the exported canvas size. The visible concern is composition: several workshop images place the product very small against a large dark bench/workshop background, which makes them look smaller than Image 2 and manufacturer gallery peers even when the source dimensions are technically adequate.

Priority visual review queue:

| SKU | Product | Reason |
| --- | --- | --- |
| IS-AOS-05627 | Toyota 2000GT White | Very small/mostly dark composition and technically tiny 90 KB file. |
| IS-AOS-06459 | Toyota GR86 Spark Red | Product sits as a narrow strip in a large black frame; likely perceived as smaller than peers. |
| IS-AOS-06460 | Toyota GR86 White Pearl | Product sits as a narrow strip in a large black frame; likely perceived as smaller than peers. |
| IS-CUB-C108H | Thomas Jefferson Memorial | Subject is very low/small in frame with heavy empty dark space above. |
| IS-CUB-C114H | St Patrick's Cathedral | Very small/mostly dark composition and technically tiny 118 KB file. |
| IS-CUB-C119H | Two Masted Schooner | Subject is small within the frame compared with adjacent workshop images. |
| IS-CUB-MC092H | St Peter's Basilica | Small/dark composition and technically light 209 KB file. |
| IS-CUB-MC093H | St Basil's Cathedral | Subject is tiny in a large dark scene despite passing the file-size threshold. |
| IS-CUB-T4008H | Santa Maria | Very small/mostly dark composition and technically light 192 KB file. |

Recommended remediation: regenerate or crop/recompose the priority queue so the product occupies a similar visual footprint to the stronger workshop images, while retaining the same workshop background direction. Keep the current 1.5 MP+ output target or move to a standard 1600px-class export so gallery and PDP zoom behaviour stays consistent.

## Workshop Regeneration Scope Notes

- All approved workshop images should be normalised in the regeneration pass so the product/subject occupies a consistent visual footprint across desktop cards, PDP gallery, and mobile views.
- The desktop card inconsistency is amplified by source crops with different subject scales. Product cards should preserve the whole image without clipping, but the assets still need consistent composition.
- `IS-CUB-C007H` / Era of Navigation is a four-ship set. Its replacement Image 2 and workshop image must show the complete set of four ships rather than a single ship.
- Do not replace Image 2 with a manufacturer image. If the available Image 2 is unsuitable, create a replacement Image 2 that represents the product correctly.

## Product Review Sheet

| SKU | Product | Brand | Workshop | Workshop file | Image 2 peer | Manufacturer peer | Flags |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| IS-AOS-05603 | Pagani Zonda F | Aoshima | 1586x992 | 1.98 MB | 1586x992 / 1.34 MB | 1100x1100 / 122 KB | ok |
| IS-AOS-05627 | Toyota 2000GT White | Aoshima | 1586x992 | 90 KB | 1586x992 / 426 KB | 1100x1100 / 167 KB | small-file, much-smaller-file-than-gallery-peers |
| IS-AOS-05628 | Toyota 2000GT Red | Aoshima | 1586x992 | 705 KB | 1254x1254 / 327 KB | 1100x1100 / 174 KB | ok |
| IS-AOS-05629 | Toyota 2000GT Silver | Aoshima | 1586x992 | 360 KB | 1586x992 / 274 KB | 1100x1100 / 171 KB | ok |
| IS-AOS-05778 | Suzuki Jimny Blue | Aoshima | 1562x1007 | 676 KB | 1731x909 / 418 KB | 1100x1100 / 182 KB | ok |
| IS-AOS-06259 | Nissan Fairlady Z Blue | Aoshima | 1586x992 | 1.94 MB | 1586x992 / 1.17 MB | 1100x1100 / 176 KB | ok |
| IS-AOS-06290 | Honda Motocompo | Aoshima | 1733x908 | 1.79 MB | 1731x909 / 1.07 MB | 1100x1100 / 663 KB | ok |
| IS-AOS-06345 | Lamborghini Aventador White | Aoshima | 1586x992 | 1.84 MB | 1586x992 / 1.12 MB | 1100x1100 / 156 KB | ok |
| IS-AOS-06347 | Lamborghini Aventador Red | Aoshima | 1586x992 | 1.86 MB | 1729x910 / 1.29 MB | 1100x1100 / 160 KB | ok |
| IS-AOS-06349 | Lamborghini Aventador Blue | Aoshima | 1535x1025 | 1.88 MB | 1729x910 / 1.34 MB | 1100x1100 / 164 KB | ok |
| IS-AOS-06357 | Skyline GTR Red Pearl | Aoshima | 1586x992 | 1.96 MB | 1586x992 / 1.19 MB | 1100x1100 / 169 KB | ok |
| IS-AOS-06437 | Back to the Future Part II | Aoshima | 1535x1025 | 2.08 MB | 1731x909 / 1.39 MB | 1100x1100 / 186 KB | ok |
| IS-AOS-06438 | Back to the Future Part III | Aoshima | 1536x1024 | 2.25 MB | 1729x910 / 1.32 MB | 1100x1100 / 173 KB | ok |
| IS-AOS-06459 | Toyota GR86 Spark Red | Aoshima | 1586x992 | 314 KB | 1728x910 / 348 KB | 1100x1100 / 161 KB | ok |
| IS-AOS-06460 | Toyota GR86 White Pearl | Aoshima | 1535x1025 | 610 KB | 1728x910 / 237 KB | 1100x1100 / 157 KB | ok |
| IS-AOS-06474 | Nissan S30 Fairlady Z Red Custom Wheels | Aoshima | 1725x912 | 1.91 MB | 1727x910 / 1.34 MB | 1100x1100 / 187 KB | ok |
| IS-AOS-06477 | Nissan S30 Fairlady Z Brown Custom Wheels | Aoshima | 1648x954 | 1.87 MB | 1647x955 / 1.38 MB | 1100x1100 / 187 KB | ok |
| IS-AOS-06539 | Lamborghini Countach LPI 800-4 White | Aoshima | 1535x1025 | 1.78 MB | 1500x1049 / 1.14 MB | 1100x1100 / 143 KB | ok |
| IS-AOS-06540 | Lamborghini Countach LPI 800-4 Red | Aoshima | 1535x1025 | 1.86 MB | 1727x911 / 1.30 MB | 1100x1100 / 148 KB | ok |
| IS-CUB-C007H | Era of Navigation | CubicFun | 1586x992 | 1.99 MB | 1586x992 / 1.15 MB | 1100x1100 / 231 KB | ok |
| IS-CUB-C108H | Thomas Jefferson Memorial | CubicFun | 1586x992 | 496 KB | 1448x1086 / 238 KB | 1100x1100 / 168 KB | ok |
| IS-CUB-C112H | Basilica of the National Shrine | CubicFun | 1586x992 | 2.08 MB | 1448x1086 / 1.38 MB | 1100x1100 / 246 KB | ok |
| IS-CUB-C114H | St Patrick's Cathedral | CubicFun | 1615x974 | 118 KB | 1731x909 / 269 KB | 1100x1100 / 209 KB | small-file, much-smaller-file-than-gallery-peers |
| IS-CUB-C119H | Two Masted Schooner | CubicFun | 1535x1024 | 298 KB | 1508x1043 / 336 KB | 1100x1100 / 153 KB | ok |
| IS-CUB-C712H | Brandenburg Gate | CubicFun | 1470x1070 | 2.03 MB | 1375x1144 / 1.57 MB | 1100x1100 / 112 KB | ok |
| IS-CUB-MC092H | St Peter's Basilica | CubicFun | 1635x962 | 209 KB | 1730x909 / 306 KB | 1100x1100 / 192 KB | small-file |
| IS-CUB-MC093H | St Basil's Cathedral | CubicFun | 1586x992 | 258 KB | 1254x1254 / 224 KB | 1100x1100 / 164 KB | ok |
| IS-CUB-MC106H | Queen Anne's Revenge | CubicFun | 1403x1121 | 1.87 MB | 1353x1162 / 266 KB | 1100x1100 / 238 KB | ok |
| IS-CUB-MC133H | Burj Khalifa | CubicFun | 1536x1024 | 2.10 MB | 1100x1100 / 31 KB | 1100x1100 / 151 KB | ok |
| IS-CUB-MC139H | Chateau de Chenonceau | CubicFun | 1635x962 | 2.21 MB | 1731x909 / 1.63 MB | 1100x1100 / 182 KB | ok |
| IS-CUB-OM3603 | Magic Box  Underwater World | CubicFun | 1535x1025 | 1.95 MB | 1731x909 / 1.56 MB | 1100x1100 / 224 KB | ok |
| IS-CUB-OM3606 | Magic Box  London at Night | CubicFun | 1586x992 | 2.26 MB | 1448x1086 / 2.08 MB | 1100x1100 / 210 KB | ok |
| IS-CUB-T4008H | Santa Maria | CubicFun | 1537x1023 | 192 KB | 1334x1179 / 266 KB | 1100x1100 / 221 KB | small-file |
| IS-PIN-K1001 | Jigsaw Flowerpot - Red Carpet of Life | Pintoo | 1586x992 | 2.02 MB | 1254x1254 / 1.29 MB | 1100x1100 / 178 KB | ok |
| IS-PIN-K1002 | Jigsaw Flowerpot - Slow Down | Pintoo | 1586x992 | 1.96 MB | 1254x1254 / 1.24 MB | 1100x1100 / 180 KB | ok |
| IS-PIN-K1006 | Jigsaw Flowerpot - Singing Birds & Flowers | Pintoo | 1586x992 | 1.72 MB | 1026x992 / 460 KB | 1100x1100 / 138 KB | ok |
| IS-PIN-KC1005 | Jigsaw Clock - Classic Rose | Pintoo | 1586x992 | 2.12 MB | 1254x1254 / 1.74 MB | 1100x1100 / 759 KB | ok |
| IS-PIN-KC1007 | Jigsaw Clock - Into the Woods | Pintoo | 1586x992 | 2.06 MB | 985x992 / 1.18 MB | 1100x1100 / 820 KB | ok |
| IS-PIN-KC1046 | Jigsaw Clock - Singing Birds and Fragrant Flowers | Pintoo | 1586x992 | 2.00 MB | 1254x1254 / 1.73 MB | 1100x1100 / 173 KB | ok |
| IS-PIN-Q1035 | Jigsaw Screen - Famous Architectures | Pintoo | 1543x1019 | 2.58 MB | 1732x908 / 2.65 MB | 1100x1100 / 229 KB | ok |
| IS-PIN-Q1037 | Jigsaw Lantern - Famous Architecture | Pintoo | 1586x992 | 1.99 MB | 1730x909 / 1.22 MB | 1100x1100 / 139 KB | ok |
| IS-PIN-Q1038 | Jigsaw Lantern - Floral | Pintoo | 1586x992 | 2.28 MB | 1254x1254 / 1.96 MB | 1100x1100 / 195 KB | ok |
| IS-PIN-Q1040 | Jigsaw Lantern - Derjen Dancing Girls | Pintoo | 1586x992 | 2.03 MB | 1254x1254 / 1.54 MB | 1100x1100 / 144 KB | ok |
| IS-PIN-Q1061 | Jigsaw Screen - Le Papillon et la Fleur | Pintoo | 1635x962 | 2.44 MB | 1731x908 / 1.85 MB | 1100x1100 / 202 KB | ok |
| IS-PIN-S1009 | 3D Jigsaw Vase - Children | Pintoo | 1586x992 | 1.95 MB | 1086x1448 / 1.22 MB | 1100x1100 / 100 KB | ok |
| IS-PIN-S1024 | 3D Jigsaw Vase - Koi Carp and Lotus | Pintoo | 1536x1024 | 1.97 MB | 1254x1254 / 1.22 MB | 1100x1100 / 137 KB | ok |
| IS-PIN-S1025 | 3D Jigsaw Vase - Magpies on a Plum Tree | Pintoo | 1536x1024 | 2.05 MB | 1100x1100 / 82 KB | 1100x1100 / 158 KB | ok |
