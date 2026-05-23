const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3005'
    : 'https://handwritten-lead-funnel.vercel.app';

document.addEventListener('DOMContentLoaded', () => {

    // Prefill name & email from sessionStorage if available (e.g. from homepage popup)
    const cachedName = sessionStorage.getItem('mirror5000_first_name');
    const cachedEmail = sessionStorage.getItem('mirror5000_email');
    if (cachedName && document.getElementById('input-name')) {
        document.getElementById('input-name').value = cachedName;
    }
    if (cachedEmail && document.getElementById('input-email')) {
        document.getElementById('input-email').value = cachedEmail;
    }

    // -------------------------------------------------------------
    // 1. Live Compilers / Sentence Builders
    // -------------------------------------------------------------
    const inputIdentity = document.getElementById('input-identity');
    const inputGoal = document.getElementById('input-goal');
    const inputDocumenting = document.getElementById('input-documenting');
    const identityRecap = document.getElementById('identity-recap');

    const inputChallenge = document.getElementById('input-challenge');
    const inputUpside = document.getElementById('input-upside');
    const inputDownside = document.getElementById('input-downside');
    const stakeRecap = document.getElementById('stake-recap');

    function updateIdentitySentence() {
        const idVal = inputIdentity.value || '[identity]';
        const goalVal = inputGoal.value || '[goal]';
        const docVal = inputDocumenting.value.trim() || '[journey]';
        identityRecap.textContent = `I am a ${idVal} trying to ${goalVal} by documenting ${docVal}.`;
    }

    function updateStakeStatement() {
        const upVal = inputUpside.value || '[upside]';
        const downVal = inputDownside.value || '[downside]';
        stakeRecap.textContent = `For the next 30 days, I am choosing visibility over hiding. If I complete this, I gain ${upVal}. If I quit, I stay stuck in ${downVal}.`;
    }

    if (inputIdentity) inputIdentity.addEventListener('change', updateIdentitySentence);
    if (inputGoal) inputGoal.addEventListener('change', updateIdentitySentence);
    if (inputDocumenting) inputDocumenting.addEventListener('input', updateIdentitySentence);

    if (inputUpside) inputUpside.addEventListener('change', updateStakeStatement);
    if (inputDownside) inputDownside.addEventListener('change', updateStakeStatement);

    // -------------------------------------------------------------
    // 2. Choice Cards (Radios / Checkboxes)
    // -------------------------------------------------------------
    const choiceCards = document.querySelectorAll('.grid-choice-card');

    // Initialize checked card states
    choiceCards.forEach(card => {
        const input = card.querySelector('input');
        if (input && input.checked) {
            card.classList.add('selected');
        }

        card.addEventListener('click', () => {
            if (!input) return;
            if (input.type === 'radio') {
                const groupName = input.name;
                document.querySelectorAll(`input[name="${groupName}"]`).forEach(radio => {
                    radio.closest('.grid-choice-card').classList.remove('selected');
                });
                input.checked = true;
                card.classList.add('selected');
            } else if (input.type === 'checkbox') {
                input.checked = !input.checked;
                card.classList.toggle('selected', input.checked);
            }
        });
    });

    // -------------------------------------------------------------
    // 3. Multi-Step Navigation & Validation
    // -------------------------------------------------------------
    const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3')
    ];
    const stepNodes = [
        document.getElementById('step-node-1'),
        document.getElementById('step-node-2'),
        document.getElementById('step-node-3')
    ];
    let currentStep = 0;
    const errorAlert = document.getElementById('error-alert');

    function showError(msg) {
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        errorAlert.textContent = '';
        errorAlert.style.display = 'none';
    }

    function validateStep(stepIndex) {
        hideError();

        if (stepIndex === 0) {
            const identity = inputIdentity.value;
            const goal = inputGoal.value;
            const documenting = inputDocumenting.value.trim();
            const challenge = inputChallenge.value.trim();
            const upside = inputUpside.value;
            const downside = inputDownside.value;

            if (!identity) {
                showError('Please select your visibility identity / role.');
                return false;
            }
            if (!goal) {
                showError('Please select your primary exit goal.');
                return false;
            }
            if (!documenting) {
                showError('Please input what journey or skill you are documenting.');
                return false;
            }
            if (!challenge) {
                showError('Please define your 30-day stake challenge details.');
                return false;
            }
            if (!upside) {
                showError('Please select what you gain on completion.');
                return false;
            }
            if (!downside) {
                showError('Please select what routine you stay stuck in on failure.');
                return false;
            }
        } else if (stepIndex === 1) {
            // Check that radio buttons are chosen
            const audienceVal = document.querySelector('input[name="audience_size"]:checked');
            const platformVal = document.querySelector('input[name="primary_platform"]:checked');
            const monetization = document.getElementById('input-monetization').value;
            const obstacle = document.getElementById('input-obstacle').value;

            if (!audienceVal) {
                showError('Please select your aggregate starting audience size.');
                return false;
            }
            if (!platformVal) {
                showError('Please select where you want to become visible first.');
                return false;
            }
            if (!monetization) {
                showError('Please select your primary monetization route.');
                return false;
            }
            if (!obstacle) {
                showError('Please select your biggest obstacle.');
                return false;
            }
        } else if (stepIndex === 2) {
            const name = document.getElementById('input-name').value.trim();
            const email = document.getElementById('input-email').value.trim();
            const consent = document.getElementById('input-consent').checked;

            if (!name) {
                showError('Please enter your name.');
                return false;
            }
            if (!email) {
                showError('Please enter your email address.');
                return false;
            }
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                showError('Please enter a valid email address.');
                return false;
            }
            if (!consent) {
                showError('Please consent to receiving the manual and updates.');
                return false;
            }
        }
        return true;
    }

    function goToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= steps.length) return;

        steps.forEach((step, idx) => {
            if (idx === stepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        stepNodes.forEach((node, idx) => {
            if (idx === stepIndex) {
                node.classList.add('active');
                node.classList.remove('completed');
            } else if (idx < stepIndex) {
                node.classList.remove('active');
                node.classList.add('completed');
            } else {
                node.classList.remove('active');
                node.classList.remove('completed');
            }
        });

        currentStep = stepIndex;
        hideError();
    }

    // Step Nav Listeners
    const nextBtn1 = document.getElementById('next-btn-1');
    const nextBtn2 = document.getElementById('next-btn-2');
    const prevBtn2 = document.getElementById('prev-btn-2');
    const prevBtn3 = document.getElementById('prev-btn-3');

    if (nextBtn1) nextBtn1.addEventListener('click', () => { if (validateStep(0)) goToStep(1); });
    if (nextBtn2) nextBtn2.addEventListener('click', () => { if (validateStep(1)) goToStep(2); });
    if (prevBtn2) prevBtn2.addEventListener('click', () => goToStep(0));
    if (prevBtn3) prevBtn3.addEventListener('click', () => goToStep(1));

    // Make nodes clickable directly if validated
    stepNodes.forEach((node, idx) => {
        node.addEventListener('click', () => {
            if (idx < currentStep) {
                goToStep(idx);
            } else if (idx > currentStep) {
                let canGo = true;
                for (let i = currentStep; i < idx; i++) {
                    if (!validateStep(i)) {
                        canGo = false;
                        break;
                    }
                }
                if (canGo) goToStep(idx);
            }
        });
    });

    // -------------------------------------------------------------
    // 4. Form Submission
    // -------------------------------------------------------------
    const form = document.getElementById('mirror-form');
    const submitBtn = document.getElementById('submit-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateStep(2)) return;

            // Honeypot check
            if (document.getElementById('hp-web').value || document.getElementById('hp-nick').value) {
                showError('Spam submission detected.');
                return;
            }

            // Get form values
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            data.consent_opt_in = document.getElementById('input-consent').checked;

            // Cache generated phrases and details in sessionStorage for confirmed page
            sessionStorage.setItem('mirror5000_identity_sentence', identityRecap.textContent);
            sessionStorage.setItem('mirror5000_stakes_statement', stakeRecap.textContent);
            sessionStorage.setItem('mirror5000_email', data.email);
            sessionStorage.setItem('mirror5000_first_name', data.first_name);

            // Display loading
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'STAMPING...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(API_BASE + '/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to submit workbook details.');
                }

                // Redirect on success
                window.location.href = 'confirmed.html';

            } catch (err) {
                showError(err.message || 'An error occurred. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // -------------------------------------------------------------
    // 5. Admin Ledger Overlay / Drawer Login
    // -------------------------------------------------------------
    const ledgerTrigger = document.getElementById('btn-ledger-trigger');
    const loginModal = document.getElementById('login-modal');
    const loginSubmit = document.getElementById('btn-login-submit');
    const loginCancel = document.getElementById('btn-login-cancel');
    const adminPassInput = document.getElementById('admin-pass-input');
    const adminDrawer = document.getElementById('admin-drawer-ledger');

    let adminToken = sessionStorage.getItem('mirror5000_admin_token') || null;
    let fullSubscriberList = [];

    function verifyBearCodeAndOpenLedger() {
        const bearCode = prompt("Enter Bear Code (🧸):");
        if (bearCode !== "9938") {
            alert("Incorrect Bear Code.");
            return;
        }

        // Bear Code matches, now verify/open ledger secret key
        if (adminToken) {
            adminDrawer.style.display = 'block';
            fetchAdminStats();
        } else {
            loginModal.style.display = 'flex';
            if (adminPassInput) adminPassInput.focus();
        }
    }

    // Trigger Ledger Drawer
    if (ledgerTrigger) {
        ledgerTrigger.addEventListener('click', () => {
            if (adminDrawer.style.display === 'block') {
                adminDrawer.style.display = 'none';
            } else {
                verifyBearCodeAndOpenLedger();
            }
        });
    }

    // Check if showLedger is passed in URL query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showLedger') === 'true') {
        verifyBearCodeAndOpenLedger();
    }

    if (loginCancel) {
        loginCancel.addEventListener('click', () => {
            loginModal.style.display = 'none';
            adminPassInput.value = '';
        });
    }

    if (loginSubmit) {
        loginSubmit.addEventListener('click', handleAdminLogin);
    }
    if (adminPassInput) {
        adminPassInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAdminLogin();
        });
    }

    async function handleAdminLogin() {
        const password = adminPassInput.value;
        if (!password) return alert('Please enter key password.');

        try {
            const response = await fetch(API_BASE + '/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Login failed.');

            adminToken = result.token;
            sessionStorage.setItem('mirror5000_admin_token', adminToken);

            loginModal.style.display = 'none';
            adminDrawer.style.display = 'block';
            adminPassInput.value = '';

            fetchAdminStats();

        } catch (err) {
            alert(err.message || 'Unauthorized Key.');
        }
    }

    // -------------------------------------------------------------
    // 6. Admin Panel Statistics & Outbox Retry
    // -------------------------------------------------------------
    async function fetchAdminStats() {
        if (!adminToken) return;

        try {
            const response = await fetch(API_BASE + '/api/admin/stats', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    sessionStorage.removeItem('mirror5000_admin_token');
                    adminToken = null;
                    adminDrawer.style.display = 'none';
                    alert('Session expired. Please log in again.');
                    return;
                }
                throw new Error('Failed to fetch ledger stats.');
            }

            const stats = await response.json();
            fullSubscriberList = stats.subscribers;

            // Fill numerical counters
            document.getElementById('stat-total').textContent = stats.totalSubscribers;
            document.getElementById('stat-today').textContent = stats.subscribersToday;
            document.getElementById('stat-monetization').textContent = stats.mostCommonMonetization;
            document.getElementById('stat-obstacle').textContent = stats.mostCommonObstacle;

            // Render Table Rows
            renderLedgerRows(fullSubscriberList);

            // Render Outbox retry listings
            renderOutboxQueue(stats.outbox);

        } catch (err) {
            console.error("Stats fetching error:", err);
            alert('Failed to retrieve intelligence ledger stats.');
        }
    }

    function renderLedgerRows(items) {
        const tbody = document.getElementById('ledger-rows');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; opacity: 0.6;">No database subscribers recorded.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const dateStr = new Date(item.created_at).toLocaleDateString();

            // Format contact details
            const emailHtml = item.email ? `<div><strong>Email:</strong> ${escapeHTML(item.email)}</div>` : '';
            const phoneHtml = item.phone ? `<div><strong>Phone:</strong> ${escapeHTML(item.phone)}</div>` : '';
            const cityHtml = item.city_state ? `<div><strong>Loc:</strong> ${escapeHTML(item.city_state)}</div>` : '';
            const contactInfo = `${emailHtml}${phoneHtml}${cityHtml}` || 'N/A';

            // Format social handles
            const instaHtml = item.instagram_handle ? `<div><strong>Insta:</strong> ${escapeHTML(item.instagram_handle)}</div>` : '';
            const tiktokHtml = item.tiktok_handle ? `<div><strong>TikTok:</strong> ${escapeHTML(item.tiktok_handle)}</div>` : '';
            const ytHtml = item.youtube_url ? `<div><strong>YT:</strong> <a href="${item.youtube_url.startsWith('http') ? item.youtube_url : 'https://' + item.youtube_url}" target="_blank" style="color: var(--accent-purple); word-break: break-all;">Link</a></div>` : '';
            const socialHandles = `${instaHtml}${tiktokHtml}${ytHtml}` || 'None';

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${escapeHTML(item.first_name)}</strong></td>
                    <td style="font-size: 0.85rem; line-height: 1.3;">${contactInfo}</td>
                    <td style="font-size: 0.85rem; line-height: 1.3;">${socialHandles}</td>
                    <td style="font-size: 0.85rem; line-height: 1.3;">
                        ${escapeHTML(item.generated_identity_sentence)}<br>
                        <span style="color: var(--stamp-red); font-style: italic;">"${escapeHTML(item.challenge_30_day)}"</span>
                    </td>
                    <td style="font-size: 0.85rem; line-height: 1.3;">
                        <strong>Obstacle:</strong> ${escapeHTML(item.biggest_obstacle)}<br>
                        <strong>Route:</strong> ${escapeHTML(item.monetization_route)}
                    </td>
                    <td style="font-size: 0.8rem; white-space: nowrap;">
                        Sub Welcome: <strong style="color: ${item.email_sent_status === 'sent' ? 'var(--success-green)' : 'var(--stamp-red)'}">${item.email_sent_status}</strong><br>
                        Admin Alert: <strong style="color: ${item.admin_notified_status === 'sent' ? 'var(--success-green)' : 'var(--stamp-red)'}">${item.admin_notified_status}</strong>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderOutboxQueue(outboxItems) {
        const outboxList = document.getElementById('outbox-list');
        if (!outboxList) return;

        if (!outboxItems || outboxItems.length === 0) {
            outboxList.innerHTML = `<p style="opacity: 0.6; font-size: 0.9rem;">No pending/failed emails in queue.</p>`;
            return;
        }

        outboxList.innerHTML = outboxItems.map(item => {
            const errText = item.error_message ? `<br><span style="color: var(--stamp-red); font-size: 0.75rem;">Error: ${escapeHTML(item.error_message)}</span>` : '';
            return `
                <div class="outbox-item">
                    <div class="outbox-details">
                        <strong>To:</strong> ${escapeHTML(item.recipient_email)} | <strong>Type:</strong> ${escapeHTML(item.email_type)}<br>
                        <strong>Subject:</strong> ${escapeHTML(item.subject)} | <strong>Retries:</strong> ${item.retry_count || 0}
                        ${errText}
                    </div>
                    <button type="button" class="btn-stamp" style="font-size: 0.8rem; padding: 6px 12px; transform: none;" onclick="retryOutboxEmail('${item.id}')">
                        Retry Send
                    </button>
                </div>
            `;
        }).join('');
    }

    // Global binding helper for retry button click
    window.retryOutboxEmail = async function(outboxId) {
        if (!adminToken) return;

        try {
            const response = await fetch(API_BASE + '/api/admin/retry-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ outboxId })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to retry email.');

            alert(result.message || 'Email successfully sent!');
            fetchAdminStats();

        } catch (err) {
            alert(err.message || 'Retry action failed.');
        }
    };

    // Client Side Search Filter
    const searchInput = document.getElementById('ledger-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderLedgerRows(fullSubscriberList);
                return;
            }

            const filtered = fullSubscriberList.filter(item => {
                return (
                    (item.first_name || '').toLowerCase().includes(query) ||
                    (item.email || '').toLowerCase().includes(query) ||
                    (item.primary_platform || '').toLowerCase().includes(query) ||
                    (item.generated_identity_sentence || '').toLowerCase().includes(query) ||
                    (item.biggest_obstacle || '').toLowerCase().includes(query) ||
                    (item.monetization_route || '').toLowerCase().includes(query)
                );
            });
            renderLedgerRows(filtered);
        });
    }

    // CSV Download Export
    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (fullSubscriberList.length === 0) {
                alert('No records available for export.');
                return;
            }

            const headers = [
                'Date', 'First Name', 'Email', 'Instagram', 'TikTok', 'YouTube URL', 'Phone', 'City/State',
                'Identity Role', 'Exit Goal', 'Documenting', 'Generated Identity Sentence',
                '30Day Challenge', 'Stakes Upside', 'Stakes Downside', 'Generated Stakes Sentence',
                'Audience Size', 'Primary Platform', 'Monetization Path', 'Biggest Obstacle',
                'Consent Opt-In', 'Source Page', 'Email Status', 'Admin Alert Status'
            ];

            const rows = fullSubscriberList.map(item => [
                new Date(item.created_at).toISOString(),
                item.first_name,
                item.email,
                item.instagram_handle,
                item.tiktok_handle,
                item.youtube_url,
                item.phone,
                item.city_state,
                item.identity_type,
                item.goal,
                item.documenting,
                item.generated_identity_sentence,
                item.challenge_30_day,
                item.upside,
                item.downside,
                item.generated_stake_statement,
                item.audience_size,
                item.primary_platform,
                item.monetization_route,
                item.biggest_obstacle,
                item.consent_opt_in ? 'Yes' : 'No',
                item.source_page || 'mirror5000',
                item.email_sent_status,
                item.admin_notified_status
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `mirror_5000_ledger_export_${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Live Signups Ticker Marquee Initialization
    const tickerMove = document.getElementById('recent-ticker-move');
    if (tickerMove) {
        loadRecentSignups();
    }

    async function loadRecentSignups() {
        const mockCreators = generateMockCreators();
        try {
            const response = await fetch(API_BASE + '/api/subscribers/recent');
            if (!response.ok) throw new Error('Failed to load recent signups');
            const data = await response.json();

            // Merge real signups at the front, followed by mock creators to pad it
            const merged = [...data];
            mockCreators.forEach(mock => {
                if (merged.length < 120) {
                    merged.push(mock);
                }
            });

            renderTicker(merged);
        } catch (err) {
            console.warn("Could not connect to live submissions API, falling back to mock logs:", err);
            renderTicker(mockCreators);
        }
    }

    function renderTicker(items) {
        if (!tickerMove) return;
        tickerMove.innerHTML = items.map(s => {
            return `<div class="ticker-item">
                <span class="highlight-name">${escapeHTML(s.name)}</span>
                (<span class="highlight-email">${escapeHTML(s.email)}</span>)
                just authorized mirror passport entry
            </div>`;
        }).join(' &nbsp;&bull;&nbsp; ');
    }

    function generateMockCreators() {
        const names = [
            "Kendren", "Tachyon", "Aria", "Julian", "Marcus", "Sienna", "Elena", "Liam", "Sophia", "Zavier",
            "Chloe", "Devon", "Amara", "Kai", "Maya", "Silas", "Freya", "Jonah", "Leila", "Dante",
            "Zoe", "Luca", "Nova", "Jasper", "Zara", "Tristan", "Naomi", "Ezra", "Iris", "Felix",
            "Clara", "Leo", "Ruby", "Ada", "Jude", "Gwen", "Kaelen", "Fiona", "Cassian", "Seraphina",
            "Callum", "Lyra", "Rowan", "Evangeline", "Beckett", "Isla", "Gideon", "Maeve", "Cyrus",
            "Ophelia", "Lachlan", "Astrid", "Atticus", "Genevieve", "Rory", "Aurelia", "Soren", "Elowen",
            "Cassius", "Thalia", "Kian", "Mirabelle", "Killian", "Tobias", "Nadia", "Ronan", "Imogen",
            "Balthazar", "Axiom", "Zephyr", "Orion", "Lysander", "Calliope", "Peregrine", "Elara", "Rohan",
            "Evander", "Keanu", "Samira", "Callista", "Castor", "Echo", "Faye", "Griffin", "Helix", "Indigo",
            "Osiris", "Phoenix", "Quest", "River", "Sage", "Sol", "Titus", "Vesper", "Winter", "Xanthe",
            "Yael", "Zenith", "Atlas", "Caspian", "Dax", "Harlow", "Idris", "Jett", "Koda", "Lennox",
            "Magnus", "Nola", "Opal", "Priya", "Remy", "Salem", "Tatum", "Wilder", "Zuri"
        ];
        const domains = ["gmail.com", "proton.me", "substack.com", "beehiiv.com", "yahoo.com", "icloud.com", "outlook.com", "hey.com"];

        const mockList = [];
        for (let i = 0; i < 120; i++) {
            const baseName = names[i % names.length];
            const nameSuffix = (i >= names.length) ? String(i) : "";
            const fullName = baseName + nameSuffix;

            const domain = domains[(i * 3) % domains.length];
            const emailPrefix = baseName.toLowerCase() + (i % 7 ? String(i % 100) : "");

            const visibleNameLen = Math.min(2, fullName.length);
            const obfuscatedName = fullName.substring(0, visibleNameLen) + '***';

            const visibleEmailLen = Math.min(2, emailPrefix.length);
            const obfuscatedEmail = emailPrefix.substring(0, visibleEmailLen) + '***@' + domain;

            mockList.push({ name: obfuscatedName, email: obfuscatedEmail });
        }
        return mockList;
    }

    // Admin Ledger Tab Switching
    const tabButtons = document.querySelectorAll('.ledger-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabId = btn.getAttribute('data-tab');
            if (tabId === 'subscribers') {
                document.getElementById('tab-subscribers').style.display = 'block';
                document.getElementById('tab-outbox').style.display = 'none';
            } else {
                document.getElementById('tab-subscribers').style.display = 'none';
                document.getElementById('tab-outbox').style.display = 'block';
            }
        });
    });
});
