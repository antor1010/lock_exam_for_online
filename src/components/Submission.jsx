import { useState } from "react";
import { api } from "../api.js";

export default function Submission({ s }) {
  const [imgs, setImgs] = useState(null);

  const load = async () => {
    const r = await Promise.all(s.imgs.map((id) => api("getImg", { id })));
    setImgs(r.map((x) => x.img).filter(Boolean));
  };

  return (
    <div className="card">
      <b>{s.name}</b> ({s.id}) — MCQ: {s.score}/{s.total} <span className="mut">{s.time}</span>
      <br />
      {s.imgs.length === 0 ? (
        <span className="mut">ছবি নেই</span>
      ) : imgs ? (
        imgs.map((d, i) => <img key={i} className="th" src={d} alt="" />)
      ) : (
        <button className="g" onClick={load}>🖼 {s.imgs.length}টি ছবি দেখুন</button>
      )}
    </div>
  );
}
