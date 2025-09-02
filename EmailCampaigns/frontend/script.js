const API_BASE = "https://email-campaign-backend-ovtw.onrender.com"; // your backend

const els = {
  title: document.getElementById("title"),
  tagline: document.getElementById("tagline"),
  adminLink: document.getElementById("adminLink"),
  subjectPreview: document.getElementById("subjectPreview"),
  bodyPreview: document.getElementById("bodyPreview"),
  form: document.getElementById("emailForm"),
  name: document.getElementById("name"),
  postcode: document.getElementById("postcode"),
  note: document.getElementById("note"),
  recipientsList: document.getElementById("recipientsList"),
};

let cfg = null;

function applyPlaceholders(t, name, pc) {
  return (t || "").replaceAll("{{name}}", name ?? "").replaceAll("{{postcode}}", pc ?? "");
}

async function loadConfig() {
  const res = await fetch(`${API_BASE}/config`, { cache: "no-store" });
  if (!res.ok) throw new Error("config load failed");
  cfg = await res.json();

  els.title.textContent = cfg.title || "Email Campaign";
  els.tagline.textContent = cfg.tagline || "";
  els.adminLink.href = `${API_BASE}/admin`;

  els.subjectPreview.textContent = cfg.subject || "";
  els.bodyPreview.textContent = applyPlaceholders(cfg.body || "", "", "");

  els.recipientsList.innerHTML = (cfg.recipients || [])
    .map(r => `<li>${r.name ? `${r.name} ` : ""}&lt;${r.email}&gt;</li>`)
    .join("");
}

function refreshBodyPreview() {
  els.bodyPreview.textContent = applyPlaceholders(
    cfg?.body || "",
    els.name.value.trim(),
    els.postcode.value.trim()
  );
}
["input","change"].forEach(ev => {
  els.name.addEventListener(ev, refreshBodyPreview);
  els.postcode.addEventListener(ev, refreshBodyPreview);
});

function buildMailto() {
  const recipients = (cfg.recipients || []).map(r => r.email).join(",");
  const subject = cfg.subject || "";
  let body = applyPlaceholders(cfg.body || "", els.name.value.trim(), els.postcode.value.trim());
  const note = els.note.value.trim();
  if (note) body += `\n\nP.S. ${note}`;
  return `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g,"\r\n"))}`;
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cfg) return;
  window.location.href = buildMailto();
});

loadConfig().catch(() => {
  els.title.textContent = "Unable to load campaign";
  els.tagline.textContent = "Please try again later.";
});
