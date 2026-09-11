const bcrypt = require('bcryptjs');

// Pre-calculated bcrypt hash for default PIN/password "1234"
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync("1234", 10);

const SEED_WORKERS = [
  {
    id: "w-1",
    name: "Ramesh Kumar",
    phone: "9876012345",
    trade: "Masonry",
    daily_wage: 850,
    experience: "8+ Years",
    location: "Sector 62, Noida, UP",
    preferred_lang: "Hindi",
    aadhar_verified: true,
    password_hash: DEFAULT_PASSWORD_HASH,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString()
  }
];

const SEED_CONTRACTORS = [
  {
    id: "c-1",
    company_name: "Apex Infrastructure Ltd.",
    contact_person: "Vikram Sharma",
    phone: "9876543210",
    email: "contractor@apexinfra.com",
    business_type: "General Civil Contractor",
    location: "Sector 62, Noida, UP",
    gst_id: "07AAAAA0000A1Z5",
    password_hash: DEFAULT_PASSWORD_HASH,
    created_at: new Date(Date.now() - 86400000 * 60).toISOString()
  }
];

const SEED_JOBS = [
  {
    id: "job-101",
    contractor_id: "c-1",
    contractor_name: "Apex Infrastructure Ltd.",
    contractor_contact: "+91 98765 43210",
    title: "Expert Mason / Rajmistri Needed for Boundary Wall",
    category: "Masonry",
    workers_needed: 3,
    daily_wage: 850,
    duration: "4 Days",
    start_date: "Tomorrow, 8:00 AM",
    end_date: "In 4 Days",
    location: "Sector 62, Noida, UP",
    description: "Urgent requirement for 3 skilled masons to construct a 6-foot brick boundary wall with plastering. Tools and materials supplied on site.",
    requirements: [
      "Minimum 3 years experience in brickwork",
      "Must bring own trowel/measuring tape",
      "Punctual and reliable"
    ],
    urgent: true,
    status: "Open",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "job-102",
    contractor_id: "c-1",
    contractor_name: "Creative Living Interiors",
    contractor_contact: "+91 98111 22334",
    title: "Interior Wall Painting & Priming",
    category: "Painting",
    workers_needed: 2,
    daily_wage: 750,
    duration: "3 Days",
    start_date: "Monday, 9:00 AM",
    end_date: "Next Wednesday",
    location: "Indiranagar, Bengaluru, KA",
    description: "Looking for 2 painters for 3BHK flat interior emulsion coating, putty finishing, and ceiling priming.",
    requirements: [
      "Knowledge of roller & brush application",
      "Surface sanding experience",
      "Clean workmanship"
    ],
    urgent: false,
    status: "Open",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "job-103",
    contractor_id: "c-1",
    contractor_name: "Metro BuildTech",
    contractor_contact: "+91 99222 33445",
    title: "Plumbing Pipe Laying & Fitting",
    category: "Plumbing",
    workers_needed: 1,
    daily_wage: 900,
    duration: "2 Days",
    start_date: "Immediate",
    end_date: "Tomorrow",
    location: "Andheri East, Mumbai, MH",
    description: "Commercial building restroom pipeline repair and CPVC pipe joint fitting. Experienced plumber required.",
    requirements: [
      "CPVC / PVC pipe welding & jointing",
      "Pressure testing understanding",
      "Own pipe wrench"
    ],
    urgent: true,
    status: "Open",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "job-104",
    contractor_id: "c-1",
    contractor_name: "Vikram Sharma Constructions",
    contractor_contact: "+91 97333 44556",
    title: "Furniture Assembly & Wood Framing",
    category: "Carpentry",
    workers_needed: 2,
    daily_wage: 800,
    duration: "5 Days",
    start_date: "Wednesday, 8:30 AM",
    end_date: "Next Week",
    location: "Gachibowli, Hyderabad, TS",
    description: "Office cabin partition framing and wooden desk modular assembly. Need 2 skilled carpenters.",
    requirements: [
      "Measurement accuracy",
      "Familiarity with power saw and drills",
      "Blueprint reading is a plus"
    ],
    urgent: false,
    status: "Open",
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "job-105",
    contractor_id: "c-1",
    contractor_name: "Spark Line Electricals",
    contractor_contact: "+91 96444 55667",
    title: "Building Electrical Conduit & Wiring Helper",
    category: "Electrical",
    workers_needed: 4,
    daily_wage: 700,
    duration: "6 Days",
    start_date: "Next Friday",
    end_date: "Following Week",
    location: "Kothrud, Pune, MH",
    description: "Laying electrical conduits into newly cast slabs and pulling cables. Experienced electrician or skilled helper required.",
    requirements: [
      "Safety gear compliance",
      "Cable routing basics",
      "Physical stamina"
    ],
    urgent: false,
    status: "Open",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

const SEED_ASSIGNMENTS = [
  {
    id: "app-1",
    job_id: "job-101",
    worker_id: "w-1",
    contractor_id: "c-1",
    job_title: "Expert Mason / Rajmistri Needed for Boundary Wall",
    contractor_name: "Apex Infrastructure Ltd.",
    worker_name: "Ramesh Kumar",
    worker_trade: "Masonry",
    worker_phone: "+91 98760 12345",
    agreed_wage: 850,
    location: "Sector 62, Noida, UP",
    assignment_status: "Accepted",
    work_status: "Accepted",
    applied_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "app-2",
    job_id: "job-104",
    worker_id: "w-1",
    contractor_id: "c-1",
    job_title: "Furniture Assembly & Wood Framing",
    contractor_name: "Vikram Sharma Constructions",
    worker_name: "Ramesh Kumar",
    worker_trade: "Masonry",
    worker_phone: "+91 98760 12345",
    agreed_wage: 800,
    location: "Gachibowli, Hyderabad, TS",
    assignment_status: "Assigned",
    work_status: "Assigned",
    applied_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const SEED_PAYMENTS = [
  {
    id: "pay-1",
    assignment_id: "app-1",
    job_id: "job-101",
    worker_id: "w-1",
    contractor_id: "c-1",
    job_title: "Expert Mason / Rajmistri Needed for Boundary Wall",
    worker_name: "Ramesh Kumar",
    contractor_name: "Apex Infrastructure Ltd.",
    amount: 850,
    payment_status: "Pending",
    payment_date: null,
    notes: "Day 1 wage pending evening clearance",
    created_at: new Date().toISOString()
  }
];

module.exports = {
  DEFAULT_PASSWORD_HASH,
  SEED_WORKERS,
  SEED_CONTRACTORS,
  SEED_JOBS,
  SEED_ASSIGNMENTS,
  SEED_PAYMENTS
};
