export function utcIsoToLocalInput(iso: string): string {
  // Naive strings from MongoDB have no timezone marker — force UTC interpretation
  const utcIso =
    iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(utcIso);
  const localMs = d.getTime() - d.getTimezoneOffset() * 60000;
  return new Date(localMs).toISOString().slice(0, 16);
}

export function localInputToUtcIso(localStr: string): string {
  return new Date(localStr).toISOString();
}
