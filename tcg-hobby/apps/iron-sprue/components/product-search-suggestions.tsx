'use client';

import { useMemo, useState } from 'react';
import { filterIronSprueProducts, type IronSprueProduct } from '../lib/catalogue';
import { ironSprueDisplayMediaUrl } from '../lib/responsive-media';
import { formatPrice, productImage } from '../lib/storefront';

type ProductSearchSuggestionsProps = {
  products: IronSprueProduct[];
};

export function ProductSearchSuggestions({ products }: ProductSearchSuggestionsProps) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const searchResults = useMemo(() => {
    if (trimmedQuery.length < 2) return [];
    return filterIronSprueProducts(products, { search: trimmedQuery });
  }, [products, trimmedQuery]);
  const matches = searchResults.slice(0, 6);

  const showPanel = trimmedQuery.length >= 2;
  const searchHref = `/shop?search=${encodeURIComponent(trimmedQuery)}`;

  return (
    <form className="site-search" action="/shop" role="search">
      <label htmlFor="site-search">Search Iron Sprue</label>
      <div className="site-search-input-row">
        <input
          id="site-search"
          name="search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search kits, brands, tools..."
        />
        <button type="submit">Search</button>
      </div>
      {showPanel ? (
        <div className="site-search-results" role="listbox" aria-label="Suggested products">
          {matches.length ? (
            <>
              {matches.map((product) => {
                const imageUrl = productImage(product);
                return (
                  <a className="site-search-result" href={`/products/${product.slug}`} key={product.sku} role="option">
                    <span className="site-search-result-image">
                      {imageUrl ? (
                        <img
                          src={ironSprueDisplayMediaUrl(imageUrl, 320)}
                          alt=""
                          width="64"
                          height="64"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </span>
                    <span className="site-search-result-copy">
                      <span>{product.name}</span>
                      <small>{product.brand} / {product.category}</small>
                    </span>
                    <strong>{formatPrice(product)}</strong>
                  </a>
                );
              })}
              <a className="site-search-all" href={searchHref}>See all results ({searchResults.length})</a>
            </>
          ) : (
            <div className="site-search-empty">No matching products found.</div>
          )}
        </div>
      ) : null}
    </form>
  );
}
