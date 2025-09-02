const API_BASE = "https://email-campaign-backend-ovtw.onrender.com"; // your backend

const els = {
  title: document.getElementById("title"),
  tagline: document.getElementById("tagline"),
  form: document.getElementById("emailForm"),
  name: document.getElementById("name"),
  postcode: document.getElementById("postcode"),
  note: document.getElementById("note"),
  recipientsList: document.getElementById("recipientsList"),
  sendBtn: document.getElementById("sendBtn"),
};

let cfg = null;

async function loadConfig() {
  const res = await fetch(`${API_BASE}/config`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load config");
  cfg = await res.json();

  els.title.textContent = cfg.title || "Email Campaign";
  els.tagline.textContent = cfg.tagline || "";
  els.recipientsList.innerHTML = (cfg.recipients || [])
    .map(r => `<li>${r.name ?? ""} &lt;${r.email}&gt;</li>`)
    .join("");
}

function buildMailto() {
  const recipients = (cfg.recipients || []).map(r => r.email).join(",");
  const subject = cfg.subject || "Your constituent has concerns";

  let body = (cfg.body || "")
    .replace("{{name}}", els.name.value.trim())
    .replace("{{postcode}}", els.postcode.value.trim());

  const note = els.note.value.trim();
  if (note) body += `\n\nP.S. ${note}`;

  // encode with CRLF line breaks
  const encBody = encodeURIComponent(body.replace(/\n/g, "\r\n"));
  const encSubject = encodeURIComponent(subject);

  return `mailto:${recipients}?subject=${encSubject}&body=${encBody}`;
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cfg) return;
  const link = buildMailto();
  window.location.href = link;
});

loadConfig().catch(() => {
  els.title.textContent = "Unable to load campaign";
  els.tagline.textContent = "Please try again later.";
  els.sendBtn.disabled = true;
});
