'use client';

import React from 'react';

type CatalogueSortSelectProps = {
  defaultValue: string;
};

export function CatalogueSortSelect({ defaultValue }: CatalogueSortSelectProps) {
  return (
    <select
      aria-label="Sort products"
      name="sort"
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="featured">Featured</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="newest">Newest</option>
    </select>
  );
}
