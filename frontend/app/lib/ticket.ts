const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeTicketId(raw: string) {
  const ticketId = raw.trim();
  return UUID_PATTERN.test(ticketId) ? ticketId.toLowerCase() : null;
}

export function compatibleEventType(ticketType: string, currentEventType?: string | null) {
  switch (ticketType.toUpperCase()) {
    case "TECHPASS":
      return "TECH";
    case "NONTECHPASS":
      return "NONTECH";
    case "WORKSHOP":
      return "WORKSHOP";
    case "RACING":
      return "RACING";
    case "HACKATHON":
      return currentEventType?.toUpperCase() || null;
    default:
      return null;
  }
}

export function formatTicketType(ticketType: string, passType: string) {
  const labels: Record<string, string> = {
    TECHPASS: "Technical",
    NONTECHPASS: "Non-technical",
    WORKSHOP: "Workshop",
    RACING: "Racing",
    HACKATHON: "Hackathon",
  };
  return labels[ticketType.toUpperCase()] || passType || ticketType;
}
