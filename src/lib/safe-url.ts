/** Only http(s) URLs may be rendered as links. */
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function extractHttpUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"'）)]+/gi) ?? []
  const urls: string[] = []
  const seen = new Set<string>()
  for (const raw of matches) {
    const cleaned = raw.replace(/[),.;]+$/g, '')
    if (!isSafeHttpUrl(cleaned) || seen.has(cleaned)) continue
    seen.add(cleaned)
    urls.push(cleaned)
  }
  return urls
}

export function researchBlobUrl(repository: string, commit: string, filename: string): string {
  return `https://github.com/${repository}/blob/${commit}/data/research/${filename}`
}
