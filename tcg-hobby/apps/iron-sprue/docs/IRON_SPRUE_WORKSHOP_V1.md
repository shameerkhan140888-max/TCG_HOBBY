# Iron Sprue Workshop Image Recipe

- version: `IRON_SPRUE_WORKSHOP_V2`
- status: approved operating recipe for all future workshop image generation
- generation mode: individual product generation only
- bulk/composite generation: rejected

This is the single source of truth for Iron Sprue product workshop images.
Any older landscape, Foamex, playmat, flat-composite, or batch-generation guidance is superseded by this document.

## Required Source

- Start from the product's approved Image 2 or clean product-on-white master.
- Use exactly one product reference per generation.
- Do not use raw packaging, catalogue cards, screenshots, labels, supplier artwork, or manufacturer lifestyle scenes as the product subject.
- If the clean product reference is missing, incorrect, low quality, or identity is uncertain, stop and repair Image 2 before generating a workshop image.

## Generation Rule

Generate workshop images one product at a time.

Do not bulk-generate multiple products in one prompt, contact sheet, composite script, or shared scene. Bulk generation has already produced inconsistent scale, incorrect product shapes, wide shots, and mismatched outputs. Each SKU needs its own prompt, visual review, and selected output.

## Visual Recipe

- Format: square 1:1 product-gallery image.
- Setting: dark Iron Sprue-style modelling workbench.
- Surface: black cutting mat or dark modelling mat with a subtle grid.
- Background: softly blurred pegboard, modelling tools, brushes, paints, clamps, or sprues.
- Product: the exact referenced item, large and centred as the clear subject.
- Framing: product fills the gallery frame neatly without becoming cropped.
- Lighting: crisp premium workshop/studio lighting with realistic shadows and reflections.
- Colour: accurate product colour and markings; dark graphite/black bench context; restrained warm highlights.
- Branding/text: no added text, watermarks, labels, logos, packaging, or promotional marks.

The image should feel like a finished product photographed on the Iron Sprue bench, not a product pasted onto a mat and not a wide environmental shot.

## Framing Rules

For every subject:

- The whole product must be visible.
- Leave a small, even margin around the product.
- Avoid large empty bench space.
- Keep the product materially larger than the old wide workshop images.
- Reject any output where the gallery subject feels smaller than the manufacturer/Image 2 subject.

For vehicles:

- Preserve true vehicle proportions from the reference.
- Do not squash, compress, stretch, shorten, widen, or distort the car.
- Full front bumper, rear bumper, roof, wheels, and rear quarter must remain visible.
- Reject cropped bumpers, cropped wheels, over-tight front corners, or fisheye/exaggerated perspective.

For ships, buildings, lanterns, clocks, screens, globes, vases, and flowerpots:

- Preserve the product shape, pattern, architecture, sails, silhouette, and visible details from the clean reference.
- Use the same square workshop treatment, but allow the product's natural footprint to decide the camera distance.
- Tall/narrow products should have breathing room above and below without appearing tiny.
- Sets must show the complete set when the product is sold as a set.

## Prompt Template

Use this as the starting prompt and adapt only the product-specific subject details.

```text
Use case: product-mockup
Asset type: Iron Sprue product gallery workshop image, square 1:1.
Input image: reference for the exact <product name> product, including shape, proportions, colours, markings, pattern, and key details.
Primary request: Create a high-quality workshop product image of this exact <product name> on a dark modelling workbench.
Scene/backdrop: dark Iron Sprue-style model-making bench, black cutting mat surface with subtle grid, softly blurred pegboard/tools in the background, premium hobby photography.
Subject: the exact <product name> from the reference, full product visible.
Composition/framing: square image; camera pulled back enough that the whole product is clearly inside the frame with a small even margin on all sides; product large and centred; no wide empty bench.
Critical accuracy constraints: preserve the original product proportions, silhouette, colours, markings, and visible details from the reference. Do not squash, stretch, crop, redesign, or simplify the product.
Lighting/mood: crisp studio/workshop lighting, realistic contact shadows, sharp product detail.
Avoid: text, logos, packaging, watermark, labels, white card, pasted cutout look, flat composite, wide environmental shot, cropped subject, distorted proportions.
```

Vehicle prompts must add:

```text
Full front bumper, front wheel, roof, rear wheel, and rear bumper must be visible. Preserve the wheelbase, nose length, cabin shape, rear quarter and roofline from the reference.
```

Set prompts must add:

```text
Show the complete set exactly as sold; do not reduce it to a single item.
```

## Acceptance Checklist

Before upload or assignment:

- Product identity matches the source.
- Shape, scale, colour, markings, and key details are faithful.
- The subject is not squashed, stretched, cropped, or redesigned.
- The product is large enough for PDP gallery and card use.
- The product sits naturally in the workshop scene.
- No packaging, labels, white source card, watermark, or generated text appears.
- The image is square and suitable for the gallery grid.
- The output was generated individually, not as part of a bulk scene.

Reject and regenerate if any checklist item fails.

## Storage And Review

- Store accepted workshop masters under the product workshop prefix.
- Archive or pause previous workshop images rather than deleting them immediately.
- Record rejected generated outputs in the local work manifest only; do not upload rejected outputs.
- Do not publish a replacement until it has been visually checked against the reference and the existing gallery treatment.
