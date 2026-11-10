import { useState } from "react";
import { api, setToken } from "../api.js";

export default function Login({ role, onOk, back }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const submit = async () => {
    const r = await api("login", { role, id: id.trim(), pw });
    if (r.error) setErr(r.error);
    else { setToken(r.token); onOk(r); }
  };

  return (
    <div className="card">
      <h2>{role === "admin" ? "অ্যাডমিন" : "শিক্ষার্থী"} লগইন</h2>
      <input placeholder="ইউজার আইডি" value={id} onChange={(e) => setId(e.target.value)} />
      <input type="password" placeholder="পাসওয়ার্ড" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button onClick={submit}>লগইন</button>
      <button className="g" onClick={back}>পিছনে</button>
      <p className="err">{err}</p>
    </div>
  );
}
