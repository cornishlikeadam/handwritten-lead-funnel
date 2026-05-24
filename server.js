const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_BUILDER || !!process.env.VERCEL_ENV;

// Middleware
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
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

app.get('/mirror5000/payment-pending', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-pending.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000/trillion-unlocked', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trillion-unlocked.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mirror5000-test.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000-test/confirmed', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'confirmed-test.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000-test/payment-pending', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'payment-pending.html'), { dotfiles: 'allow' });
});

app.get('/mirror5000-test/trillion-unlocked', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trillion-unlocked.html'), { dotfiles: 'allow' });
});

app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

// Database File Paths (Fallback JSON)
const DB_FILE = isVercel ? '/tmp/subscribers.json' : path.join(__dirname, 'subscribers.json');
const OUTBOX_DB_FILE = isVercel ? '/tmp/email_outbox.json' : path.join(__dirname, 'email_outbox.json');
const PURCHASES_DB_FILE = isVercel ? '/tmp/purchases.json' : path.join(__dirname, 'purchases.json');
const OUTBOX_DIR = isVercel ? '/tmp/outbox' : path.join(__dirname, 'outbox');

// Ensure fallback directories exist
if (!isVercel && !fs.existsSync(OUTBOX_DIR)) {
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
} else if (isVercel && !fs.existsSync('/tmp/outbox')) {
    fs.mkdirSync('/tmp/outbox', { recursive: true });
}

// Database Connection & Helper Functions
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const usePostgres = !!postgresUrl;
const allowEphemeralFallback = process.env.ALLOW_EPHEMERAL_FALLBACK === 'true';
let pool = null;

if (usePostgres) {
    console.log("PostgreSQL Database URL detected. Preparing connection pool...");
    const isLocal = postgresUrl.includes('localhost') || postgresUrl.includes('127.0.0.1');
    pool = new Pool({
        connectionString: postgresUrl,
        ssl: isLocal ? false : { rejectUnauthorized: false }
    });
}

function getPersistenceStatus() {
    if (usePostgres) {
        return { mode: 'postgres', permanent: true, configured: true };
    }

    if (isVercel && !allowEphemeralFallback) {
        return {
            mode: 'unconfigured',
            permanent: false,
            configured: false,
            message: 'DATABASE_URL or POSTGRES_URL is required in Vercel production to permanently store subscribers.'
        };
    }

    return {
        mode: isVercel ? 'ephemeral-json' : 'local-json',
        permanent: !isVercel,
        configured: true
    };
}

function assertWritablePersistence() {
    const status = getPersistenceStatus();
    if (!status.configured) {
        const err = new Error(status.message);
        err.statusCode = 503;
        throw err;
    }
}

function cleanText(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length ? text : null;
}

function normalizeEmail(value) {
    const email = cleanText(value);
    return email ? email.toLowerCase() : null;
}

function asBoolean(value) {
    return value === true || value === 'true' || value === 'on' || value === '1';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getPublicBaseUrl() {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return `http://localhost:${PORT}`;
}

// Initialize tables or files
async function dbInit() {
    if (usePostgres) {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                email VARCHAR(320) NOT NULL UNIQUE
            );
        `);
        await pool.query(`
            ALTER TABLE subscribers
                ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(255),
                ADD COLUMN IF NOT EXISTS tiktok_handle VARCHAR(255),
                ADD COLUMN IF NOT EXISTS youtube_url TEXT,
                ADD COLUMN IF NOT EXISTS phone VARCHAR(255),
                ADD COLUMN IF NOT EXISTS city_state VARCHAR(255),
                ADD COLUMN IF NOT EXISTS identity_type VARCHAR(255),
                ADD COLUMN IF NOT EXISTS goal TEXT,
                ADD COLUMN IF NOT EXISTS documenting TEXT,
                ADD COLUMN IF NOT EXISTS generated_identity_sentence TEXT,
                ADD COLUMN IF NOT EXISTS challenge_30_day TEXT,
                ADD COLUMN IF NOT EXISTS upside VARCHAR(255),
                ADD COLUMN IF NOT EXISTS downside VARCHAR(255),
                ADD COLUMN IF NOT EXISTS generated_stake_statement TEXT,
                ADD COLUMN IF NOT EXISTS audience_size VARCHAR(255),
                ADD COLUMN IF NOT EXISTS primary_platform VARCHAR(255),
                ADD COLUMN IF NOT EXISTS monetization_route VARCHAR(255),
                ADD COLUMN IF NOT EXISTS biggest_obstacle VARCHAR(255),
                ADD COLUMN IF NOT EXISTS consent_opt_in BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS source_page VARCHAR(255) DEFAULT 'mirror5000',
                ADD COLUMN IF NOT EXISTS email_sent_status VARCHAR(255) DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS admin_notified_status VARCHAR(255) DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS waitlist_kit BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS purchase_intent BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS selected_offer VARCHAR(255),
                ADD COLUMN IF NOT EXISTS selected_price INTEGER,
                ADD COLUMN IF NOT EXISTS buyer_status VARCHAR(255) DEFAULT 'lead',
                ADD COLUMN IF NOT EXISTS last_offer_clicked_at TIMESTAMPTZ,
                ADD COLUMN IF NOT EXISTS interested_execution_kit BOOLEAN DEFAULT FALSE;
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_outbox (
                id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                recipient_email VARCHAR(320) NOT NULL
            );
        `);
        await pool.query(`
            ALTER TABLE email_outbox
                ADD COLUMN IF NOT EXISTS email_type VARCHAR(255),
                ADD COLUMN IF NOT EXISTS subject VARCHAR(255),
                ADD COLUMN IF NOT EXISTS body TEXT,
                ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS error_message TEXT,
                ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                subscriber_id VARCHAR(255),
                email VARCHAR(320) NOT NULL,
                product_slug VARCHAR(255) NOT NULL,
                product_name VARCHAR(255) NOT NULL,
                original_price_cents INTEGER DEFAULT 8700,
                price_cents INTEGER DEFAULT 2700,
                currency VARCHAR(10) DEFAULT 'usd',
                payment_mode VARCHAR(50) DEFAULT 'manual',
                payment_provider VARCHAR(50),
                payment_status VARCHAR(50) DEFAULT 'pending',
                checkout_session_id VARCHAR(255),
                payment_intent_id VARCHAR(255),
                purchase_intent BOOLEAN DEFAULT TRUE,
                checkout_started_at TIMESTAMPTZ,
                paid_at TIMESTAMPTZ,
                download_token TEXT,
                download_token_expires_at TIMESTAMPTZ,
                download_count INTEGER DEFAULT 0,
                refund_status VARCHAR(50) DEFAULT 'none',
                admin_notes TEXT,
                source_page VARCHAR(255) DEFAULT 'mirror5000'
            );
        `);
        await pool.query(`
            ALTER TABLE purchases
                ADD COLUMN IF NOT EXISTS source_page VARCHAR(255) DEFAULT 'mirror5000';
        `);
        console.log("PostgreSQL tables checked and ready.");
    } else {
        if (isVercel && !allowEphemeralFallback) {
            console.warn("DATABASE_URL/POSTGRES_URL is missing in Vercel. Write endpoints will reject submissions to prevent data loss.");
            return;
        }
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
        }
        if (!fs.existsSync(OUTBOX_DB_FILE)) {
            fs.writeFileSync(OUTBOX_DB_FILE, JSON.stringify([], null, 2), 'utf8');
        }
        if (!fs.existsSync(PURCHASES_DB_FILE)) {
            fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify([], null, 2), 'utf8');
        }
        console.log("Fallback JSON database files checked and ready.");
    }
}

// Call init
let dbInitError = null;
let dbInitRetry = null;
const dbReady = dbInit().catch((err) => {
    dbInitError = err;
    console.error("Database initialization failed:", err);
});

async function ensureDbReady() {
    await dbReady;
    if (dbInitError) {
        const firstError = dbInitError;
        if (!dbInitRetry) {
            dbInitRetry = dbInit()
                .then(() => {
                    dbInitError = null;
                    console.warn("Database initialization recovered after retry:", firstError.message);
                })
                .catch((retryErr) => {
                    dbInitError = retryErr;
                    throw retryErr;
                })
                .finally(() => {
                    dbInitRetry = null;
                });
        }
        await dbInitRetry;
    }
}

// Db Access functions
async function getSubscribers() {
    await ensureDbReady();
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM subscribers ORDER BY created_at DESC');
        return res.rows;
    } else {
        if (isVercel && !allowEphemeralFallback) return [];
        try {
            if (!fs.existsSync(DB_FILE)) return [];
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading JSON subscribers:", err);
            return [];
        }
    }
}

async function getPurchases() {
    await ensureDbReady();
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM purchases ORDER BY created_at DESC');
        return res.rows;
    } else {
        if (isVercel && !allowEphemeralFallback) return [];
        try {
            if (!fs.existsSync(PURCHASES_DB_FILE)) return [];
            return JSON.parse(fs.readFileSync(PURCHASES_DB_FILE, 'utf8'));
        } catch (err) {
            console.error("Error reading JSON purchases:", err);
            return [];
        }
    }
}

async function addPurchase(purchase) {
    await ensureDbReady();
    assertWritablePersistence();

    if (usePostgres) {
        const query = `
            INSERT INTO purchases (
                id, created_at, subscriber_id, email, product_slug, product_name,
                original_price_cents, price_cents, currency, payment_mode, payment_provider,
                payment_status, checkout_session_id, payment_intent_id, purchase_intent,
                checkout_started_at, paid_at, download_token, download_token_expires_at,
                download_count, refund_status, admin_notes, source_page
            ) VALUES (
                $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            )
            RETURNING *
        `;
        const values = [
            purchase.id, purchase.subscriber_id, purchase.email, purchase.product_slug, purchase.product_name,
            purchase.original_price_cents || 8700, purchase.price_cents || 2700, purchase.currency || 'usd',
            purchase.payment_mode || 'manual', purchase.payment_provider || null, purchase.payment_status || 'pending',
            purchase.checkout_session_id || null, purchase.payment_intent_id || null, purchase.purchase_intent ?? true,
            purchase.checkout_started_at || null, purchase.paid_at || null, purchase.download_token || null,
            purchase.download_token_expires_at || null, purchase.download_count || 0, purchase.refund_status || 'none',
            purchase.admin_notes || null, purchase.source_page || 'mirror5000'
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    } else {
        const purchases = await getPurchases();
        purchase.created_at = new Date().toISOString();
        purchases.push(purchase);
        fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
        return purchase;
    }
}

async function updatePurchaseStatus(id, payment_status, paid_at, download_token, download_token_expires_at) {
    await ensureDbReady();
    assertWritablePersistence();

    if (usePostgres) {
        await pool.query(
            `UPDATE purchases SET 
                payment_status = $1, 
                paid_at = $2, 
                download_token = $3, 
                download_token_expires_at = $4 
             WHERE id = $5`,
            [payment_status, paid_at, download_token, download_token_expires_at, id]
        );
    } else {
        const purchases = await getPurchases();
        const purchase = purchases.find(p => p.id === id);
        if (purchase) {
            purchase.payment_status = payment_status;
            purchase.paid_at = paid_at;
            purchase.download_token = download_token;
            purchase.download_token_expires_at = download_token_expires_at;
            fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
        }
    }
}

async function updateSubscriberPurchaseIntent(email, purchase_intent, selected_offer, selected_price) {
    await ensureDbReady();
    assertWritablePersistence();

    if (usePostgres) {
        await pool.query(
            `UPDATE subscribers SET 
                purchase_intent = $1, 
                selected_offer = $2, 
                selected_price = $3, 
                last_offer_clicked_at = NOW() 
             WHERE LOWER(email) = LOWER($4)`,
            [purchase_intent, selected_offer, selected_price, email]
        );
    } else {
        const subs = await getSubscribers();
        const sub = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (sub) {
            sub.purchase_intent = purchase_intent;
            sub.selected_offer = selected_offer;
            sub.selected_price = selected_price;
            sub.last_offer_clicked_at = new Date().toISOString();
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        }
    }
}

async function updateSubscriberKitInterest(email, interested) {
    await ensureDbReady();
    assertWritablePersistence();

    if (usePostgres) {
        await pool.query(
            `UPDATE subscribers SET 
                interested_execution_kit = $1 
             WHERE LOWER(email) = LOWER($2)`,
            [interested, email]
        );
    } else {
        const subs = await getSubscribers();
        const sub = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (sub) {
            sub.interested_execution_kit = interested;
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        }
    }
}

async function addSubscriber(sub) {
    await ensureDbReady();
    assertWritablePersistence();

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
            ON CONFLICT (email) DO UPDATE SET
                first_name = EXCLUDED.first_name,
                instagram_handle = COALESCE(EXCLUDED.instagram_handle, subscribers.instagram_handle),
                tiktok_handle = COALESCE(EXCLUDED.tiktok_handle, subscribers.tiktok_handle),
                youtube_url = COALESCE(EXCLUDED.youtube_url, subscribers.youtube_url),
                phone = COALESCE(EXCLUDED.phone, subscribers.phone),
                city_state = COALESCE(EXCLUDED.city_state, subscribers.city_state),
                identity_type = COALESCE(EXCLUDED.identity_type, subscribers.identity_type),
                goal = COALESCE(EXCLUDED.goal, subscribers.goal),
                documenting = COALESCE(EXCLUDED.documenting, subscribers.documenting),
                generated_identity_sentence = COALESCE(EXCLUDED.generated_identity_sentence, subscribers.generated_identity_sentence),
                challenge_30_day = COALESCE(EXCLUDED.challenge_30_day, subscribers.challenge_30_day),
                upside = COALESCE(EXCLUDED.upside, subscribers.upside),
                downside = COALESCE(EXCLUDED.downside, subscribers.downside),
                generated_stake_statement = COALESCE(EXCLUDED.generated_stake_statement, subscribers.generated_stake_statement),
                audience_size = COALESCE(EXCLUDED.audience_size, subscribers.audience_size),
                primary_platform = COALESCE(EXCLUDED.primary_platform, subscribers.primary_platform),
                monetization_route = COALESCE(EXCLUDED.monetization_route, subscribers.monetization_route),
                biggest_obstacle = COALESCE(EXCLUDED.biggest_obstacle, subscribers.biggest_obstacle),
                consent_opt_in = EXCLUDED.consent_opt_in,
                source_page = EXCLUDED.source_page
            RETURNING *
        `;
        const values = [
            sub.id, sub.first_name, sub.email, sub.instagram_handle, sub.tiktok_handle, sub.youtube_url, sub.phone, sub.city_state,
            sub.identity_type, sub.goal, sub.documenting, sub.generated_identity_sentence, sub.challenge_30_day, sub.upside, sub.downside,
            sub.generated_stake_statement, sub.audience_size, sub.primary_platform, sub.monetization_route, sub.biggest_obstacle,
            sub.consent_opt_in, sub.source_page || 'mirror5000', sub.email_sent_status || 'pending', sub.admin_notified_status || 'pending'
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    } else {
        const subs = await getSubscribers();
        const existingIdx = subs.findIndex(s => s.email.toLowerCase() === sub.email.toLowerCase());
        if (existingIdx !== -1) {
            const existing = subs[existingIdx];
            const merged = { ...existing };
            Object.entries(sub).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    merged[key] = value;
                }
            });
            merged.id = existing.id;
            merged.created_at = existing.created_at;
            merged.email_sent_status = existing.email_sent_status || sub.email_sent_status || 'pending';
            merged.admin_notified_status = existing.admin_notified_status || sub.admin_notified_status || 'pending';
            subs[existingIdx] = merged;
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
            return merged;
        } else {
            sub.created_at = new Date().toISOString();
            subs.push(sub);
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
            return sub;
        }
    }
}

async function updateSubscriberStatus(id, email_sent_status, admin_notified_status) {
    await ensureDbReady();
    assertWritablePersistence();

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
    await ensureDbReady();
    if (usePostgres) {
        const res = await pool.query('SELECT * FROM email_outbox ORDER BY created_at DESC');
        return res.rows;
    } else {
        if (isVercel && !allowEphemeralFallback) return [];
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
    await ensureDbReady();
    assertWritablePersistence();

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
    await ensureDbReady();
    assertWritablePersistence();

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
const adminPassword = process.env.ADMIN_LEDGER_PASSWORD || '9938';
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

app.get('/api/health', async (req, res) => {
    try {
        await ensureDbReady();
        res.json({
            ok: !dbInitError,
            persistence: getPersistenceStatus(),
            smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            adminEmailConfigured: Boolean(process.env.ADMIN_EMAIL),
            publicBaseUrl: getPublicBaseUrl()
        });
    } catch (err) {
        res.status(500).json({
            ok: false,
            persistence: getPersistenceStatus(),
            error: err.message
        });
    }
});

// -------------------------------------------------------------
// API: Recent Subscribers Public Feed (Obfuscated for social proof ticker)
// -------------------------------------------------------------
app.get('/api/subscribers/recent', async (req, res) => {
    try {
        const subs = await getSubscribers();
        
        // Sort descending by created_at
        subs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Take the 15 most recent and obfuscate
        const recent = subs.slice(0, 15).map(s => {
            const emailParts = (s.email || '').split('@');
            let obfuscatedEmail = '';
            if (emailParts.length === 2) {
                const namePart = emailParts[0];
                const domainPart = emailParts[1];
                const visibleLen = Math.min(2, namePart.length);
                obfuscatedEmail = namePart.substring(0, visibleLen) + '***@' + domainPart;
            } else {
                obfuscatedEmail = '***@***.***';
            }
            
            const name = s.first_name || s.firstName || 'Creator';
            const visibleNameLen = Math.min(2, name.length);
            const obfuscatedName = name.substring(0, visibleNameLen) + '***';

            return {
                name: obfuscatedName,
                email: obfuscatedEmail
            };
        });

        // Add default mock creators if the list has fewer than 5 entries
        const mockDefaults = [
            { name: "Al***", email: "al***@gmail.com" },
            { name: "Ke***", email: "ke***@proton.me" },
            { name: "Sa***", email: "sa***@substack.com" },
            { name: "Da***", email: "da***@yahoo.com" },
            { name: "Ma***", email: "ma***@beehiiv.com" }
        ];
        
        const merged = [...recent];
        while (merged.length < 5 && mockDefaults.length > 0) {
            merged.push(mockDefaults.shift());
        }
        
        res.json(merged);
    } catch (err) {
        console.error("Error fetching recent subscribers:", err);
        res.status(500).json({ error: 'Failed to retrieve feed.' });
    }
});

// -------------------------------------------------------------
// SANDBOX HELPERS & ENDPOINTS
// -------------------------------------------------------------

async function sendAdminNotificationOfSaleIntent(purchase, subscriberId, isFinalSale = false) {
    const adminEmailAddress = process.env.ADMIN_EMAIL || 'kendren@proton.me, tachyon@proton.me';
    
    // Look up subscriber data
    let sub = {};
    try {
        const subs = await getSubscribers();
        if (subscriberId) {
            sub = subs.find(s => s.id === subscriberId) || {};
        } else {
            sub = subs.find(s => s.email.toLowerCase() === purchase.email.toLowerCase()) || {};
        }
    } catch (e) {
        console.error("Error fetching subscriber for admin sale notification:", e);
    }

    const typeLabel = isFinalSale ? 'Sale Confirmed' : 'Purchase Intent';
    const subject = `New Trillion Dollar Miracle ${typeLabel}`;
    
    const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { background-color: #E9E4D9; color: #2E2D32; font-family: monospace; padding: 20px; }
            .card { background-color: #F2EDE0; border: 2px solid #2E2D32; padding: 20px; box-shadow: 4px 4px 0px #1D1C20; }
            h3 { color: #C96F6B; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid rgba(46, 45, 50, 0.15); }
            td.label { font-weight: bold; width: 220px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h3>New Trillion Dollar Miracle Ebook ${typeLabel}!</h3>
            <table>
                <tr><td class="label">Customer Email:</td><td>${escapeHtml(purchase.email)}</td></tr>
                <tr><td class="label">Product:</td><td>${escapeHtml(purchase.product_name)}</td></tr>
                <tr><td class="label">Price paid:</td><td>$${(purchase.price_cents / 100).toFixed(2)}</td></tr>
                <tr><td class="label">Payment Mode:</td><td>${escapeHtml(purchase.payment_mode)}</td></tr>
                <tr><td class="label">Payment Status:</td><td>${escapeHtml(purchase.payment_status)}</td></tr>
                <tr><td class="label">Checkout Started:</td><td>${purchase.checkout_started_at}</td></tr>
                <tr><td class="label">Paid At:</td><td>${purchase.paid_at || 'N/A'}</td></tr>
                
                <tr><td class="label">Subscriber Name:</td><td>${escapeHtml(sub.first_name || 'N/A')}</td></tr>
                <tr><td class="label">Identity sentence:</td><td>${escapeHtml(sub.generated_identity_sentence || 'N/A')}</td></tr>
                <tr><td class="label">30-Day Stake:</td><td>${escapeHtml(sub.generated_stake_statement || 'N/A')}</td></tr>
                <tr><td class="label">Monetization Route:</td><td>${escapeHtml(sub.monetization_route || 'N/A')}</td></tr>
                <tr><td class="label">Audience Size:</td><td>${escapeHtml(sub.audience_size || 'N/A')}</td></tr>
                <tr><td class="label">Biggest Obstacle:</td><td>${escapeHtml(sub.biggest_obstacle || 'N/A')}</td></tr>
            </table>
        </div>
    </body>
    </html>
    `;

    const outboxId = crypto.randomUUID();
    const outboxEntry = {
        id: outboxId,
        recipient_email: adminEmailAddress,
        email_type: isFinalSale ? 'admin_sale_success' : 'admin_sale_intent',
        subject: subject,
        body: bodyHtml,
        status: 'pending',
        error_message: null
    };

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        const recipients = adminEmailAddress.split(',').map(e => e.trim());
        for (const recipient of recipients) {
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || `"Mirror 5000 Admin" <${smtpUser}>`,
                    to: recipient,
                    subject: subject,
                    html: bodyHtml
                });
                outboxEntry.status = 'sent';
            } catch (err) {
                console.error(`Admin alert dispatch to ${recipient} failed:`, err);
                outboxEntry.status = 'failed';
                outboxEntry.error_message = err.message;
            }
        }
        await addEmailToOutbox(outboxEntry);
    } else {
        try {
            const localOutboxPath = path.join(OUTBOX_DIR, `admin_sale_alert_${purchase.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`);
            fs.writeFileSync(localOutboxPath, `<!--\nTO: ${adminEmailAddress}\nSUBJECT: ${subject}\n-->\n` + bodyHtml, 'utf8');
            console.log(`Mock Admin Sale Notification HTML saved to: ${localOutboxPath}`);
        } catch (err) {
            console.error("Failed to write mock admin email:", err);
        }
        outboxEntry.status = 'pending';
        await addEmailToOutbox(outboxEntry);
    }
}

async function dispatchBuyerEbookEmail(recipientEmail, downloadToken, sourcePage = 'mirror5000') {
    const isTest = sourcePage && sourcePage.includes('test');
    const prefix = isTest ? '/mirror5000-test' : '/mirror5000';
    const downloadLink = `${getPublicBaseUrl()}${prefix}/trillion-unlocked?token=${downloadToken}`;
    const subject = 'Trillion Dollar Miracle Is Unlocked';
    const bodyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { background-color: #E9E4D9; color: #2E2D32; font-family: 'Courier New', monospace; padding: 30px; }
            .card { background-color: #F2EDE0; border: 3px solid #2E2D32; border-radius: 8px; max-width: 600px; margin: 0 auto; padding: 30px; box-shadow: 6px 6px 0px #1D1C20; }
            .stamp-logo { border: 3px double #C96F6B; color: #C96F6B; font-weight: bold; padding: 8px 16px; display: inline-block; transform: rotate(-3deg); margin-bottom: 25px; text-transform: uppercase; font-size: 20px; letter-spacing: 2px; }
            .accent-line { border-top: 2px dashed #8F7EA6; margin: 20px 0; }
            .btn { display: inline-block; background-color: #C96F6B; color: #E9E4D9 !important; text-decoration: none; font-weight: bold; padding: 12px 24px; border: 2px solid #2E2D32; border-radius: 4px; box-shadow: 4px 4px 0px #1D1C20; text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="stamp-logo">UNLOCKED</div>
            <p>You unlocked <strong>Trillion Dollar Miracle</strong>.</p>
            <p>Seen Until Believed showed you how visibility becomes trust. This book is the next room: wealth, ownership, cash flow, family banking, AI systems, and legacy.</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${downloadLink}" class="btn" target="_blank">Download Ebook</a>
            </p>
            <p>Keep this link private. If it expires, reply to this email and I’ll resend access.</p>
            <div class="accent-line"></div>
            <p>— Kendren<br><strong>Mirror 5000</strong></p>
        </div>
    </body>
    </html>
    `;

    const outboxId = crypto.randomUUID();
    const outboxEntry = {
        id: outboxId,
        recipient_email: recipientEmail,
        email_type: 'buyer_unlock',
        subject: subject,
        body: bodyHtml,
        status: 'pending',
        error_message: null
    };

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465,
            auth: { user: smtpUser, pass: smtpPass }
        });

        try {
            await transporter.sendMail({
                from: process.env.SMTP_FROM || `"Kendren Cornish" <${smtpUser}>`,
                to: recipientEmail,
                subject: subject,
                html: bodyHtml
            });
            outboxEntry.status = 'sent';
        } catch (err) {
            console.error("Buyer email dispatch failed:", err);
            outboxEntry.status = 'failed';
            outboxEntry.error_message = err.message;
        }
        await addEmailToOutbox(outboxEntry);
    } else {
        try {
            const localOutboxPath = path.join(OUTBOX_DIR, `buyer_unlock_to_${recipientEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.html`);
            fs.writeFileSync(localOutboxPath, `<!--\nTO: ${recipientEmail}\nSUBJECT: ${subject}\n-->\n` + bodyHtml, 'utf8');
            console.log(`Mock Buyer Ebook Unlock HTML saved to: ${localOutboxPath}`);
        } catch (err) {
            console.error("Failed to write mock buyer email:", err);
        }
        outboxEntry.status = 'pending';
        await addEmailToOutbox(outboxEntry);
    }
}

async function confirmPaidPurchase(purchaseId, email, subscriberId, provider, sessionId = null, paymentIntentId = null) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration
    const paidAt = new Date().toISOString();

    if (usePostgres) {
        await pool.query(
            `UPDATE purchases SET 
                payment_status = 'paid',
                payment_provider = $1,
                checkout_session_id = $2,
                payment_intent_id = $3,
                paid_at = $4,
                download_token = $5,
                download_token_expires_at = $6
             WHERE id = $7`,
            [provider, sessionId, paymentIntentId, paidAt, token, expiresAt, purchaseId]
        );
        await pool.query(
            "UPDATE subscribers SET buyer_status = 'buyer', purchase_intent = TRUE WHERE LOWER(email) = LOWER($1)",
            [email]
        );
    } else {
        const purchases = await getPurchases();
        const pur = purchases.find(p => p.id === purchaseId);
        if (pur) {
            pur.payment_status = 'paid';
            pur.payment_provider = provider;
            pur.checkout_session_id = sessionId;
            pur.payment_intent_id = paymentIntentId;
            pur.paid_at = paidAt;
            pur.download_token = token;
            pur.download_token_expires_at = expiresAt.toISOString();
            fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
        }

        const subs = await getSubscribers();
        const sub = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
        if (sub) {
            sub.buyer_status = 'buyer';
            sub.purchase_intent = true;
            fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2), 'utf8');
        }
    }

    let sourcePage = 'mirror5000';
    if (usePostgres) {
        const purRes = await pool.query("SELECT source_page FROM purchases WHERE id = $1", [purchaseId]);
        if (purRes.rows.length > 0) {
            sourcePage = purRes.rows[0].source_page || 'mirror5000';
        }
        if (sourcePage === 'mirror5000') {
            const subRes = await pool.query(
                "SELECT source_page FROM subscribers WHERE id = $1 OR LOWER(email) = LOWER($2) ORDER BY created_at DESC LIMIT 1",
                [subscriberId || '', email]
            );
            if (subRes.rows.length > 0 && subRes.rows[0].source_page) {
                sourcePage = subRes.rows[0].source_page;
            }
        }
    } else {
        const purchases = await getPurchases();
        const pur = purchases.find(p => p.id === purchaseId);
        if (pur) {
            sourcePage = pur.source_page || 'mirror5000';
        }
        if (sourcePage === 'mirror5000') {
            const subs = await getSubscribers();
            const sub = subs.find(s => s.id === subscriberId || s.email.toLowerCase() === email.toLowerCase());
            if (sub && sub.source_page) sourcePage = sub.source_page;
        }
    }

    await dispatchBuyerEbookEmail(email, token, sourcePage);
    const updatedPurchases = await getPurchases();
    const purObj = updatedPurchases.find(p => p.id === purchaseId);
    if (purObj) {
        await sendAdminNotificationOfSaleIntent(purObj, subscriberId, true);
    }
}

// 1. Subscribe Sandbox Lead (Unified with production /api/subscribe below)

// 2. Get Trillion Dollar Miracle Info & Scarcity
app.get(['/api/trillion-info-test', '/api/trillion-info'], async (req, res) => {
    try {
        const limit = parseInt(process.env.TRILLION_LAUNCH_LIMIT) || 100;
        const envOriginalPrice = parseInt(process.env.TRILLION_ORIGINAL_PRICE) || 87;
        const envActivePrice = parseInt(process.env.TRILLION_ACTIVE_PRICE) || 27;
        const videoUrl = process.env.TRILLION_VIDEO_URL || '';
        const paymentMode = process.env.PAYMENT_MODE || 'manual';
        const cashappTag = process.env.CASHAPP_CASHTAG || '$senseifruit';
        const manualInstructions = process.env.MANUAL_PAYMENT_INSTRUCTIONS || '';

        const purchases = await getPurchases();
        const paidPurchases = purchases.filter(p => p.product_slug === 'trillion-dollar-miracle' && p.payment_status === 'paid');
        const paidCount = paidPurchases.length;
        const remainingCopies = Math.max(0, limit - paidCount);

        res.json({
            originalPrice: envOriginalPrice,
            activePrice: envActivePrice,
            launchLimit: limit,
            copiesSold: paidCount,
            remainingCopies: remainingCopies,
            videoUrl: videoUrl,
            paymentMode: paymentMode,
            cashappTag: cashappTag,
            manualInstructions: manualInstructions
        });
    } catch (err) {
        console.error("Error loading trillion-info:", err);
        res.status(500).json({ error: 'Failed to retrieve product details.' });
    }
});

// 3. Checkout Intent Logger & Redirector
app.post(['/api/checkout-intent-test', '/api/checkout-intent'], async (req, res) => {
    const { email, subscriberId } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required for checkout.' });
    }

    try {
        const isTest = req.path.includes('-test');
        const prefix = isTest ? '/mirror5000-test' : '/mirror5000';

        const paymentMode = process.env.PAYMENT_MODE || 'manual';
        const price = parseInt(process.env.TRILLION_ACTIVE_PRICE) || 27;
        const originalPrice = parseInt(process.env.TRILLION_ORIGINAL_PRICE) || 87;
        
        await updateSubscriberPurchaseIntent(email, true, 'trillion-dollar-miracle', price);
        
        const purchaseId = crypto.randomUUID();
        const newPurchase = {
            id: purchaseId,
            subscriber_id: subscriberId || null,
            email: email,
            product_slug: 'trillion-dollar-miracle',
            product_name: 'Trillion Dollar Miracle',
            original_price_cents: originalPrice * 100,
            price_cents: price * 100,
            currency: 'usd',
            payment_mode: paymentMode,
            payment_status: paymentMode === 'manual' ? 'pending_manual' : 'pending',
            purchase_intent: true,
            checkout_started_at: new Date().toISOString(),
            paid_at: null,
            download_token: null,
            download_token_expires_at: null,
            download_count: 0,
            refund_status: 'none',
            admin_notes: null,
            source_page: isTest ? 'mirror5000-test' : 'mirror5000'
        };

        await addPurchase(newPurchase);
        await sendAdminNotificationOfSaleIntent(newPurchase, subscriberId).catch(err => {
            console.error("Admin sale intent notification failed:", err);
        });

        if (paymentMode === 'manual') {
            return res.json({
                success: true,
                paymentMode: 'manual',
                redirectUrl: `${prefix}/payment-pending?email=${encodeURIComponent(email)}&purchaseId=${purchaseId}`
            });
        } else if (paymentMode === 'stripe') {
            const stripeSecret = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecret) {
                const externalUrl = process.env.TRILLION_CHECKOUT_URL;
                if (externalUrl) {
                    return res.json({
                        success: true,
                        paymentMode: 'external',
                        redirectUrl: externalUrl
                    });
                }
                return res.status(400).json({ error: 'Payment processor Stripe keys are missing.' });
            }

            const stripe = require('stripe')(stripeSecret);
            const successUrl = process.env.STRIPE_SUCCESS_URL || `${getPublicBaseUrl()}${prefix}/trillion-unlocked?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = process.env.STRIPE_CANCEL_URL || `${getPublicBaseUrl()}${prefix}/confirmed?email=${encodeURIComponent(email)}`;
            
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Trillion Dollar Miracle',
                            description: 'The Wealth Mirror After Visibility'
                        },
                        unit_amount: price * 100,
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                customer_email: email,
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    purchaseId: purchaseId,
                    email: email,
                    subscriberId: subscriberId || ''
                }
            });

            if (usePostgres) {
                await pool.query(
                    'UPDATE purchases SET checkout_session_id = $1 WHERE id = $2',
                    [session.id, purchaseId]
                );
            } else {
                const purchases = await getPurchases();
                const pur = purchases.find(p => p.id === purchaseId);
                if (pur) {
                    pur.checkout_session_id = session.id;
                    fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
                }
            }

            return res.json({
                success: true,
                paymentMode: 'stripe',
                redirectUrl: session.url
            });
        } else {
            const externalUrl = process.env.TRILLION_CHECKOUT_URL;
            if (!externalUrl) {
                return res.status(400).json({ error: 'External checkout URL TRILLION_CHECKOUT_URL is not configured.' });
            }

            if (usePostgres) {
                await pool.query(
                    "UPDATE purchases SET payment_provider = 'external' WHERE id = $1",
                    [purchaseId]
                );
            } else {
                const purchases = await getPurchases();
                const pur = purchases.find(p => p.id === purchaseId);
                if (pur) {
                    pur.payment_provider = 'external';
                    fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
                }
            }

            return res.json({
                success: true,
                paymentMode: 'external',
                redirectUrl: externalUrl
            });
        }
    } catch (err) {
        console.error("Checkout intent error:", err);
        return res.status(500).json({ error: err.message || 'Failed to initialize checkout.' });
    }
});

// 4. Stripe Webhook Handler
app.post(['/api/webhooks/stripe-test', '/api/webhooks/stripe'], async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    if (!sig || !webhookSecret || !stripeSecret) {
        return res.status(400).send('Webhook Credentials Missing');
    }

    const stripe = require('stripe')(stripeSecret);
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const purchaseId = session.metadata.purchaseId;
        const email = session.metadata.email;
        const subscriberId = session.metadata.subscriberId;

        try {
            await confirmPaidPurchase(purchaseId, email, subscriberId, 'stripe', session.id, session.payment_intent);
        } catch (err) {
            console.error("Webhook processing error:", err);
            return res.status(500).send('Webhook process failed.');
        }
    }

    res.json({ received: true });
});

// 5. Ebook Download Controller
app.get(['/api/download-ebook-test', '/api/download-ebook'], async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Download token missing.');
    }

    try {
        const purchases = await getPurchases();
        const purchase = purchases.find(p => p.download_token === token);

        if (!purchase) {
            return res.status(404).send('Invalid token.');
        }

        if (purchase.payment_status !== 'paid') {
            return res.status(403).send('Purchase unpaid.');
        }

        const expiresAt = new Date(purchase.download_token_expires_at);
        if (expiresAt < new Date()) {
            return res.status(403).send('Download link expired.');
        }

        const pdfPath = path.join(__dirname, 'public', 'assets', 'trillion-dollar-miracle.pdf');
        if (!fs.existsSync(pdfPath)) {
            return res.status(404).send('PDF file missing from assets.');
        }

        if (usePostgres) {
            await pool.query('UPDATE purchases SET download_count = download_count + 1 WHERE id = $1', [purchase.id]);
        } else {
            purchase.download_count = (purchase.download_count || 0) + 1;
            fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
        }

        res.download(pdfPath, 'trillion-dollar-miracle.pdf', { dotfiles: 'allow' });
    } catch (err) {
        console.error("Download endpoint error:", err);
        res.status(500).send('Download failed.');
    }
});

// 6. Ebook Page Validate Token
app.get(['/api/validate-token-test', '/api/validate-token'], async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false, error: 'Token missing' });
    try {
        const purchases = await getPurchases();
        const purchase = purchases.find(p => p.download_token === token);
        if (!purchase || purchase.payment_status !== 'paid') {
            return res.json({ valid: false });
        }
        const expiresAt = new Date(purchase.download_token_expires_at);
        if (expiresAt < new Date()) {
            return res.json({ valid: false, expired: true });
        }
        res.json({ valid: true, email: purchase.email });
    } catch (err) {
        res.status(500).json({ valid: false });
    }
});

// 7. Execution Kit Waitlist Opt-in
app.post(['/api/kit-interest-test', '/api/kit-interest'], async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });

    try {
        await updateSubscriberKitInterest(email, true);
        
        const adminEmailAddress = process.env.ADMIN_EMAIL || 'kendren@proton.me, tachyon@proton.me';
        const subject = `Mirror Execution Kit Waitlist Sign-up`;
        const bodyHtml = `
            <p>Subscriber <strong>${email}</strong> has expressed interest in the 30-Day Mirror Execution Kit.</p>
        `;
        
        const outboxEntry = {
            id: crypto.randomUUID(),
            recipient_email: adminEmailAddress,
            email_type: 'kit_waitlist',
            subject: subject,
            body: bodyHtml,
            status: 'pending',
            error_message: null
        };

        const smtpHost = process.env.SMTP_HOST;
        if (smtpHost) {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: parseInt(process.env.SMTP_PORT) === 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            try {
                await transporter.sendMail({
                    from: process.env.SMTP_FROM || `"Mirror 5000" <${process.env.SMTP_USER}>`,
                    to: adminEmailAddress,
                    subject: subject,
                    html: bodyHtml
                });
                outboxEntry.status = 'sent';
            } catch (err) {
                outboxEntry.status = 'failed';
                outboxEntry.error_message = err.message;
            }
        }
        await addEmailToOutbox(outboxEntry);
        res.json({ success: true });
    } catch (err) {
        console.error("Kit waitlist error:", err);
        res.status(500).json({ error: 'Failed to register kit interest.' });
    }
});

// 8. Admin Sandbox Statistics
app.get(['/api/admin/stats-test', '/api/admin/stats'], requireAdmin, async (req, res) => {
    try {
        const subs = await getSubscribers();
        const purchases = await getPurchases();
        const outbox = await getEmailOutbox();

        const paidPurchases = purchases.filter(p => p.payment_status === 'paid');
        const pendingPurchases = purchases.filter(p => p.payment_status === 'pending' || p.payment_status === 'pending_manual');
        const failedPurchases = purchases.filter(p => p.payment_status === 'failed');

        const totalRevenueCents = paidPurchases.reduce((acc, p) => acc + (p.price_cents || 0), 0);
        const totalRevenue = (totalRevenueCents / 100).toFixed(2);

        const limit = parseInt(process.env.TRILLION_LAUNCH_LIMIT) || 100;
        const remainingCopies = Math.max(0, limit - paidPurchases.length);

        const uniqueSubscribersCount = subs.length;
        const uniqueBuyersCount = new Set(paidPurchases.map(p => p.email.toLowerCase())).size;
        const conversionRate = uniqueSubscribersCount > 0 
            ? ((uniqueBuyersCount / uniqueSubscribersCount) * 100).toFixed(1) + '%'
            : '0%';

        const checklist = {
            freePdfExists: fs.existsSync(path.join(__dirname, 'public', 'assets', 'seen-until-believed-sacred-tech-edition.pdf')),
            trillionPdfExists: fs.existsSync(path.join(__dirname, 'public', 'assets', 'trillion-dollar-miracle.pdf')),
            freeCoverExists: fs.existsSync(path.join(__dirname, 'public', 'assets', 'seen_until_believed_cover.jpg')) || fs.existsSync(path.join(__dirname, 'public', 'assets', 'seen_until_believed_cover.png')),
            trillionCoverExists: fs.existsSync(path.join(__dirname, 'public', 'assets', 'trillion-dollar-miracle-cover.jpg')) || fs.existsSync(path.join(__dirname, 'public', 'assets', 'trillion-dollar-miracle-cover.png')),
            videoUrlConfigured: Boolean(process.env.TRILLION_VIDEO_URL && process.env.TRILLION_VIDEO_URL.trim() !== ''),
            logoConfigured: true, // Wordmark default active
            routeConfigured: true, // /mirror5000-test active
            adminPasswordConfigured: Boolean(process.env.ADMIN_LEDGER_PASSWORD),
            senderEmailConfigured: Boolean(process.env.SMTP_FROM),
            adminNotificationEmailConfigured: Boolean(process.env.ADMIN_EMAIL),
            smtpHostConfigured: Boolean(process.env.SMTP_HOST),
            smtpPortConfigured: Boolean(process.env.SMTP_PORT),
            smtpUsernameConfigured: Boolean(process.env.SMTP_USER),
            smtpPasswordConfigured: Boolean(process.env.SMTP_PASS),
            paymentMode: process.env.PAYMENT_MODE || 'manual',
            cashappTagConfigured: Boolean(process.env.CASHAPP_CASHTAG),
            stripeKeysConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_TRILLION),
            externalCheckoutConfigured: Boolean(process.env.TRILLION_CHECKOUT_URL)
        };

        res.json({
            totalPurchases: paidPurchases.length,
            totalRevenue: totalRevenue,
            pendingCount: pendingPurchases.length,
            failedCount: failedPurchases.length,
            copiesSold: paidPurchases.length,
            copiesRemaining: remainingCopies,
            conversionRate: conversionRate,
            purchases: purchases,
            subscribers: subs,
            outbox: outbox.filter(e => e.status !== 'sent'),
            persistence: getPersistenceStatus(),
            smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
            checklist: checklist
        });
    } catch (err) {
        console.error("Admin stats test failed:", err);
        res.status(500).json({ error: 'Stats loading failed.' });
    }
});

// 9. Admin Manual Mark Paid
app.post(['/api/admin/mark-paid-test', '/api/admin/mark-paid'], requireAdmin, async (req, res) => {
    const { purchaseId } = req.body;
    if (!purchaseId) return res.status(400).json({ error: 'Purchase ID missing.' });

    try {
        const purchases = await getPurchases();
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase) return res.status(404).json({ error: 'Purchase record not found.' });

        if (purchase.payment_status === 'paid') {
            return res.json({ success: true, message: 'Already marked paid.' });
        }

        let subscriberId = purchase.subscriber_id;
        if (!subscriberId) {
            const subs = await getSubscribers();
            const sub = subs.find(s => s.email.toLowerCase() === purchase.email.toLowerCase());
            if (sub) subscriberId = sub.id;
        }

        await confirmPaidPurchase(purchaseId, purchase.email, subscriberId, 'admin_manual');
        res.json({ success: true, message: 'Purchase validated. Access tokens generated.' });
    } catch (err) {
        console.error("Manual approve failed:", err);
        res.status(500).json({ error: 'Manual mark paid failed.' });
    }
});

// 10. Admin Resend Link
app.post(['/api/admin/resend-link-test', '/api/admin/resend-link'], requireAdmin, async (req, res) => {
    const { purchaseId } = req.body;
    if (!purchaseId) return res.status(400).json({ error: 'Purchase ID missing.' });

    try {
        const purchases = await getPurchases();
        const purchase = purchases.find(p => p.id === purchaseId);
        if (!purchase) return res.status(404).json({ error: 'Purchase record not found.' });

        if (purchase.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Purchase unpaid.' });
        }

        let token = purchase.download_token;
        if (!token) {
            token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            if (usePostgres) {
                await pool.query('UPDATE purchases SET download_token = $1, download_token_expires_at = $2 WHERE id = $3', [token, expiresAt, purchaseId]);
            } else {
                purchase.download_token = token;
                purchase.download_token_expires_at = expiresAt.toISOString();
                fs.writeFileSync(PURCHASES_DB_FILE, JSON.stringify(purchases, null, 2), 'utf8');
            }
        }

        let sourcePage = purchase.source_page || 'mirror5000';
        if (sourcePage === 'mirror5000') {
            const subs = await getSubscribers();
            const sub = subs.find(s => s.id === purchase.subscriber_id || s.email.toLowerCase() === purchase.email.toLowerCase());
            if (sub && sub.source_page) sourcePage = sub.source_page;
        }

        await dispatchBuyerEbookEmail(purchase.email, token, sourcePage);
        res.json({ success: true });
    } catch (err) {
        console.error("Resend unlock failed:", err);
        res.status(500).json({ error: 'Failed to resend access.' });
    }
});

// -------------------------------------------------------------
// API: Subscribe Endpoint
// -------------------------------------------------------------
app.post(['/api/subscribe-test', '/api/subscribe'], rateLimiter, async (req, res) => {
    const body = req.body || {};
    const first_name = cleanText(body.first_name || body.firstName || body.name);
    const email = normalizeEmail(body.email);
    const instagram_handle = cleanText(body.instagram_handle || body.instagram || body.instagramHandle);
    const tiktok_handle = cleanText(body.tiktok_handle || body.tiktok || body.tiktokHandle);
    const youtube_url = cleanText(body.youtube_url || body.youtube || body.youtubeUrl);
    const phone = cleanText(body.phone || body.phone_number || body.phoneNumber);
    const city_state = cleanText(body.city_state || body.cityState || body.location);
    const identity_type = cleanText(body.identity_type || body.identityType);
    const goal = cleanText(body.goal);
    const documenting = cleanText(body.documenting);
    const challenge_30_day = cleanText(body.challenge_30_day || body.challenge30Day || body.challenge);
    const upside = cleanText(body.upside);
    const downside = cleanText(body.downside);
    const audience_size = cleanText(body.audience_size || body.audienceSize);
    const primary_platform = cleanText(body.primary_platform || body.primaryPlatform);
    const monetization_route = cleanText(body.monetization_route || body.monetizationRoute || body.monetization);
    const biggest_obstacle = cleanText(body.biggest_obstacle || body.biggestObstacle || body.obstacle);
    const isTest = req.path.includes('-test');
    const source_page = isTest ? 'mirror5000-test' : (cleanText(body.source_page || body.sourcePage) || 'mirror5000');
    const consent_opt_in = asBoolean(body.consent_opt_in || body.consentOptIn);
    const website = cleanText(body.website);
    const nickname = cleanText(body.nickname);

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
        consent_opt_in,
        source_page,
        email_sent_status: 'pending',
        admin_notified_status: 'pending'
    };

    // 4. Save subscriber to database
    let savedSubscriber;
    try {
        savedSubscriber = await addSubscriber(newSubscriber);
    } catch (err) {
        console.error("DB Error adding subscriber:", err);
        return res.status(err.statusCode || 500).json({ error: err.message || 'Failed to save entry.' });
    }

    // 5. Trigger email flow asynchronously
    dispatchEmails(savedSubscriber).catch((err) => {
        console.error("Async email dispatch failed:", err);
    });

    const prefix = isTest ? '/mirror5000-test' : '/mirror5000';
    return res.status(200).json({
        message: isTest ? 'Successfully registered in the sandbox system.' : 'Successfully registered in the Mirror 5000 system.',
        redirectUrl: `${prefix}/confirmed?email=${encodeURIComponent(email)}&id=${savedSubscriber.id}`,
        persistence: getPersistenceStatus()
    });
});

// -------------------------------------------------------------
// API: Waitlist Opt-In Endpoint
// -------------------------------------------------------------
app.post('/api/waitlist', async (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    try {
        await ensureDbReady();
        assertWritablePersistence();
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
        res.status(err.statusCode || 500).json({ error: err.message || 'Failed to join waitlist.' });
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
// Redundant stats endpoint removed. Managed via joint array routing.

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
    const pdfUrl = process.env.PDF_DOWNLOAD_URL || `${getPublicBaseUrl()}/assets/seen-until-believed-sacred-tech-edition.pdf`;

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
                background-color: #E9E4D9; /* Warm sand/concrete cream */
                color: #2E2D32; /* Deep slate charcoal ink */
                font-family: 'Courier New', Courier, monospace, sans-serif;
                padding: 30px;
                margin: 0;
            }
            .card {
                background-color: #F2EDE0; /* Elevated card cream */
                border: 3px solid #2E2D32;
                border-radius: 8px;
                max-width: 600px;
                margin: 0 auto;
                padding: 30px;
                box-shadow: 6px 6px 0px #1D1C20; /* flat slate shadow */
            }
            .stamp-logo {
                border: 3px double #C96F6B; /* Muted rose stamp pink */
                color: #C96F6B;
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
                border-top: 2px dashed #8F7EA6; /* Soft lavender/purple */
                margin: 20px 0;
            }
            .highlight {
                background-color: rgba(209, 161, 78, 0.15); /* Mustard gold highlight */
                padding: 2px 6px;
                font-weight: bold;
            }
            .btn {
                display: inline-block;
                background-color: #C96F6B; /* Muted rose stamp pink */
                color: #E9E4D9 !important;
                text-decoration: none;
                font-weight: bold;
                padding: 12px 24px;
                border: 2px solid #2E2D32;
                border-radius: 4px;
                box-shadow: 4px 4px 0px #1D1C20;
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
                <a href="${escapeHtml(pdfUrl)}" class="btn" target="_blank">Download Field Manual</a>
            </p>

            <p>Read it like a field manual, not a motivational quote book.</p>

            <p>Your ordinary life is not the limitation. The frame is.</p>

            <div class="accent-line"></div>

            <p><strong>Your story alignment:</strong></p>
            <p class="highlight">"${escapeHtml(subscriber.generated_identity_sentence)}"</p>

            <p><strong>Your commitments:</strong></p>
            <p class="highlight">"${escapeHtml(subscriber.generated_stake_statement)}"</p>

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
            body { background-color: #E9E4D9; color: #2E2D32; font-family: monospace; padding: 20px; }
            .card { background-color: #F2EDE0; border: 2px solid #2E2D32; padding: 20px; box-shadow: 4px 4px 0px #1D1C20; }
            h3 { color: #C96F6B; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px; border-bottom: 1px solid rgba(46, 45, 50, 0.15); }
            td.label { font-weight: bold; width: 220px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h3>New subscriber entered the field system.</h3>
            <table>
                <tr><td class="label">Name:</td><td>${escapeHtml(subscriber.first_name || 'N/A')}</td></tr>
                <tr><td class="label">Email:</td><td>${escapeHtml(subscriber.email || 'N/A')}</td></tr>
                <tr><td class="label">Identity:</td><td>${escapeHtml(subscriber.generated_identity_sentence || 'N/A')}</td></tr>
                <tr><td class="label">30-Day Stake:</td><td>${escapeHtml(subscriber.generated_stake_statement || 'N/A')}</td></tr>
                <tr><td class="label">Audience Size:</td><td>${escapeHtml(subscriber.audience_size || 'N/A')}</td></tr>
                <tr><td class="label">Primary Platform:</td><td>${escapeHtml(subscriber.primary_platform || 'N/A')}</td></tr>
                <tr><td class="label">Monetization Route:</td><td>${escapeHtml(subscriber.monetization_route || 'N/A')}</td></tr>
                <tr><td class="label">Biggest Obstacle:</td><td>${escapeHtml(subscriber.biggest_obstacle || 'N/A')}</td></tr>
                <tr><td class="label">Instagram:</td><td>${escapeHtml(subscriber.instagram_handle || 'N/A')}</td></tr>
                <tr><td class="label">TikTok:</td><td>${escapeHtml(subscriber.tiktok_handle || 'N/A')}</td></tr>
                <tr><td class="label">YouTube:</td><td>${escapeHtml(subscriber.youtube_url || 'N/A')}</td></tr>
                <tr><td class="label">Phone:</td><td>${escapeHtml(subscriber.phone || 'N/A')}</td></tr>
                <tr><td class="label">City/State:</td><td>${escapeHtml(subscriber.city_state || 'N/A')}</td></tr>
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
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`\nSeen Until Believed Mirror 5000 running at http://localhost:${PORT}`);
        console.log(`Subscribers DB File: ${DB_FILE}`);
        console.log(`Outbox File: ${OUTBOX_DB_FILE}`);
    });
}

module.exports = app;
