import * as core from '@actions/core';
import * as http from '@actions/http-client';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const packageJSON = require('../package.json');

export function getPlat(os: string): string {
  os = os.trim().toLowerCase();

  if (
    os.startsWith('win') ||
    os.startsWith('cygwin') ||
    os.startsWith('mingw') ||
    os.startsWith('msys')
  ) {
    os = 'windows';
  }

  if (os.startsWith('darwin')) {
    os = 'macos';
  }

  switch (os) {
    case 'macos':
      break;
    case 'linux':
      break;
    default:
      throw new Error(`unsupported platform: ${os}`);
  }

  return os;
}

export function getArch(arch: string): string {
  arch = arch.trim().toLowerCase();

  switch (arch) {
    case 'x64':
      arch = 'amd64';
      break;
    case 'x32':
      arch = '386';
      break;
    case 'arm64':
      break;
    case 'armv6':
      break;
    default:
      throw new Error(`unsupported arch: ${arch}`);
  }

  return arch;
}

export function getFormat(platform: string): string {
  if (platform == 'windows') {
    return 'zip';
  }
  return 'tar.gz';
}

export async function tagToVersion(
  tag: string,
  owner: string,
  repo: string
): Promise<string> {
  core.info(`looking for ${repo}/${tag}`);

  interface Release {
    tag_name: string;
  }

  const version =
    process.env.npm_package_version || packageJSON.version || 'unknown';
  const ua = `listendev-action/${version}; ${repo}/${tag}`;
  const url = `https://github.com/${owner}/${repo}/releases/${tag}`;
  const client = new http.HttpClient(ua);
  const headers = {[http.Headers.Accept]: 'application/json'};
  const response = await client.getJson<Release>(url, headers);

  core.info(`looking for release ${url}`);
  core.info(`using user agent "${ua}"`);

  if (response.statusCode != http.HttpCodes.OK) {
    core.error(
      `${url} returns unexpected HTTP status code: ${response.statusCode}`
    );
  }
  if (!response.result) {
    throw new Error(
      `unable to find '${tag}': use 'latest' or see https://github.com/${owner}/${repo}/releases for details`
    );
  }
  let realTag = response.result.tag_name;

  // if version starts with 'v', remove it
  realTag = realTag.replace(/^v/, '');

  return realTag;
}
