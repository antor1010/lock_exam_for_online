import { useEffect, useState } from "react";
import { api } from "../api.js";

// প্রশ্নের সাথে যুক্ত ছবি দেখায়
export default function QImg({ id }) {
  const [src, setSrc] = useState("");
  useEffect(() => { api("getQImg", { id }).then((r) => setSrc(r.img || "")); }, [id]);
  return src ? <img className="qimg" src={src} alt="প্রশ্নের ছবি" /> : <span className="mut">ছবি লোড হচ্ছে...</span>;
}
