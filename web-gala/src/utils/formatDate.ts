const PT_MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function toUtcDate(isoString: string): Date {
  const utcIso =
    isoString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(isoString)
      ? isoString
      : isoString + "Z";
  return new Date(utcIso);
}

export function formatDatePT(isoString: string): string {
  if (!isoString) return "A anunciar";
  const d = toUtcDate(isoString);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return "A anunciar";
  return `${d.getDate()} de ${PT_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatTimePT(isoString: string | null): string {
  if (!isoString) return "—";
  const d = toUtcDate(isoString);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return "—";
  return `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTimePT(isoString: string): string {
  if (!isoString) return "A anunciar";
  const d = toUtcDate(isoString);
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return "A anunciar";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${PT_MONTHS[d.getMonth()]} (${hours}h${minutes})`;
}
