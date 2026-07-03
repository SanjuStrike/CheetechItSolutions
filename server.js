require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  connectMongo,
  getSettings,
  updateSettings,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  saveContact,
  getContacts,
  saveApplication,
  getApplications,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cheetech123';

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Session Store (in-memory token) ────────────────────────────────────────
const activeSessions = new Set();

function generateToken() {
  return 'tk_' + Math.random().toString(36).substr(2, 16) + Date.now();
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  next();
}

// ── File upload configuration ──────────────────────────────────────────────
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'resumes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, PNG, JPG files allowed'));
  },
});

const founderStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'assets'));
  },
  filename: (req, file, cb) => {
    cb(null, 'founder.jpg');
  },
});
const uploadFounder = multer({
  storage: founderStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Serve uploaded resumes (admin only in production - simplified here)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ══════════════════════════════════════════════════════════════════
// PUBLIC API ROUTES
// ══════════════════════════════════════════════════════════════════

// GET Settings (public - only safe fields)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Jobs (public)
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await getJobs();
    const activeJobs = jobs.filter(j => !j.archived);
    res.json(activeJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Contact (public)
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    const contact = await saveContact({ name, email, phone, subject, message });
    res.status(201).json({ success: true, message: 'Your message has been received! We will contact you shortly.', id: contact.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Job Application (public) - with resume file upload
app.post('/api/applications', uploadResume.single('resume'), async (req, res) => {
  try {
    const { name, email, phone, jobId, jobTitle, experience, message } = req.body;
    if (!name || !email || !jobId) {
      return res.status(400).json({ error: 'Name, email, and job selection are required.' });
    }
    const resumePath = req.file ? `/uploads/resumes/${req.file.filename}` : null;
    const application = await saveApplication({
      name, email, phone, jobId, jobTitle, experience, message, resumePath,
    });
    res.status(201).json({ success: true, message: 'Application submitted! We will review and contact you.', id: application.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// ADMIN AUTH ROUTES
// ══════════════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = generateToken();
    activeSessions.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid password.' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) activeSessions.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/check', (req, res) => {
  const token = req.headers['x-admin-token'];
  res.json({ authenticated: !!(token && activeSessions.has(token)) });
});

// ══════════════════════════════════════════════════════════════════
// ADMIN API ROUTES (Protected)
// ══════════════════════════════════════════════════════════════════

// Settings management
app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings/founder-image', requireAdmin, uploadFounder.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    const imageUrl = '/assets/founder.jpg?t=' + Date.now();
    await updateSettings({ founderImage: '/assets/founder.jpg' });
    res.json({ success: true, imageUrl: '/assets/founder.jpg' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Jobs CRUD
app.get('/api/admin/jobs', requireAdmin, async (req, res) => {
  try {
    const jobs = await getJobs();
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/jobs', requireAdmin, async (req, res) => {
  try {
    const { title, department, location, type, description, requirements, salary } = req.body;
    if (!title || !description) return res.status(400).json({ error: 'Title and description are required.' });
    const job = await createJob({ title, department, location, type, description, requirements, salary });
    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
  try {
    const job = await updateJob(req.params.id, req.body);
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/jobs/:id', requireAdmin, async (req, res) => {
  try {
    await deleteJob(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View submissions
app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  try {
    const contacts = await getContacts();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const apps = await getApplications();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download CSV (Excel-compatible)
app.get('/api/admin/download-csv', requireAdmin, async (req, res) => {
  try {
    const { type, ids } = req.query;
    let data = [];
    let filename = 'export.csv';

    if (type === 'contacts') {
      const all = await getContacts();
      data = ids ? all.filter(c => ids.split(',').includes(c.id)) : all;
      filename = 'contacts_export.csv';
    } else if (type === 'applications') {
      const all = await getApplications();
      data = ids ? all.filter(a => ids.split(',').includes(a.id)) : all;
      filename = 'applications_export.csv';
    } else {
      return res.status(400).json({ error: 'Invalid type. Use contacts or applications.' });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'No data found for selected IDs.' });
    }

    // Generate CSV
    const keys = Object.keys(data[0]);
    const csvRows = [keys.join(',')];
    for (const row of data) {
      const values = keys.map(k => {
        const val = String(row[k] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    const csv = '\uFEFF' + csvRows.join('\r\n'); // BOM for Excel UTF-8

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start Server ───────────────────────────────────────────────────────────
async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`\n🚀 Cheetech IT Solution server running at http://localhost:${PORT}`);
    console.log(`   Admin Console:  http://localhost:${PORT}/#admin`);
    console.log(`   Admin Password: ${ADMIN_PASSWORD}\n`);
  });
}

start();
