/**
 * Mobile-optimized JavaScript for Northern Ireland Email Campaign
 * Handles both public campaign page and admin dashboard functionality
 */

// Global variables
let config = null;
let isLoading = false;

// Utility functions
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelector(selector);
const $$$ = (selector) => document.querySelectorAll(selector);

// Show/hide loading indicator
function showLoading(show = true) {
    const loading = $('loading');
    if (loading) {
        loading.setAttribute('aria-hidden', show ? 'false' : 'true');
        isLoading = show;
    }
}

// Display status message
function showStatus(message, type = 'info') {
    const statusEl = $('status-msg');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'status-message';
        }, 5000);
    }
}

// Form validation utilities
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePostcode(postcode) {
    if (!postcode.trim()) return true; // Optional field
    const re = /^[A-Za-z]{2}[0-9]{1,2} ?[0-9][A-Za-z]{2}$/;
    return re.test(postcode.trim());
}

function showFieldError(fieldId, message) {
    const field = $(fieldId);
    const errorEl = $(fieldId + '-error');
    
    if (field) {
        field.setAttribute('aria-invalid', 'true');
        field.classList.add('error');
    }
    
    if (errorEl) {
        errorEl.textContent = message;
    }
}

function clearFieldError(fieldId) {
    const field = $(fieldId);
    const errorEl = $(fieldId + '-error');
    
    if (field) {
        field.setAttribute('aria-invalid', 'false');
        field.classList.remove('error');
    }
    
    if (errorEl) {
        errorEl.textContent = '';
    }
}

// Load campaign configuration
async function loadConfig() {
    try {
        showLoading(true);
        const response = await fetch('/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        config = await response.json();
        return config;
        
    } catch (error) {
        console.error('Failed to load config:', error);
        showStatus('Failed to load campaign configuration. Please refresh the page.', 'error');
        return null;
    } finally {
        showLoading(false);
    }
}

// Show success modal after email app opens
function showEmailSuccessMessage() {
    const modal = $('success-modal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'false');
        
        // Close modal when user clicks "Got it!"
        const closeBtn = $('close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.setAttribute('aria-hidden', 'true');
            };
        }
        
        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.setAttribute('aria-hidden', 'true');
            }
        };
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            modal.setAttribute('aria-hidden', 'true');
        }, 10000);
    }
}

// Initialize character counter for textareas
function initCharCounter() {
    const noteField = $('note');
    const charCount = $('char-count');
    
    if (noteField && charCount) {
        function updateCount() {
            const count = noteField.value.length;
            charCount.textContent = count;
            
            if (count > 450) {
                charCount.style.color = '#D32F2F';
            } else if (count > 400) {
                charCount.style.color = '#FF6F00';
            } else {
                charCount.style.color = '#666';
            }
        }
        
        noteField.addEventListener('input', updateCount);
        updateCount(); // Initial count
    }
}

// Public campaign page functionality
function initCampaignPage() {
    const campaignForm = $('campaign-form');
    if (!campaignForm) return;
    
    // Populate campaign info
    if (config) {
        const titleEl = $('campaign-title');
        const taglineEl = $('campaign-tagline');
        const emailSubjectEl = $('email-subject');
        const emailBodyEl = $('email-body');
        const recipientsContainer = $('recipients-container');
        
        if (titleEl) titleEl.textContent = config.title || 'Email Campaign';
        if (taglineEl) taglineEl.textContent = config.tagline || 'Contact your representatives';
        
        // Populate email preview
        if (emailSubjectEl) {
            emailSubjectEl.textContent = config.subject || 'Message from constituent';
        }
        
        if (emailBodyEl) {
            // Show template with placeholders explained
            let bodyText = config.body || 'No message template configured.';
            bodyText = bodyText.replace(/\{\{name\}\}/g, '[Your name will appear here]');
            bodyText = bodyText.replace(/\{\{postcode\}\}/g, '[Your postcode will appear here]');
            emailBodyEl.textContent = bodyText;
        }
        
        // Populate recipients list
        if (recipientsContainer) {
            if (config.recipients && config.recipients.length > 0) {
                recipientsContainer.innerHTML = '';
                config.recipients.forEach(recipient => {
                    const recipientDiv = document.createElement('div');
                    recipientDiv.className = 'recipient-item';
                    
                    const displayName = recipient.name || 'Representative';
                    const initials = displayName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
                    
                    recipientDiv.innerHTML = `
                        <div class="recipient-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="white"/>
                                <path d="M8 10C3.58172 10 0 13.5817 0 18H16C16 13.5817 12.4183 10 8 10Z" fill="white"/>
                            </svg>
                        </div>
                        <div class="recipient-info">
                            <div class="recipient-name">${displayName}</div>
                            <div class="recipient-email">${recipient.email}</div>
                        </div>
                    `;
                    
                    recipientsContainer.appendChild(recipientDiv);
                });
            } else {
                recipientsContainer.innerHTML = '<div class="loading-text">No recipients configured</div>';
            }
        }
    }
    
    // Initialize character counter
    initCharCounter();
    
    // Real-time validation
    const nameField = $('name');
    const emailField = $('email');
    const postcodeField = $('postcode');
    
    if (nameField) {
        nameField.addEventListener('blur', () => {
            const value = nameField.value.trim();
            if (!value) {
                showFieldError('name', 'Please enter your full name');
            } else if (value.length < 2) {
                showFieldError('name', 'Name must be at least 2 characters');
            } else {
                clearFieldError('name');
            }
        });
    }
    
    if (emailField) {
        emailField.addEventListener('blur', () => {
            const value = emailField.value.trim();
            if (!value) {
                showFieldError('email', 'Please enter your email address');
            } else if (!validateEmail(value)) {
                showFieldError('email', 'Please enter a valid email address');
            } else {
                clearFieldError('email');
            }
        });
    }
    
    if (postcodeField) {
        postcodeField.addEventListener('blur', () => {
            const value = postcodeField.value.trim();
            if (value && !validatePostcode(value)) {
                showFieldError('postcode', 'Please enter a valid NI postcode (e.g., BT1 1XX)');
            } else {
                clearFieldError('postcode');
            }
        });
        
        // Format postcode as user types
        postcodeField.addEventListener('input', (e) => {
            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 3) {
                value = value.substring(0, 3) + ' ' + value.substring(3, 6);
            }
            e.target.value = value;
        });
    }
    
    // Form submission
    campaignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = nameField?.value.trim() || '';
        const email = emailField?.value.trim() || '';
        const postcode = postcodeField?.value.trim() || '';
        const note = $('note')?.value.trim() || '';
        
        // Clear previous errors
        clearFieldError('name');
        clearFieldError('email');
        
        let hasErrors = false;
        
        // Validate required fields
        if (!name) {
            showFieldError('name', 'Please enter your full name');
            hasErrors = true;
        } else if (name.length < 2) {
            showFieldError('name', 'Name must be at least 2 characters');
            hasErrors = true;
        }
        
        if (!email) {
            showFieldError('email', 'Please enter your email address');
            hasErrors = true;
        } else if (!validateEmail(email)) {
            showFieldError('email', 'Please enter a valid email address');
            hasErrors = true;
        }
        
        if (postcode && !validatePostcode(postcode)) {
            showFieldError('postcode', 'Please enter a valid NI postcode');
            hasErrors = true;
        }
        
        if (hasErrors) {
            // Focus first error field
            const firstError = $$('.input[aria-invalid="true"]');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        
        // Build email content
        if (!config) {
            showStatus('Campaign configuration not loaded. Please refresh the page.', 'error');
            return;
        }
        
        let body = config.body || '';
        body = body.replace(/\{\{name\}\}/g, name);
        body = body.replace(/\{\{postcode\}\}/g, postcode);
        
        if (note) {
            body += '\n\nPersonal note:\n' + note;
        }
        
        // Get recipient emails
        const recipientEmails = config.recipients && Array.isArray(config.recipients)
            ? config.recipients.map(r => r.email).filter(Boolean).join(',')
            : '';
        
        if (!recipientEmails) {
            showStatus('No recipients configured. Please contact the administrator.', 'error');
            return;
        }
        
        // Create mailto link
        const subject = encodeURIComponent(config.subject || 'Message from constituent');
        const encodedBody = encodeURIComponent(body);
        const mailtoLink = `mailto:${recipientEmails}?subject=${subject}&body=${encodedBody}`;
        
        // Provide feedback and show success message
        const sendBtn = $('send-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = `
                <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.8333 5L7.5 13.3333L4.16667 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="btn-text">Opening Email App...</span>
            `;
            
            // Show success feedback
            setTimeout(() => {
                showEmailSuccessMessage();
                sendBtn.innerHTML = `
                    <svg class="btn-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.3333 2.5L9.16667 11.6667" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.3333 2.5L12.5 18.3333L9.16667 11.6667L1.66667 8.33333L18.3333 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="btn-text">Open Email App</span>
                `;
                sendBtn.disabled = false;
            }, 1500);
        }
        
        // Track email send before opening mailto link
        try {
            // Send tracking data to server
            const trackingData = {
                name: name,
                email: email,
                postcode: postcode,
                personalNote: note,
                timestamp: new Date().toISOString()
            };

            fetch('/track-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trackingData)
            }).catch(err => {
                console.log('Analytics tracking failed (not critical):', err);
            });

            // Open mailto link
            window.location.href = mailtoLink;
        } catch (error) {
            console.error('Failed to open email client:', error);
            showStatus('Unable to open email client. Please copy the recipient emails manually.', 'error');
        }
    });
}

// Load and display analytics data
async function loadAnalytics() {
    const analyticsModal = $('analytics-modal');
    const analyticsLoading = $$('.analytics-loading');
    const analyticsData = $('analytics-data');
    const analyticsError = $('analytics-error');
    
    if (!analyticsModal) return;
    
    // Show modal and loading state
    analyticsModal.setAttribute('aria-hidden', 'false');
    if (analyticsLoading) analyticsLoading.style.display = 'block';
    if (analyticsData) analyticsData.style.display = 'none';
    if (analyticsError) analyticsError.style.display = 'none';
    
    try {
        const username = $('admin-username')?.value.trim() || '';
        const password = $('admin-password')?.value.trim() || '';
        
        if (!username || !password) {
            throw new Error('Please enter admin credentials first');
        }
        
        const credentials = btoa(`${username}:${password}`);
        const response = await fetch('/analytics', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to load analytics');
        }
        
        const data = await response.json();
        
        // Update summary cards
        const totalSendsEl = $('total-sends');
        const uniqueUsersEl = $('unique-users');
        if (totalSendsEl) totalSendsEl.textContent = data.summary.totalSends;
        if (uniqueUsersEl) uniqueUsersEl.textContent = data.summary.uniqueUsers;
        
        // Update recent sends list
        const recentSendsList = $('recent-sends-list');
        if (recentSendsList) {
            if (data.recentSends && data.recentSends.length > 0) {
                recentSendsList.innerHTML = '';
                data.recentSends.forEach(send => {
                    const sendDate = new Date(send.sentAt);
                    const timeAgo = getTimeAgo(sendDate);
                    const postcode = send.postcode ? ` (${send.postcode})` : '';
                    
                    const sendDiv = document.createElement('div');
                    sendDiv.className = 'send-item';
                    sendDiv.innerHTML = `
                        <div class="send-info">
                            <div class="send-name">${send.name}${postcode}</div>
                            <div class="send-details">Sent to ${send.recipientCount} recipient${send.recipientCount > 1 ? 's' : ''}</div>
                        </div>
                        <div class="send-time">${timeAgo}</div>
                    `;
                    recentSendsList.appendChild(sendDiv);
                });
            } else {
                recentSendsList.innerHTML = '<div class="no-data">No recent activity</div>';
            }
        }
        
        // Show data
        if (analyticsLoading) analyticsLoading.style.display = 'none';
        if (analyticsData) analyticsData.style.display = 'block';
        
    } catch (error) {
        console.error('Analytics error:', error);
        if (analyticsLoading) analyticsLoading.style.display = 'none';
        if (analyticsError) {
            analyticsError.style.display = 'block';
            const errorText = analyticsError.querySelector('p');
            if (errorText) {
                errorText.textContent = error.message || 'Unable to load analytics data';
            }
        }
    }
}

// Helper function to format time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Admin page functionality
function initAdminPage() {
    const adminForm = $('admin-form');
    if (!adminForm) return;
    
    // Analytics modal handlers
    const viewAnalyticsBtn = $('view-analytics');
    const analyticsModal = $('analytics-modal');
    const closeAnalyticsBtn = $('close-analytics');
    
    if (viewAnalyticsBtn && analyticsModal) {
        viewAnalyticsBtn.addEventListener('click', () => {
            loadAnalytics();
        });
    }
    
    if (closeAnalyticsBtn && analyticsModal) {
        closeAnalyticsBtn.addEventListener('click', () => {
            analyticsModal.setAttribute('aria-hidden', 'true');
        });
    }
    
    // Close modal when clicking outside
    if (analyticsModal) {
        analyticsModal.addEventListener('click', (e) => {
            if (e.target === analyticsModal) {
                analyticsModal.setAttribute('aria-hidden', 'true');
            }
        });
    }
    
    // Pre-populate fields with current config
    if (config) {
        const fields = {
            'cfg-title': config.title || '',
            'cfg-tagline': config.tagline || '',
            'cfg-subject': config.subject || '',
            'cfg-body': config.body || ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const field = $(id);
            if (field) field.value = value;
        });
        
        // Handle recipients
        const recipientsField = $('cfg-recipients');
        if (recipientsField && config.recipients) {
            const recipientLines = config.recipients
                .map(r => r.name ? `${r.name} <${r.email}>` : r.email)
                .join('\n');
            recipientsField.value = recipientLines;
        }
    }
    
    // Form submission
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = $('admin-username')?.value.trim() || '';
        const password = $('admin-password')?.value.trim() || '';
        
        if (!username || !password) {
            showStatus('Please enter both username and password', 'error');
            return;
        }
        
        // Gather form data
        const newConfig = {
            title: $('cfg-title')?.value.trim() || '',
            tagline: $('cfg-tagline')?.value.trim() || '',
            subject: $('cfg-subject')?.value.trim() || '',
            body: $('cfg-body')?.value || '',
            recipients: []
        };
        
        // Validate required fields
        if (!newConfig.title) {
            showStatus('Campaign title is required', 'error');
            $('cfg-title')?.focus();
            return;
        }
        
        if (!newConfig.subject) {
            showStatus('Email subject is required', 'error');
            $('cfg-subject')?.focus();
            return;
        }
        
        if (!newConfig.body) {
            showStatus('Email template is required', 'error');
            $('cfg-body')?.focus();
            return;
        }
        
        // Parse recipients
        const recipientLines = ($('cfg-recipients')?.value || '').split(/\r?\n/);
        for (const line of recipientLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            
            // Match "Name <email>" or just "email"
            const match = trimmed.match(/^(.*?)\s*<(.+@.+)>$/);
            if (match) {
                const name = match[1].trim();
                const email = match[2].trim();
                if (validateEmail(email)) {
                    newConfig.recipients.push({ name, email });
                }
            } else if (validateEmail(trimmed)) {
                newConfig.recipients.push({ name: '', email: trimmed });
            }
        }
        
        if (newConfig.recipients.length === 0) {
            showStatus('At least one valid recipient email is required', 'error');
            $('cfg-recipients')?.focus();
            return;
        }
        
        // Submit form
        try {
            showStatus('Saving configuration...', 'loading');
            const credentials = btoa(`${username}:${password}`);
            
            const response = await fetch('/admin/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${credentials}`
                },
                body: JSON.stringify(newConfig)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showStatus('Configuration saved successfully!', 'success');
                config = newConfig; // Update local config
            } else {
                showStatus(result.message || 'Failed to save configuration', 'error');
            }
            
        } catch (error) {
            console.error('Error saving config:', error);
            showStatus('Network error. Please check your connection and try again.', 'error');
        }
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    await loadConfig();
    
    // Initialize appropriate page functionality
    if (document.body.classList.contains('admin-body') || $('admin-form')) {
        initAdminPage();
    } else {
        initCampaignPage();
    }
    
    // Add touch feedback for buttons
    $$$('^button, .nav-link').forEach(button => {
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('touchend', () => {
            setTimeout(() => {
                button.style.transform = '';
            }, 100);
        });
    });
    
    // Prevent double-tap zoom on forms
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Handle viewport changes (keyboard show/hide on mobile)
    const viewportMeta = $$('meta[name="viewport"]');
    if (viewportMeta) {
        let isKeyboardOpen = false;
        
        window.addEventListener('resize', () => {
            const heightChange = window.innerHeight < window.screen.height * 0.75;
            
            if (heightChange !== isKeyboardOpen) {
                isKeyboardOpen = heightChange;
                document.body.classList.toggle('keyboard-open', isKeyboardOpen);
            }
        });
    }
    
    // Smooth scroll to form errors
    const errorObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const target = mutation.target;
                if (target.classList && target.classList.contains('error-message') && target.textContent.trim()) {
                    setTimeout(() => {
                        const field = target.previousElementSibling;
                        if (field && field.classList.contains('input')) {
                            field.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                }
            }
        });
    });
    
    $$$('^.error-message').forEach(el => {
        errorObserver.observe(el, {
            childList: true,
            characterData: true,
            subtree: true
        });
    });
});

// Handle page visibility changes (battery optimization)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause any ongoing processes when page is hidden
        showLoading(false);
    }
});

// Service worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
        // Could register service worker for offline functionality
        // navigator.serviceWorker.register('/sw.js');
    });
}
