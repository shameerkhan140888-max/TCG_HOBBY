'use client';

import { useMemo, useState } from 'react';
import type { IronSprueSearchSuggestionProduct } from '../lib/admin-storefront-controls';
import { ironSprueDisplayMediaUrl } from '../lib/responsive-media';

type ProductSearchSuggestionsProps = {
  products: IronSprueSearchSuggestionProduct[];
};

export function ProductSearchSuggestions({ products }: ProductSearchSuggestionsProps) {
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim();

  const searchResults = useMemo(() => {
    if (trimmedQuery.length < 2) return [];
    const terms = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((product) => terms.every((term) => product.searchText.includes(term)));
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
                const imageUrl = product.imageUrl;
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
                    <strong>£{(product.priceMinor / 100).toFixed(2)}</strong>
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
