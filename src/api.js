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
