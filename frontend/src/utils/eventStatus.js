export function isEventExpired(event) {
  if (!event) return false;
  if (event.status === "COMPLETED") return true;
  if (!event.event_date) return false;

  const eventDate = new Date(event.event_date);
  if (Number.isNaN(eventDate.getTime())) return false;

  return eventDate < new Date();
}

export function isEventCancelled(event) {
  return event?.status === "CANCELLED";
}

export function isEventUnavailable(event) {
  return isEventExpired(event) || isEventCancelled(event);
}

export function getDisplayEventStatus(event) {
  if (isEventCancelled(event)) return "CANCELLED";
  if (isEventExpired(event)) return "EXPIRED";
  return event?.status || "UPCOMING";
}

export function isEventActive(event) {
  return ["ACTIVE", "UPCOMING", "ONGOING"].includes(event?.status) && !isEventExpired(event);
}
