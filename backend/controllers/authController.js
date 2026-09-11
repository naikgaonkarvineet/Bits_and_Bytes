const bcrypt = require('bcryptjs');
const { db } = require('../config/supabase');
const { generateToken } = require('../middleware/auth');

// Worker Registration
async function registerWorker(req, res, next) {
  try {
    const {
      name,
      phone,
      trade,
      dailyWage,
      experience,
      location,
      preferredLang,
      aadharVerified,
      password
    } = req.body;

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const existingWorker = await db.findWorkerByPhone(cleanPhone);
    if (existingWorker) {
      return res.status(409).json({
        success: false,
        message: 'A worker with this mobile number is already registered. Please log in.'
      });
    }

    const plainPassword = password || '1234';
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const newWorker = await db.createWorker({
      name: name.trim(),
      phone: cleanPhone,
      trade: trade || 'Masonry',
      daily_wage: Number(dailyWage) || 800,
      experience: experience || '3-5 Years',
      location: location || 'Noida, UP',
      preferred_lang: preferredLang || 'Hindi',
      aadhar_verified: Boolean(aadharVerified),
      password_hash
    });

    const token = generateToken({
      id: newWorker.id,
      name: newWorker.name,
      phone: newWorker.phone,
      role: 'worker',
      trade: newWorker.trade
    });

    const sanitizedWorker = { ...newWorker };
    delete sanitizedWorker.password_hash;

    res.status(201).json({
      success: true,
      message: 'Worker registered successfully!',
      token,
      user: {
        ...sanitizedWorker,
        role: 'worker'
      }
    });
  } catch (err) {
    next(err);
  }
}

// Contractor Registration
async function registerContractor(req, res, next) {
  try {
    const {
      companyName,
      contactPerson,
      phone,
      email,
      businessType,
      location,
      gstId,
      password
    } = req.body;

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const existing = await db.findContractorByIdentifier(cleanPhone);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A contractor with this mobile number is already registered. Please log in.'
      });
    }

    const plainPassword = password || '1234';
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const newContractor = await db.createContractor({
      company_name: companyName.trim(),
      contact_person: contactPerson.trim(),
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : null,
      business_type: businessType || 'General Civil Contractor',
      location: location || 'Delhi NCR',
      gst_id: gstId ? gstId.trim() : null,
      password_hash
    });

    const token = generateToken({
      id: newContractor.id,
      name: newContractor.contact_person,
      company: newContractor.company_name,
      phone: newContractor.phone,
      role: 'contractor'
    });

    const sanitizedContractor = { ...newContractor };
    delete sanitizedContractor.password_hash;

    res.status(201).json({
      success: true,
      message: 'Contractor registered successfully!',
      token,
      user: {
        ...sanitizedContractor,
        role: 'contractor'
      }
    });
  } catch (err) {
    next(err);
  }
}

// Login
async function login(req, res, next) {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both identifier (phone or email) and password/PIN.'
      });
    }

    const cleanIdentifier = identifier.trim();
    const cleanPhone = cleanIdentifier.replace(/\D/g, '').slice(-10);

    let user = null;
    let userRole = role;

    // Search by role if specified, or detect
    if (userRole === 'contractor') {
      user = await db.findContractorByIdentifier(cleanPhone || cleanIdentifier.toLowerCase());
    } else if (userRole === 'worker') {
      user = await db.findWorkerByPhone(cleanPhone);
    } else {
      // Auto-detect role
      user = await db.findWorkerByPhone(cleanPhone);
      if (user) {
        userRole = 'worker';
      } else {
        user = await db.findContractorByIdentifier(cleanPhone || cleanIdentifier.toLowerCase());
        if (user) userRole = 'contractor';
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please check your credentials or register.'
      });
    }

    // Verify Password Hash with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password or PIN. Please try again.'
      });
    }

    const tokenPayload = {
      id: user.id,
      name: user.name || user.contact_person,
      phone: user.phone,
      role: userRole,
      ...(userRole === 'contractor' ? { company: user.company_name } : { trade: user.trade })
    };

    const token = generateToken(tokenPayload);

    const sanitizedUser = { ...user, role: userRole };
    delete sanitizedUser.password_hash;

    res.status(200).json({
      success: true,
      message: `Welcome back, ${sanitizedUser.name || sanitizedUser.company_name}!`,
      token,
      user: sanitizedUser
    });
  } catch (err) {
    next(err);
  }
}

// Get Logged-in Profile
async function getMe(req, res, next) {
  try {
    const { id, role } = req.user;
    let user = null;

    if (role === 'worker') {
      user = await db.findWorkerById(id);
    } else {
      user = await db.findContractorById(id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const sanitizedUser = { ...user, role };
    delete sanitizedUser.password_hash;

    res.status(200).json({ success: true, user: sanitizedUser });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerWorker,
  registerContractor,
  login,
  getMe
};
