/**
 * server.js
 * Backend for PDF Transparency app - ready for Render hosting
 */

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const nodemailer = require('nodemailer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fetch = require('node-fetch'); // npm i node-fetch@2
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

///////////////////// CONFIG - from environment variables /////////////////////

const PORT = process.env.PORT || 3000;  // Render sets this automatically

const MONGO_URI = process.env.MONGO_URI; // Your MongoDB Atlas connection string

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';  // Use strong secret in prod

const HF_API_KEY = process.env.HF_API_KEY;  // HuggingFace API key

// SMTP config for nodemailer - set your real SMTP info in env vars
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

//////////////////////////////////////////////////////////////////////////////////

// Check all required env vars present
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in environment variables');
  process.exit(1);
}
if (!HF_API_KEY) {
  console.error('❌ HF_API_KEY not set in environment variables');
  process.exit(1);
}
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('❌ SMTP_HOST, SMTP_USER, or SMTP_PASS not set in environment variables');
  process.exit(1);
}

// Initialize express app
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('✅ MongoDB connected'))
  .catch(err=> {
    console.error('❌ MongoDB connection error', err);
    process.exit(1);
  });

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  isVerified: { type: Boolean, default: false },
});
const OTPTempSchema = new mongoose.Schema({
  email: String,
  otp: String,
  purpose: String, // 'register' or 'login'
  expiresAt: Date
});
OTPTempSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
const PDFSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  filename: String,
  originalName: String,
  text: String,
  uploadedAt: { type: Date, default: Date.now }
});
const ConversationSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  pdfId: mongoose.Types.ObjectId,
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const OTPTemp = mongoose.model('OTPTemp', OTPTempSchema);
const PDFModel = mongoose.model('PDF', PDFSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);

// nodemailer transporter
let transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// multer config (PDF only)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') return cb(new Error('Only PDF allowed'));
    cb(null, true);
  }
});

// helpers
async function sendOtpEmail(toEmail, otp) {
  const mail = {
    from: SMTP_USER,
    to: toEmail,
    subject: 'Your verification OTP',
    text: `Your OTP is: ${otp}. It will expire in 10 minutes.`
  };
  return transporter.sendMail(mail);
}

async function createOtpRecord(email, purpose) {
  const otp = ('' + Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const expiresAt = new Date(Date.now() + 10*60*1000); // 10 minutes
  await OTPTemp.findOneAndDelete({ email, purpose }); // ensure single
  const rec = new OTPTemp({ email, otp, purpose, expiresAt });
  await rec.save();
  try {
    await sendOtpEmail(email, otp);
  } catch (e) {
    console.error('Failed to send OTP email:', e && e.message ? e.message : e);
  }
  return otp;
}

async function verifyOtp(email, otp, purpose) {
  const rec = await OTPTemp.findOne({ email, purpose });
  if (!rec) return { ok: false, reason: 'no_otp' };
  if (rec.expiresAt < new Date()) { await OTPTemp.deleteOne({ _id: rec._id }); return { ok: false, reason: 'expired' }; }
  if (rec.otp !== otp) return { ok: false, reason: 'wrong' };
  await OTPTemp.deleteOne({ _id: rec._id });
  return { ok: true };
}

// auth middleware using cookie token
function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return res.status(401).json({ ok: false, error: 'unauthenticated' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.userId;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'invalid_token' });
  }
}

/* ---------- Routes ---------- */

// health
app.get('/', (req, res) => res.send('Server running'));

// Check duplicates
app.post('/api/check-duplicate', async (req, res) => {
  try {
    const { email, phone, name } = req.body;
    const resp = {};
    if (email) resp.emailExists = !!(await User.findOne({ email }));
    if (phone) resp.phoneExists = !!(await User.findOne({ phone }));
    if (name) resp.nameExists = !!(await User.findOne({ name }));
    return res.json({ ok: true, ...resp });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Register:start -> send OTP
app.post('/api/register/start', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email || !phone) return res.status(400).json({ ok: false, error: 'missing_fields' });

    if (await User.findOne({ email })) return res.status(400).json({ ok: false, error: 'email_exists' });
    if (await User.findOne({ phone })) return res.status(400).json({ ok: false, error: 'phone_exists' });

    await createOtpRecord(email, 'register');
    return res.json({ ok: true, msg: 'otp_sent' });
  } catch (err) {
    console.error('register/start error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Register:verify -> create user + set cookie token
app.post('/api/register/verify', async (req, res) => {
  try {
    const { name, email, phone, otp } = req.body;
    if (!name || !email || !phone || !otp) return res.status(400).json({ ok: false, error: 'missing_fields' });

    const v = await verifyOtp(email, otp, 'register');
    if (!v.ok) return res.status(400).json({ ok: false, error: v.reason });

    if (await User.findOne({ email })) return res.status(400).json({ ok: false, error: 'email_exists' });

    const user = new User({ name, email, phone, isVerified: true });
    await user.save();

    // create token cookie
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false });
    return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('register/verify error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Login:start -> send OTP if user exists
app.post('/api/login/start', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'missing_email' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, error: 'not_registered' });
    await createOtpRecord(email, 'login');
    return res.json({ ok: true, msg: 'otp_sent' });
  } catch (err) {
    console.error('login/start error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Login:verify -> issue cookie
app.post('/api/login/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ ok: false, error: 'missing_fields' });

    const v = await verifyOtp(email, otp, 'login');
    if (!v.ok) return res.status(400).json({ ok: false, error: v.reason });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ ok: false, error: 'not_registered' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false });
    return res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('login/verify error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// Upload PDF (authenticated)
app.post('/api/upload-pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'no_file' });
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = (pdfData && pdfData.text) ? pdfData.text : '';
    const pdfRecord = new PDFModel({
      userId: req.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      text
    });
    await pdfRecord.save();

    // remove file from uploads to keep disk clean
    fs.unlinkSync(req.file.path);

    return res.json({ ok: true, pdf: { id: pdfRecord._id, name: pdfRecord.originalName } });
  } catch (err) {
    console.error('upload-pdf error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// List user's PDFs
app.get('/api/my-pdfs', authMiddleware, async (req, res) => {
  try {
    const pdfs = await PDFModel.find({ userId: req.userId }).sort({ uploadedAt: -1 }).select('-text');
    return res.json({ ok: true, pdfs });
  } catch (err) {
    console.error('my-pdfs error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Ask question (send: pdfId, question) -> call HF model with context (pdf text) and store answer
app.post('/api/ask', authMiddleware, async (req, res) => {
  try {
    const { pdfId, question } = req.body;
    if (!pdfId) return res.status(400).json({ ok: false, error: 'missing_pdfId' });
    if (!question || question.trim() === '') return res.status(400).json({ ok: false, error: 'missing_question' });

    const pdf = await PDFModel.findOne({ _id: pdfId, userId: req.userId });
    if (!pdf) return res.status(404).json({ ok: false, error: 'pdf_not_found' });

    const contextText = (pdf.text || '').slice(0, 30000);

    const hfUrl = 'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2';

    const payload = {
      inputs: {
        question,
        context: contextText,
      }
    };

    const hfResp = await fetch(hfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!hfResp.ok) {
      const txt = await hfResp.text();
      console.error('HF error', hfResp.status, txt);
      return res.status(500).json({ ok: false, error: 'llm_error', details: txt });
    }

    const hfJson = await hfResp.json();

    let answer = hfJson.answer || "Sorry, I couldn't find an answer.";

    const conv = new Conversation({
      userId: req.userId,
      pdfId: pdf._id,
      question,
      answer,
    });
    await conv.save();

    return res.json({ ok: true, answer, convId: conv._id });
  } catch (err) {
    console.error('ask error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Get conversations (user's history)
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const convs = await Conversation.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json({ ok: true, convs });
  } catch (err) {
    console.error('conversations error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// Get single user info
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    if (!user) return res.status(404).json({ ok: false, error: 'not_found' });
    return res.json({ ok: true, user });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
