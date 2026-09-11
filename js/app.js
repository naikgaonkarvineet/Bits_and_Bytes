/**
 * KaamSetu - Frontend Core Application Logic & Mock Store
 * Designed for hackathon demonstration with real-time UI interactivity.
 */

// Initial Seed Data for Demo
const SEED_JOBS = [
  {
    id: "job-101",
    title: "Expert Mason / Rajmistri Needed for Boundary Wall",
    category: "Masonry",
    workersNeeded: 3,
    dailyWage: 850,
    duration: "4 Days",
    startDate: "Tomorrow, 8:00 AM",
    location: "Sector 62, Noida, UP",
    contractorName: "Apex Infrastructure Ltd.",
    contractorContact: "+91 98765 43210",
    description: "Urgent requirement for 3 skilled masons to construct a 6-foot brick boundary wall with plastering. Tools and materials supplied on site.",
    requirements: ["Minimum 3 years experience in brickwork", "Must bring own trowel/measuring tape", "Punctual and reliable"],
    urgent: true,
    postedAt: "2 hours ago"
  },
  {
    id: "job-102",
    title: "Interior Wall Painting & Priming",
    category: "Painting",
    workersNeeded: 2,
    dailyWage: 750,
    duration: "3 Days",
    startDate: "Monday, 9:00 AM",
    location: "Indiranagar, Bengaluru, KA",
    contractorName: "Creative Living Interiors",
    contractorContact: "+91 98111 22334",
    description: "Looking for 2 painters for 3BHK flat interior emulsion coating, putty finishing, and ceiling priming.",
    requirements: ["Knowledge of roller & brush application", "Surface sanding experience", "Clean workmanship"],
    urgent: false,
    postedAt: "5 hours ago"
  },
  {
    id: "job-103",
    title: "Plumbing Pipe Laying & Fitting",
    category: "Plumbing",
    workersNeeded: 1,
    dailyWage: 900,
    duration: "2 Days",
    startDate: "Immediate",
    location: "Andheri East, Mumbai, MH",
    contractorName: "Metro BuildTech",
    contractorContact: "+91 99222 33445",
    description: "Commercial building restroom pipeline repair and CPVC pipe joint fitting. Experienced plumber required.",
    requirements: ["CPVC / PVC pipe welding & jointing", "Pressure testing understanding", "Own pipe wrench"],
    urgent: true,
    postedAt: "1 day ago"
  },
  {
    id: "job-104",
    title: "Furniture Assembly & Wood Framing",
    category: "Carpentry",
    workersNeeded: 2,
    dailyWage: 800,
    duration: "5 Days",
    startDate: "Wednesday, 8:30 AM",
    location: "Gachibowli, Hyderabad, TS",
    contractorName: "Vikram Sharma Constructions",
    contractorContact: "+91 97333 44556",
    description: "Office cabin partition framing and wooden desk modular assembly. Need 2 skilled carpenters.",
    requirements: ["Measurement accuracy", "Familiarity with power saw and drills", "Blueprint reading is a plus"],
    urgent: false,
    postedAt: "1 day ago"
  },
  {
    id: "job-105",
    title: "Building Electrical Conduit & Wiring Helper",
    category: "Electrical",
    workersNeeded: 4,
    dailyWage: 700,
    duration: "6 Days",
    startDate: "Next Friday",
    location: "Kothrud, Pune, MH",
    contractorName: "Spark Line Electricals",
    contractorContact: "+91 96444 55667",
    description: "Laying electrical conduits into newly cast slabs and pulling cables. Experienced electrician or skilled helper required.",
    requirements: ["Safety gear compliance", "Cable routing basics", "Physical stamina"],
    urgent: false,
    postedAt: "2 days ago"
  }
];

const SEED_APPLICATIONS = [
  {
    id: "app-1",
    jobId: "job-101",
    jobTitle: "Expert Mason / Rajmistri Needed for Boundary Wall",
    contractorName: "Apex Infrastructure Ltd.",
    wage: 850,
    location: "Sector 62, Noida, UP",
    status: "Accepted",
    appliedDate: "Today, 10:15 AM",
    workerName: "Ramesh Kumar",
    workerTrade: "Masonry (Rajmistri)",
    workerPhone: "+91 98760 12345",
    rating: "4.8"
  },
  {
    id: "app-2",
    jobId: "job-104",
    jobTitle: "Furniture Assembly & Wood Framing",
    contractorName: "Vikram Sharma Constructions",
    wage: 800,
    location: "Gachibowli, Hyderabad, TS",
    status: "Pending Review",
    appliedDate: "Yesterday, 3:30 PM",
    workerName: "Ramesh Kumar",
    workerTrade: "Masonry (Rajmistri)",
    workerPhone: "+91 98760 12345",
    rating: "4.8"
  }
];

// Initialize Storage & Sync with Backend API
const API_BASE_URL = (typeof window !== 'undefined' && (window.location.port === '5000' || window.location.origin.includes(':5000')))
  ? '/api'
  : 'http://localhost:5000/api';

function initStorage() {
  if (!localStorage.getItem("kaamsetu_jobs")) {
    localStorage.setItem("kaamsetu_jobs", JSON.stringify(SEED_JOBS));
  }
  if (!localStorage.getItem("kaamsetu_applications")) {
    localStorage.setItem("kaamsetu_applications", JSON.stringify(SEED_APPLICATIONS));
  }

  // Attempt background sync with live backend API
  syncBackendJobs();
}

async function syncBackendJobs() {
  try {
    const res = await fetch(`${API_BASE_URL}/jobs`);
    if (res.ok) {
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        const mapped = data.jobs.map(j => ({
          id: j.id,
          title: j.title,
          category: j.category,
          workersNeeded: j.workers_needed,
          dailyWage: Number(j.daily_wage),
          duration: j.duration,
          startDate: j.start_date,
          location: j.location,
          contractorName: j.contractor_name,
          contractorContact: j.contractor_contact,
          description: j.description,
          requirements: j.requirements || [],
          urgent: j.urgent,
          postedAt: "Recently"
        }));
        localStorage.setItem("kaamsetu_jobs", JSON.stringify(mapped));
      }
    }
  } catch (e) {
    // Backend offline or standalone mode, fallback smoothly
  }
}

// Data Access
function getJobs() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem("kaamsetu_jobs")) || SEED_JOBS;
  } catch (e) {
    return SEED_JOBS;
  }
}

function getJobById(id) {
  const jobs = getJobs();
  return jobs.find(j => j.id === id) || jobs[0];
}

function saveJob(newJob) {
  const jobs = getJobs();
  jobs.unshift(newJob);
  localStorage.setItem("kaamsetu_jobs", JSON.stringify(jobs));

  // Sync to Backend API if running
  const token = localStorage.getItem("kaamsetu_token");
  fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      title: newJob.title,
      category: newJob.category,
      workersNeeded: newJob.workersNeeded,
      dailyWage: newJob.dailyWage,
      duration: newJob.duration,
      startDate: newJob.startDate,
      location: newJob.location,
      description: newJob.description,
      urgent: newJob.urgent
    })
  }).catch(() => {});
}

function getApplications() {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem("kaamsetu_applications")) || SEED_APPLICATIONS;
  } catch (e) {
    return SEED_APPLICATIONS;
  }
}

function applyForJob(jobId, workerInfo = {}) {
  const job = getJobById(jobId);
  const apps = getApplications();
  
  // Check if already applied
  const existing = apps.find(a => a.jobId === jobId);
  if (existing) {
    return { success: false, message: "You have already applied for this job." };
  }

  const newApp = {
    id: "app-" + Date.now(),
    jobId: job.id,
    jobTitle: job.title,
    contractorName: job.contractorName,
    wage: job.dailyWage,
    location: job.location,
    status: "Pending Review",
    appliedDate: "Just now",
    workerName: workerInfo.name || "Ramesh Kumar",
    workerTrade: workerInfo.trade || "Skilled Craftsman",
    workerPhone: workerInfo.phone || "+91 98760 12345",
    rating: "4.8"
  };

  apps.unshift(newApp);
  localStorage.setItem("kaamsetu_applications", JSON.stringify(apps));

  // Sync to Backend API
  const token = localStorage.getItem("kaamsetu_token");
  fetch(`${API_BASE_URL}/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  }).catch(() => {});

  return { success: true, message: "Application submitted successfully! Contractor has been notified." };
}

// User Session Management
function getCurrentUser() {
  const user = localStorage.getItem("kaamsetu_user");
  if (user) {
    try { return JSON.parse(user); } catch (e) {}
  }
  return { role: "worker", name: "Ramesh Kumar", trade: "Masonry", phone: "+91 98760 12345" };
}

function setCurrentUser(role, name, details = {}) {
  const user = { role, name, ...details };
  localStorage.setItem("kaamsetu_user", JSON.stringify(user));
}

// Quick Demo Login (Judges Helper)
function demoLogin(role) {
  const identifier = role === 'worker' ? '9876012345' : '9876543210';
  fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: '1234', role })
  })
    .then(r => r.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem("kaamsetu_token", data.token);
      }
    })
    .catch(() => {});

  if (role === "worker") {
    setCurrentUser("worker", "Ramesh Kumar", { trade: "Masonry (Rajmistri)", rate: 850 });
    window.location.href = "worker-dashboard.html";
  } else {
    setCurrentUser("contractor", "Vikram Sharma", { company: "Apex Infrastructure Ltd." });
    window.location.href = "contractor-dashboard.html";
  }
}

// UI Helpers: Mobile Menu
function initMobileMenu() {
  const hamburger = document.getElementById("hamburgerBtn");
  const navMenu = document.getElementById("navMenu");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("show");
    });
  }
}

// Notification Banner Helper
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `alert alert-${type}`;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  toast.style.maxWidth = "350px";
  toast.innerHTML = `<strong>${type === "success" ? "✓" : "ℹ"}</strong> ${message}`;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  initStorage();
  initMobileMenu();
});
