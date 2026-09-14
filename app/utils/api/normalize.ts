/** Normalize the list envelopes returned by the API without hiding errors. */
export function listFromResponse<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['items', 'data', 'results']) {
      if (Array.isArray(record[key])) return record[key] as T[]
    }
  }
  return []
}
