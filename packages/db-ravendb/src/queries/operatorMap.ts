export type OperatorMapKey = keyof typeof operatorMap

// map Payload operators to internal query operators
export const operatorMap = {
  all: '$all',
  contains: 'contains',
  equals: '$eq',
  exists: '$exists',
  greater_than: '$gt',
  greater_than_equal: '$gte',
  in: '$in',
  intersects: '$geoIntersects',
  less_than: '$lt',
  less_than_equal: '$lte',
  like: 'like',
  near: '$near',
  not_equals: '$ne',
  not_in: '$nin',
  not_like: 'not_like',
  within: '$geoWithin',
}
