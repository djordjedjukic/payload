export function getCollectionName(collectionSlug: string): string {
  return collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1)
}
