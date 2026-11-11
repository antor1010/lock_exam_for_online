import { useEffect, useState } from "react";
import { api, L, mcqMarks, cqMarks } from "../api.js";
import Submission from "./Submission.jsx";
import QImg from "./QImg.jsx";

export default function Admin() {
  const [ex, setEx] = useState({ title: "", mins: 30, mcq: [], cq: [] });
  const [alerts, setAlerts] = useState([]);
  const [subs, setSubs] = useState([]);
  const [snaps, setSnaps] = useState([]);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const [cq, setCq] = useState("");
  const [cqImg, setCqImg] = useState("");
  const [mcqImg, setMcqImg] = useState("");
  const [mcqMark, setMcqMark] = useState("1");
  const [cqMark, setCqMark] = useState("5");
  const [mcqFileKey, setMcqFileKey] = useState(0);
  const [fileKey, setFileKey] = useState(0);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("getExam").then((r) => r.exam && setEx(r.exam));
    const poll = async () => {
      const a = await api("getAlerts");
      const s = await api("getSubs");
      if (a.alerts) setAlerts(a.alerts);
      if (s.subs) setSubs(s.subs);
      const c = await api("latestSnaps");
      if (c.snaps) setSnaps(c.snaps);
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
  }, []);

  const save = async (n) => {
    setEx(n);
    await api("saveExam", { exam: n });
    setMsg("✅ সংরক্ষিত হয়েছে");
    setTimeout(() => setMsg(""), 1500);
  };

  const addMcq = async () => {
    if (!q && !mcqImg) return;
    let img;
    if (mcqImg) {
      const r = await api("qimg", { img: mcqImg });
      if (!r.id) { setMsg("❌ ছবি আপলোড হয়নি"); return; }
      img = r.id;
    }
    await save({ ...ex, mcq: [...ex.mcq, { q, o: opts, a: correct, img, m: mcqMark === "" ? 1 : +mcqMark }] });
    setQ(""); setOpts(["", "", "", ""]); setMcqImg(""); setMcqFileKey((k) => k + 1);
  };

  const setMark = (type, i, v) =>
    setEx((e) => ({ ...e, [type]: e[type].map((x, j) => (j === i ? { ...(typeof x === "string" ? { t: x } : x), m: v === "" ? "" : +v } : x)) }));

  const removeItem = async (type, i) => {
    const item = ex[type][i];
    await save({ ...ex, [type]: ex[type].filter((_, j) => j !== i) });
    if (item && item.img) api("delQImg", { id: item.img });
  };

  const pickImg = (file, set) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas");
        const k = Math.min(1, 1000 / im.width);
        cv.width = im.width * k; cv.height = im.height * k;
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        set(cv.toDataURL("image/jpeg", 0.7));
      };
      im.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const addCq = async () => {
    if (!cq && !cqImg) return;
    let img;
    if (cqImg) {
      const r = await api("qimg", { img: cqImg });
      if (!r.id) { setMsg("❌ ছবি আপলোড হয়নি"); return; }
      img = r.id;
    }
    await save({ ...ex, cq: [...ex.cq, { t: cq, img, m: cqMark === "" ? 0 : +cqMark }] });
    setCq(""); setCqImg(""); setFileKey((k) => k + 1);
  };

  return (
    <div>
      <div className="card">
        <h3>📝 পরীক্ষার সেটআপ</h3>
        <input value={ex.title} placeholder="পরীক্ষার নাম" onChange={(e) => setEx({ ...ex, title: e.target.value })} />
        <p className="mut">⏱ পরীক্ষার সময় (মিনিট):</p>
        <input type="number" min="1" value={ex.mins} placeholder="সময় (মিনিট)"
          onChange={(e) => setEx({ ...ex, mins: e.target.value === "" ? "" : Math.max(1, +e.target.value) })} />
        <div>
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <button key={m} className={ex.mins === m ? "" : "g"} onClick={() => save({ ...ex, mins: m })}>{m} মি.</button>
          ))}
          <button className="g" onClick={() => save({ ...ex, mins: (+ex.mins || 0) + 5 })}>➕ ৫ মিনিট বাড়ান</button>
        </div>
        <p className="mut">চলতে থাকা পরীক্ষায় সময় বদলালে শিক্ষার্থীদের টাইমার ৩০ সেকেন্ডের মধ্যে আপডেট হবে।</p>
        <button onClick={() => save({ ...ex, mins: +ex.mins || 30 })}>সংরক্ষণ করুন</button>{" "}
        <button className="red" onClick={() => {
          if (!confirm("সবার টাইমার নতুন করে শুরু হবে (নতুন পরীক্ষার জন্য)। নিশ্চিত?")) return;
          save({ ...ex, mins: +ex.mins || 30, ver: Date.now() });
        }}>🔄 নতুন পরীক্ষা (টাইমার রিসেট)</button> {msg}
      </div>

      <div className="card">
        <h3>✅ MCQ প্রশ্ন যোগ করুন</h3>
        <input placeholder="প্রশ্ন (ছবি দিলে লেখা ফাঁকা রাখা যাবে)" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="mut">🖼 প্রশ্নের ছবি (ঐচ্ছিক):</p>
        <input key={mcqFileKey} type="file" accept="image/*" onChange={(e) => pickImg(e.target.files[0], setMcqImg)} />
        {mcqImg && <img className="qimg" src={mcqImg} alt="" />}
        {opts.map((v, i) => (
          <input key={i} placeholder={"অপশন " + L[i]} value={v}
            onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
        <p className="mut">🎯 এই প্রশ্নের নম্বর:</p>
        <input type="number" min="0" step="0.5" value={mcqMark} onChange={(e) => setMcqMark(e.target.value)} />
        <select value={correct} onChange={(e) => setCorrect(+e.target.value)}>
          {L.map((l, i) => <option key={i} value={i}>সঠিক উত্তর: {l}</option>)}
        </select>
        <button onClick={addMcq}>+ MCQ যোগ করুন</button>
      </div>

      <div className="card">
        <h3>✍️ CQ প্রশ্ন যোগ করুন</h3>
        <textarea rows="3" placeholder="CQ প্রশ্ন (লেখা)" value={cq} onChange={(e) => setCq(e.target.value)} />
        <p className="mut">🎯 এই প্রশ্নের নম্বর:</p>
        <input type="number" min="0" step="0.5" value={cqMark} onChange={(e) => setCqMark(e.target.value)} />
        <p className="mut">🖼 অথবা প্রশ্নের ছবি আপলোড করুন (লেখার সাথেও দেওয়া যাবে):</p>
        <input key={fileKey} type="file" accept="image/*" onChange={(e) => pickImg(e.target.files[0], setCqImg)} />
        {cqImg && <img className="qimg" src={cqImg} alt="" />}
        <button onClick={addCq}>+ CQ যোগ করুন</button>
      </div>

      <div className="card">
        <h3>📋 আপলোড করা প্রশ্ন ({ex.mcq.length} MCQ, {ex.cq.length} CQ)</h3>
        <p><b>🎯 মোট পূর্ণমান: {Math.round((mcqMarks(ex) + cqMarks(ex)) * 100) / 100}</b> <span className="mut">(MCQ {mcqMarks(ex)} + CQ {cqMarks(ex)})</span></p>
        {ex.mcq.map((m, i) => (
          <div className="alert ok" key={"m" + i}>
            <span className="tag">MCQ</span>{m.q}{m.img && <QImg id={m.img} />}{" "}
            <input type="number" min="0" step="0.5" style={{ width: 70, display: "inline-block" }} title="নম্বর"
              value={m.m ?? 1} onChange={(e) => setMark("mcq", i, e.target.value)} onBlur={() => save(ex)} /> নম্বর{" "}
            <button className="red" onClick={() => removeItem("mcq", i)}>মুছুন</button>
          </div>
        ))}
        {ex.cq.map((m, i) => (
          <div className="alert pr" key={"c" + i}>
            <span className="tag">CQ</span>{m.t ?? m}{m.img && <QImg id={m.img} />}{" "}
            <input type="number" min="0" step="0.5" style={{ width: 70, display: "inline-block" }} title="নম্বর"
              value={m.m ?? 0} onChange={(e) => setMark("cq", i, e.target.value)} onBlur={() => save(ex)} /> নম্বর{" "}
            <button className="red" onClick={() => removeItem("cq", i)}>মুছুন</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>📷 শিক্ষার্থীদের ক্যামেরা (প্রতি ~২০ সেকেন্ডে আপডেট){" "}
          {snaps.length > 0 && (
            <button className="g" onClick={async () => { setSnaps([]); await api("clearSnaps"); }}>পরিষ্কার করুন</button>
          )}
        </h3>
        {snaps.length ? snaps.map((s) => (
          <div key={s.id} style={{ display: "inline-block", margin: 6, textAlign: "center" }}>
            <img className="snap" src={s.img} alt="" /><br />
            <b>{s.name}</b> ({s.id})<br /><span className="mut">{s.time}</span>
          </div>
        )) : <span className="mut">কেউ পরীক্ষা শুরু করেনি</span>}
      </div>

      <div className="card">
        <h3>🔔 নোটিফিকেশন{" "}
          <button className="g" onClick={async () => { await api("clearAlerts"); setAlerts([]); }}>পরিষ্কার করুন</button>
        </h3>
        {alerts.length
          ? alerts.map((a, i) => (
              <div className="alert" key={i}>⚠️ <b>{a.who}</b>: {a.msg} <span className="mut">{a.time}</span></div>
            ))
          : <span className="mut">কোনো সতর্কতা নেই</span>}
      </div>

      <div className="card">
        <h3>📥 জমা দেওয়া উত্তর{" "}
          {subs.length > 0 && (
            <button className="red" onClick={async () => {
              if (!confirm("সব জমা দেওয়া উত্তর ও ছবি মুছে যাবে। নিশ্চিত?")) return;
              setSubs([]); await api("clearSubs");
            }}>🗑 সব মুছুন</button>
          )}
        </h3>
        {subs.length
          ? subs.map((s, i) => (
            <Submission key={s.id + s.time} s={s} onDelete={async () => {
              if (!confirm("এই জমা দেওয়া উত্তর (ছবিসহ) মুছে ফেলবেন?")) return;
              setSubs((x) => x.filter((y) => y !== s));
              await api("deleteSub", { id: s.id, time: s.time });
            }} />
          ))
          : <span className="mut">এখনো কেউ জমা দেয়নি</span>}
      </div>
    </div>
  );
}
