const crypto = require("crypto");
const E = process.env;
const ADMIN = { id: E.ADMIN_ID || "antor1010", pw: E.ADMIN_PW || "antor1010" };
const STU = E.STUDENTS ? JSON.parse(E.STUDENTS) : { student09: { pw: "123", name: "শিক্ষার্থী" } };
const SECRET = E.SECRET || "change-this-secret";
const sign = (s) => crypto.createHmac("sha256", SECRET).update(s).digest("hex").slice(0, 32);
const KV_URL = E.KV_REST_API_URL || E.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = E.KV_REST_API_TOKEN || E.UPSTASH_REDIS_REST_TOKEN;
const mem = (globalThis.__examMem ||= new Map());
const memR = ([c, k, ...a]) => {
  const l = () => mem.get(k) || [];
  switch (c) {
    case "GET": return mem.has(k) ? mem.get(k) : null;
    case "SET": mem.set(k, a[0]); return "OK";
    case "DEL": mem.delete(k); return 1;
    case "LPUSH": { const x = l(); x.unshift(a[0]); mem.set(k, x); return x.length; }
    case "LTRIM": mem.set(k, l().slice(a[0], a[1] + 1)); return "OK";
    case "LRANGE": return l().slice(a[0], a[1] + 1);
    case "LSET": { const x = l(); x[a[0]] = a[1]; mem.set(k, x); return "OK"; }
    case "LREM": { const x = l(); const i = x.indexOf(a[1]); if (i >= 0) x.splice(i, 1); mem.set(k, x); return i >= 0 ? 1 : 0; }
    case "SADD": { const x = l(); if (!x.includes(a[0])) x.push(a[0]); mem.set(k, x); return 1; }
    case "SMEMBERS": return l();
  }
};
const R = async (...cmd) => {
  if (!KV_URL) {
    if (E.VERCEL) throw new Error("ডাটাবেস (Upstash Redis) কানেক্ট করা নেই — Vercel Storage থেকে Connect করুন");
    return memR(cmd); // লোকাল টেস্টের জন্য মেমোরি (সার্ভার রিস্টার্টে মুছে যায়)
  }
  return (await (await fetch(KV_URL, { method: "POST", headers: { Authorization: "Bearer " + KV_TOKEN }, body: JSON.stringify(cmd) })).json()).result;
};
const J = (v) => { try { return JSON.parse(v); } catch (e) { return null; } };

function auth(req) {
  const [role, id, sig] = (req.headers.authorization || "").split("|");
  if (!role || !id || sig !== sign(role + "|" + id)) return null;
  return { role, id, name: role === "admin" ? "শিক্ষক" : (STU[id] || {}).name || id };
}

async function wa(img, cap) {
  if (!E.WA_TOKEN || !E.WA_PHONE_ID) return false;
  const f = new FormData();
  f.append("messaging_product", "whatsapp");
  f.append("type", "image/jpeg");
  f.append("file", new Blob([Buffer.from(img.split(",")[1], "base64")], { type: "image/jpeg" }), "answer.jpg");
  const H = { Authorization: "Bearer " + E.WA_TOKEN };
  const u = await (await fetch(`https://graph.facebook.com/v20.0/${E.WA_PHONE_ID}/media`, { method: "POST", headers: H, body: f })).json();
  if (!u.id) return false;
  const m = await (await fetch(`https://graph.facebook.com/v20.0/${E.WA_PHONE_ID}/messages`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: E.WA_TO || "916297751533", type: "image", image: { id: u.id, caption: cap } }),
  })).json();
  return !!m.messages;
}

module.exports = async (req, res) => {
  const a = req.query.a, b = req.body || {};
  try {
    if (a === "login") {
      const ok = b.role === "admin" ? b.id === ADMIN.id && b.pw === ADMIN.pw : STU[b.id] && STU[b.id].pw === b.pw;
      if (!ok) return res.status(401).json({ error: "আইডি বা পাসওয়ার্ড ভুল" });
      const role = b.role === "admin" ? "admin" : "student";
      return res.json({ token: role + "|" + b.id + "|" + sign(role + "|" + b.id), name: role === "admin" ? "শিক্ষক" : STU[b.id].name, role, id: b.id });
    }
    const u = auth(req);
    if (!u) return res.status(401).json({ error: "লগইন করুন" });
    const exam = J(await R("GET", "exam")) || { title: "ক্লাস টেস্ট", mins: 30, mcq: [], cq: [] };

    if (a === "getExam") {
      if (u.role === "student") exam.mcq = exam.mcq.map(({ q, o, img, m }) => ({ q, o, img, m }));
      return res.json({ exam, now: Date.now() });
    }
    if (a === "start" && u.role === "student") {
      // শুরুর সময় সার্ভারে সেভ — রিফ্রেশ করলেও টাইমার রিসেট হবে না
      const k = "start:" + (exam.ver || 0) + ":" + u.id;
      let t = +(await R("GET", k));
      if (!t) { t = Date.now(); await R("SET", k, String(t), "EX", 60 * 60 * 24); }
      return res.json({ start: t, now: Date.now(), mins: exam.mins });
    }
    if (a === "alert" && u.role === "student") {
      await R("LPUSH", "alerts", JSON.stringify({ who: u.name + " (" + u.id + ")", msg: b.msg, time: new Date().toLocaleTimeString("bn-BD", { timeZone: "Asia/Kolkata" }) }));
      await R("LTRIM", "alerts", 0, 99);
      return res.json({ ok: 1 });
    }
    if (a === "sendImg" && u.role === "student") {
      const id = crypto.randomUUID();
      await R("SET", "img:" + id, b.img, "EX", 60 * 60 * 24 * 30);
      const sent = await wa(b.img, `${u.name} (${u.id}) — CQ উত্তরের ছবি`);
      return res.json({ id, sent });
    }
    if (a === "getQImg") return res.json({ img: await R("GET", "qimg:" + b.id) });
    if (a === "snap" && u.role === "student") {
      await R("SET", "snap:" + u.id, JSON.stringify({ img: b.img, name: u.name, time: new Date().toLocaleTimeString("bn-BD", { timeZone: "Asia/Kolkata" }) }));
      await R("SADD", "snapusers", u.id);
      return res.json({ ok: 1 });
    }
    if (a === "submit" && u.role === "student") {
      const r2 = (n) => Math.round(n * 100) / 100;
      let score = 0, total = 0;
      exam.mcq.forEach((m, i) => {
        const w = m.m === undefined || m.m === "" ? 1 : +m.m || 0;
        total += w;
        if (b.ans && b.ans[i] === m.a) score += w;
      });
      score = r2(score); total = r2(total);
      const cqTotal = r2(exam.cq.reduce((t, c) => t + (+(c && c.m) || 0), 0));
      const sub = { id: u.id, name: u.name, score, total, cqTotal, imgs: b.imgs || [], time: new Date().toLocaleString("bn-BD", { timeZone: "Asia/Kolkata" }) };
      await R("LPUSH", "subs", JSON.stringify(sub));
      return res.json({ score, total, cqTotal });
    }
    if (u.role !== "admin") return res.status(403).json({ error: "অনুমতি নেই" });
    if (a === "qimg") {
      const id = crypto.randomUUID();
      await R("SET", "qimg:" + id, b.img);
      return res.json({ id });
    }
    if (a === "delQImg") { if (b.id) await R("DEL", "qimg:" + b.id); return res.json({ ok: 1 }); }
    if (a === "saveExam") { b.exam.mins = Math.max(1, +b.exam.mins || 30); await R("SET", "exam", JSON.stringify(b.exam)); return res.json({ ok: 1 }); }
    if (a === "getAlerts") return res.json({ alerts: ((await R("LRANGE", "alerts", 0, 49)) || []).map(J) });
    if (a === "clearAlerts") { await R("DEL", "alerts"); return res.json({ ok: 1 }); }
    if (a === "getSubs") {
      const g = J(await R("GET", "grades")) || {};
      const subs = ((await R("LRANGE", "subs", 0, 99)) || []).map(J).filter(Boolean).map((s) => ({ ...s, cqScore: g[s.id + "|" + s.time] }));
      return res.json({ subs });
    }
    if (a === "grade") {
      const g = J(await R("GET", "grades")) || {};
      g[b.id + "|" + b.time] = Math.max(0, +b.cq || 0);
      await R("SET", "grades", JSON.stringify(g));
      return res.json({ ok: 1 });
    }
    if (a === "latestSnaps") {
      const out = [];
      for (const id of (await R("SMEMBERS", "snapusers")) || []) { const x = J(await R("GET", "snap:" + id)); if (x) out.push({ id, ...x }); }
      return res.json({ snaps: out });
    }
    if (a === "deleteSub") {
      const raw = (await R("LRANGE", "subs", 0, 99)) || [];
      const i = raw.findIndex((x) => { const s = J(x); return s && s.time === b.time && s.id === b.id; });
      if (i >= 0) {
        for (const id of J(raw[i]).imgs || []) await R("DEL", "img:" + id);
        await R("LSET", "subs", i, "__del__");
        await R("LREM", "subs", 1, "__del__");
      }
      return res.json({ ok: 1 });
    }
    if (a === "clearSubs") {
      for (const x of (await R("LRANGE", "subs", 0, 999)) || []) {
        const s = J(x);
        for (const id of (s && s.imgs) || []) await R("DEL", "img:" + id);
      }
      await R("DEL", "subs"); await R("DEL", "grades");
      return res.json({ ok: 1 });
    }
    if (a === "clearSnaps") {
      for (const id of (await R("SMEMBERS", "snapusers")) || []) await R("DEL", "snap:" + id);
      await R("DEL", "snapusers");
      return res.json({ ok: 1 });
    }
    if (a === "getImg") return res.json({ img: await R("GET", "img:" + b.id) });
    res.status(404).json({ error: "unknown" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
