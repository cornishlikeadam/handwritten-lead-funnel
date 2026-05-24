const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3005'
    : 'https://handwritten-lead-funnel.vercel.app';

const isTest = window.location.pathname.includes('-test');
const apiSuffix = isTest ? '-test' : '';

document.addEventListener('DOMContentLoaded', () => {
    
    // Prefill name & email from sessionStorage if available
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
        if (!inputIdentity || !inputGoal || !inputDocumenting) return;
        const idVal = inputIdentity.value || '[identity]';
        const goalVal = inputGoal.value || '[goal]';
        const docVal = inputDocumenting.value.trim() || '[journey]';
        identityRecap.textContent = `I am a ${idVal} trying to ${goalVal} by documenting ${docVal}.`;
    }

    function updateStakeStatement() {
        if (!inputUpside || !inputDownside) return;
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
        if (!errorAlert) return;
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        if (errorAlert) {
            errorAlert.textContent = '';
            errorAlert.style.display = 'none';
        }
    }

    function validateStep(stepIndex) {
        hideError();

        if (stepIndex === 0) {
            const identity = inputIdentity ? inputIdentity.value : '';
            const goal = inputGoal ? inputGoal.value : '';
            const documenting = inputDocumenting ? inputDocumenting.value.trim() : '';
            const challenge = inputChallenge ? inputChallenge.value.trim() : '';
            const upside = inputUpside ? inputUpside.value : '';
            const downside = inputDownside ? inputDownside.value : '';

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
            const audienceVal = document.querySelector('input[name="audience_size"]:checked');
            const platformVal = document.querySelector('input[name="primary_platform"]:checked');
            const monetization = document.getElementById('input-monetization') ? document.getElementById('input-monetization').value : '';
            const obstacle = document.getElementById('input-obstacle') ? document.getElementById('input-obstacle').value : '';

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
            const nameEl = document.getElementById('input-name');
            const emailEl = document.getElementById('input-email');
            const consentEl = document.getElementById('input-consent');
            
            const name = nameEl ? nameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const consent = consentEl ? consentEl.checked : false;

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
        if (!steps[0]) return; // Form not present on this page

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

    stepNodes.forEach((node, idx) => {
        if (!node) return;
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

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            data.consent_opt_in = document.getElementById('input-consent').checked;

            sessionStorage.setItem('mirror5000_identity_sentence', identityRecap.textContent);
            sessionStorage.setItem('mirror5000_stakes_statement', stakeRecap.textContent);
            sessionStorage.setItem('mirror5000_email', data.email);
            sessionStorage.setItem('mirror5000_first_name', data.first_name);

            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'STAMPING...';
            submitBtn.disabled = true;

            try {
                const response = await fetch(API_BASE + `/api/subscribe${apiSuffix}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to submit details.');
                }

                sessionStorage.setItem('mirror5000_subscriber_id', result.redirectUrl.split('id=')[1] || '');
                window.location.href = result.redirectUrl;

            } catch (err) {
                showError(err.message || 'An error occurred. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // -------------------------------------------------------------
    // 5. Admin Ledger Drawer Authorization
    // -------------------------------------------------------------
    const ledgerTrigger = document.getElementById('btn-ledger-trigger');
    const loginModal = document.getElementById('login-modal');
    const loginSubmit = document.getElementById('btn-login-submit');
    const loginCancel = document.getElementById('btn-login-cancel');
    const adminPassInput = document.getElementById('admin-pass-input');
    const adminDrawer = document.getElementById('admin-drawer-ledger');

    let adminToken = sessionStorage.getItem('mirror5000_admin_token') || null;
    let fullSubscriberList = [];
    let fullPurchasesList = [];

    function verifyBearCodeAndOpenLedger() {
        const bearCode = prompt("Enter Bear Code (🧸) for Sandbox ledger:");
        if (bearCode !== "9938") {
            alert("Incorrect Bear Code.");
            return;
        }
        
        if (adminToken) {
            adminDrawer.style.display = 'block';
            fetchAdminStats();
        } else {
            loginModal.style.display = 'flex';
            if (adminPassInput) adminPassInput.focus();
        }
    }

    if (ledgerTrigger) {
        ledgerTrigger.addEventListener('click', () => {
            if (adminDrawer.style.display === 'block') {
                adminDrawer.style.display = 'none';
            } else {
                verifyBearCodeAndOpenLedger();
            }
        });
    }

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
        if (!password) return alert('Please enter password key.');

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
    // 6. Admin Panel Statistics & Checklist Renderer
    // -------------------------------------------------------------
    async function fetchAdminStats() {
        if (!adminToken) return;

        try {
            const response = await fetch(API_BASE + `/api/admin/stats${apiSuffix}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
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
            fullPurchasesList = stats.purchases;

            // Render Subscribers Ledger Tab
            document.getElementById('stat-total').textContent = stats.totalSubscribers || 0;
            document.getElementById('stat-today').textContent = stats.subscribersToday || 0;
            document.getElementById('stat-monetization').textContent = stats.mostCommonMonetization || 'N/A';
            document.getElementById('stat-obstacle').textContent = stats.mostCommonObstacle || 'N/A';
            renderLedgerRows(fullSubscriberList);

            // Render Sales Ledger Tab
            document.getElementById('stat-sales-revenue').textContent = `$${stats.totalRevenue}`;
            document.getElementById('stat-sales-paid').textContent = stats.totalPurchases;
            document.getElementById('stat-sales-pending').textContent = stats.pendingCount;
            document.getElementById('stat-sales-conversion').textContent = stats.conversionRate;
            document.getElementById('stat-sales-remaining').textContent = stats.copiesRemaining;
            renderSalesRows(fullPurchasesList);

            // Render Email Queue Tab
            renderOutboxQueue(stats.outbox);

            // Render Setup Checklist Tab
            renderChecklist(stats.checklist);

        } catch (err) {
            console.error("Stats fetching error:", err);
            alert('Failed to retrieve sandbox ledger stats.');
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
            const emailHtml = item.email ? `<div><strong>Email:</strong> ${escapeHTML(item.email)}</div>` : '';
            const phoneHtml = item.phone ? `<div><strong>Phone:</strong> ${escapeHTML(item.phone)}</div>` : '';
            const cityHtml = item.city_state ? `<div><strong>Loc:</strong> ${escapeHTML(item.city_state)}</div>` : '';
            const contactInfo = `${emailHtml}${phoneHtml}${cityHtml}` || 'N/A';

            const instaHtml = item.instagram_handle ? `<div><strong>Insta:</strong> ${escapeHTML(item.instagram_handle)}</div>` : '';
            const tiktokHtml = item.tiktok_handle ? `<div><strong>TikTok:</strong> ${escapeHTML(item.tiktok_handle)}</div>` : '';
            const ytHtml = item.youtube_url ? `<div><strong>YT:</strong> <a href="${item.youtube_url.startsWith('http') ? item.youtube_url : 'https://' + item.youtube_url}" target="_blank" style="color: var(--accent-purple); word-break: break-all;">Link</a></div>` : '';
            const socialHandles = `${instaHtml}${tiktokHtml}${ytHtml}` || 'None';

            const kitBadge = item.interested_execution_kit
                ? `<br><span style="background: rgba(108,148,130,0.15); color: var(--success-green); padding: 1px 4px; font-weight: bold; border-radius: 2px; font-size: 0.75rem;">Kit Interest</span>`
                : '';

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
                        ${kitBadge}
                    </td>
                    <td style="font-size: 0.8rem; white-space: nowrap;">
                        Sub Welcome: <strong style="color: ${item.email_sent_status === 'sent' ? 'var(--success-green)' : 'var(--stamp-red)'}">${item.email_sent_status}</strong><br>
                        Admin Alert: <strong style="color: ${item.admin_notified_status === 'sent' ? 'var(--success-green)' : 'var(--stamp-red)'}">${item.admin_notified_status}</strong>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderSalesRows(items) {
        const tbody = document.getElementById('sales-ledger-rows');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; opacity: 0.6;">No sandbox purchases recorded yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(item => {
            const dateStr = new Date(item.created_at).toLocaleDateString();
            const priceStr = `$${(item.price_cents / 100).toFixed(2)}`;
            
            let statusColor = 'var(--gold)';
            if (item.payment_status === 'paid') statusColor = 'var(--success-green)';
            if (item.payment_status === 'failed') statusColor = 'var(--stamp-red)';

            let actionButtons = '';
            if (item.payment_status !== 'paid') {
                actionButtons += `<button type="button" class="btn-stamp" style="font-size: 0.75rem; padding: 4px 8px; transform: none; box-shadow: 2px 2px 0 var(--shadow-charcoal);" onclick="approvePurchase('${item.id}')">Verify Paid</button>`;
            } else {
                actionButtons += `<button type="button" class="btn-stamp" style="font-size: 0.75rem; padding: 4px 8px; transform: none; box-shadow: 2px 2px 0 var(--shadow-charcoal);" onclick="resendEbookLink('${item.id}')">Resend Link</button>`;
            }

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${escapeHTML(item.email)}</strong></td>
                    <td style="font-size: 0.85rem;">${escapeHTML(item.product_name)}</td>
                    <td style="font-family: var(--font-heading);">${priceStr}</td>
                    <td style="font-size: 0.85rem; text-transform: uppercase;">
                        ${escapeHTML(item.payment_mode)} / ${escapeHTML(item.payment_provider || 'N/A')}
                    </td>
                    <td>
                        <strong style="color: ${statusColor}; text-transform: uppercase; font-size: 0.85rem;">
                            ${escapeHTML(item.payment_status)}
                        </strong>
                        ${item.paid_at ? `<div style="font-size: 0.75rem; opacity: 0.6;">Paid: ${new Date(item.paid_at).toLocaleDateString()}</div>` : ''}
                        ${item.download_count > 0 ? `<div style="font-size: 0.75rem; color: var(--success-green);">Downloads: ${item.download_count}</div>` : ''}
                    </td>
                    <td>
                        <div style="display: flex; gap: 5px;">
                            ${actionButtons}
                        </div>
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

    function renderChecklist(checklist) {
        if (!checklist) return;

        const setStatus = (id, valid, successText, failText) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (valid) {
                el.innerHTML = `<span style="color: var(--success-green); font-weight: bold;">✓ ${successText}</span>`;
            } else {
                el.innerHTML = `<span style="color: var(--stamp-red); font-weight: bold;">⚠️ ${failText}</span>`;
            }
        };

        // Render Assets checklist items
        setStatus('check-asset-free-pdf', checklist.freePdfExists, 'Local Found', 'Missing (public/assets/seen-until-believed-sacred-tech-edition.pdf)');
        setStatus('check-asset-paid-pdf', checklist.trillionPdfExists, 'Local Found', 'Missing (public/assets/trillion-dollar-miracle.pdf)');
        setStatus('check-asset-free-cover', checklist.freeCoverExists, 'Local Found', 'Missing (public/assets/seen_until_believed_cover.jpg)');
        setStatus('check-asset-paid-cover', checklist.trillionCoverExists, 'Local Found', 'Missing (public/assets/trillion-dollar-miracle-cover.jpg)');
        setStatus('check-asset-video-url', checklist.videoUrlConfigured, 'Configured', 'Using Placeholder');
        setStatus('check-asset-admin-pass', checklist.adminPasswordConfigured, 'Configured', "Default '9938' Active");
        setStatus('check-asset-sender-email', checklist.senderEmailConfigured, 'Configured', 'Using Default SMTP User');
        setStatus('check-asset-admin-email', checklist.adminNotificationEmailConfigured, 'Configured', 'Default (kendren/tachyon@proton.me)');

        // Render SMTP checklist items
        setStatus('check-smtp-host', checklist.smtpHostConfigured, 'Set', 'Not Configured (Fallback Local files)');
        setStatus('check-smtp-port', checklist.smtpPortConfigured, 'Set', 'Missing');
        setStatus('check-smtp-user', checklist.smtpUsernameConfigured, 'Set', 'Missing');
        setStatus('check-smtp-pass', checklist.smtpPasswordConfigured, 'Set', 'Missing');

        // Render Payment Mode
        const modeEl = document.getElementById('check-payment-mode');
        const detailsEl = document.getElementById('check-payment-details');
        
        if (modeEl && detailsEl) {
            modeEl.textContent = checklist.paymentMode;
            if (checklist.paymentMode === 'manual') {
                if (checklist.cashappTagConfigured) {
                    detailsEl.innerHTML = `Cash App mode enabled. Cashtag is set in environment (✓ verified). Manual admin approval required to unlock.`;
                } else {
                    detailsEl.innerHTML = `<span style="color: var(--stamp-red); font-weight: bold;">⚠️ CASHAPP_CASHTAG not set.</span> Please configure it in your Vercel Project Settings.`;
                }
            } else if (checklist.paymentMode === 'stripe') {
                if (checklist.stripeKeysConfigured) {
                    detailsEl.innerHTML = `Stripe Checkout enabled. Stripe Secret Keys & Webhooks verified (✓ active). Autounlocks are enabled.`;
                } else {
                    detailsEl.innerHTML = `<span style="color: var(--stamp-red); font-weight: bold;">⚠️ Stripe keys missing.</span> Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_TRILLION.`;
                }
            } else {
                if (checklist.externalCheckoutConfigured) {
                    detailsEl.innerHTML = `External checkout URL verified (✓ active). Will redirect clicks directly. Autounlocks are enabled.`;
                } else {
                    detailsEl.innerHTML = `<span style="color: var(--stamp-red); font-weight: bold;">⚠️ TRILLION_CHECKOUT_URL missing.</span> Please set the link.`;
                }
            }
        }
    }

    // -------------------------------------------------------------
    // 7. Global Actions for Ledger Purchases
    // -------------------------------------------------------------
    window.approvePurchase = async function(purchaseId) {
        if (!adminToken) return;
        if (!confirm('Mark this Cash App/Manual transaction as verified? This generates download tokens and emails access link.')) return;

        try {
            const res = await fetch(API_BASE + `/api/admin/mark-paid${apiSuffix}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ purchaseId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to verify transaction.');

            alert(data.message || 'Payment verified. Ebook download tokens emailed successfully.');
            fetchAdminStats();
        } catch (err) {
            alert(err.message || 'Approval action failed.');
        }
    };

    window.resendEbookLink = async function(purchaseId) {
        if (!adminToken) return;
        if (!confirm('Resend access download link email to buyer?')) return;

        try {
            const res = await fetch(API_BASE + `/api/admin/resend-link${apiSuffix}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify({ purchaseId })
            });
            if (!res.ok) throw new Error('Resend link failed.');

            alert('Download link successfully queued & resent!');
            fetchAdminStats();
        } catch (err) {
            alert(err.message || 'Action failed.');
        }
    };

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

    // Client Side Search Filters
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

    const salesSearchInput = document.getElementById('sales-ledger-search');
    if (salesSearchInput) {
        salesSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderSalesRows(fullPurchasesList);
                return;
            }
            const filtered = fullPurchasesList.filter(item => {
                return (item.email || '').toLowerCase().includes(query);
            });
            renderSalesRows(filtered);
        });
    }

    // CSV Download Export: Subscribers
    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (fullSubscriberList.length === 0) {
                alert('No records available for export.');
                return;
            }
            const headers = ['Date', 'First Name', 'Email', 'Instagram', 'TikTok', 'YouTube URL', 'Phone', 'City/State', 'Identity Role', 'Exit Goal', 'Documenting', 'Challenge Stakes', 'Agg Audience', 'Platform', 'Monetization Path', 'Biggest Obstacle', 'Execution Kit Waitlist'];
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
                item.generated_stake_statement,
                item.audience_size,
                item.primary_platform,
                item.monetization_route,
                item.biggest_obstacle,
                item.interested_execution_kit ? 'Yes' : 'No'
            ]);
            downloadCSV(headers, rows, 'mirror_5000_sandbox_subscribers');
        });
    }

    // CSV Download Export: Sales Purchases
    const exportSalesCsvBtn = document.getElementById('btn-export-sales-csv');
    if (exportSalesCsvBtn) {
        exportSalesCsvBtn.addEventListener('click', () => {
            if (fullPurchasesList.length === 0) {
                alert('No purchase logs available for export.');
                return;
            }
            const headers = ['Date', 'Email', 'Product', 'Original Price Cents', 'Paid Price Cents', 'Currency', 'Payment Mode', 'Provider', 'Status', 'Paid At', 'Downloads Count'];
            const rows = fullPurchasesList.map(item => [
                new Date(item.created_at).toISOString(),
                item.email,
                item.product_name,
                item.original_price_cents,
                item.price_cents,
                item.currency,
                item.payment_mode,
                item.payment_provider || '',
                item.payment_status,
                item.paid_at || '',
                item.download_count
            ]);
            downloadCSV(headers, rows, 'mirror_5000_sandbox_sales');
        });
    }

    function downloadCSV(headers, rows, fileName) {
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}_export_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    // Admin Ledger Tab Switching
    const tabButtons = document.querySelectorAll('.ledger-tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.ledger-tab-content').forEach(panel => {
                panel.style.display = 'none';
            });
            document.getElementById(`tab-${tabId}`).style.display = 'block';
        });
    });
});
