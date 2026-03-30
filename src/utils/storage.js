const STORAGE_KEY = "arc-agi-created-solutions";

/**
 * Load created solutions from localStorage.
 * Returns the stored object or `null` on failure.
 */
export function loadCreatedSolutions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save created solutions to localStorage.
 */
export function saveCreatedSolutions(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — silently ignore
  }
}
