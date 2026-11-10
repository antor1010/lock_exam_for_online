export default function Home({ go }) {
  return (
    <div className="grid">
      <div className="card role r1" onClick={() => go("admin")}><span>👩‍🏫</span>অ্যাডমিন (শিক্ষক)</div>
      <div className="card role r2" onClick={() => go("student")}><span>🧑‍🎓</span>শিক্ষার্থী</div>
    </div>
  );
}
