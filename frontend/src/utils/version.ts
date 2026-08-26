/**
 * Application SemVer version identifier matching root VERSION and frontend/package.json
 */
export const APP_VERSION = '3.1.0';

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
