/**
 * major.minor.patch 비교 (빌드 메타 +patch 제외)
 */
export function parseSemver(version) {
  const raw = String(version ?? '').trim();
  const match = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** client < min 이면 true */
export function isVersionBelow(clientVersion, minVersion) {
  const client = parseSemver(clientVersion);
  const min = parseSemver(minVersion);
  if (!client || !min) return false;
  if (client.major !== min.major) return client.major < min.major;
  if (client.minor !== min.minor) return client.minor < min.minor;
  return client.patch < min.patch;
}
