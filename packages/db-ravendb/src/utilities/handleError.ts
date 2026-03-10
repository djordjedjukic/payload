import type { PayloadRequest } from 'payload'

import { ValidationError } from 'payload'

export function handleError({
  collection,
  error,
  req,
}: {
  collection?: string
  error: unknown
  req?: Partial<PayloadRequest>
}): never {
  if (error instanceof Error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new ValidationError(
        {
          collection,
          errors: [
            {
              message: req?.t ? req.t('error:valueMustBeUnique') : 'Value must be unique',
              path: 'id',
            },
          ],
          req,
        },
        req?.t,
      )
    }

    throw error
  }

  throw new Error('An unknown error occurred')
}
