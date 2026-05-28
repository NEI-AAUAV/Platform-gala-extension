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
