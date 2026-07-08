import PageShell from "../components/PageShell";

const promos = [
  {
    title: "Tuesday Movie Treats",
    desc: "Enjoy discounted tickets every Tuesday for Spirit Movie members.",
    code: "TUESDAY10",
  },
  {
    title: "Student Bundle",
    desc: "Valid student ID — ticket + regular popcorn from 11.90 USD.",
    code: "STUDENT",
  },
  {
    title: "Family Package",
    desc: "4 tickets + 2 large drinks + 1 popcorn to share.",
    code: "FAMILY4",
  },
];

export default function PromotionsPage() {
  return (
    <PageShell title="Promotions" subtitle="Latest deals and seasonal offers.">
      <div className="gv-promo-list">
        {promos.map((p) => (
          <article key={p.title} className="gv-promo-card">
            <div className="gv-promo-banner" />
            <div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <code className="gv-code">{p.code}</code>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
