const API_BASE = "https://email-campaign-backend-ovtw.onrender.com"; // backend URL

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

function applyPlaceholders(template, name, postcode) {
  return (template || "")
    .replaceAll("{{name}}", name ?? "")
    .replaceAll("{{postcode}}", postcode ?? "");
}

async function loadConfig() {
  const res = await fetch(`${API_BASE}/config`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load config");
  cfg = await res.json();

  // Top header
  els.title.textContent = cfg.title || "Email Campaign";
  els.tagline.textContent = cfg.tagline || "";
  els.adminLink.href = `${API_BASE}/admin`;

  // Previews (mirror admin contents)
  els.subjectPreview.textContent = cfg.subject || "";
  // initial preview with empty placeholders
  els.bodyPreview.textContent = applyPlaceholders(cfg.body || "", "", "");

  // Recipients
  els.recipientsList.innerHTML = (cfg.recipients || [])
    .map(r => `<li>${(r.name ? `${r.name} ` : "")}&lt;${r.email}&gt;</li>`)
    .join("");
}

// Update previews live as user types (so they can see {{name}}/{{postcode}} filled)
function refreshBodyPreview() {
  const name = els.name.value.trim();
  const postcode = els.postcode.value.trim();
  els.bodyPreview.textContent = applyPlaceholders(cfg?.body || "", name, postcode);
}

["input", "change"].forEach(ev => {
  els.name.addEventListener(ev, refreshBodyPreview);
  els.postcode.addEventListener(ev, refreshBodyPreview);
});

function buildMailto() {
  const recipients = (cfg.recipients || []).map(r => r.email).join(",");
  const subject = cfg.subject || "";

  // Fill placeholders with user inputs
  const bodyFilled = applyPlaceholders(
    cfg.body || "",
    els.name.value.trim(),
    els.postcode.value.trim()
  );

  const note = els.note.value.trim();
  let body = bodyFilled;
  if (note) body += `\n\nP.S. ${note}`;

  const encSubject = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body.replace(/\n/g, "\r\n"));

  return `mailto:${recipients}?subject=${encSubject}&body=${encBody}`;
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!cfg) return;
  window.location.href = buildMailto();
});

loadConfig().catch(() => {
  els.title.textContent = "Unable to load campaign";
  els.tagline.textContent = "Please try again later.";
  els.subjectPreview.textContent = "";
  els.bodyPreview.textContent = "";
});
