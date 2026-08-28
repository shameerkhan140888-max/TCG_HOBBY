const promoPanels = [
  {
    eyebrow: 'Tool essentials bundle',
    title: 'Save 15%',
    copy: 'Cut, trim, sand and finish with a compact starter bench set.',
    cta: 'View bundle',
    image: '/assets/promo-tools.png',
  },
  {
    eyebrow: 'CubicFun display builds',
    title: 'From £16.99',
    copy: 'Landmarks and shelf-ready 3D builds with real presence.',
    cta: 'Shop now',
    image: '/assets/promo-cubicfun-landmark-workshop.png',
  },
  {
    eyebrow: 'Pintoo puzzle objects',
    title: 'Built to display',
    copy: 'Puzzle builds with decorative finished forms.',
    cta: 'Explore',
    image: '/assets/promo-pintoo-vase-workshop.png',
  },
];

const variants = [
  {
    id: 'current',
    name: 'Current Condensed',
    note: 'Keeps the punch, but is best reserved for hero moments.',
  },
  {
    id: 'technical',
    name: 'Technical Plate',
    note: 'More engineered and controlled, with less poster weight.',
  },
  {
    id: 'workshop',
    name: 'Workshop Grotesk',
    note: 'Retail-focused, strong, and easier to use across more UI.',
  },
  {
    id: 'precision',
    name: 'Precision Sans',
    note: 'Premium and quieter, letting product photography lead.',
  },
];

export default function TypographyShowcasePage() {
  return (
    <main className="typography-showcase homepage-board">
      <header className="typography-showcase-header">
        <p className="eyebrow">Iron Sprue prototype</p>
        <h1>Typography Directions</h1>
        <p>Same promo content, same board system, different type voices.</p>
      </header>

      {variants.map((variant) => (
        <section className={`typography-sample typography-sample-${variant.id}`} key={variant.id}>
          <div className="typography-sample-head">
            <div>
              <p className="eyebrow">{variant.name}</p>
              <h2>Homepage promo cards</h2>
            </div>
            <p>{variant.note}</p>
          </div>
          <div className="promo-grid">
            {promoPanels.map((panel) => (
              <article className="promo-card" key={`${variant.id}-${panel.title}`}>
                <img src={panel.image} alt="" width="900" height="600" />
                <div>
                  <p className="eyebrow">{panel.eyebrow}</p>
                  <h2>{panel.title}</h2>
                  <p>{panel.copy}</p>
                  <a className="button" href="/shop">{panel.cta}</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
