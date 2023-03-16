import * as path from "path";
import * as core from "@actions/core";
import * as http from "@actions/http-client";
import * as tc from "@actions/tool-cache";
import {version} from "../package.json";

export async function lstn(tag: string, directory: string): Promise<string> {
    core.info(`looking for release ${tag}...`);

    const owner = "listendev";
    const repo = "lstn"
    const vers = tagToVersion(tag, owner, repo);
    const plat = getPlat(process.platform.toString());
    const arch = getArch(process.arch.toString());
    const archive = getFormat(plat);
    const url = `https://github.com/${owner}/${repo}/releases/download/v${vers}/lstn_${vers}_${plat}_${arch}.${archive}`;

    core.info(`downloading from ${url}`);

    const download = await tc.downloadTool(url);

    core.info(`extracting...`);

    let ext = "";
    let res = "";
    if (archive == "zip") {
      res = await tc.extractZip(download, directory);
      ext = ".exe";
    } else {
      res = await tc.extractTar(download, directory);
    }

    return path.join(res, `lstn${ext}`)
}

function getPlat(os: string): string {
  os = os.trim().toLowerCase();

  if (os.startsWith("win") || os.startsWith("cygwin") || os.startsWith("mingw") || os.startsWith("msys")) {
    os = "windows"
  }

  if (os.startsWith("darwin")) {
    os = "macos"
  }

  switch (os) {
    case "macos":
      break
    case "linux":
      break
    default:
        throw new Error(`unsupporter platform: ${os}`)
  }

  return os
}

function getArch(arch: string): string {
  arch = arch.trim().toLowerCase();

  switch (arch) {
    case "x64":
      arch = "amd64"
      break
    case "x32":
      arch = "386"
      break
    case "arm64":
      break
    case "armv6":
      break
    default:
      throw new Error(`unsupporter arch: ${arch}`)
  }

  return arch
}

function getFormat(platform: string): string {
  if (platform == "windows") {
    return "zip"
  }
  return "tar.gz"
}

async function tagToVersion(tag: string, owner: string, repo: string): Promise<string> {
    core.info(`looking for a release for tag ${tag}`);

    interface Release {
      tag_name: string;
    }

    const ua = `listendev-action/${version}; lstn/${tag}`;
    const url = `https://github.com/${owner}/${repo}/releases/${tag}`;
    const client = new http.HttpClient(ua);
    const headers = { [http.Headers.Accept]: "application/json" };
    const response = await client.getJson<Release>(url, headers);

    if (response.statusCode != http.HttpCodes.OK) {
      core.error(`${url} returns unexpected HTTP status code: ${response.statusCode}`);
    }
    if (!response.result) {
      throw new Error(
        `unable to find '${tag}': use 'latest' or see https://github.com/${owner}/${repo}/releases for details`
      );
    }
    let realTag = response.result.tag_name;

    // if version starts with 'v', remove it
    realTag = realTag.replace(/^v/, "");

    return realTag;
}