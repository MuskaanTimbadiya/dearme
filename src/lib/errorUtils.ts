/**
 * Sanitizes technical error messages to prevent leaking stack traces,
 * internal file paths, or raw database errors to the user UI, while ensuring
 * full technical details are logged to developer console/logs.
 */
export function sanitizeUserFacingError(error: any, fallbackMessage: string): string {
  if (!error) return fallbackMessage;

  // Log full raw error details server-side / console for developer debugging
  console.error('[Application Internal Error]:', error);

  const rawMessage = typeof error === 'string' ? error : error.message || '';

  if (!rawMessage) return fallbackMessage;

  // Filter out stack traces, file paths, and database internals
  if (
    rawMessage.includes('file://') ||
    rawMessage.includes('node_modules') ||
    rawMessage.includes('/Users/') ||
    rawMessage.includes('FirebaseError:') ||
    rawMessage.includes('at ') ||
    rawMessage.includes('PERMISSION_DENIED') ||
    rawMessage.includes('firestore.googleapis.com')
  ) {
    if (rawMessage.toLowerCase().includes('permission') || rawMessage.toLowerCase().includes('unauthorized')) {
      return 'Access denied or session expired. Please sign in again.';
    }
    if (rawMessage.toLowerCase().includes('network') || rawMessage.toLowerCase().includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    return fallbackMessage;
  }

  // If clean, user-friendly short message (e.g. "Email is required."), pass through
  if (rawMessage.length < 150 && !rawMessage.includes('\n')) {
    return rawMessage;
  }

  return fallbackMessage;
}
