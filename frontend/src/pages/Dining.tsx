import PageShell from "../components/PageShell";

const menu = [
  { name: "Truffle Fries", price: "8.90", tag: "Bestseller", img: "/dining/truffle-fries.jpg" },
  { name: "Chicken Bites Combo", price: "12.50", tag: "Combo", img: "/dining/chicken-bites.jpg" },
  { name: "Gourmet Hot Dog", price: "9.90", tag: "", img: "/dining/hot-dog.jpg" },
  { name: "Double Chocolate Brownie", price: "7.50", tag: "New", img: "/dining/brownie.jpg" },
  { name: "Caramel Popcorn (Large)", price: "6.90", tag: "", img: "/dining/popcorn.jpg" },
];

export default function DiningPage() {
  return (
    <PageShell
      title="Dining"
      subtitle="Counter menu reference — order and pay at the cinema concession stand."
    >
      <div className="gv-dining-grid">
        {menu.map((item) => (
          <article key={item.name} className="gv-dining-card">
            <div className="gv-dining-img">
              <img src={item.img} alt={item.name} loading="lazy" />
            </div>
            <h3>{item.name}</h3>
            <div className="gv-dining-tag-slot">
              {item.tag ? <span className="gv-tag">{item.tag}</span> : null}
            </div>
            <p className="gv-price-tag">USD {item.price}</p>
            <p className="gv-meta">Available at cinema counter</p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
