import { useState } from "react";
import { api } from "../api.js";
import QImg from "./QImg.jsx";

export default function Submission({ s, onDelete }) {
  const [imgs, setImgs] = useState(null);
  const [showMcq, setShowMcq] = useState(false);
  const [cq, setCq] = useState(s.cqScore ?? "");
  const [saved, setSaved] = useState(s.cqScore !== undefined && s.cqScore !== null);

  const load = async () => {
    const r = await Promise.all(s.imgs.map((id) => api("getImg", { id })));
    setImgs(r.map((x) => x.img).filter(Boolean));
  };

  const cqMax = s.cqTotal || 0;
  const saveCq = async () => {
    let v = Math.max(0, +cq || 0);
    if (cqMax) v = Math.min(v, cqMax);
    setCq(v);
    await api("grade", { id: s.id, time: s.time, cq: v });
    setSaved(true);
  };
  const r2 = (n) => Math.round(n * 100) / 100;
  const got = r2(s.score + (saved ? +cq || 0 : 0));
  const full = r2(s.total + cqMax);

  return (
    <div className="card">
      <b>{s.name}</b> ({s.id}) <span className="mut">{s.time}</span>{" "}
      <button className="red" onClick={onDelete}>🗑 মুছুন</button>
      <br />
      MCQ: <b>{s.score}/{s.total}</b>
      {cqMax > 0 && (
        <>
          {" · "}CQ নম্বর:{" "}
          <input type="number" min="0" max={cqMax} step="0.5" style={{ width: 80, display: "inline-block" }}
            value={cq} onChange={(e) => { setCq(e.target.value); setSaved(false); }} /> / {cqMax}{" "}
          <button className="g" onClick={saveCq}>{saved ? "✅ সেভ হয়েছে" : "সেভ"}</button>
        </>
      )}
      {" · "}মোট: <b>{got}/{full}</b>
      <br />
      {s.det && s.det.length > 0 ? (
        <>
          <button className="g" onClick={() => setShowMcq(!showMcq)}>
            {showMcq ? "▲ MCQ উত্তর লুকান" : "▼ MCQ-র কোনটা ঠিক/ভুল দেখুন"}
          </button>
          {showMcq && (
            <div style={{ margin: "8px 0" }}>
              {s.det.map((d, i) => {
                const ok = d.p === d.a;
                const skip = d.p === null || d.p === undefined;
                return (
                  <div key={i} className={"alert " + (ok ? "ok" : "")} style={{ marginBottom: 6 }}>
                    <b>{i + 1}. {ok ? "✅" : skip ? "⚪" : "❌"}</b> {d.q}
                    {d.img && <QImg id={d.img} />}
                    <div className="mut" style={{ marginTop: 4 }}>
                      {skip
                        ? "শিক্ষার্থী উত্তর দেয়নি"
                        : <>শিক্ষার্থীর উত্তর: <b>{d.o[d.p] ?? "?"}</b></>}
                      {!ok && <> · সঠিক উত্তর: <b>{d.o[d.a] ?? "?"}</b></>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <br />
        </>
      ) : null}
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
