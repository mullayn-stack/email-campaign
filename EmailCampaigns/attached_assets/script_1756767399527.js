// Wait for the DOM to load before executing any logic.
document.addEventListener('DOMContentLoaded', async () => {
  let config;
  try {
    const response = await fetch('/config');
    config = await response.json();
  } catch (err) {
    console.error('Could not load config:', err);
  }

  // Landing page logic
  const campaignForm = document.getElementById('campaign-form');
  if (campaignForm) {
    // Populate campaign title and tagline
    if (config) {
      const titleEl = document.getElementById('campaign-title');
      const taglineEl = document.getElementById('campaign-tagline');
      titleEl.textContent = config.title || '';
      taglineEl.textContent = config.tagline || '';
    }

    campaignForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const postcode = document.getElementById('postcode').value.trim();
      const note = document.getElementById('note').value.trim();

      // Build the email body by replacing placeholders.
      let body = (config && config.body) || '';
      body = body.replace(/{{name}}/g, name);
      body = body.replace(/{{postcode}}/g, postcode);
      if (note) {
        body += '\n\nP.S. ' + note;
      }
      // Encode subject and body
      const subject = encodeURIComponent((config && config.subject) || '');
      const encodedBody = encodeURIComponent(body);
      // Extract comma‑separated list of recipient emails
      const recipientEmails =
        config && Array.isArray(config.recipients)
          ? config.recipients.map((r) => r.email).join(',')
          : '';

      // Construct the mailto link and redirect the browser.
      const mailtoLink = `mailto:${recipientEmails}?subject=${subject}&body=${encodedBody}`;
      window.location.href = mailtoLink;
    });
  }

  // Admin page logic
  const adminForm = document.getElementById('admin-form');
  if (adminForm) {
    // Pre-fill fields with current config
    if (config) {
      document.getElementById('cfg-title').value = config.title || '';
      document.getElementById('cfg-tagline').value = config.tagline || '';
      document.getElementById('cfg-subject').value = config.subject || '';
      document.getElementById('cfg-body').value = config.body || '';
      const recLines =
        config.recipients
          .map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
          .join('\n') || '';
      document.getElementById('cfg-recipients').value = recLines;
    }

    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value.trim();

      // Gather campaign settings from form fields
      const newConfig = {
        title: document.getElementById('cfg-title').value.trim(),
        tagline: document.getElementById('cfg-tagline').value.trim(),
        subject: document.getElementById('cfg-subject').value.trim(),
        body: document.getElementById('cfg-body').value,
        recipients: []
      };
      // Parse recipients lines
      const recLines = document
        .getElementById('cfg-recipients')
        .value.split(/\r?\n/);
      recLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        // Match "Name <email>" or just "email"
        const match = trimmed.match(/^(.*?)\s*<(.+@.+)>$/);
        if (match) {
          const name = match[1].trim();
          const emailAddr = match[2].trim();
          newConfig.recipients.push({ name, email: emailAddr });
        } else {
          // Only email provided
          newConfig.recipients.push({ name: '', email: trimmed });
        }
      });
      // Build basic auth header
      const credentials = btoa(`${username}:${password}`);
      const statusEl = document.getElementById('status-msg');
      statusEl.style.color = '';
      statusEl.textContent = 'Saving...';
      try {
        const resp = await fetch('/admin/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${credentials}`
          },
          body: JSON.stringify(newConfig)
        });
        if (resp.ok) {
          statusEl.style.color = 'green';
          statusEl.textContent = 'Configuration saved successfully.';
        } else {
          let message = 'Request failed.';
          try {
            const data = await resp.json();
            message = data.message || message;
          } catch (e) {
            // ignore JSON parsing error
          }
          statusEl.style.color = 'red';
          statusEl.textContent = 'Error: ' + message;
        }
      } catch (err) {
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + err.message;
      }
    });
  }
});
