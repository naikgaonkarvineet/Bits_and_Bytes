function validateWorkerRegistration(req, res, next) {
  const { name, phone, trade } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Full name is required.');
  }

  if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, '').slice(-10))) {
    errors.push('A valid 10-digit mobile number is required.');
  }

  if (!trade || typeof trade !== 'string') {
    errors.push('Trade or skill category is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors[0] });
  }

  next();
}

function validateContractorRegistration(req, res, next) {
  const { companyName, contactPerson, phone } = req.body;
  const errors = [];

  if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
    errors.push('Company or contractor name is required.');
  }

  if (!contactPerson || typeof contactPerson !== 'string' || contactPerson.trim().length === 0) {
    errors.push('Primary contact person name is required.');
  }

  if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, '').slice(-10))) {
    errors.push('A valid 10-digit mobile number is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors[0] });
  }

  next();
}

function validateLogin(req, res, next) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Identifier (mobile number or email) and password/PIN are required.'
    });
  }
  next();
}

function validateJobCreation(req, res, next) {
  const { title, category, dailyWage, location } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Job title is required.');
  }

  if (!category || typeof category !== 'string') {
    errors.push('Trade or work category is required.');
  }

  if (!dailyWage || isNaN(Number(dailyWage)) || Number(dailyWage) <= 0) {
    errors.push('A valid positive daily wage amount is required.');
  }

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    errors.push('Site location address is required.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ success: false, errors, message: errors[0] });
  }

  next();
}

module.exports = {
  validateWorkerRegistration,
  validateContractorRegistration,
  validateLogin,
  validateJobCreation
};
