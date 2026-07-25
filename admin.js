// State Management with Firebase Firestore
import {
  seedIfEmpty,
  subscribeInventory,
  subscribeDonors,
  subscribeRequests,
  updateDonor,
  deleteRequest,
  setInventoryUnits
} from './db-service.js';

// Still used for the admin login session flag (sessionStorage), which is
// unrelated to the app data — that now lives in Firestore, not localStorage.
const STORAGE_PREFIX = 'lifeflow_';

// Live state — populated by real-time Firestore subscriptions.
let inventory = [];
let donors = [];
let requests = [];
// DOM Elements
const loginGate = document.getElementById('login-gate');
const loginForm = document.getElementById('login-form');
const bypassBtn = document.getElementById('demo-bypass-btn');
const adminLogout = document.getElementById('admin-logout');
const totalUnitsEl = document.getElementById('metric-total-units');
const criticalTypesEl = document.getElementById('metric-critical-types');
const pendingRequestsEl = document.getElementById('metric-pending-requests');
const totalDonorsEl = document.getElementById('metric-total-donors');
const stockChartContainer = document.getElementById('stock-distribution-chart');
const inventoryGrid = document.getElementById('admin-inventory-grid');
const requestsTableBody = document.getElementById('admin-requests-table-body');
const donorsTableBody = document.getElementById('admin-donors-table-body');
const donorSearchInput = document.getElementById('admin-search-donor');
const logDonationForm = document.getElementById('log-donation-form');
const logDonorSelect = document.getElementById('log-donor-select');
const logBloodDisplay = document.getElementById('log-blood-display');
const toastEl = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');
const toastSuccessIcon = document.getElementById('toast-icon-success');
const toastErrorIcon = document.getElementById('toast-icon-error');
// Header Scroll Class
window.addEventListener('scroll', () => {
  const header = document.getElementById('site-header');
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});
// Toast Helper
function showToast(message, isError = false) {
  toastMsg.textContent = message;
  if (isError) {
    toastSuccessIcon.style.display = 'none';
    toastErrorIcon.style.display = 'block';
    toastEl.classList.add('error');
  } else {
    toastSuccessIcon.style.display = 'block';
    toastErrorIcon.style.display = 'none';
    toastEl.classList.remove('error');
  }
  toastEl.classList.add('show');
  
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 4000);
}
// Authentication Logic
function checkAuth() {
  const isAuth = sessionStorage.getItem(STORAGE_PREFIX + 'admin_auth');
  if (isAuth === 'true') {
    loginGate.classList.add('hidden');
    initializeDashboard();
  } else {
    loginGate.classList.remove('hidden');
  }
}
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const passcode = document.getElementById('admin-passcode').value;
  if (passcode === '1234') {
    sessionStorage.setItem(STORAGE_PREFIX + 'admin_auth', 'true');
    loginGate.classList.add('hidden');
    initializeDashboard();
    showToast('Authenticated successfully. Welcome back, Administrator.');
  } else {
    showToast('Invalid Security Key. Please try again.', true);
  }
});
bypassBtn.addEventListener('click', () => {
  sessionStorage.setItem(STORAGE_PREFIX + 'admin_auth', 'true');
  loginGate.classList.add('hidden');
  initializeDashboard();
  showToast('Demo Mode Bypass: Session authorized.');
});
adminLogout.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(STORAGE_PREFIX + 'admin_auth');
  location.reload();
});
// Initialize Dashboard Content
// (inventory/donors/requests are kept fresh by the Firestore subscriptions
// set up in the DOMContentLoaded handler at the bottom of this file, so
// this just needs to render whatever is currently in memory.)
function initializeDashboard() {
  renderMetrics();
  renderChart();
  renderInventoryGrid();
  renderRequestsTable();
  renderDonorsTable();
  populateDonorDropdown();
}
// Render Metrics Ribbon
function renderMetrics() {
  const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0);
  totalUnitsEl.textContent = totalUnits;
  
  const criticalCount = inventory.filter(item => (item.units / item.max) < 0.3).length;
  criticalTypesEl.textContent = criticalCount;
  
  pendingRequestsEl.textContent = requests.length;
  totalDonorsEl.textContent = donors.length;
}
// Render Stock Analytics Chart
function renderChart() {
  stockChartContainer.innerHTML = '';
  inventory.forEach(item => {
    const pct = Math.min(100, Math.round((item.units / item.max) * 100));
    
    // Choose gradient based on stock levels
    let colorStyle = 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)'; // critical
    if (pct >= 30 && pct <= 65) {
      colorStyle = 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'; // stable
    } else if (pct > 65) {
      colorStyle = 'linear-gradient(180deg, #10b981 0%, #059669 100%)'; // high
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-bar-wrapper';
    wrapper.innerHTML = `
      <div class="chart-bar" style="height: ${pct}%; background: ${colorStyle};">
        <div class="chart-bar-tooltip">${item.units} / ${item.max} Units (${pct}%)</div>
      </div>
      <div class="chart-label">${item.type}</div>
    `;
    stockChartContainer.appendChild(wrapper);
  });
}
// Render Inventory Controls
function renderInventoryGrid() {
  inventoryGrid.innerHTML = '';
  inventory.forEach(item => {
    const pct = Math.round((item.units / item.max) * 100);
    let statusClass = 'stable';
    let statusText = 'Stable';
    
    if (pct < 30) {
      statusClass = 'critical';
      statusText = 'Critical';
    } else if (pct > 65) {
      statusClass = 'high';
      statusText = 'High';
    }
    
    const card = document.createElement('div');
    card.className = `glass-panel blood-card-admin ${statusClass}`;
    card.innerHTML = `
      <div class="blood-card-admin-header">
        <div class="blood-type" style="margin: 0; font-size: 1.8rem;">
          ${item.type}
        </div>
        <div class="admin-stock-actions">
          <button class="btn-adjust minus-btn" data-type="${item.type}">-</button>
          <span style="font-weight: 700; font-size: 1.1rem; min-width: 30px; text-align: center;">${item.units}</span>
          <button class="btn-adjust plus-btn" data-type="${item.type}">+</button>
        </div>
      </div>
      <div class="inventory-level" style="margin-bottom: 8px; text-align: left;">Status: <strong class="badge badge-${statusClass}">${statusText}</strong></div>
      <div class="progress-bar-container" style="margin-bottom: 6px;">
        <div class="progress-bar" style="width: ${pct}%"></div>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary); display:flex; justify-content:space-between;">
        <span>Max Cap: ${item.max}u</span>
        <span>${pct}% Filled</span>
      </div>
    `;
    
    // Wire up events
    card.querySelector('.minus-btn').addEventListener('click', () => adjustStock(item.type, -1));
    card.querySelector('.plus-btn').addEventListener('click', () => adjustStock(item.type, 1));
    
    inventoryGrid.appendChild(card);
  });
}
async function adjustStock(bloodType, amount) {
  const match = inventory.find(i => i.type === bloodType);
  if (match) {
    const newCount = match.units + amount;
    if (newCount < 0) {
      showToast('Inventory unit count cannot drop below 0.', true);
      return;
    }
    if (newCount > match.max) {
      showToast(`Inventory limit reached for ${bloodType} (${match.max} Units max).`, true);
      return;
    }
    try {
      await setInventoryUnits(bloodType, newCount);
      // GUI refreshes automatically via the inventory subscription.
      showToast(`Inventory updated for ${bloodType}: ${newCount} Units.`);
    } catch (err) {
      console.error('LifeFlow: failed to update inventory', err);
      showToast('Could not update inventory — check your connection/database setup.', true);
    }
  }
}
// Render Urgent Requests Table
function renderRequestsTable() {
  requestsTableBody.innerHTML = '';
  
  if (requests.length === 0) {
    requestsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No active emergency broadcasts registered.
        </td>
      </tr>
    `;
    return;
  }
  
  requests.forEach(req => {
    let urgencyBadge = 'stable';
    if (req.urgency === 'Critical') urgencyBadge = 'critical';
    else if (req.urgency === 'High') urgencyBadge = 'high';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${req.patient}</strong></td>
      <td><span class="donor-blood-badge">${req.blood}</span></td>
      <td>${req.units} Units</td>
      <td><span class="badge badge-${urgencyBadge}">${req.urgency}</span></td>
      <td><span style="font-size: 0.85rem;">${req.hospital}</span></td>
      <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${req.contact}</span></td>
      <td style="text-align: right;">
        <button class="btn-primary resolve-req-btn" data-id="${req.id}" style="padding: 6px 12px; font-size: 0.75rem; background: linear-gradient(135deg, #10b981 0%, #047857 100%); box-shadow: none;">Resolve</button>
      </td>
    `;
    
    tr.querySelector('.resolve-req-btn').addEventListener('click', () => {
      resolveRequest(req.id);
    });
    
    requestsTableBody.appendChild(tr);
  });
}
async function resolveRequest(id) {
  const match = requests.find(r => r.id === id);
  if (match) {
    const patientName = match.patient;
    try {
      await deleteRequest(id);
      // Table/metrics refresh automatically via the requests subscription.
      showToast(`Emergency request for ${patientName} marked as RESOLVED.`);
    } catch (err) {
      console.error('LifeFlow: failed to resolve request', err);
      showToast('Could not resolve this request — check your connection/database setup.', true);
    }
  }
}
// Render Donors Table
function renderDonorsTable() {
  donorsTableBody.innerHTML = '';
  const searchVal = donorSearchInput.value.toLowerCase().trim();
  
  const filtered = donors.filter(d => {
    return !searchVal || 
           d.name.toLowerCase().includes(searchVal) || 
           d.blood.toLowerCase().includes(searchVal) || 
           d.location.toLowerCase().includes(searchVal);
  });
  
  if (filtered.length === 0) {
    donorsTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
          No matching donor records found.
        </td>
      </tr>
    `;
    return;
  }
  
  filtered.forEach(donor => {
    const isDeferred = donor.lastDonated === '1';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="donor-avatar" style="width:32px; height:32px; font-size:0.75rem;">${donor.name.split(' ').map(n => n[0]).join('')}</div>
          <strong>${donor.name}</strong>
        </div>
      </td>
      <td><span class="donor-blood-badge">${donor.blood}</span></td>
      <td>${donor.location}</td>
      <td>${donor.age} Yrs</td>
      <td>${donor.phone}</td>
      <td>
        <span class="badge ${isDeferred ? 'badge-deferred' : 'badge-stable'}">
          ${isDeferred ? 'Deferred (3m)' : 'Eligible'}
        </span>
      </td>
      <td style="text-align: right; display: flex; gap: 6px; justify-content: flex-end; align-items: center; border-bottom: none; height: 65px;">
        <button class="btn-primary quick-log-btn" data-id="${donor.id}" style="padding: 6px 12px; font-size: 0.75rem; box-shadow: none;">Log Donation</button>
        <button class="btn-secondary quick-contact-btn" data-phone="${donor.phone}" data-name="${donor.name}" style="padding: 6px 12px; font-size: 0.75rem;">Contact</button>
      </td>
    `;
    
    // Quick Actions wiring
    tr.querySelector('.quick-log-btn').addEventListener('click', () => {
      logDonorSelect.value = donor.id;
      // Trigger select change logic manually to update readonly displays
      logDonorSelect.dispatchEvent(new Event('change'));
      document.getElementById('admin-inventory-section').scrollIntoView({ behavior: 'smooth' });
      showToast(`Selected ${donor.name}. Configure details in Log Donation form.`);
    });
    
    tr.querySelector('.quick-contact-btn').addEventListener('click', () => {
      showToast(`Connecting with ${donor.name} at phone ${donor.phone}...`);
    });
    
    donorsTableBody.appendChild(tr);
  });
}
// Populate Donor Dropdown
function populateDonorDropdown() {
  logDonorSelect.innerHTML = '<option value="">Choose volunteer...</option>';
  donors.forEach(d => {
    const isDeferred = d.lastDonated === '1';
    const suffix = isDeferred ? ' (Deferred)' : '';
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} [${d.blood}]${suffix}`;
    logDonorSelect.appendChild(opt);
  });
}
// Dropdown change listener to display blood group
logDonorSelect.addEventListener('change', (e) => {
  const donorId = parseInt(e.target.value);
  if (!donorId) {
    logBloodDisplay.value = '';
    return;
  }
  const match = donors.find(d => d.id === donorId);
  if (match) {
    const isDeferred = match.lastDonated === '1';
    logBloodDisplay.value = `${match.blood} Type ${isDeferred ? '(Warning: Deferred)' : '(Eligible)'}`;
  }
});
// Search input listener
donorSearchInput.addEventListener('input', renderDonorsTable);
// Handle Log Donation Form Submission
logDonationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const donorId = parseInt(logDonorSelect.value);
  const units = parseInt(document.getElementById('log-units').value);
  const hospital = document.getElementById('log-hospital').value.trim();
  
  if (!donorId || !units || !hospital) {
    showToast('Please select a donor and fill out units.', true);
    return;
  }
  
  const donor = donors.find(d => d.id === donorId);
  if (!donor) return;
  
  try {
    // 1. Update donor eligibility: mark as deferred (just donated, wait 3 months)
    await updateDonor(donorId, { lastDonated: '1' });

    // 2. Add units to central stock inventory
    const typeInv = inventory.find(i => i.type === donor.blood);
    if (typeInv) {
      await setInventoryUnits(donor.blood, Math.min(typeInv.max, typeInv.units + units));
    }

    // Layout refreshes automatically via the donors/inventory subscriptions.

    showToast(`Donation logged! Added ${units} Units of ${donor.blood} from donor ${donor.name}.`);
    logDonationForm.reset();
    logBloodDisplay.value = '';
  } catch (err) {
    console.error('LifeFlow: failed to log donation', err);
    showToast('Could not log this donation — check your connection/database setup and try again.', true);
  }
});
// Mobile Nav Toggle
const mobileBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
mobileBtn.addEventListener('click', () => {
  const isDisplayed = navLinks.style.display === 'flex';
  if (isDisplayed) {
    navLinks.style.display = 'none';
  } else {
    navLinks.style.display = 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '70px';
    navLinks.style.left = '0';
    navLinks.style.width = '100%';
    navLinks.style.background = 'rgba(9, 13, 22, 0.95)';
    navLinks.style.padding = '20px';
    navLinks.style.borderBottom = '1px solid var(--glass-border)';
  }
});
// Are we currently past the login gate?
function isAuthenticated() {
  return sessionStorage.getItem(STORAGE_PREFIX + 'admin_auth') === 'true';
}

// Real-time synchronization: fires immediately with current data, then again
// whenever ANY device changes the data in Firestore — this replaces the old
// same-machine-only localStorage 'storage' event sync.
function startLiveSync() {
  subscribeInventory((data) => {
    inventory = data;
    if (isAuthenticated()) {
      renderMetrics();
      renderChart();
      renderInventoryGrid();
    }
  });
  subscribeDonors((data) => {
    donors = data;
    if (isAuthenticated()) {
      renderMetrics();
      renderDonorsTable();
      populateDonorDropdown();
    }
  });
  subscribeRequests((data) => {
    requests = data;
    if (isAuthenticated()) {
      renderMetrics();
      renderRequestsTable();
    }
  });
}

// Bootstrap on load
window.addEventListener('DOMContentLoaded', async () => {
  await seedIfEmpty();
  startLiveSync();
  checkAuth();
});