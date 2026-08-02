import productMerchandising from '../content/product-merchandising.generated.json';

export type ProductContents = {
  items: string[];
  notice?: string;
  supportImageAlt?: string;
};

type GeneratedProductMerchandising = Record<
  string,
  {
    contents?: string[];
    variationNotice?: string;
  }
>;

const generatedProductMerchandising = productMerchandising as GeneratedProductMerchandising;

export function getProductContents(slug: string): ProductContents | null {
  const productContents = generatedProductMerchandising[slug];

  if (!productContents?.contents || productContents.contents.length === 0) {
    return null;
  }

  return {
    items: productContents.contents,
    ...(productContents.variationNotice ? { notice: productContents.variationNotice } : {}),
  };
}
