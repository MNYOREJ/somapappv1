(() => {
  const ADMIN_ROLES = new Set([
    "admin",
    "transport_officer",
    "transport",
    "dashboard",
    "dashboard_admin",
    "super_admin",
    "owner",
    "director",
    "headteacher",
    "head_teacher",
    "transport_admin",
  ]);

  const STAFF_ROLES = new Set([
    "teacher",
    "class_teacher",
    "assistant_teacher",
    "teacher_assistant",
    "staff",
  ]);

  function normalize(role) {
    if (role === null || role === undefined) return "";
    return String(role).trim().toLowerCase();
  }

  function isAdmin(role) {
    const norm = normalize(role);
    if (!norm) return true; // default to allow legacy admin accounts
    return ADMIN_ROLES.has(norm);
  }

  function isStaff(role) {
    const norm = normalize(role);
    return STAFF_ROLES.has(norm) || isAdmin(norm);
  }

  function canViewTransport(role) {
    return isStaff(role);
  }

  window.TransportRoles = {
    ADMIN_ROLES,
    STAFF_ROLES,
    normalize,
    isAdmin,
    isStaff,
    canViewTransport,
  };
})();
