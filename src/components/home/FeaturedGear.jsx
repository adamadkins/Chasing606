import { useMemo, useState } from 'react';
import useCatalog from '../../hooks/useCatalog';
import { allCategories, DEFAULT_QUERY, queryProducts } from '../../lib/catalog';
import { Link } from '../../lib/router';
import Icon from '../ui/Icon';
import { CategoryTabs } from '../shop';
import CatalogResults from '../shop/CatalogResults';
import '../shop/shop.css';

const FEATURED_COUNT = 4;

/** Homepage teaser for the shop: a few products, with a link to all of them. */
export default function FeaturedGear() {
  const { products } = useCatalog();
  const [category, setCategory] = useState('');

  const visible = useMemo(
    () => queryProducts(products, { ...DEFAULT_QUERY, category }).slice(0, FEATURED_COUNT),
    [products, category]
  );

  return (
    <section className="shop shop--home topo" data-reveal aria-labelledby="shop-title">
      <div className="section-heading">
        <p className="eyebrow">Chasing 606 gear</p>
        <h2 id="shop-title">The 606 collection.</h2>
        <p>Shirts, hats, and other Chasing 606 gear.<br />Good for the woods or wherever the day takes you.</p>
      </div>
      <CategoryTabs categories={allCategories(products)} value={category} onChange={setCategory} count={visible.length} />
      <CatalogResults products={visible} onClearFilters={() => setCategory('')} />
      <div className="shop__more">
        <Link href="/merch" className="btn btn--dark">VIEW ALL MERCH <Icon /></Link>
      </div>
    </section>
  );
}
