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
    return String(role)
      .trim()
      .toLowerCase()
      .replace(/[\s\-\/\\]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function isAdmin(role) {
    const norm = normalize(role);
    if (!norm) return true; // default to allow legacy admin accounts
    if (ADMIN_ROLES.has(norm)) return true;
    if (
      norm.includes("admin") ||
      norm.includes("owner") ||
      norm.includes("director") ||
      norm.includes("principal")
    ) {
      return true;
    }
    return false;
  }

  function isStaff(role) {
    const norm = normalize(role);
    if (!norm) return true;
    if (STAFF_ROLES.has(norm)) return true;
    if (norm.includes("teacher") || norm.includes("staff")) return true;
    return isAdmin(norm);
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
