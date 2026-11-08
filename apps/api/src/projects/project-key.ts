/** Builds a short task prefix from a project name, for example "Website bán hàng" becomes "WBH". */
export function projectKeyBase(name: string): string {
  const words = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
  const key = words.length > 1 ? words.map(word => word[0]).join('').slice(0, 6) : (words[0] ?? '').slice(0, 4);
  return key.length >= 2 ? key : 'DA';
}

export function uniqueProjectKey(name: string, taken: ReadonlySet<string>): string {
  const base = projectKeyBase(name);
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix++) {
    if (!taken.has(`${base}${suffix}`)) return `${base}${suffix}`;
  }
}
