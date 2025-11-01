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

  const GATE_ROLES = new Set([
    "gate_officer",
    "gate_attendant",
    "gate_manager",
    "gate_staff",
    "gatekeeper",
    "gate_keeper",
    "boarding_gate",
    "boarding_gate_officer",
    "boarding_gate_staff",
    "boarding_officer",
    "boarding_manager",
    "boarding_control",
    "transport_gate",
    "board_control",
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

  function isDriver(role) {
    const norm = normalize(role);
    if (!norm) return false;
    if (norm.includes("driver")) return true;
    if (norm.includes("conductor")) return true;
    return false;
  }

  function isGateOfficer(role) {
    const norm = normalize(role);
    if (!norm) return false;
    if (GATE_ROLES.has(norm)) return true;
    const words = norm.replace(/_/g, " ");
    if (/\bgate\b/.test(words) && /\b(officer|attendant|keeper|staff|manager|control)\b/.test(words)) {
      return true;
    }
    if (/\bboarding\b/.test(words) && /\bgate\b/.test(words)) {
      return true;
    }
    return false;
  }

  function canViewTransport(role) {
    if (isAdmin(role)) return true;
    if (isStaff(role)) return true;
    if (isDriver(role)) return true;
    return isGateOfficer(role);
  }

  window.TransportRoles = {
    ADMIN_ROLES,
    STAFF_ROLES,
    GATE_ROLES,
    normalize,
    isAdmin,
    isStaff,
    isDriver,
    isGateOfficer,
    canViewTransport,
  };
})();
