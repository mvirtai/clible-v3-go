/**
 * Application SemVer version identifier injected at build/test time directly from root VERSION.
 */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.1.1';

/**
 * Runtime version and build metadata returned by the backend.
 */
export interface VersionInfo {
  /** SemVer application version */
  version: string;
  /** Git commit SHA hash */
  gitCommit: string;
  /** Binary build timestamp */
  buildDate: string;
  /** Go runtime compiler version */
  goVersion: string;
}

/**
 * Fetches runtime build metadata from the backend API.
 */
export async function fetchBackendVersion(): Promise<VersionInfo | null> {
  try {
    const res = await fetch('/api/version');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
