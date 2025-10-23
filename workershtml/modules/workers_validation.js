const PHONE_REGEX = /^\+2550\d{9}$/;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const ROLE_DOC_REQUIREMENTS = {
  teacher: ['cv', 'formFourCert', 'roleCert'],
  accountant: ['cv', 'formFourCert', 'roleCert'],
  academic: ['cv', 'formFourCert', 'roleCert'],
  manager: ['cv', 'formFourCert', 'roleCert'],
  secretary: ['cv', 'formFourCert', 'roleCert'],
  cook: ['villageLetter'],
  cleaner: ['villageLetter'],
  guard: ['villageLetter']
};

export function normalizeThreeNames(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    throw new Error('Full name is required');
  }
  const tokens = rawName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length !== 3) {
    throw new Error('Full name must contain exactly three names (First Middle Last)');
  }
  return tokens.map(t => t.toUpperCase()).join(' ');
}

export function isTZWorkerPhone(value) {
  return PHONE_REGEX.test((value || '').trim());
}

export function validatePhone(phone, label = 'phone') {
  if (!isTZWorkerPhone(phone)) {
    throw new Error(`${label} must start with +2550 followed by 9 digits`);
  }
  return phone.trim();
}

export function validateFile(file, { allowedTypes = [], maxBytes = MAX_FILE_BYTES, label = 'file' } = {}) {
  if (!file) {
    throw new Error(`${label} is required`);
  }
  if (allowedTypes.length && !allowedTypes.includes(file.type)) {
    throw new Error(`${label} must be one of: ${allowedTypes.join(', ')}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${label} must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller`);
  }
  return true;
}

export function validateOptionalFile(file, options = {}) {
  if (!file) return false;
  return validateFile(file, options);
}

export function validateAdmissionPayload(payload) {
  const errors = [];
  if (!payload) {
    return ['Admission payload missing'];
  }
  const profile = payload.profile || {};
  const docs = payload.docs || {};

  const requiredProfileFields = [
    'firstName',
    'middleName',
    'lastName',
    'phone',
    'country',
    'nextOfKinName',
    'nextOfKinPhone',
    'nssfNumber',
    'nidaOrPassport',
    'fatherName',
    'motherName',
    'maritalStatus',
    'area',
    'tribe',
    'villageHome',
    'role',
    'baseSalary',
    'createdBy'
  ];

  requiredProfileFields.forEach(field => {
    if (!profile[field] && profile[field] !== 0) {
      errors.push(`${field} is required`);
    }
  });

  try {
    profile.phone && validatePhone(profile.phone, 'Worker phone');
  } catch (err) {
    errors.push(err.message);
  }

  try {
    profile.nextOfKinPhone && validatePhone(profile.nextOfKinPhone, 'Next of kin phone');
  } catch (err) {
    errors.push(err.message);
  }

  if (profile.maritalStatus === 'married') {
    if (!profile.spouseName) {
      errors.push('spouseName is required when married');
    }
    try {
      profile.spousePhone && validatePhone(profile.spousePhone, 'Spouse phone');
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (!Number.isFinite(Number(profile.baseSalary)) || Number(profile.baseSalary) <= 0) {
    errors.push('baseSalary must be a positive number');
  }

  if (!profile.role) {
    errors.push('role selection is required');
  }

  // Documents
  if (!docs.idPhoto || !docs.idPhoto.size) {
    errors.push('ID photo is required');
  }
  if (!docs.passportPhoto || !docs.passportPhoto.size) {
    errors.push('Passport photo is required');
  }

  const roleKey = (profile.role || '').toLowerCase();
  const requiredDocs = ROLE_DOC_REQUIREMENTS[roleKey] || [];
  requiredDocs.forEach(docKey => {
    if (!docs[docKey] || !docs[docKey].size) {
      const label = {
        cv: 'CV (PDF)',
        formFourCert: 'Form Four Certificate (PDF)',
        roleCert: 'Role certificate',
        villageLetter: 'Village introduction letter'
      }[docKey] || docKey;
      errors.push(`${label} is required for role ${profile.role}`);
    }
  });

  return errors;
}

export function ensureThreeNamesAndPhone(fullName, phone) {
  const normalizedName = normalizeThreeNames(fullName);
  if (!isTZWorkerPhone(phone)) {
    throw new Error('Phone must match +2550#########');
  }
  return { normalizedName, phone: phone.trim() };
}

export { PHONE_REGEX, MAX_FILE_BYTES, ROLE_DOC_REQUIREMENTS };


