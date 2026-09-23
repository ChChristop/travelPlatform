export type ValidationErrorCode =
  | 'duplicate-id'
  | 'dangling-reference'
  | 'ownership-mismatch'
  | 'option-not-in-group'
  | 'invalid-date-order'
  | 'non-finite-value';

export interface ValidationError {
  code: ValidationErrorCode;
  entityType: string;
  entityId?: string;
  message: string;
}
