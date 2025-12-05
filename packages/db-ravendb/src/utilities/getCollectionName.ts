/**
 * Get the RavenDB collection name for a Payload collection
 */
export function getCollectionName(collectionSlug: string): string {
  // RavenDB collection names - capitalize first letter
  return collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1)
}

