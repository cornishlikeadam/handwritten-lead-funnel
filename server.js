const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to prevent static caching during local development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Database File Path
const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_BUILDER;
const DB_FILE = isVercel ? '/tmp/subscribers.json' : path.join(__dirname, 'subscribers.json');
const OUTBOX_DIR = isVercel ? '/tmp/outbox' : path.join(__dirname, 'outbox');

// Ensure database and outbox directory exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
}
if (!fs.existsSync(OUTBOX_DIR)) {
    fs.mkdirSync(OUTBOX_DIR, { recursive: true });
}

// Helper to read subscribers
function getSubscribers() {
    try {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error('Error reading subscribers file:', err);
        return [];
    }
}

// Helper to save subscribers
function saveSubscribers(subscribers) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(subscribers, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing to subscribers file:', err);
        return false;
    }
}

// API: Subscribe Endpoint
app.post('/api/subscribe', async (req, res) => {
    const {
        firstName,
        email,
        niche,
        documenting,
        goal,
        sprintShow,
        sprintProve,
        sprintAction,
        emailPlatform,
        audienceSize,
        monetization,
        joinMailingList
    } = req.body;

    // Simple validation
    if (!firstName || !email) {
        return res.status(400).json({ error: 'First Name and Email are required.' });
    }

    const newSubscriber = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        firstName,
        email,
        niche,
        documenting,
        goal,
        sprintShow,
        sprintProve,
        sprintAction,
        emailPlatform,
        audienceSize,
        monetization,
        joinMailingList: joinMailingList === true || joinMailingList === 'true'
    };

    // Save to local database file
    const subscribers = getSubscribers();
    subscribers.push(newSubscriber);
    
    if (!saveSubscribers(subscribers)) {
        return res.status(500).json({ error: 'Failed to write subscriber data to database.' });
    }

    // Try to send the ebook email
    try {
        const emailSentInfo = await sendEbookEmail(newSubscriber);
        return res.status(200).json({
            message: 'Subscriber added successfully.',
            emailStatus: emailSentInfo.sent ? 'sent' : 'mocked',
            outboxPath: emailSentInfo.outboxPath || null
        });
    } catch (err) {
        console.error('Error in email delivery:', err);
        // We still return 200 since subscriber is saved
        return res.status(200).json({
            message: 'Subscriber added, but email delivery failed internally.',
            emailStatus: 'failed',
            error: err.message
        });
    }
});

// API: Get Subscribers (for ledger view)
app.get('/api/subscribers', (req, res) => {
    const subscribers = getSubscribers();
    // Sort descending by registration date
    subscribers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(subscribers);
});

// Helper: Send Email or Save to Outbox
async function sendEbookEmail(subscriber) {
    const pdfPath = path.join(__dirname, 'public', 'assets', 'seen-until-believed-sacred-tech-edition.pdf');
    
    // HTML Email Template matching Kendren's Sacred-Tech branding
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your Sacred-Tech Manual: Seen Until Believed</title>
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #1c122c; /* Deep Purple Chalkboard */
                color: #f5f6fa;
                padding: 30px;
                margin: 0;
            }
            .email-card {
                background-color: #25183a; /* Purple card */
                border: 3px solid #ff4757; /* Chalk Coral Red */
                border-radius: 12px;
                max-width: 600px;
                margin: 0 auto;
                padding: 30px;
                box-shadow: 0px 4px 15px rgba(255, 71, 87, 0.15);
            }
            .header {
                border-bottom: 2px dashed #ff4757;
                padding-bottom: 20px;
                margin-bottom: 25px;
                text-align: center;
            }
            .title {
                font-size: 24px;
                font-weight: bold;
                letter-spacing: -0.5px;
                color: #ff4757; /* Chalk Coral Red */
                text-transform: uppercase;
                margin: 0;
            }
            .subtitle {
                font-size: 14px;
                color: #9b8ea9;
                margin-top: 5px;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 15px;
            }
            .worksheet-recap {
                background-color: #1c122c;
                border-left: 4px solid #fed330; /* Chalkboard Yellow */
                padding: 15px;
                margin: 20px 0;
                font-style: italic;
                line-height: 1.6;
            }
            .accent {
                color: #ff4757;
                font-weight: bold;
            }
            .btn-download {
                display: inline-block;
                background-color: #ff4757; /* Chalk Coral Red */
                color: #ffffff !important;
                text-decoration: none;
                font-weight: bold;
                padding: 14px 28px;
                border-radius: 8px;
                margin: 25px 0;
                text-align: center;
                font-size: 16px;
                text-transform: uppercase;
            }
            .btn-download:hover {
                background-color: #2ecc71; /* Success Green */
            }
            .footer {
                margin-top: 35px;
                border-top: 1px dotted #9b8ea9;
                padding-top: 20px;
                font-size: 12px;
                color: #9b8ea9;
                line-height: 1.5;
            }
            .footer a {
                color: #ff4757;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="email-card">
            <div class="header">
                <div class="title">Seen Until Believed</div>
                <div class="subtitle">The Gospel of Going Visible • Sacred-Tech Edition</div>
            </div>

            <div class="greeting">Hey <span class="accent">${subscriber.firstName}</span>,</div>

            <p>You filled out the workbook. Your stakes are set. The mirror has registered your path.</p>
            
            <p>Here is the identity framework you committed to:</p>
            
            <div class="worksheet-recap">
                "I am a <span class="accent">${subscriber.niche}</span> documenting the process of <span class="accent">${subscriber.documenting}</span> so I can <span class="accent">${subscriber.goal}</span>. 
                For the next 30 days, I will show <span class="accent">${subscriber.sprintShow}</span> every day and prove <span class="accent">${subscriber.sprintProve}</span> by <span class="accent">${subscriber.sprintAction}</span>."
            </div>

            <p>Your strategic foundation is set for <span class="accent">${subscriber.emailPlatform}</span> targeting a starting audience size of <span class="accent">${subscriber.audienceSize}</span>, with your monetization goal focused on <span class="accent">${subscriber.monetization}</span>.</p>
            
            <p>As promised, your copy of <strong>Seen Until Believed: Sacred-Tech Edition</strong> is attached to this email. You can also download it immediately using the button below:</p>

            <div style="text-align: center;">
                <a href="http://localhost:${PORT}/assets/seen-until-believed-sacred-tech-edition.pdf" class="btn-download" target="_blank">Download Manual PDF</a>
            </div>

            <p>Read it once like a manifesto. Then read it again like an operator. Film the proof. Package the lesson. Let the market tell you what is alive.</p>

            <div class="footer">
                <strong>Next Step:</strong> Start at <a href="https://kendren.us">kendren.us</a> or connect with Kendren Cornish on LinkedIn. <br>
                Instagram: <a href="https://instagram.com/THXKENDREN">@THXKENDREN</a> | <a href="https://instagram.com/FRU1T4U">@FRU1T4U</a> <br>
                Email Support: <a href="mailto:TACYHON@proton.me">TACYHON@proton.me</a> <br>
                <br>
                <em>If you are tired of being invisible, bring proof. The mirror needs something true to reflect.</em>
            </div>
        </div>
    </body>
    </html>
    `;

    const subject = `Your Free Copy of "Seen Until Believed" - Sacred-Tech Edition 📖`;

    // Check SMTP configurations in environment
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        console.log(`SMTP configured. Attempting to send real email to ${subscriber.email}...`);
        
        let transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        // Send email
        let info = await transporter.sendMail({
            from: `"Kendren Cornish" <${smtpUser}>`,
            to: subscriber.email,
            subject: subject,
            html: emailHtml,
            attachments: [
                {
                    filename: 'seen-until-believed-sacred-tech-edition.pdf',
                    path: pdfPath
                }
            ]
        });

        console.log(`Email successfully sent! Message ID: ${info.messageId}`);
        return { sent: true };
    } else {
        // Fallback: Save to Outbox directory for local verification
        const safeEmail = subscriber.email.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `email_to_${safeEmail}_${Date.now()}.html`;
        const outboxFilePath = path.join(OUTBOX_DIR, filename);

        const outboxContent = `<!-- 
TO: ${subscriber.email}
SUBJECT: ${subject}
DATE: ${new Date().toISOString()}
ATTACHMENT: ${pdfPath}
-->
${emailHtml}`;

        fs.writeFileSync(outboxFilePath, outboxContent, 'utf8');

        console.warn('\n===============================================================');
        console.warn('⚠️  EMAIL SMTP NOT CONFIGURED IN .env');
        console.warn(`📧 Mock email written to: outbox/${filename}`);
        console.warn(`📬 Recipient: ${subscriber.email}`);
        console.warn(`📝 Subject: ${subject}`);
        console.warn('===============================================================\n');

        return { sent: false, outboxPath: outboxFilePath };
    }
}

// Start Server
app.listen(PORT, () => {
    console.log(`\n🚀 Seen Until Believed Funnel Server running at http://localhost:${PORT}`);
    console.log(`📂 Subscribers are recorded in: ${DB_FILE}`);
    console.log(`📬 Local email outbox directory: ${OUTBOX_DIR}\n`);
});
