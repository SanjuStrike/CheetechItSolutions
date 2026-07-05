const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DB_JSON_PATH = path.join(__dirname, 'db.json');
let db = null;
let mongoConnected = false;

function readJsonDb() {
  try {
    const raw = fs.readFileSync(DB_JSON_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { settings: {}, jobs: [], contacts: [], applications: [] };
  }
}

function writeJsonDb(data) {
  fs.writeFileSync(DB_JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

async function connectMongo() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cheetech';
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db();
    mongoConnected = true;
    console.log('✅ Connected to MongoDB');

    // Sync existing db.json data into MongoDB on first connect
    const jsonData = readJsonDb();
    const settingsCount = await db.collection('settings').countDocuments();
    if (settingsCount === 0 && jsonData.settings && Object.keys(jsonData.settings).length > 0) {
      await db.collection('settings').insertOne(jsonData.settings);
    }
    const jobsCount = await db.collection('jobs').countDocuments();
    if (jobsCount === 0 && jsonData.jobs && jsonData.jobs.length > 0) {
      await db.collection('jobs').insertMany(jsonData.jobs);
    }
  } catch (err) {
    mongoConnected = false;
    console.warn('⚠️  MongoDB not available, using db.json fallback:', err.message);
  }
}

// ── Settings ───────────────────────────────────────────────────────────────

async function getSettings() {
  if (mongoConnected) {
    const doc = await db.collection('settings').findOne({});
    if (doc) {
      const { _id, ...rest } = doc;
      return rest;
    }
  }
  return readJsonDb().settings || {};
}

async function updateSettings(newSettings) {
  const jsonData = readJsonDb();
  jsonData.settings = { ...jsonData.settings, ...newSettings };
  writeJsonDb(jsonData);

  if (mongoConnected) {
    const existing = await db.collection('settings').findOne({});
    if (existing) {
      await db.collection('settings').updateOne({}, { $set: newSettings });
    } else {
      await db.collection('settings').insertOne(newSettings);
    }
  }
  return jsonData.settings;
}

// ── Jobs ───────────────────────────────────────────────────────────────────

async function getJobs() {
  if (mongoConnected) {
    const jobs = await db.collection('jobs').find({}).sort({ createdAt: -1 }).toArray();
    return jobs.map(j => ({ ...j, id: j._id.toString(), _id: undefined }));
  }
  return readJsonDb().jobs || [];
}

async function createJob(jobData) {
  const id = `job_${Date.now()}`;
  const job = { ...jobData, id, createdAt: new Date().toISOString() };

  const jsonData = readJsonDb();
  jsonData.jobs.unshift(job);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    await db.collection('jobs').insertOne({ ...job, _id: undefined });
  }
  return job;
}

async function updateJob(id, jobData) {
  const jsonData = readJsonDb();
  const idx = jsonData.jobs.findIndex(j => j.id === id);
  if (idx !== -1) {
    jsonData.jobs[idx] = { ...jsonData.jobs[idx], ...jobData };
    writeJsonDb(jsonData);
  }
  if (mongoConnected) {
    // Try by _id first (getJobs maps _id→id), then fall back to custom id field
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    await db.collection('jobs').updateOne(query, { $set: jobData });
  }
  return jsonData.jobs[idx];
}

async function deleteJob(id) {
  const jsonData = readJsonDb();
  jsonData.jobs = jsonData.jobs.filter(j => j.id !== id);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    // Try by _id first (getJobs maps _id→id), then fall back to custom id field
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    const result = await db.collection('jobs').deleteOne(query);
    if (result.deletedCount === 0) {
      // Fallback: try the other field
      await db.collection('jobs').deleteOne({ id });
    }
  }
  return { success: true };
}

// ── Contacts ──────────────────────────────────────────────────────────────

async function saveContact(contactData) {
  const id = `contact_${Date.now()}`;
  const contact = { ...contactData, id, createdAt: new Date().toISOString(), read: false };

  const jsonData = readJsonDb();
  jsonData.contacts.unshift(contact);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    await db.collection('contacts').insertOne({ ...contact, _id: undefined });
  }
  return contact;
}

async function getContacts() {
  if (mongoConnected) {
    const contacts = await db.collection('contacts').find({}).sort({ createdAt: -1 }).toArray();
    return contacts.map(c => ({ ...c, id: c.id || c._id.toString(), _id: undefined }));
  }
  return readJsonDb().contacts || [];
}

// ── Applications ───────────────────────────────────────────────────────────

async function saveApplication(appData) {
  const id = `app_${Date.now()}`;
  const application = { ...appData, id, createdAt: new Date().toISOString(), status: 'pending' };

  const jsonData = readJsonDb();
  jsonData.applications.unshift(application);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    await db.collection('applications').insertOne({ ...application, _id: undefined });
  }
  return application;
}

async function getApplications() {
  if (mongoConnected) {
    const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).toArray();
    return apps.map(a => ({ ...a, id: a.id || a._id.toString(), _id: undefined }));
  }
  return readJsonDb().applications || [];
}

async function deleteContact(id) {
  const jsonData = readJsonDb();
  jsonData.contacts = jsonData.contacts.filter(c => c.id !== id);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    await db.collection('contacts').deleteOne({ id });
  }
  return { success: true };
}

async function deleteApplication(id) {
  const jsonData = readJsonDb();
  jsonData.applications = jsonData.applications.filter(a => a.id !== id);
  writeJsonDb(jsonData);

  if (mongoConnected) {
    await db.collection('applications').deleteOne({ id });
  }
  return { success: true };
}

module.exports = {
  connectMongo,
  getSettings,
  updateSettings,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  saveContact,
  getContacts,
  deleteContact,
  saveApplication,
  getApplications,
  deleteApplication,
};
