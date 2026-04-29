const PT_MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function formatDatePT(isoString: string): string {
  if (!isoString) return "A anunciar";
  const d = new Date(isoString);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "A anunciar";
  return `${d.getDate()} de ${PT_MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatDateTimePT(isoString: string): string {
  if (!isoString) return "A anunciar";
  const d = new Date(isoString);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return "A anunciar";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${PT_MONTHS[d.getMonth()]} (${hours}h${minutes})`;
}
