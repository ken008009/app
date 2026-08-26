import semver from 'semver';

import platformEnv from '../platformEnv';

import { EUpdateStrategy } from './type';

import type { IResponseAppUpdateInfo } from './type';

const APK_FILE_RE = /app-(\d+\.\d+\.\d+)\.apk/gi;
const MAX_PATCH_PROBES = 20;
const MAX_MINOR_PROBES = 5;
const MAX_MAJOR_PROBES = 2;

/**
 * Self-hosted Android APK update by filename (not official JS OTA).
 *
 * Bake `ANDROID_APK_UPDATE_BASE_URL` (HTTPS directory), e.g.
 * `https://cdn.example.com/android/`. Upload files named `app-1.0.1.apk`.
 * The client picks the highest semver greater than the installed VERSION.
 */
const DEFAULT_ANDROID_APK_UPDATE_BASE_URL = 'https://www.moblus.net/download/';
const UPDATE_MANIFEST_FILE_NAME = 'latest.json';

type IAndroidApkUpdateManifest = {
  version?: unknown;
  apk?: unknown;
  downloadUrl?: unknown;
  fileSize?: unknown;
};

export function getAndroidApkUpdateBaseUrl(): string | undefined {
  const url = (
    process.env.ANDROID_APK_UPDATE_BASE_URL ||
    DEFAULT_ANDROID_APK_UPDATE_BASE_URL
  ).trim();
  if (!url.startsWith('https://')) {
    return undefined;
  }
  return url.endsWith('/') ? url : `${url}/`;
}

export function shouldSkipSelfHostedAndroidApkGpg(): boolean {
  return Boolean(platformEnv.isNativeAndroid && getAndroidApkUpdateBaseUrl());
}

export function parseApkVersionsFromDirectoryText(text: string): string[] {
  const versions = new Set<string>();
  APK_FILE_RE.lastIndex = 0;
  let match = APK_FILE_RE.exec(text);
  while (match) {
    const version = match[1];
    if (semver.valid(version)) {
      versions.add(version);
    }
    match = APK_FILE_RE.exec(text);
  }
  return [...versions];
}

export function pickLatestApkNewerThan(
  versions: string[],
  currentVersion: string,
): string | undefined {
  const current = semver.valid(currentVersion);
  if (!current) {
    return undefined;
  }
  let latest: string | undefined;
  for (const version of versions) {
    const parsed = semver.valid(version);
    if (
      parsed &&
      semver.gt(parsed, current) &&
      (!latest || semver.gt(parsed, latest))
    ) {
      latest = parsed;
    }
  }
  return latest;
}

export function getSelfHostedApkFileName(version: string): string {
  return `app-${version}.apk`;
}

export function buildApkDownloadUrl(baseUrl: string, version: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalized}${getSelfHostedApkFileName(version)}`;
}

export function buildApkManifestUrl(baseUrl: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalized}${UPDATE_MANIFEST_FILE_NAME}`;
}

export function parseAndroidApkUpdateManifest(params: {
  text: string;
  baseUrl: string;
}): { version: string; downloadUrl: string; fileSize?: number } | undefined {
  try {
    const manifest = JSON.parse(params.text) as IAndroidApkUpdateManifest;
    const version =
      typeof manifest.version === 'string'
        ? semver.valid(manifest.version)
        : null;
    let apk: string | undefined;
    if (typeof manifest.downloadUrl === 'string') {
      apk = manifest.downloadUrl;
    } else if (typeof manifest.apk === 'string') {
      apk = manifest.apk;
    }
    if (!version || !apk) {
      return undefined;
    }
    const downloadUrl = new URL(apk, params.baseUrl).toString();
    if (!downloadUrl.startsWith('https://')) {
      return undefined;
    }
    const parsedFileSize = Number(manifest.fileSize);
    return {
      version,
      downloadUrl,
      fileSize:
        Number.isFinite(parsedFileSize) && parsedFileSize > 0
          ? parsedFileSize
          : undefined,
    };
  } catch {
    return undefined;
  }
}

export function buildApkProbeVersions(currentVersion: string): string[] {
  const current = semver.parse(currentVersion);
  if (!current) {
    return [];
  }
  const probes: string[] = [];
  for (let patch = 1; patch <= MAX_PATCH_PROBES; patch += 1) {
    probes.push(`${current.major}.${current.minor}.${current.patch + patch}`);
  }
  for (let minor = 1; minor <= MAX_MINOR_PROBES; minor += 1) {
    probes.push(`${current.major}.${current.minor + minor}.0`);
  }
  for (let major = 1; major <= MAX_MAJOR_PROBES; major += 1) {
    probes.push(`${current.major + major}.0.0`);
  }
  return probes;
}

export function buildSelfHostedAndroidApkUpdateInfo(params: {
  version: string;
  downloadUrl: string;
  fileSize?: number;
}): IResponseAppUpdateInfo {
  return {
    version: params.version,
    downloadUrl: params.downloadUrl,
    fileSize: params.fileSize,
    updateStrategy: EUpdateStrategy.manual,
  };
}

export async function resolveSelfHostedAndroidApkUpdate(params: {
  currentVersion: string;
  baseUrl: string;
  fetchText: (url: string) => Promise<string | undefined>;
  probeApk: (url: string) => Promise<{ exists: boolean; fileSize?: number }>;
}): Promise<IResponseAppUpdateInfo | undefined> {
  const { currentVersion, baseUrl, fetchText, probeApk } = params;
  const manifestText = await fetchText(buildApkManifestUrl(baseUrl));
  const manifest = manifestText
    ? parseAndroidApkUpdateManifest({ text: manifestText, baseUrl })
    : undefined;
  if (
    manifest &&
    semver.valid(currentVersion) &&
    semver.gt(manifest.version, currentVersion)
  ) {
    const probed = await probeApk(manifest.downloadUrl);
    if (probed.exists) {
      return buildSelfHostedAndroidApkUpdateInfo({
        version: manifest.version,
        downloadUrl: manifest.downloadUrl,
        fileSize: manifest.fileSize || probed.fileSize,
      });
    }
  }

  const listingText = await fetchText(baseUrl);
  let versions = listingText
    ? parseApkVersionsFromDirectoryText(listingText)
    : [];
  const foundFromListing = versions.length > 0;

  if (!foundFromListing) {
    const found: string[] = [];
    for (const version of buildApkProbeVersions(currentVersion)) {
      const probed = await probeApk(buildApkDownloadUrl(baseUrl, version));
      if (probed.exists) {
        found.push(version);
      }
    }
    versions = found;
  }

  const latest = pickLatestApkNewerThan(versions, currentVersion);
  if (!latest) {
    return undefined;
  }

  const downloadUrl = buildApkDownloadUrl(baseUrl, latest);
  const probed = await probeApk(downloadUrl);
  // Directory listing already named the file. If HEAD is blocked, still update.
  if (!foundFromListing && !probed.exists) {
    return undefined;
  }

  return buildSelfHostedAndroidApkUpdateInfo({
    version: latest,
    downloadUrl,
    fileSize: probed.fileSize,
  });
}
