const TICKET_TYPE_INFO = {
  TECHPASS: { passType: 'technical', eventType: 'TECH' },
  NONTECHPASS: { passType: 'non-technical', eventType: 'NONTECH' },
  WORKSHOP: { passType: 'workshop', eventType: 'WORKSHOP' },
  RACING: { passType: 'racing', eventType: 'RACING' },
  HACKATHON: { passType: 'hackathon', eventType: null },
};

function ticketTypeInfo(ticketType, currentEventType = null) {
  const normalized = String(ticketType || '').toUpperCase();
  const known = TICKET_TYPE_INFO[normalized] || { passType: normalized.toLowerCase(), eventType: null };

  return {
    ticketType: normalized,
    passType: known.passType,
    eventType: known.eventType || (normalized === 'HACKATHON' ? String(currentEventType || '').toUpperCase() : null),
  };
}

function isCompatibleEventType(ticketType, candidateEventType, currentEventType = null) {
  const requiredType = ticketTypeInfo(ticketType, currentEventType).eventType;
  if (!requiredType) return true;
  return String(candidateEventType || '').toUpperCase() === requiredType;
}

module.exports = { TICKET_TYPE_INFO, ticketTypeInfo, isCompatibleEventType };
