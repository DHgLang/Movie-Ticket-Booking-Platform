import PageShell from "../components/PageShell";

const products = [
  { name: "Marvel Collectible Tumbler", price: "24.90", cat: "Drinkware" },
  { name: "GV Logo Hoodie", price: "49.90", cat: "Apparel" },
  { name: "Limited Edition Poster Set", price: "19.90", cat: "Posters" },
  { name: "Popcorn Plush Toy", price: "15.90", cat: "Toys" },
];

export default function ShopPage() {
  return (
    <PageShell title="Shop Merchandise" subtitle="Exclusive GV merchandise and movie collectibles.">
      <div className="gv-shop-grid">
        {products.map((p) => (
          <article key={p.name} className="gv-shop-card">
            <div className="gv-shop-img" />
            <span className="gv-meta">{p.cat}</span>
            <h3>{p.name}</h3>
            <p className="gv-price-tag">USD {p.price}</p>
            <button type="button" className="gv-btn-gold">
              Add to Cart
            </button>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
