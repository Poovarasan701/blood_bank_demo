// State Management with Firebase Firestore
import {
  seedIfEmpty,
  subscribeInventory,
  subscribeDonors,
  subscribeRequests,
  addDonor,
  addRequest,
  setInventoryUnits
} from './db-service.js';

// Live state — populated by real-time Firestore subscriptions below.
// These arrays stay in sync across every browser/device automatically.
let inventory = [];
let donors = [];
let requests = [];
// DOM Elements
const inventoryContainer = document.getElementById('inventory-container');
const urgentFeed = document.getElementById('urgent-feed');
const donorsGrid = document.getElementById('donors-grid');
const resultsCountEl = document.getElementById('results-count');
const locatorMap = document.getElementById('locator-map');
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
// Render Hero Stats
function renderHeroStats() {
  // Simple animations for counts
  document.getElementById('stat-donors').textContent = donors.length;
  
  const totalUnits = inventory.reduce((sum, item) => sum + item.units, 0);
  document.getElementById('stat-units').textContent = totalUnits;
  
  // Lives saved estimation (base + donors * 3)
  const estimatedLivesSaved = 1420 + (donors.length * 4);
  document.getElementById('stat-saved').textContent = estimatedLivesSaved.toLocaleString();
}
// Render Blood Inventory Dashboard
function renderInventory() {
  inventoryContainer.innerHTML = '';
  inventory.forEach(item => {
    const pct = Math.round((item.units / item.max) * 100);
    let statusClass = 'stable';
    let statusText = 'Stable Stock';
    
    if (pct < 30) {
      statusClass = 'critical';
      statusText = 'Critical Stock';
    } else if (pct > 65) {
      statusClass = 'high';
      statusText = 'High Volume';
    }
    
    const card = document.createElement('div');
    card.className = `glass-panel blood-card ${statusClass}`;
    card.innerHTML = `
      <div class="blood-type">
        ${item.type}
        <svg class="blood-drop" viewBox="0 0 24 24">
          <path d="M12,2.69C12,2.69 19,8.5 19,13.79C19,17.77 15.87,21 12,21C8.13,21 5,17.77 5,13.79C5,8.5 12,2.69 12,2.69Z" />
        </svg>
      </div>
      <div class="inventory-level">${statusText}</div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${pct}%"></div>
      </div>
      <div class="units-count">${item.units} / ${item.max} Units Available</div>
    `;
    inventoryContainer.appendChild(card);
  });
}
// Render Urgent Requests Feed
function renderRequests() {
  urgentFeed.innerHTML = '';
  
  if (requests.length === 0) {
    urgentFeed.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        No active emergency broadcasts. The network is secure.
      </div>
    `;
    return;
  }
  
  requests.forEach(req => {
    const item = document.createElement('div');
    item.className = 'glass-panel request-item';
    item.innerHTML = `
      <div class="req-badge">
        <span class="type">${req.blood}</span>
        <span class="label">${req.urgency}</span>
      </div>
      <div class="req-details">
        <h4>${req.hospital}</h4>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">
          Patient: <strong>${req.patient}</strong> | Required Units: <strong>${req.units}</strong>
        </p>
        <div class="req-meta">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            ${req.contact}
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Broadcast: Urgent
          </span>
        </div>
        ${req.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px; font-style: italic;">"${req.notes}"</p>` : ''}
      </div>
      <div class="req-actions">
        <button class="btn-primary donate-btn" data-contact="${req.contact}" data-patient="${req.patient}" style="padding: 10px 16px; font-size: 0.85rem;">I Can Donate</button>
      </div>
    `;
    
    // Add event listener to the specific "I Can Donate" button
    item.querySelector('.donate-btn').addEventListener('click', (e) => {
      const contact = e.target.getAttribute('data-contact');
      const patient = e.target.getAttribute('data-patient');
      showToast(`Emergency coordinator matched! Contact Attendant for ${patient} at ${contact}.`);
    });
    
    urgentFeed.appendChild(item);
  });
}
// Render Donors Directory & Locator Map
function renderDonorsGrid() {
  donorsGrid.innerHTML = '';
  locatorMap.innerHTML = '';
  
  // Get active filters
  const checkedBloodTypes = Array.from(document.querySelectorAll('#blood-checkboxes input:checked')).map(cb => cb.value);
  const cityQuery = document.getElementById('filter-city').value.toLowerCase().trim();
  
  const filteredDonors = donors.filter(d => {
    const matchesBlood = checkedBloodTypes.length === 0 || checkedBloodTypes.includes(d.blood);
    const matchesCity = !cityQuery || d.location.toLowerCase().includes(cityQuery);
    return matchesBlood && matchesCity;
  });
  
  resultsCountEl.textContent = filteredDonors.length;
  
  if (filteredDonors.length === 0) {
    donorsGrid.innerHTML = `
      <div style="grid-column: span 3; text-align: center; padding: 40px; color: var(--text-muted);">
        No volunteer matches found for selected filters. Try clearing filter terms.
      </div>
    `;
    return;
  }
  
  filteredDonors.forEach(donor => {
    // Render card
    const card = document.createElement('div');
    card.className = 'glass-panel donor-card';
    card.innerHTML = `
      <div class="donor-card-header">
        <div class="donor-avatar">${donor.name.split(' ').map(n => n[0]).join('')}</div>
        <span class="donor-blood-badge">${donor.blood}</span>
      </div>
      <h4>${donor.name}</h4>
      <div class="location">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        ${donor.location}
      </div>
      <div class="donor-details">
        <div>
          <div class="label">Age</div>
          <div class="val">${donor.age} Yrs</div>
        </div>
        <div>
          <div class="label">Status</div>
          <div class="val" style="color: var(--accent-green);">Verified</div>
        </div>
        <div>
          <div class="label">Eligibility</div>
          <div class="val">${donor.lastDonated === '1' ? 'Deferred' : 'Eligible'}</div>
        </div>
      </div>
      <div class="donor-actions">
        <button class="btn-primary contact-donor-btn" data-phone="${donor.phone}" data-name="${donor.name}">Connect</button>
      </div>
    `;
    
    // Connect Button Action
    card.querySelector('.contact-donor-btn').addEventListener('click', (e) => {
      const name = e.target.getAttribute('data-name');
      const phone = e.target.getAttribute('data-phone');
      showToast(`Initiating connection with ${name}. Call direct: ${phone}`);
    });
    
    donorsGrid.appendChild(card);
    
    // Render pin on locator map
    const pin = document.createElement('div');
    pin.className = 'map-marker';
    pin.style.left = `${donor.mapX}%`;
    pin.style.top = `${donor.mapY}%`;
    pin.innerHTML = `
      <div class="map-marker-popup">
        <strong>${donor.name}</strong> (${donor.blood})<br>
        📍 ${donor.location}
      </div>
    `;
    locatorMap.appendChild(pin);
  });
}
// Handle Form Submissions
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('reg-name').value.trim();
  const blood = document.getElementById('reg-blood').value;
  const phone = document.getElementById('reg-phone').value.trim();
  const location = document.getElementById('reg-location').value.trim();
  const age = parseInt(document.getElementById('reg-age').value);
  const lastDonated = document.getElementById('reg-last-donated').value;
  
  if (!name || !blood || !phone || !location || !age) {
    showToast('Please fill all required registration fields.', true);
    return;
  }
  
  // Random coordinates for map placement (between 10% and 90%)
  const mapX = Math.floor(Math.random() * 80) + 10;
  const mapY = Math.floor(Math.random() * 80) + 10;
  
  const newDonor = {
    id: Date.now(),
    name,
    blood,
    phone,
    location,
    age,
    lastDonated,
    mapX,
    mapY
  };
  
  try {
    await addDonor(newDonor);

    // Update inventory slightly to simulate donation registration
    const matchInv = inventory.find(i => i.type === blood);
    if (matchInv) {
      await setInventoryUnits(blood, Math.min(matchInv.max, matchInv.units + 1));
    }

    // Note: no manual re-render needed here — the Firestore subscriptions
    // below will fire automatically and refresh the UI for every open tab.

    showToast(`Welcome! ${name} has been added to our network of active volunteers.`);
    e.target.reset();
  } catch (err) {
    console.error('LifeFlow: failed to save registration', err);
    showToast('Could not save your registration — check your connection/database setup and try again.', true);
  }
});
document.getElementById('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const patient = document.getElementById('req-patient').value.trim();
  const blood = document.getElementById('req-blood-type').value;
  const hospital = document.getElementById('req-hospital').value.trim();
  const contact = document.getElementById('req-contact').value.trim();
  const units = parseInt(document.getElementById('req-units').value);
  const urgency = document.getElementById('req-urgency').value;
  const notes = document.getElementById('req-notes').value.trim();
  
  if (!patient || !blood || !hospital || !contact || !units) {
    showToast('Please fill all required request fields.', true);
    return;
  }
  
  const newReq = {
    id: Date.now(),
    patient,
    blood,
    hospital,
    contact,
    units,
    urgency,
    notes
  };
  
  try {
    await addRequest(newReq);

    // Reduce inventory matching this request to simulate urgent demand
    const matchInv = inventory.find(i => i.type === blood);
    if (matchInv) {
      await setInventoryUnits(blood, Math.max(0, matchInv.units - units));
    }

    // UI refreshes automatically via the Firestore subscriptions below.

    showToast(`Alert broadcasted! Seeking matching ${blood} donors for ${patient}.`);
    e.target.reset();

    // Smooth scroll up to see urgent requests
    document.getElementById('urgent-requests').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('LifeFlow: failed to save request', err);
    showToast('Could not broadcast this request — check your connection/database setup and try again.', true);
  }
});
// Setup filters events
document.querySelectorAll('#blood-checkboxes input').forEach(checkbox => {
  checkbox.addEventListener('change', renderDonorsGrid);
});
document.getElementById('filter-city').addEventListener('input', renderDonorsGrid);
document.getElementById('clear-filters').addEventListener('click', () => {
  document.querySelectorAll('#blood-checkboxes input').forEach(cb => cb.checked = true);
  document.getElementById('filter-city').value = '';
  renderDonorsGrid();
  showToast('Directory filter constraints reset.');
});
// Header quick-search widget execution
document.getElementById('widget-search-btn').addEventListener('click', () => {
  const bloodSel = document.getElementById('widget-blood').value;
  const locationSel = document.getElementById('widget-location').value.trim().toLowerCase();
  
  // Sync checklist filters
  document.querySelectorAll('#blood-checkboxes input').forEach(cb => {
    if (bloodSel === '') {
      cb.checked = true;
    } else {
      cb.checked = (cb.value === bloodSel);
    }
  });
  
  // Sync location filter
  document.getElementById('filter-city').value = locationSel;
  
  renderDonorsGrid();
  
  // Scroll to directory section
  document.getElementById('directory').scrollIntoView({ behavior: 'smooth' });
  
  showToast('Network directory filtered.');
});
// Accordion Toggles
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const parent = trigger.parentElement;
    const content = trigger.nextElementSibling;
    const isActive = parent.classList.contains('active');
    
    // Close other FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
      item.querySelector('.faq-content').style.maxHeight = null;
    });
    
    if (!isActive) {
      parent.classList.add('active');
      content.style.maxHeight = content.scrollHeight + "px";
    }
  });
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
// Initialize: seed the database once if empty, then subscribe to live data.
// Every subscription callback fires immediately with current data, and again
// in real time whenever ANY visitor's browser changes the data — this
// replaces both the old page-load render and the old same-machine
// cross-tab localStorage sync, and now works across different devices too.
window.addEventListener('DOMContentLoaded', async () => {
  await seedIfEmpty();

  subscribeInventory((data) => {
    inventory = data;
    renderInventory();
    renderHeroStats();
  });

  subscribeDonors((data) => {
    donors = data;
    renderDonorsGrid();
    renderHeroStats();
  });

  subscribeRequests((data) => {
    requests = data;
    renderRequests();
  });
});