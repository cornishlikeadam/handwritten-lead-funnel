const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prevent static caching during development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// PRIVATE ROUTING
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mirror5000.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mirror5000.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000/confirmed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'confirmed.html'), { dotfiles: 'allow' });
});

app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

// Database File Paths (Fallback JSON)
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_BUILDER;
const DB_FILE = isVercel ? '/tmp/subscribers.json' : path.join(__dirname, 'subscribers.json');
const OUTBOX_DB_FILE = isVercel ? '/tmp/email_outbox.json' : path.join(__dirname, 'email_outbox.json');
const OUTBOX_DIR = isVercel ? '/tmp/outbox' : path.join(__dirname, 'outbox');

// Ensure fallback directories exist
if (!isVercel && !fs.existsSync(OUTBOX_DIR)) {
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
} else if (isVercel && !fs.existsSync('/tmp/outbox')) {
    fs.mkdirSync('/tmp/outbox', { recursive: true });
}

// Database Connection & Helper Functions
const usePostgres = !!process.env.DATABASE_URL;
let pool = null;

if (usePostgres) {
    console.log("PostgreSQL Database URL detected. Preparing connection pool...");
    const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isLocal ? false : { rejectUnauthorized: false }
    });
}

// Initialize tables or files
async function dbInit() {
    if (usePostgres) {
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS subscribers (
                    id VARCHAR(255) PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT NOW(),
                    first_name VARCHAR(255),
                    email VARCHAR(255) NOT NULL UNIQUE,
                    instagram_handle VARCHAR(255),
                    tiktok_handle VARCHAR(255),
                    youtube_url TEXT,
                    phone VARCHAR(255),
                    city_state VARCHAR(255),
                    identity_type VARCHAR(255),
                    goal TEXT,
                    documenting TEXT,
                    generated_identity_sentence TEXT,
                    challenge_30_day TEXT,
                    upside VARCHAR(255),
                    downside VARCHAR(255),
                    generated_stake_statement TEXT,
                    audience_size VARCHAR(255),
                    primary_platform VARCHAR(255),
                    monetization_route VARCHAR(255),
                    biggest_obstacle VARCHAR(255),
                    consent_opt_in BOOLEAN DEFAULT FALSE,
                    source_page VARCHAR(255) DEFAULT 'mirror5000',
                    email_sent_status VARCHAR(255) DEFAULT 'pending',
                    admin_notified_status VARCHAR(255) DEFAULT 'pending'
                );
            `);
            await pool.query(`
                ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS waitlist_kit BOOLEAN DEFAULT FALSE;
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS email_outbox (
                    id VARCHAR(255) PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT NOW(),
                    recipient_email VARCHAR(255) NOT NULL,
                    email_type VARCHAR(255),
                    subject VARCHAR(255),
                    body TEXT,
                    status VARCHAR(255) DEFAULT 'pending',
                    error_message TEXT,
                    retry_count INTEGER DEFAULT 0
                );
            `);
            console.log("PostgreSQL tables checked and ready.");
        } catch (err) {
            console.error("Failed to check/create PostgreSQL tables:", err);
        }
    } else {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
        }
        if (!fs.existsSync(OUTBOX_DB_FILE)) {
            fs.writeFileSync(OUTBOX_DB_FILE, JSON.stringify([], null, 2), 'utf8');
        }
        console.log("Fallback JSON database files checked and ready.");
    }
}

// Call init
dbInit();

// Db Access functions
async function getSubscribers() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM subscribers ORDER BY created_at DESC');
        return res.rows;
    } else {
        try {
            if (!fs.existsSync(DB_FILE)) return [];
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading JSON subscribers:", err);
            return [];
        }
    }
}

async function addSubscriber(sub) {
    if (usePostgres) {
        const query = `
            INSERT INTO subscribers (
                id, created_at, first_name, email, instagram_handle, tiktok_handle, youtube_url, phone, city_state,
                identity_type, goal, documenting, generated_identity_sentence, challenge_30_day, upside, downside,
                generated_stake_statement, audience_size, primary_platform, monetization_route, biggest_obstacle,
                consent_opt_in, source_page, email_sent_status, admin_notified_status
            ) VALUES (
                $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
            )
        `;
        const values = [
            sub.id, sub.first_name, sub.email, sub.instagram_handle, sub.tiktok_handle, sub.youtube_url, sub.phone, sub.city_state,
            sub.identity_type, sub.goal, sub.documenting, sub.generated_identity_sentence, sub.challenge_30_day, sub.upside, sub.downside,
            sub.generated_stake_statement, sub.audience_size, sub.primary_platform, sub.monetization_route, sub.biggest_obstacle,
            sub.consent_opt_in, sub.source_page || 'mirror5000', sub.email_sent_status || 'pending', sub.admin_notified_status || 'pending'
        ];
        await pool.query(query, values);
    } else {
        const subs = await getSubscribers();
        if (subs.some(s => s.email.toLowerCase() === sub.email.toLowerCase())) {
            throw new Error('Email already registered in the field system.');
        }
        sub.created_at = new Date().toISOString();
        subs.push(sub);
        fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
    }
}

async function updateSubscriberStatus(id, email_sent_status, admin_notified_status) {
    if (usePostgres) {
        await pool.query(
            'UPDATE subscribers SET email_sent_status = $1, admin_notified_status = $2 WHERE id = $3',
            [email_sent_status, admin_notified_status, id]
        );
    } else {
        const subs = await getSubscribers();
        const sub = subs.find(s => s.id === id);
        if (sub) {
            sub.email_sent_status = email_sent_status;
            sub.admin_notified_status = admin_notified_status;
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        }
    }
}

async function getEmailOutbox() {
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM email_outbox ORDER BY created_at DESC');
        return res.rows;
    } else {
        try {
            if (!fs.existsSync(OUTBOX_DB_FILE)) return [];
            return JSON.parse(fs.readFileSync(OUTBOX_DB_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading JSON outbox:", err);
            return [];
        }
    }
}

async function addEmailToOutbox(email) {
    if (usePostgres) {
        const query = `
            INSERT INTO email_outbox (
                id, created_at, recipient_email, email_type, subject, body, status, error_message, retry_count
            ) VALUES (
                $1, NOW(), $2, $3, $4, $5, $6, $7, $8
            )
        `;
        const values = [
            email.id, email.recipient_email, email.email_type, email.subject, email.body, email.status || 'pending', email.error_message || null, email.retry_count || 0
        ];
        await pool.query(query, values);
    } else {
        const outbox = await getEmailOutbox();
        email.created_at = new Date().toISOString();
        outbox.push(email);
        fs.writeFileSync(OUTBOX_DB_FILE, JSON.stringify(outbox, null, 2), 'utf8');
    }
}

async function updateEmailOutboxStatus(id, status, error_message, retry_count) {
    if (usePostgres) {
        await pool.query(
            'UPDATE email_outbox SET status = $1, error_message = $2, retry_count = $3 WHERE id = $4',
            [status, error_message, retry_count, id]
        );
    } else {
        const outbox = await getEmailOutbox();
        const email = outbox.find(e => e.id === id);
        if (email) {
            email.status = status;
            email.error_message = error_message;
            email.retry_count = retry_count;
            fs.writeFileSync(OUTBOX_DB_FILE, JSON.stringify(outbox, null, 2), 'utf8');
        }
    }
}

// Custom Deterministic Admin Token
const adminPassword = process.env.ADMIN_LEDGER_PASSWORD || 'admin123';
const ADMIN_TOKEN = crypto.createHash('sha256').update(adminPassword).digest('hex');

// In-Memory Rate Limiter Map
const ipRequests = new Map();
function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 mins
    const maxRequests = 10;
    
    if (!ipRequests.has(ip)) {
        ipRequests.set(ip, []);
    }
    
    const timestamps = ipRequests.get(ip).filter(t => now - t < windowMs);
    timestamps.push(now);
    ipRequests.set(ip, timestamps);
    
    if (timestamps.length > maxRequests) {
        return res.status(429).json({ error: 'Too many registration requests. Please try again later.' });
    }
    next();
}

// Require Admin Middleware
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized. Authorization header missing.' });
    }
    const token = authHeader.replace('Bearer ', '');
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Invalid ledger token.' });
    }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// -------------------------------------------------------------
// API: Subscribe Endpoint
// -------------------------------------------------------------
app.post('/api/subscribe', rateLimiter, async (req, res) => {
    const {
        first_name,
        email,
        instagram_handle,
        tiktok_handle,
        youtube_url,
        phone,
        city_state,
        identity_type,
        goal,
        documenting,
        challenge_30_day,
        upside,
        downside,
        audience_size,
        primary_platform,
        monetization_route,
        biggest_obstacle,
        consent_opt_in,
        // Honeypot fields
        website,
        nickname
    } = req.body;

    // 1. Honeypot check
    if (website || nickname) {
        console.warn("Spam detected: Honeypot field triggered.");
        return res.status(400).json({ error: 'Spam submission rejected.' });
    }

    // 2. Core validations
    if (!first_name || !email) {
        return res.status(400).json({ error: 'First Name and Email are required.' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // 3. Assemble generated sentences
    const identityDropdownVal = identity_type === 'other' ? 'someone starting over' : (identity_type || 'builder');
    const generated_identity_sentence = `I am a ${identityDropdownVal} trying to ${goal || 'escape the rut'} by documenting ${documenting || 'my daily build'}.`;
    const generated_stake_statement = `For the next 30 days, I am choosing visibility over hiding. If I complete this, I gain ${upside || 'momentum'}. If I quit, I stay stuck in ${downside || 'invisibility'}.`;

    const subId = crypto.randomUUID();
    const newSubscriber = {
        id: subId,
        first_name,
        email,
        instagram_handle: instagram_handle || null,
        tiktok_handle: tiktok_handle || null,
        youtube_url: youtube_url || null,
        phone: phone || null,
        city_state: city_state || null,
        identity_type: identity_type || null,
        goal: goal || null,
        documenting: documenting || null,
        generated_identity_sentence,
        challenge_30_day: challenge_30_day || null,
        upside: upside || null,
        downside: downside || null,
        generated_stake_statement,
        audience_size: audience_size || null,
        primary_platform: primary_platform || null,
        monetization_route: monetization_route || null,
        biggest_obstacle: biggest_obstacle || null,
        consent_opt_in: consent_opt_in === true || consent_opt_in === 'true',
        source_page: 'mirror5000',
        email_sent_status: 'pending',
        admin_notified_status: 'pending'
    };

    // 4. Save subscriber to database
    try {
        await addSubscriber(newSubscriber);
    } catch (err) {
        console.error("DB Error adding subscriber:", err);
        return res.status(400).json({ error: err.message || 'Failed to save entry.' });
    }

    // 5. Trigger email flow asynchronously
    dispatchEmails(newSubscriber);

    return res.status(200).json({
        message: 'Successfully registered in the Mirror 5000 system.',
        redirectUrl: '/mirror5000/confirmed'
    });
});

// -------------------------------------------------------------
// API: Waitlist Opt-In Endpoint
// -------------------------------------------------------------
app.post('/api/waitlist', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        if (usePostgres) {
            const result = await pool.query(
                'UPDATE subscribers SET waitlist_kit = TRUE WHERE LOWER(email) = LOWER($1) RETURNING *',
                [email]
            );
            if (result.rowCount === 0) {
                const subId = crypto.randomUUID();
                await pool.query(
                    'INSERT INTO subscribers (id, created_at, email, waitlist_kit, source_page) VALUES ($1, NOW(), $2, TRUE, $3)',
                    [subId, email, 'waitlist_kit']
                );
            }
        } else {
            const subs = await getSubscribers();
            let sub = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
            if (sub) {
                sub.waitlist_kit = true;
            } else {
                sub = {
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                    email: email,
                    waitlist_kit: true,
                    source_page: 'waitlist_kit'
                };
                subs.push(sub);
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        }
        res.json({ success: true, message: 'Successfully joined waitlist.' });
    } catch (err) {
        console.error("Waitlist DB update failed:", err);
        res.status(500).json({ error: err.message || 'Failed to join waitlist.' });
    }
});

// -------------------------------------------------------------
// Admin Authentication & Ledger API
// -------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === adminPassword) {
        return res.json({ token: ADMIN_TOKEN });
    } else {
        return res.status(401).json({ error: 'Unauthorized. Invalid ledger key.' });
    }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const subs = await getSubscribers();
        const outbox = await getEmailOutbox();
        
        // Calculate aggregations
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        const subsToday = subs.filter(s => new Date(s.created_at) >= startOfToday).length;

        // Monetization routes
        const monetizationCounts = {};
        subs.forEach(s => {
            const val = s.monetization_route || s.monetization || 'unknown';
            monetizationCounts[val] = (monetizationCounts[val] || 0) + 1;
        });
        let topMonetization = 'N/A';
        let maxMon = 0;
        for (const [r, c] of Object.entries(monetizationCounts)) {
            if (c > maxMon) {
                maxMon = c;
                topMonetization = r;
            }
        }

        // Obstacles
        const obstacleCounts = {};
        subs.forEach(s => {
            const val = s.biggest_obstacle || s.obstacle || 'unknown';
            obstacleCounts[val] = (obstacleCounts[val] || 0) + 1;
        });
        let topObstacle = 'N/A';
        let maxObs = 0;
        for (const [o, c] of Object.entries(obstacleCounts)) {
            if (c > maxObs) {
                maxObs = c;
                topObstacle = o;
            }
        }

        // Audience size breakdown
        const audienceCounts = {};
        subs.forEach(s => {
            const val = s.audience_size || s.audienceSize || 'I have no audience yet';
            audienceCounts[val] = (audienceCounts[val] || 0) + 1;
        });

        res.json({
            totalSubscribers: subs.length,
            subscribersToday: subsToday,
            mostCommonMonetization: topMonetization,
            mostCommonObstacle: topObstacle,
            audienceSizeBreakdown: audienceCounts,
            subscribers: subs,
            outbox: outbox.filter(e => e.status !== 'sent') // pending or failed queue
        });
    } catch (err) {
        console.error("Error generating admin statistics:", err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Retry Email Endpoint
app.post('/api/admin/retry-email', requireAdmin, async (req, res) => {
    const { outboxId } = req.body;
    if (!outboxId) return res.status(400).json({ error: 'Outbox entry ID required.' });

    try {
        const outbox = await getEmailOutbox();
        const mailEntry = outbox.find(e => e.id === outboxId);
        if (!mailEntry) return res.status(404).json({ error: 'Email outbox entry not found.' });

        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;

        if (smtpHost && smtpUser && smtpPass) {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: parseInt(process.env.SMTP_PORT) === 465,
                auth: { user: smtpUser, pass: smtpPass }
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || `"Kendren Cornish" <${smtpUser}>`,
                to: mailEntry.recipient_email,
                subject: mailEntry.subject,
                html: mailEntry.body
            };

            // Attach PDF to welcome email if local and exists
            const isWelcome = mailEntry.email_type === 'welcome';
            const pdfPath = path.join(__dirname, 'public', 'assets', 'seen-until-believed-sacred-tech-edition.pdf');
            if (isWelcome && fs.existsSync(pdfPath)) {
                mailOptions.attachments = [{
                    filename: 'seen-until-believed-sacred-tech-edition.pdf',
                    path: pdfPath
                }];
            }

            await transporter.sendMail(mailOptions);
            await updateEmailOutboxStatus(outboxId, 'sent', null, (mailEntry.retry_count || 0) + 1);

            // Update subscriber list statuses
            const subs = await getSubscribers();
            const sub = subs.find(s => s.email.toLowerCase() === mailEntry.recipient_email.toLowerCase());
            if (sub) {
                if (isWelcome) {
                    await updateSubscriberStatus(sub.id, 'sent', sub.admin_notified_status);
                } else {
                    await updateSubscriberStatus(sub.id, sub.email_sent_status, 'sent');
                }
            }

            return res.json({ success: true, message: 'Email sent successfully on retry.' });
        } else {
            return res.status(400).json({ error: 'SMTP server details not configured. Cannot send.' });
        }
    } catch (err) {
        console.error("Retry email failed:", err);
        return res.status(500).json({ error: err.message || 'Retry failed.' });
    }
});

// -------------------------------------------------------------
// Email Dispatch Helper Engine
// -------------------------------------------------------------
async function dispatchEmails(subscriber) {
    const pdfPath = path.join(__dirname, 'public', 'assets', 'seen-until-believed-sacred-tech-edition.pdf');
    const pdfUrl = process.env.PDF_DOWNLOAD_URL || `http://localhost:${PORT}/assets/seen-until-believed-sacred-tech-edition.pdf`;

    // 1. WELCOME EMAIL FOR SUBSCRIBER
    const welcomeSubject = 'Your Mirror 5000 Field Copy Is Inside';
    const welcomeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your Mirror 5000 Entry</title>
        <style>
            body {
                background-color: #F4EEDC; /* Cream */
                color: #171717; /* Ink */
                font-family: 'Courier New', Courier, monospace, sans-serif;
                padding: 30px;
                margin: 0;
            }
            .card {
                background-color: #F7F1E1;
                border: 3px solid #171717;
                border-radius: 8px;
                max-width: 600px;
                margin: 0 auto;
                padding: 30px;
                box-shadow: 6px 6px 0px #2B2B2B;
            }
            .stamp-logo {
                border: 3px double #B12A22; /* Stamp Red */
                color: #B12A22;
                font-weight: bold;
                padding: 8px 16px;
                display: inline-block;
                transform: rotate(-3deg);
                margin-bottom: 25px;
                text-transform: uppercase;
                font-size: 20px;
                letter-spacing: 2px;
            }
            .accent-line {
                border-top: 2px dashed #6E8BAA;
                margin: 20px 0;
            }
            .highlight {
                background-color: rgba(196, 154, 69, 0.15); /* Muted gold */
                padding: 2px 6px;
                font-weight: bold;
            }
            .btn {
                display: inline-block;
                background-color: #B12A22;
                color: #F4EEDC !important;
                text-decoration: none;
                font-weight: bold;
                padding: 12px 24px;
                border: 2px solid #171717;
                border-radius: 4px;
                box-shadow: 4px 4px 0px #171717;
                text-transform: uppercase;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="stamp-logo">VISIBLE</div>
            
            <p>You're in.</p>
            
            <p>Your field copy of <strong>Seen Until Believed / The Gospel of Going Visible</strong> is ready:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="${pdfUrl}" class="btn" target="_blank">Download Field Manual</a>
            </p>

            <p>Read it like a field manual, not a motivational quote book.</p>

            <p>Your ordinary life is not the limitation. The frame is.</p>

            <div class="accent-line"></div>

            <p><strong>Your story alignment:</strong></p>
            <p class="highlight">"${subscriber.generated_identity_sentence}"</p>

            <p><strong>Your commitments:</strong></p>
            <p class="highlight">"${subscriber.generated_stake_statement}"</p>

            <div class="accent-line"></div>

            <p><strong>Your first move:</strong><br>
            Write one sentence that names your story. That sentence is your first mirror.</p>

            <p>Reply to this email with your 30-day stake if you want me to see what you're building.</p>

            <p>— Kendren<br><strong>Mirror 5000</strong></p>
        </div>
    </body>
    </html>
    `;

    // 2. ADMIN NOTIFICATION EMAIL
    const adminSubject = 'New Mirror 5000 Subscriber';
    const adminEmailAddress = process.env.ADMIN_EMAIL || 'TACYHON@proton.me';
    const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { background-color: #F4EEDC; color: #171717; font-family: monospace; padding: 20px; }
            .card { background-color: #ffffff; border: 2px solid #171717; padding: 20px; }
            h3 { color: #B12A22; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            td.label { font-weight: bold; width: 220px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h3>New subscriber entered the field system.</h3>
            <table>
                <tr><td class="label">Name:</td><td>${subscriber.first_name}</td></tr>
                <tr><td class="label">Email:</td><td>${subscriber.email}</td></tr>
                <tr><td class="label">Identity:</td><td>${subscriber.generated_identity_sentence}</td></tr>
                <tr><td class="label">30-Day Stake:</td><td>${subscriber.generated_stake_statement}</td></tr>
                <tr><td class="label">Audience Size:</td><td>${subscriber.audience_size}</td></tr>
                <tr><td class="label">Primary Platform:</td><td>${subscriber.primary_platform}</td></tr>
                <tr><td class="label">Monetization Route:</td><td>${subscriber.monetization_route}</td></tr>
                <tr><td class="label">Biggest Obstacle:</td><td>${subscriber.biggest_obstacle}</td></tr>
                <tr><td class="label">Instagram:</td><td>${subscriber.instagram_handle || 'N/A'}</td></tr>
                <tr><td class="label">TikTok:</td><td>${subscriber.tiktok_handle || 'N/A'}</td></tr>
                <tr><td class="label">YouTube:</td><td>${subscriber.youtube_url || 'N/A'}</td></tr>
                <tr><td class="label">Phone:</td><td>${subscriber.phone || 'N/A'}</td></tr>
                <tr><td class="label">City/State:</td><td>${subscriber.city_state || 'N/A'}</td></tr>
                <tr><td class="label">Timestamp:</td><td>${new Date().toISOString()}</td></tr>
            </table>
        </div>
    </body>
    </html>
    `;

    const welcomeEmailId = crypto.randomUUID();
    const adminEmailId = crypto.randomUUID();

    const welcomeOutbox = {
        id: welcomeEmailId,
        recipient_email: subscriber.email,
        email_type: 'welcome',
        subject: welcomeSubject,
        body: welcomeHtml,
        status: 'pending',
        error_message: null
    };

    const adminOutbox = {
        id: adminEmailId,
        recipient_email: adminEmailAddress,
        email_type: 'admin_notification',
        subject: adminSubject,
        body: adminHtml,
        status: 'pending',
        error_message: null
    };

    // SMTP Check
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        console.log(`SMTP Credentials found. Sending real emails...`);
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        // Send Welcome
        try {
            const welcomeOptions = {
                from: process.env.SMTP_FROM || `"Kendren Cornish" <${smtpUser}>`,
                to: subscriber.email,
                subject: welcomeSubject,
                html: welcomeHtml
            };
            if (fs.existsSync(pdfPath)) {
                welcomeOptions.attachments = [{
                    filename: 'seen-until-believed-sacred-tech-edition.pdf',
                    path: pdfPath
                }];
            }
            await transporter.sendMail(welcomeOptions);
            welcomeOutbox.status = 'sent';
        } catch (err) {
            console.error("Welcome email delivery failed:", err);
            welcomeOutbox.status = 'failed';
            welcomeOutbox.error_message = err.message;
        }

        // Send Admin alert
        try {
            const adminOptions = {
                from: process.env.SMTP_FROM || `"Mirror 5000" <${smtpUser}>`,
                to: adminEmailAddress,
                subject: adminSubject,
                html: adminHtml
            };
            await transporter.sendMail(adminOptions);
            adminOutbox.status = 'sent';
        } catch (err) {
            console.error("Admin alert delivery failed:", err);
            adminOutbox.status = 'failed';
            adminOutbox.error_message = err.message;
        }

        // Save state logs to databases
        await addEmailToOutbox(welcomeOutbox);
        await addEmailToOutbox(adminOutbox);
        await updateSubscriberStatus(subscriber.id, welcomeOutbox.status, adminOutbox.status);

    } else {
        // Fallback Outbox Mode: Save emails to text files in /outbox/ and queue in db outbox
        console.log(`SMTP not configured. Running in Local Outbox mode...`);
        
        // Write physical files
        try {
            const safeEmail = subscriber.email.replace(/[^a-zA-Z0-9]/g, '_');
            const fileSuffix = Date.now();
            
            const filePrefixSub = `<!--\nTO: ${subscriber.email}\nSUBJECT: ${welcomeSubject}\nTYPE: welcome\n-->\n`;
            const filePrefixAdmin = `<!--\nTO: ${adminEmailAddress}\nSUBJECT: ${adminSubject}\nTYPE: admin_notification\n-->\n`;
            
            const localOutboxSub = path.join(OUTBOX_DIR, `welcome_to_${safeEmail}_${fileSuffix}.html`);
            const localOutboxAdmin = path.join(OUTBOX_DIR, `admin_alert_${safeEmail}_${fileSuffix}.html`);

            fs.writeFileSync(localOutboxSub, filePrefixSub + welcomeHtml, 'utf8');
            fs.writeFileSync(localOutboxAdmin, filePrefixAdmin + adminHtml, 'utf8');
            
            console.log(`Mock Welcome HTML saved to: ${localOutboxSub}`);
            console.log(`Mock Admin HTML saved to: ${localOutboxAdmin}`);
        } catch (err) {
            console.error("Failed to write email outbox text files:", err);
        }

        // Save DB states
        welcomeOutbox.status = 'pending';
        adminOutbox.status = 'pending';
        
        await addEmailToOutbox(welcomeOutbox);
        await addEmailToOutbox(adminOutbox);
        await updateSubscriberStatus(subscriber.id, 'pending', 'pending');
    }
}

// -------------------------------------------------------------
// Start Server Daemon
// -------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`\n🚀 Seen Until Believed Mirror 5000 running at http://localhost:${PORT}`);
    console.log(`📂 Subscribers DB File: ${DB_FILE}`);
    console.log(`📬 Outbox File: ${OUTBOX_DB_FILE}`);
});
