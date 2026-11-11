import { useEffect, useRef, useState } from "react";
import { api, L } from "../api.js";
import QImg from "./QImg.jsx";

const MAX_WARN = 3; // এতবার নিয়ম ভাঙলে পরীক্ষা অটো জমা হবে

const goFull = () => {
  const e = document.documentElement;
  try { (e.requestFullscreen || e.webkitRequestFullscreen)?.call(e); } catch (_) {}
};
const exitFull = () => {
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); } catch (_) {}
};

export default function Student() {
  const [ex, setEx] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [step, setStep] = useState("intro");
  const [err, setErr] = useState("");
  const [ans, setAns] = useState({});
  const [imgs, setImgs] = useState([]);
  const [ids, setIds] = useState([]);
  const [left, setLeft] = useState(0);
  const [res, setRes] = useState(null);
  const [status, setStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const [warns, setWarns] = useState(0);

  const stream = useRef(null), video = useRef(null), live = useRef(false);
  const ansRef = useRef({}), idsRef = useRef([]);
  const lockRef = useRef(false), warnRef = useRef(0);
  const ignoreRef = useRef(false), awayRef = useRef(0), fsRef = useRef(false);
  const submitRef = useRef(null);

  const load = () => {
    setLoadErr("");
    api("getExam").then((r) => {
      if (r.exam) { setEx(r.exam); setLeft(r.exam.mins * 60); }
      else setLoadErr(r.error || "পরীক্ষা লোড হয়নি");
    });
  };
  useEffect(load, []);

  const askCamera = async () => {
    goFull(); // ক্লিকের সাথে সাথেই ফুলস্ক্রিন
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      live.current = true;
      setStep("exam");
    } catch (e) {
      exitFull();
      setErr("ক্যামেরার অনুমতি না দিলে পরীক্ষা শুরু হবে না।");
    }
  };

  // লুকানো ক্যামেরা চালু + নিয়মিত স্ন্যাপশট
  useEffect(() => {
    if (step !== "exam") return;
    const v = video.current;
    v.srcObject = stream.current;
    v.play().catch(() => {});
    const snap = () => {
      if (!live.current || !v.videoWidth) return;
      const cv = document.createElement("canvas");
      cv.width = 320; cv.height = (v.videoHeight / v.videoWidth) * 320;
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
      api("snap", { img: cv.toDataURL("image/jpeg", 0.5) });
    };
    const first = setTimeout(snap, 3000);
    const t = setInterval(snap, 20000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [step]);

  // মোবাইলে স্ক্রিন যেন বন্ধ না হয়ে যায় (স্ক্রিন বন্ধ হলে ভুল সতর্কতা আসত)
  useEffect(() => {
    if (step !== "exam") return;
    let lock;
    const get = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch (_) {} };
    const again = () => { if (!document.hidden) get(); };
    get();
    document.addEventListener("visibilitychange", again);
    return () => { document.removeEventListener("visibilitychange", again); lock?.release?.(); };
  }, [step]);

  // টাইমার (লক থাকলেও চলতে থাকবে)
  useEffect(() => {
    if (step !== "exam") return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => { if (step === "exam" && left <= 0) submitRef.current(); }, [left]);

  const submit = async () => {
    if (!live.current) return;
    live.current = false;
    stream.current && stream.current.getTracks().forEach((t) => t.stop());
    exitFull();
    const r = await api("submit", { ans: ansRef.current, imgs: idsRef.current });
    setRes(r); setLocked(false); setStep("done");
  };
  submitRef.current = submit;

  const violate = (msg) => {
    if (!live.current || lockRef.current || ignoreRef.current) return;
    lockRef.current = true;
    warnRef.current += 1;
    setWarns(warnRef.current); setLocked(true);
    api("alert", { msg: `${msg} (সতর্কতা ${warnRef.current}/${MAX_WARN})` });
    if (warnRef.current >= MAX_WARN) {
      api("alert", { msg: `${MAX_WARN} বার নিয়ম ভাঙায় পরীক্ষা অটো জমা হয়েছে` });
      submitRef.current();
    }
  };

  useEffect(() => {
    let lastLog = 0, base = null;
    const log = (m) => {
      if (!live.current || Date.now() - lastLog < 8000) return;
      lastLog = Date.now(); api("alert", { msg: m });
    };
    const baseT = setTimeout(() => { base = { w: innerWidth, h: innerHeight }; }, 2000);

    const onVis = () => {
      if (document.hidden) {
        if (ignoreRef.current) awayRef.current = Date.now();
        else violate("ট্যাব/অ্যাপ পরিবর্তন করেছে (অন্য ট্যাব, অ্যাপ বা GPT খুলতে পারে)");
      } else if (ignoreRef.current) {
        const d = awayRef.current ? Date.now() - awayRef.current : 0;
        awayRef.current = 0;
        if (d > 25000) { ignoreRef.current = false; violate(`ছবি আপলোডের নামে ${Math.round(d / 1000)} সেকেন্ড বাইরে ছিল`); }
        setTimeout(() => { ignoreRef.current = false; }, 1500);
      }
    };
    const onBlur = () => violate("অন্য অ্যাপ/উইন্ডোতে গিয়েছে");
    const onFocus = () => { if (ignoreRef.current) setTimeout(() => { ignoreRef.current = false; }, 1500); };
    const onFs = () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) fsRef.current = true;
      else if (fsRef.current) violate("ফুলস্ক্রিন থেকে বেরিয়েছে");
    };
    const onResize = () => {
      if (!base) return;
      if (Math.abs(innerWidth - base.w) / base.w > 0.25 || Math.abs(innerHeight - base.h) / base.h > 0.3)
        violate("স্ক্রিন সাইজ বদলেছে (স্প্লিট স্ক্রিন / ফ্লোটিং উইন্ডো হতে পারে)");
    };
    const onCopy = (e) => { e.preventDefault(); log("প্রশ্ন কপি/কাট করার চেষ্টা করেছে (GPT-তে পেস্ট করার জন্য হতে পারে)"); };
    const onMenu = (e) => { e.preventDefault(); log("রাইট-ক্লিক / লং-প্রেস করেছে"); };
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "s", "u", "a"].includes(k)) || k === "f12" || k === "printscreen") {
        e.preventDefault(); log("নিষিদ্ধ কী চেপেছে: " + e.key);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(baseT);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const backToExam = () => { goFull(); lockRef.current = false; setLocked(false); };

  const pick = (i, j) => { ansRef.current = { ...ansRef.current, [i]: j }; setAns(ansRef.current); };

  // ছবি আপলোডের সময় ক্যামেরা/গ্যালারি খুললে সেটাকে নিয়ম ভঙ্গ ধরা হবে না (সর্বোচ্চ ৬০ সেকেন্ড)
  const startUpload = () => { ignoreRef.current = true; awayRef.current = 0; setTimeout(() => { ignoreRef.current = false; }, 60000); };

  const addImages = (files) => {
    [...files].forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const im = new Image();
        im.onload = () => {
          const cv = document.createElement("canvas");
          const k = Math.min(1, 800 / im.width);
          cv.width = im.width * k; cv.height = im.height * k;
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          const data = cv.toDataURL("image/jpeg", 0.6);
          setImgs((x) => [...x, data]);
          setStatus("⏳ আপলোড হচ্ছে...");
          api("sendImg", { img: data }).then((r) => {
            if (r.id) {
              idsRef.current = [...idsRef.current, r.id]; setIds(idsRef.current);
              setStatus(r.sent ? "✅ ছবি WhatsApp-এ পাঠানো হয়েছে" : "✅ ছবি জমা হয়েছে");
            } else setStatus("❌ " + (r.error || "আপলোড হয়নি"));
          });
        };
        im.src = reader.result;
      };
      reader.readAsDataURL(f);
    });
  };

  if (!ex)
    return (
      <div className="card">
        {loadErr ? (<><p className="err">❌ {loadErr}</p><button onClick={load}>আবার চেষ্টা করুন</button></>) : "লোড হচ্ছে..."}
      </div>
    );

  if (step === "intro")
    return (
      <div className="card">
        <h2>{ex.title}</h2>
        <p>⏱ {ex.mins} মিনিট · {ex.mcq.length}টি MCQ · {ex.cq.length}টি CQ</p>
        <div className="mut">
          <p>📷 পরীক্ষা চলাকালীন ক্যামেরা চালু থাকবে এবং নিয়মিত ছবি শিক্ষকের কাছে যাবে।</p>
          <p>🖥 পরীক্ষা ফুলস্ক্রিনে হবে। ট্যাব/অ্যাপ বদলালে স্ক্রিন লক হবে, সময় চলতেই থাকবে এবং শিক্ষক জানতে পারবেন।</p>
          <p>🚫 কপি-পেস্ট বন্ধ। {MAX_WARN} বার নিয়ম ভাঙলে পরীক্ষা নিজে থেকে জমা হয়ে যাবে।</p>
        </div>
        <button onClick={askCamera}>📷 ক্যামেরা চালু করে পরীক্ষা শুরু করুন</button>
        <p className="err">{err}</p>
      </div>
    );

  if (step === "done")
    return (
      <div className="card center">
        <h2>🎉 পরীক্ষা জমা হয়েছে!</h2>
        <p>MCQ স্কোর: <b>{res && res.score}/{res && res.total}</b></p>
        <p>CQ ছবি: {ids.length}টি</p>
      </div>
    );

  const m = Math.max(0, Math.floor(left / 60));
  const s = Math.max(0, left % 60);
  const clock = `⏱ ${m}:${String(s).padStart(2, "0")}`;

  return (
    <div className="nosel">
      <video ref={video} className="hidcam" autoPlay muted playsInline />

      {locked ? (
        <div className="lock">
          <h1>🚫 পরীক্ষা লক হয়েছে</h1>
          <p>আপনি পরীক্ষার স্ক্রিন ছেড়ে গিয়েছিলেন। শিক্ষককে জানানো হয়েছে।</p>
          <div className="timer">{clock}</div>
          <p>সতর্কতা: {warns}/{MAX_WARN} — সময় চলছে!</p>
          <button onClick={backToExam}>↩ পরীক্ষায় ফিরে যান</button>
        </div>
      ) : (
        <>
          <div className="card top"><div className="timer">{clock}</div></div>

          <div className="card">
            <h3>প্রথম অংশ — MCQ</h3>
            {ex.mcq.length ? ex.mcq.map((q, i) => (
              <div key={i}>
                <b>{i + 1}. {q.q}</b>
                {q.img && <QImg id={q.img} />}
                {q.o.map((o, j) => (
                  <label key={j} className={"opt" + (ans[i] === j ? " on" : "")}>
                    <input type="radio" name={"q" + i} checked={ans[i] === j} onChange={() => pick(i, j)} />
                    {L[j]}. {o}
                  </label>
                ))}
              </div>
            )) : <p className="mut">কোনো MCQ নেই</p>}
          </div>

          <div className="card">
            <h3>দ্বিতীয় অংশ — CQ</h3>
            {ex.cq.map((q, i) => (
              <div key={i}>
                <p><b>{i + 1}. {q.t ?? q}</b></p>
                {q.img && <QImg id={q.img} />}
              </div>
            ))}
            <p className="mut">খাতায় লিখে উত্তরের ছবি তুলে আপলোড করুন।</p>
            <div className="upl">
              <label className="btn">📸 ক্যামেরায় তুলুন
                <input hidden type="file" accept="image/*" capture="environment" onClick={startUpload}
                  onChange={(e) => { addImages([...e.target.files]); e.target.value = ""; }} />
              </label>
              <label className="btn g">🖼 গ্যালারি থেকে
                <input hidden type="file" accept="image/*" multiple onClick={startUpload}
                  onChange={(e) => { addImages([...e.target.files]); e.target.value = ""; }} />
              </label>
            </div>
            <p>{status}</p>
            <div>{imgs.map((d, i) => <img key={i} className="th" src={d} alt="" />)}</div>
          </div>

          <div className="submitbar"><button onClick={submit}>✅ পরীক্ষা জমা দিন</button></div>
        </>
      )}
    </div>
  );
}
