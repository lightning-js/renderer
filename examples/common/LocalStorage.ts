// Retreive state from local storage (if localStorage is available)
// and set the state of the app accordingly.
export function loadStorage<T>(testName: string): Partial<T> | null {
  if (typeof window.localStorage === 'undefined') {
    return null;
  }
  try {
    const serializedState = localStorage.getItem(`${testName}-state`);
    if (serializedState === null) {
      return null;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return null;
  }
}

// Save the state of the app to local storage (if localStorage is available).
export function saveStorage<T>(testName: string, state: Partial<T>): void {
  if (typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(`${testName}-state`, serializedState);
  } catch (err) {
    // Ignore write errors.
  }
}

// Clear the state of the app from local storage (if localStorage is available).
export function clearStorage(testName: string): void {
  if (typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(`${testName}-state`);
  } catch (err) {
    // Ignore write errors.
  }
}
