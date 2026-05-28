const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayLocalIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isPaymentDeadlinePassed(deadline: string): boolean {
  if (!deadline || deadline === "A anunciar") return false;
  if (ISO_DATE_RE.test(deadline)) {
    return todayLocalIsoDate() > deadline;
  }

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return false;
  return new Date() > parsed;
}

export function dateInputValue(value: string): string {
  return ISO_DATE_RE.test(value) ? value : "";
}

export function deadlineToLocalInput(value: string): string {
  if (!value || value === "A anunciar") return "";
  if (ISO_DATE_RE.test(value)) return `${value}T23:59`;

  const utcIso =
    value.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  const parsed = new Date(utcIso);
  if (Number.isNaN(parsed.getTime())) return "";
  const localMs = parsed.getTime() - parsed.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

export function localInputToDeadline(value: string): string {
  if (!value) return "";
  return new Date(value).toISOString();
}

export function formatPaymentDeadline(deadline: string): string {
  if (!deadline || deadline === "A anunciar") return "A anunciar";

  if (ISO_DATE_RE.test(deadline)) {
    const parsed = new Date(`${deadline}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return deadline;
    return parsed.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const utcIso =
    deadline.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(deadline)
      ? deadline
      : `${deadline}Z`;
  const parsed = new Date(utcIso);
  if (Number.isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
