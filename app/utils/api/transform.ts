export const keysToSnakeCase = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(keysToSnakeCase)
  }

  if (value && typeof value === 'object' && !(value instanceof FormData)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
        keysToSnakeCase(val),
      ]),
    )
  }

  return value
}