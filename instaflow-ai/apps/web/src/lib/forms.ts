import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, errorMessage } from './api';

/**
 * Map API validation errors onto form fields; anything else becomes a toast.
 * Returns true when at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, fields: readonly string[]): boolean {
  if (err instanceof ApiError && err.details.length) {
    let applied = false;
    for (const d of err.details) {
      if (fields.includes(d.path)) {
        setError(d.path as Path<T>, { type: 'server', message: d.message });
        applied = true;
      }
    }
    if (applied) return true;
  }
  toast.error(errorMessage(err));
  return false;
}
