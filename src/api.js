let TOKEN = "";
export const setToken = (t) => { TOKEN = t; };

export async function api(action, body = {}) {
  try {
    const r = await fetch("/api/api?a=" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: TOKEN },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    return { error: "নেটওয়ার্ক সমস্যা" };
  }
}

export const L = ["ক", "খ", "গ", "ঘ"];

const r2 = (n) => Math.round(n * 100) / 100;
export const mcqMarks = (ex) => r2((ex.mcq || []).reduce((t, m) => t + (m.m === undefined || m.m === "" ? 1 : +m.m || 0), 0));
export const cqMarks = (ex) => r2((ex.cq || []).reduce((t, c) => t + (+(c && c.m) || 0), 0));
