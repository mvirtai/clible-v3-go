/**
 * Application SemVer version identifier matching root VERSION and frontend/package.json
 */
export const APP_VERSION = '3.0.0';

export interface VersionInfo {
  version: string;
  gitCommit: string;
  buildDate: string;
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
