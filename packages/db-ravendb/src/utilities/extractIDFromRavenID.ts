export function extractIDFromRavenID(id: unknown): unknown {
  if (typeof id !== 'string') {
    return id
  }

  const separatorIndex = id.indexOf('/')

  if (separatorIndex === -1) {
    return id
  }

  return id.slice(separatorIndex + 1)
}
