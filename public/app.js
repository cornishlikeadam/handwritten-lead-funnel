document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // 1. Theme Toggle Logic
    // -------------------------------------------------------------
    const themeToggle = document.getElementById('theme-toggle');
    const themeCheckbox = document.getElementById('theme-checkbox');
    const body = document.body;

    // Check saved theme or default to dark (blueprint)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'classic') {
        body.classList.add('theme-classic');
        body.classList.remove('theme-dark');
        themeCheckbox.style.setProperty('--accent', 'var(--classic-accent)');
    } else {
        body.classList.add('theme-dark');
        body.classList.remove('theme-classic');
    }

    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('theme-classic')) {
            body.classList.remove('theme-classic');
            body.classList.add('theme-dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('theme-classic');
            body.classList.remove('theme-dark');
            localStorage.setItem('theme', 'classic');
        }
    });

    // -------------------------------------------------------------
    // 2. Choice Box Radio Selection Handler
    // -------------------------------------------------------------
    const choiceBoxes = document.querySelectorAll('.choice-box');
    choiceBoxes.forEach(box => {
        const input = box.querySelector('input');
        
        // Handle initial load state
        if (input && input.checked) {
            box.classList.add('selected');
        }

        box.addEventListener('click', () => {
            if (input && input.type === 'radio') {
                // Unselect other radios in the same group
                const name = input.name;
                document.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
                    radio.closest('.choice-box').classList.remove('selected');
                });
                box.classList.add('selected');
            } else if (input && input.type === 'checkbox') {
                box.classList.toggle('selected', input.checked);
            }
        });
    });

    // -------------------------------------------------------------
    // 3. Multi-Step Form Navigation & Validation
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
    const errorBubble = document.getElementById('error-message');

    function showError(message) {
        errorBubble.textContent = message;
        errorBubble.style.display = 'block';
        // Auto scroll to error
        errorBubble.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        errorBubble.style.display = 'none';
        errorBubble.textContent = '';
    }

    function validateStep(stepIndex) {
        hideError();

        if (stepIndex === 0) {
            const niche = document.getElementById('input-niche').value;
            const documenting = document.getElementById('input-documenting').value.trim();
            const goal = document.getElementById('input-goal').value.trim();
            const sprintShow = document.getElementById('input-sprint-show').value.trim();
            const sprintProve = document.getElementById('input-sprint-prove').value.trim();
            const sprintAction = document.getElementById('input-sprint-action').value.trim();

            if (!niche) {
                showError("Please select your niche / role first.");
                return false;
            }
            if (!documenting) {
                showError("Fill in what you are documenting.");
                return false;
            }
            if (!goal) {
                showError("Fill in your primary goal.");
                return false;
            }
            if (!sprintShow || !sprintProve || !sprintAction) {
                showError("Please complete your 30-day sprint details. They represent your public stakes!");
                return false;
            }
        } else if (stepIndex === 1) {
            const platform = document.getElementById('input-platform').value;
            const monetization = document.getElementById('input-monetization').value;

            if (!platform) {
                showError("Please choose a preferred newsletter platform.");
                return false;
            }
            if (!monetization) {
                showError("Please choose your preferred monetization route.");
                return false;
            }
        } else if (stepIndex === 2) {
            const name = document.getElementById('input-name').value.trim();
            const email = document.getElementById('input-email').value.trim();

            if (!name) {
                showError("Please enter your name.");
                return false;
            }
            if (!email) {
                showError("Please enter your email.");
                return false;
            }
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                showError("Please enter a valid email address.");
                return false;
            }
        }
        return true;
    }

    function goToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= steps.length) return;
        
        // Hide all steps, show active
        steps.forEach((step, idx) => {
            if (idx === stepIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Update step nodes indicator
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

    // Step navigation event listeners
    document.getElementById('next-btn-1').addEventListener('click', () => {
        if (validateStep(0)) goToStep(1);
    });

    document.getElementById('next-btn-2').addEventListener('click', () => {
        if (validateStep(1)) goToStep(2);
    });

    document.getElementById('prev-btn-2').addEventListener('click', () => {
        goToStep(0);
    });

    document.getElementById('prev-btn-3').addEventListener('click', () => {
        goToStep(1);
    });

    // Make nodes clickable directly if validated
    stepNodes.forEach((node, idx) => {
        node.addEventListener('click', () => {
            // Can go backwards freely or click next if the current step is valid
            if (idx < currentStep) {
                goToStep(idx);
            } else if (idx > currentStep) {
                // Attempt to skip forward - validate each step sequentially
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
    // 4. Form Submission and API Interaction
    // -------------------------------------------------------------
    const form = document.getElementById('signup-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(2)) return;

        // Collect all form data
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        // Add checked states that standard FormData can miss or formats differently
        data.joinMailingList = document.getElementById('input-mailing').checked;

        // Show loading state on button
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'STAMPING...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit form.');
            }

            // Render success screen
            document.getElementById('success-name').textContent = data.firstName;
            document.getElementById('success-email').textContent = data.email;
            
            form.style.display = 'none';
            document.getElementById('success-screen').style.display = 'flex';
            
            // Re-fetch ledger data if currently shown
            if (ledgerSection.style.display === 'block') {
                fetchLedger();
            }

        } catch (err) {
            showError(err.message || 'An error occurred. Please try again.');
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // -------------------------------------------------------------
    // 5. Admin Ledger (Subscriber List) Interaction
    // -------------------------------------------------------------
    const toggleLedgerBtn = document.getElementById('toggle-ledger-btn');
    const ledgerSection = document.getElementById('admin-ledger-section');
    const ledgerTbody = document.getElementById('ledger-tbody');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    let ledgerData = []; // Store currently loaded ledger items

    async function fetchLedger() {
        try {
            const response = await fetch('/api/subscribers');
            if (!response.ok) throw new Error('Failed to fetch subscribers');
            
            ledgerData = await response.json();
            renderLedger(ledgerData);
        } catch (err) {
            console.error('Error fetching ledger:', err);
            ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent);">Failed to load ledger records. Make sure the backend is running.</td></tr>`;
        }
    }

    function renderLedger(items) {
        if (!items || items.length === 0) {
            ledgerTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--ink-secondary);">No ledger records yet. Submissions will appear here.</td></tr>`;
            return;
        }

        ledgerTbody.innerHTML = items.map(item => {
            const dateStr = new Date(item.createdAt).toLocaleDateString();
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${escapeHTML(item.firstName)}</td>
                    <td>${escapeHTML(item.email)}</td>
                    <td>${escapeHTML(item.niche || 'N/A')}</td>
                    <td>${escapeHTML(item.documenting || 'N/A')}</td>
                    <td>${escapeHTML(item.monetization || 'N/A')}</td>
                    <td>${escapeHTML(item.emailPlatform || 'N/A')}</td>
                </tr>
            `;
        }).join('');
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

    toggleLedgerBtn.addEventListener('click', () => {
        if (ledgerSection.style.display === 'none') {
            ledgerSection.style.display = 'block';
            toggleLedgerBtn.textContent = 'Hide Subscriber Ledger';
            fetchLedger();
            // Scroll to ledger section
            setTimeout(() => {
                ledgerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            ledgerSection.style.display = 'none';
            toggleLedgerBtn.textContent = 'Show Subscriber Ledger';
        }
    });

    // CSV Export Logic
    exportCsvBtn.addEventListener('click', () => {
        if (ledgerData.length === 0) {
            alert('No records available to export.');
            return;
        }

        const headers = ['Date', 'First Name', 'Email', 'Niche', 'Documenting', 'Goal', '30DayShow', '30DayProve', '30DayAction', 'Email Platform', 'Audience Size', 'MonetizationPath', 'Mailing List Opt-In'];
        
        const rows = ledgerData.map(item => [
            new Date(item.createdAt).toISOString(),
            item.firstName,
            item.email,
            item.niche,
            item.documenting,
            item.goal,
            item.sprintShow,
            item.sprintProve,
            item.sprintAction,
            item.emailPlatform,
            item.audienceSize,
            item.monetization,
            item.joinMailingList ? 'Yes' : 'No'
        ]);

        // Escape double quotes and surround fields in quotes
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `seen_until_believed_ledger_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
