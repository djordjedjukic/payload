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
    // handle validation errors
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new ValidationError(
        {
          errors: [
            {
              path: 'id',
              message: req?.t ? req.t('error:valueMustBeUnique') : 'Value must be unique',
            },
          ],
          collection,
          req,
        },
        req?.t,
      )
    }

    throw error
  }

  throw new Error('An unknown error occurred')
}

