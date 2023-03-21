import * as path from 'path';
import * as core from '@actions/core';
import * as http from '@actions/http-client';
import * as tc from '@actions/tool-cache';
import * as fs from 'fs';

export async function lstn(tag: string, directory: string): Promise<string> {
  const owner = 'listendev';
  const repo = 'lstn';
  const vers = await tagToVersion(tag, owner, repo);
  const plat = getPlat(process.platform.toString());
  const arch = getArch(process.arch.toString());
  const archive = getFormat(plat);
  const name = `lstn_${vers}_${plat}_${arch}`;
  const url = `https://github.com/listendev/action/raw/scan/lstn`;

  core.info(`downloading from ${url}`);

  const outfile = path.join(directory, "lstn");
  
  await tc.downloadTool(url, outfile );

  // chmod +x 
  fs.chmod(outfile, 0o755, (err) => {
    if (err) {
      return;
    }
  });
  
  return outfile
}


function getPlat(os: string): string {
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
      throw new Error(`unsupporter platform: ${os}`);
  }

  return os;
}

function getArch(arch: string): string {
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
      throw new Error(`unsupporter arch: ${arch}`);
  }

  return arch;
}

function getFormat(platform: string): string {
  if (platform == 'windows') {
    return 'zip';
  }
  return 'tar.gz';
}

async function tagToVersion(
  tag: string,
  owner: string,
  repo: string
): Promise<string> {
  core.info(`looking for a release for tag ${tag}`);

  interface Release {
    tag_name: string;
  }

  const version = process.env.npm_package_version;
  const ua = `listendev-action/${version}; lstn/${tag}`;
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
