export function adsTxt(publisherId: string | undefined): string | null {
  if (!publisherId || !/^pub-\d{16}$/.test(publisherId)) return null;
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}
