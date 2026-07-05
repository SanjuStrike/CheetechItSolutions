/* ════════════════════════════════════════════════════════════════
   CHEETECH IT SOLUTION — app.js
   Frontend Logic: Routing, API calls, Admin console
   ════════════════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────────────────────────
let adminToken = sessionStorage.getItem('adminToken') || null;
let currentPage = 'home';
let editingJobId = null;

// ── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initHamburger();
  initParticles();
  initHeroParallax();
  initScrollRunCheetah();
  loadSettings();
  document.getElementById('copyrightYear').textContent = new Date().getFullYear();

  // File input display
  const appResume = document.getElementById('appResume');
  if (appResume) {
    appResume.addEventListener('change', () => {
      const name = appResume.files[0] ? appResume.files[0].name : 'Click to select file';
      document.getElementById('fileNameDisplay').textContent = name;
    });
  }
  const founderImg = document.getElementById('founderImgInput');
  if (founderImg) {
    founderImg.addEventListener('change', () => {
      const name = founderImg.files[0] ? founderImg.files[0].name : 'Choose new photo...';
      document.getElementById('founderImgName').textContent = name;
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════
function initRouter() {
  document.querySelectorAll('.nav-link, .mob-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      navigateTo(page);
    });
  });

  document.getElementById('adminNavBtn').addEventListener('click', () => {
    navigateTo('admin');
  });

  // Handle hash on load
  const hash = window.location.hash.replace('#', '');
  const validPages = ['home', 'about', 'services', 'careers', 'contact', 'admin'];
  if (hash && validPages.includes(hash)) {
    navigateTo(hash);
  } else {
    navigateTo('home');
  }
}

window.navigateTo = function(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    currentPage = page;
    window.location.hash = page;
  }

  // Highlight nav
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // Close mobile drawer
  closeMobileDrawer();

  // Scroll to top of main content
  document.getElementById('mainContent').scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific init
  switch (page) {
    case 'careers':
      loadJobs();
      break;
    case 'admin':
      initAdminPage();
      break;
    case 'contact':
      initContactForm();
      break;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// HAMBURGER / MOBILE DRAWER
// ══════════════════════════════════════════════════════════════════════════════
function initHamburger() {
  const btn = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('mobileDrawer');

  btn.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
  });
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobileDrawer');
  const btn = document.getElementById('hamburgerBtn');
  if (drawer) drawer.classList.remove('open');
  if (btn) btn.classList.remove('active');
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO PARTICLES
// ══════════════════════════════════════════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('heroParticles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      background: rgba(255,225,0,${Math.random() * 0.3 + 0.1});
      border-radius: 50%;
      top: ${Math.random() * 100}%;
      left: ${Math.random() * 100}%;
      animation: float-anim ${Math.random() * 4 + 3}s ease-in-out infinite;
      animation-delay: ${Math.random() * 3}s;
    `;
    container.appendChild(dot);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO PARALLAX ANIMATION
// ══════════════════════════════════════════════════════════════════════════════
function initHeroParallax() {
  const container = document.getElementById('heroParallax');
  if (!container) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    container.querySelectorAll('.parallax-layer').forEach(layer => {
      const depth = parseFloat(layer.getAttribute('data-depth')) || 0.5;
      const moveX = x * depth * 0.08;
      const moveY = y * depth * 0.08;
      
      // Offset translation dynamically based on depth
      layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    });
  });

  container.addEventListener('mouseleave', () => {
    container.querySelectorAll('.parallax-layer').forEach(layer => {
      layer.style.transform = 'translate3d(0, 0, 0)';
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SCROLL RUNNING CHEETAH
// ══════════════════════════════════════════════════════════════════════════════
function initScrollRunCheetah() {
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    
    // Clear previous timeout and set a new one to pause the cheetah when scrolling stops
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 250); // Pause run 250ms after scroll halts
  }, { passive: true });
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS — Load & Apply
// ══════════════════════════════════════════════════════════════════════════════
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    applySettings(settings);
  } catch (e) {
    console.warn('Could not load settings:', e.message);
  }
}

function applySettings(s) {
  if (!s) return;

  // Footer Email
  if (s.email) {
    setHref('footerEmail', `mailto:${s.email}`);
    setHref('contactEmailLink', `mailto:${s.email}`);
    setText('contactEmail', s.email);
    const em = document.getElementById('footerEmail');
    if (em) { const sp = em.querySelector('span'); if (sp) sp.textContent = s.email; }
  }

  // Phone
  if (s.phone) {
    setHref('footerPhone', `tel:${s.phone}`);
    setHref('contactPhoneLink', `tel:${s.phone}`);
    setText('contactPhone', s.phone);
    const ph = document.getElementById('footerPhone');
    if (ph) { const sp = ph.querySelector('span'); if (sp) sp.textContent = s.phone; }
  }

  // WhatsApp
  if (s.whatsapp) {
    const wa = 'https://wa.me/91' + s.whatsapp.replace(/\D/g, '');
    setHref('footerWhatsapp', wa);
    setHref('contactWhatsappLink', wa);
    setHref('footerWhatsappIcon', wa);
    setText('contactWhatsapp', s.whatsapp);
  }

  // Instagram
  if (s.instagram) {
    setHref('footerInstagram', s.instagram);
    setHref('contactInstagramLink', s.instagram);
    const handle = s.instagram.replace(/.*instagram\.com\//i, '@').replace(/\/$/, '');
    setText('contactInstagram', handle);
  }

  // LinkedIn
  if (s.linkedin) {
    setHref('footerLinkedin', s.linkedin);
    setHref('contactLinkedinLink', s.linkedin);
    setHref('founderLinkedin', s.linkedin);
  }

  // Founder
  if (s.founderName) {
    setText('founderName', s.founderName);
    setInput('setFounderName', s.founderName);
  }
  if (s.founderTitle) {
    setText('founderTitle', s.founderTitle + ', Cheetech IT Solutions');
    setInput('setFounderTitle', s.founderTitle);
  }
  if (s.founderBio) {
    setText('founderBio', s.founderBio);
    setInput('setFounderBio', s.founderBio);
  }
  if (s.founderImage) {
    const img = document.getElementById('founderImg');
    const prev = document.getElementById('adminFounderPreview');
    if (img) img.src = s.founderImage + '?t=' + Date.now();
    if (prev) prev.src = s.founderImage + '?t=' + Date.now();
  }

  // Populate settings form inputs
  setInput('setEmail', s.email || '');
  setInput('setPhone', s.phone || '');
  setInput('setWhatsapp', s.whatsapp || '');
  setInput('setInstagram', s.instagram || '');
  setInput('setLinkedin', s.linkedin || '');
}

function setHref(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.href = val;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.textContent = val;
}
function setInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

// ══════════════════════════════════════════════════════════════════════════════
// CAREERS — Load Jobs
// ══════════════════════════════════════════════════════════════════════════════
async function loadJobs() {
  const container = document.getElementById('jobsContainer');
  container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> Loading jobs...</div>';

  try {
    const res = await fetch('/api/jobs');
    const jobs = await res.json();

    if (!jobs.length) {
      container.innerHTML = `
        <div class="no-jobs">
          <i class="fa-solid fa-briefcase"></i>
          <p>No open positions at the moment. Check back soon!</p>
          <p style="margin-top:0.5rem; font-size:0.85rem;">You can send your resume to <strong style="color:var(--bright-gold)">Cheetechitsolutions@gmail.com</strong></p>
        </div>`;
      return;
    }

    container.innerHTML = '';
    jobs.forEach(job => {
      const card = document.createElement('div');
      card.className = 'job-listing-card';
      card.innerHTML = `
        <div class="job-info" style="flex:1">
          <h3>${escHtml(job.title)}</h3>
          <div class="job-meta">
            ${job.department ? `<span class="job-meta-item"><i class="fa-solid fa-building"></i>${escHtml(job.department)}</span>` : ''}
            ${job.location ? `<span class="job-meta-item"><i class="fa-solid fa-location-dot"></i>${escHtml(job.location)}</span>` : ''}
            ${job.salary ? `<span class="job-meta-item"><i class="fa-solid fa-indian-rupee-sign"></i>${escHtml(job.salary)}</span>` : ''}
            <span class="job-meta-item"><i class="fa-solid fa-calendar"></i>${formatDate(job.createdAt)}</span>
          </div>
          <p class="job-desc">${escHtml(job.description)}</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.75rem;flex-shrink:0">
          <span class="job-type-badge">${escHtml(job.type || 'Full-time')}</span>
          <button class="btn-primary" onclick="openApplicationForm('${escHtml(job.id)}', '${escHtml(job.title)}')">
            <i class="fa-solid fa-paper-plane"></i> Apply Now
          </button>
        </div>`;
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = `<div class="no-jobs"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load jobs. Please try again.</p></div>`;
  }
}

window.openApplicationForm = function(jobId, jobTitle) {
  document.getElementById('applyJobId').value = jobId;
  document.getElementById('applyJobTitle').textContent = jobTitle;
  const section = document.getElementById('applicationSection');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  initApplicationForm();
};

window.closeApplicationForm = function() {
  const section = document.getElementById('applicationSection');
  section.style.display = 'none';
  document.getElementById('applicationForm').reset();
  document.getElementById('fileNameDisplay').textContent = 'Click to select file';
  hideFormMsg('appFormMessage');
};

function initApplicationForm() {
  const form = document.getElementById('applicationForm');
  // Remove existing listener
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  // Re-attach file input listener
  const appResume = document.getElementById('appResume');
  if (appResume) {
    appResume.addEventListener('change', () => {
      const name = appResume.files[0] ? appResume.files[0].name : 'Click to select file';
      document.getElementById('fileNameDisplay').textContent = name;
    });
  }

  document.getElementById('applicationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('appSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    const form = e.target;
    const formData = new FormData(form);
    formData.set('jobTitle', document.getElementById('applyJobTitle').textContent);

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFormMsg('appFormMessage', data.message, 'success');
        form.reset();
        document.getElementById('fileNameDisplay').textContent = 'Click to select file';
        showToast('Application submitted successfully! 🎉', 'success');
      } else {
        showFormMsg('appFormMessage', data.error || 'Submission failed.', 'error');
      }
    } catch (err) {
      showFormMsg('appFormMessage', 'Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application';
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACT FORM
// ══════════════════════════════════════════════════════════════════════════════
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form || form.dataset.initialized) return;
  form.dataset.initialized = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ctcSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

    const body = {
      name: document.getElementById('ctcName').value.trim(),
      email: document.getElementById('ctcEmail').value.trim(),
      phone: document.getElementById('ctcPhone').value.trim(),
      subject: document.getElementById('ctcSubject').value.trim(),
      message: document.getElementById('ctcMessage').value.trim(),
    };

    if (!body.name || !body.email || !body.message) {
      showFormMsg('ctcFormMessage', 'Please fill in all required fields.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showFormMsg('ctcFormMessage', data.message, 'success');
        form.reset();
        showToast('Message sent! We\'ll get back to you soon. ✅', 'success');
      } else {
        showFormMsg('ctcFormMessage', data.error || 'Failed to send message.', 'error');
      }
    } catch (err) {
      showFormMsg('ctcFormMessage', 'Network error. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN CONSOLE
// ══════════════════════════════════════════════════════════════════════════════
function initAdminPage() {
  const loginSection = document.getElementById('adminLoginSection');
  const dashboard = document.getElementById('adminDashboard');

  if (adminToken) {
    // Verify token still valid
    fetch('/api/admin/check', { headers: { 'x-admin-token': adminToken } })
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          showDashboard();
        } else {
          adminToken = null;
          sessionStorage.removeItem('adminToken');
          showLoginForm();
        }
      }).catch(() => showLoginForm());
  } else {
    showLoginForm();
  }

  // Login button
  const loginBtn = document.getElementById('adminLoginBtn');
  if (loginBtn && !loginBtn.dataset.init) {
    loginBtn.dataset.init = true;
    loginBtn.addEventListener('click', handleAdminLogin);
    document.getElementById('adminPwd').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdminLogin();
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn && !logoutBtn.dataset.init) {
    logoutBtn.dataset.init = true;
    logoutBtn.addEventListener('click', handleAdminLogout);
  }
}

async function handleAdminLogin() {
  const pwd = document.getElementById('adminPwd').value;
  const btn = document.getElementById('adminLoginBtn');
  const msg = document.getElementById('adminLoginMsg');

  if (!pwd) {
    showFormMsg('adminLoginMsg', 'Please enter your password.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      adminToken = data.token;
      sessionStorage.setItem('adminToken', adminToken);
      document.getElementById('adminPwd').value = '';
      hideFormMsg('adminLoginMsg');
      showToast('Welcome to Admin Console! 🔓', 'success');
      showDashboard();
    } else {
      showFormMsg('adminLoginMsg', data.error || 'Login failed.', 'error');
    }
  } catch (err) {
    showFormMsg('adminLoginMsg', 'Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
  }
}

async function handleAdminLogout() {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { 'x-admin-token': adminToken },
    });
  } catch (e) {}
  adminToken = null;
  sessionStorage.removeItem('adminToken');
  showLoginForm();
  showToast('Logged out successfully.', 'success');
}

function showLoginForm() {
  document.getElementById('adminLoginSection').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
  document.getElementById('adminLoginSection').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  initJobFormListeners();
  switchAdminTab('jobs');
  loadAdminJobs();
  loadSettings();
}

function initJobFormListeners() {
  // Open add job button
  const addBtn = document.getElementById('openAddJobBtn');
  if (addBtn && !addBtn.dataset.init) {
    addBtn.dataset.init = true;
    addBtn.addEventListener('click', openAddJobForm);
  }

  // Job form submit
  const jobForm = document.getElementById('jobForm');
  if (jobForm && !jobForm.dataset.init) {
    jobForm.dataset.init = true;
    jobForm.addEventListener('submit', handleJobFormSubmit);
  }
}

// ── Admin Tabs ───────────────────────────────────────────────────────────────
window.switchAdminTab = function(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(p => { p.style.display = 'none'; });

  const tabEl = document.getElementById(`tab${capitalize(tab)}`);
  if (tabEl) tabEl.classList.add('active');

  const panelEl = document.getElementById(`panel${capitalize(tab)}`);
  if (panelEl) panelEl.style.display = 'block';

  if (tab === 'contacts') loadAdminContacts();
  if (tab === 'applications') loadAdminApplications();
  if (tab === 'settings') initSettingsForms();
};

// ── Admin Jobs ───────────────────────────────────────────────────────────────
async function loadAdminJobs() {
  const wrap = document.getElementById('adminJobsTable');
  wrap.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>';

  try {
    const res = await fetch('/api/admin/jobs', { headers: { 'x-admin-token': adminToken } });
    const jobs = await res.json();

    if (!jobs.length) {
      wrap.innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">No jobs yet. Add your first job!</p>';
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Dept</th>
            <th>Location</th>
            <th>Type</th>
            <th>Salary</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map(j => `
            <tr>
              <td>${escHtml(j.title)}</td>
              <td>${escHtml(j.department || '—')}</td>
              <td>${escHtml(j.location || '—')}</td>
              <td><span class="job-type-badge" style="font-size:0.72rem">${escHtml(j.type || 'Full-time')}</span></td>
              <td>${escHtml(j.salary || '—')}</td>
              <td>${formatDate(j.createdAt)}</td>
              <td>
                <div class="td-actions">
                  <button class="btn-outline-sm" onclick="editJob('${j.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                  <button class="btn-danger-sm" onclick="deleteJobAdmin('${j.id}', '${escHtml(j.title)}')"><i class="fa-solid fa-trash"></i></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = '<p style="color:var(--pure-red);padding:2rem">Failed to load jobs.</p>';
  }
}

function openAddJobForm() {
  editingJobId = null;
  document.getElementById('jobFormTitle').textContent = 'Add New Job';
  document.getElementById('jobSaveBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Add Job';
  document.getElementById('editJobId').value = '';
  document.getElementById('jobForm').reset();
  hideFormMsg('jobFormMsg');
  document.getElementById('jobFormWrap').style.display = 'block';
  document.getElementById('jobFormWrap').scrollIntoView({ behavior: 'smooth' });
}

window.editJob = async function(id) {
  try {
    const res = await fetch('/api/admin/jobs', { headers: { 'x-admin-token': adminToken } });
    const jobs = await res.json();
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    editingJobId = id;
    document.getElementById('jobFormTitle').textContent = 'Edit Job';
    document.getElementById('jobSaveBtn').innerHTML = '<i class="fa-solid fa-save"></i> Update Job';
    document.getElementById('editJobId').value = id;
    setInput('jobTitle', job.title);
    setInput('jobDept', job.department || '');
    setInput('jobLocation', job.location || '');
    document.getElementById('jobType').value = job.type || 'Full-time';
    setInput('jobSalary', job.salary || '');
    setInput('jobDesc', job.description || '');
    setInput('jobReqs', job.requirements || '');
    hideFormMsg('jobFormMsg');
    document.getElementById('jobFormWrap').style.display = 'block';
    document.getElementById('jobFormWrap').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showToast('Failed to load job data.', 'error');
  }
};

window.closeJobForm = function() {
  document.getElementById('jobFormWrap').style.display = 'none';
  document.getElementById('jobForm').reset();
  editingJobId = null;
};

async function handleJobFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('jobSaveBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const body = {
    title: document.getElementById('jobTitle').value.trim(),
    department: document.getElementById('jobDept').value.trim(),
    location: document.getElementById('jobLocation').value.trim(),
    type: document.getElementById('jobType').value,
    salary: document.getElementById('jobSalary').value.trim(),
    description: document.getElementById('jobDesc').value.trim(),
    requirements: document.getElementById('jobReqs').value.trim(),
  };

  if (!body.title || !body.description) {
    showFormMsg('jobFormMsg', 'Title and description are required.', 'error');
    btn.disabled = false;
    btn.innerHTML = editingJobId ? '<i class="fa-solid fa-save"></i> Update Job' : '<i class="fa-solid fa-plus"></i> Add Job';
    return;
  }

  try {
    let res;
    if (editingJobId) {
      res = await fetch(`/api/admin/jobs/${editingJobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch('/api/admin/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify(body),
      });
    }
    const data = await res.json();
    if (res.ok && data.success) {
      showFormMsg('jobFormMsg', `Job ${editingJobId ? 'updated' : 'created'} successfully!`, 'success');
      showToast(`Job ${editingJobId ? 'updated' : 'created'}! ✅`, 'success');
      setTimeout(() => {
        closeJobForm();
        loadAdminJobs();
      }, 1200);
    } else {
      showFormMsg('jobFormMsg', data.error || 'Operation failed.', 'error');
    }
  } catch (err) {
    showFormMsg('jobFormMsg', 'Network error.', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editingJobId ? '<i class="fa-solid fa-save"></i> Update Job' : '<i class="fa-solid fa-plus"></i> Add Job';
  }
}

window.deleteJobAdmin = async function(id, title) {
  if (!confirm(`Delete job: "${title}"?\n\nThis action cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/admin/jobs/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken },
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Job deleted.', 'success');
      loadAdminJobs();
    } else {
      showToast('Delete failed.', 'error');
    }
  } catch (e) {
    showToast('Network error.', 'error');
  }
};

// ── Admin Contacts ───────────────────────────────────────────────────────────
async function loadAdminContacts() {
  const wrap = document.getElementById('adminContactsTable');
  wrap.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch('/api/admin/contacts', { headers: { 'x-admin-token': adminToken } });
    const contacts = await res.json();
    if (!contacts.length) {
      wrap.innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">No contact messages yet.</p>';
      return;
    }
    wrap.innerHTML = `
      <table class="admin-table" id="contactsTable">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllContacts" onchange="toggleSelectAll('contactsTable', this.checked)" /></th>
            <th>Name</th><th>Email</th><th>Phone</th><th>Subject</th><th>Message</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${contacts.map(c => `
            <tr data-id="${c.id}">
              <td><input type="checkbox" class="row-check" value="${c.id}" /></td>
              <td>${escHtml(c.name)}</td>
              <td><a href="mailto:${escHtml(c.email)}" style="color:var(--bright-gold)">${escHtml(c.email)}</a></td>
              <td>${escHtml(c.phone || '—')}</td>
              <td>${escHtml(c.subject || '—')}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.message)}">${escHtml(c.message)}</td>
              <td>${formatDate(c.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = '<p style="color:var(--pure-red);padding:2rem">Failed to load contacts.</p>';
  }
}

// ── Admin Applications ───────────────────────────────────────────────────────
async function loadAdminApplications() {
  const wrap = document.getElementById('adminAppsTable');
  wrap.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>';
  try {
    const res = await fetch('/api/admin/applications', { headers: { 'x-admin-token': adminToken } });
    const apps = await res.json();
    if (!apps.length) {
      wrap.innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center;">No job applications yet.</p>';
      return;
    }
    wrap.innerHTML = `
      <table class="admin-table" id="applicationsTable">
        <thead>
          <tr>
            <th><input type="checkbox" id="selectAllApps" onchange="toggleSelectAll('applicationsTable', this.checked)" /></th>
            <th>Name</th><th>Email</th><th>Phone</th><th>Job</th><th>Experience</th><th>Resume</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map(a => `
            <tr data-id="${a.id}">
              <td><input type="checkbox" class="row-check" value="${a.id}" /></td>
              <td>${escHtml(a.name)}</td>
              <td><a href="mailto:${escHtml(a.email)}" style="color:var(--bright-gold)">${escHtml(a.email)}</a></td>
              <td>${escHtml(a.phone || '—')}</td>
              <td>${escHtml(a.jobTitle || a.jobId || '—')}</td>
              <td>${escHtml(a.experience || '—')}</td>
              <td>${a.resumePath ? `<a href="${a.resumePath}" target="_blank" style="color:var(--bright-gold)"><i class="fa-solid fa-file"></i> View</a>` : '—'}</td>
              <td>${formatDate(a.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    wrap.innerHTML = '<p style="color:var(--pure-red);padding:2rem">Failed to load applications.</p>';
  }
}

// ── Select All / Download ─────────────────────────────────────────────────────
window.selectAllRows = function(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const checks = table.querySelectorAll('.row-check');
  const allChecked = [...checks].every(c => c.checked);
  checks.forEach(c => c.checked = !allChecked);
};

window.toggleSelectAll = function(tableId, checked) {
  const table = document.getElementById(tableId);
  if (!table) return;
  table.querySelectorAll('.row-check').forEach(c => c.checked = checked);
};

window.downloadSelected = function(type) {
  let tableId = type === 'contacts' ? 'contactsTable' : 'applicationsTable';
  const table = document.getElementById(tableId);
  const checked = table ? [...table.querySelectorAll('.row-check:checked')].map(c => c.value) : [];
  const idsParam = checked.length ? `&ids=${checked.join(',')}` : '';
  const url = `/api/admin/download-csv?token=${encodeURIComponent(adminToken)}&type=${type}${idsParam}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  a.click();
  showToast(`Downloading ${type} CSV... 📥`, 'success');
};

// ── Admin Settings Forms ──────────────────────────────────────────────────────
function initSettingsForms() {
  // Contact Info form
  const contactForm = document.getElementById('settingsContactForm');
  if (contactForm && !contactForm.dataset.init) {
    contactForm.dataset.init = true;
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        email: document.getElementById('setEmail').value.trim(),
        phone: document.getElementById('setPhone').value.trim(),
        whatsapp: document.getElementById('setWhatsapp').value.trim(),
        instagram: document.getElementById('setInstagram').value.trim(),
        linkedin: document.getElementById('setLinkedin').value.trim(),
      };
      await saveSettings(body, 'settingsContactMsg');
    });
  }

  // Founder Info form
  const founderForm = document.getElementById('settingsFounderForm');
  if (founderForm && !founderForm.dataset.init) {
    founderForm.dataset.init = true;
    founderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        founderName: document.getElementById('setFounderName').value.trim(),
        founderTitle: document.getElementById('setFounderTitle').value.trim(),
        founderBio: document.getElementById('setFounderBio').value.trim(),
      };
      await saveSettings(body, 'settingsFounderMsg');
    });
  }

  // Founder Image form
  const imgForm = document.getElementById('founderImgForm');
  if (imgForm && !imgForm.dataset.init) {
    imgForm.dataset.init = true;
    imgForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = document.getElementById('founderImgInput').files[0];
      if (!file) {
        showFormMsg('founderImgMsg', 'Please select an image file.', 'error');
        return;
      }
      const fd = new FormData();
      fd.append('image', file);
      try {
        const res = await fetch('/api/admin/settings/founder-image', {
          method: 'POST',
          headers: { 'x-admin-token': adminToken },
          body: fd,
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const t = '?t=' + Date.now();
          document.getElementById('founderImg').src = '/assets/founder.jpg' + t;
          document.getElementById('adminFounderPreview').src = '/assets/founder.jpg' + t;
          showFormMsg('founderImgMsg', 'Photo updated successfully!', 'success');
          showToast('Founder photo updated! 📸', 'success');
        } else {
          showFormMsg('founderImgMsg', data.error || 'Upload failed.', 'error');
        }
      } catch (err) {
        showFormMsg('founderImgMsg', 'Network error.', 'error');
      }
    });
  }
}

async function saveSettings(body, msgId) {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showFormMsg(msgId, 'Settings saved successfully!', 'success');
      applySettings(data.settings);
      showToast('Settings updated! ✅', 'success');
    } else {
      showFormMsg(msgId, data.error || 'Save failed.', 'error');
    }
  } catch (err) {
    showFormMsg(msgId, 'Network error.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════
function showToast(message, type = '') {
  const toast = document.getElementById('toastNotif');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ══════════════════════════════════════════════════════════════════════════════
// FORM MESSAGES
// ══════════════════════════════════════════════════════════════════════════════
function showFormMsg(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `form-message ${type}`;
  el.style.display = 'block';
}
function hideFormMsg(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.textContent = ''; }
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
