export function parseAndValidateUrls(input: string[]): string[] {
  const uniqueUrls = new Set<string>();

  for (const str of input) {
    try {
      const trimmed = str.trim();
      if (!trimmed) continue;

      const url = new URL(trimmed);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        uniqueUrls.add(url.toString());
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return Array.from(uniqueUrls);
}
