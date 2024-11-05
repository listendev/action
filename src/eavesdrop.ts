import * as semver from 'semver';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {daemonsReload} from './systemctl';
import {checkPath} from './utils';
import {Writable} from 'stream';
import {getArch, getPlat, tagToVersion} from './install';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import * as io from '@actions/io';
import * as fs from 'fs';
import * as state from './state';
import {Serializer, toSerialize, toDeserialize} from 'superserial';
import {EavesdropMustRun} from './constants';

const STATE_ID = 'eavesdrop_instance';

export class Tool {
  private lstn: string;
  private version: string;
  private name: string;
  private cliEnablingCommand: string[];
  private installed = false;

  // tagMap maps the lstn tags to the eavesdrop tool versions.
  public static tagMap: Record<string, string> = {
    'v0.16.0': 'v0.8',
    'v0.15.0': 'v0.6',
    'v0.14.0': 'v0.4',
    'v0.13.2': 'v0.3',
    'v0.13.1': 'v0.1',
    'v0.13.0': 'v0.1'
  } as const;

  serialize() {
    return s.serialize(this);
  }

  [toSerialize]() {
    return {
      lstn: this.lstn,
      version: this.version,
      name: this.name,
      cliEnablingCommand: this.cliEnablingCommand,
      installed: this.installed
    };
  }

  [toDeserialize](value: {
    lstn: string;
    version: string;
    name: string;
    cliEnablingCommand: string[];
    installed: boolean;
  }) {
    this.lstn = value.lstn;
    this.version = value.version;
    this.name = value.name;
    this.cliEnablingCommand = value.cliEnablingCommand;
    this.installed = value.installed;
  }

  private initCliVersion(): string {
    const versions = Object.keys(Tool.tagMap);
    const tag =
      core.getInput('lstn') == 'latest' ? versions[0] : core.getInput('lstn');
    const version = semver.coerce(tag);
    if (!version || !semver.valid(version)) {
      throw new Error(`invalid lstn version (${tag})`);
    }

    if (!versions.includes(tag.startsWith('v') ? tag : `v${tag}`)) {
      throw new Error(`unsupported lstn version (${tag})`);
    }

    return version.format();
  }

  private initVersion(): string {
    if (!EavesdropMustRun) return '';

    const explicit = core.getInput('eavesdrop_version');
    if (!explicit) {
      return Tool.tagMap[
        this.lstn.startsWith('v') ? this.lstn : `v${this.lstn}`
      ];
    }
    const v = explicit.startsWith('v') ? explicit : `v${explicit}`;

    const custom = semver.coerce(v);
    if (!custom || !semver.valid(custom)) {
      throw new Error(`invalid custom eavesdrop tool version (${custom})`);
    }

    if (
      !semver.eq(custom, 'v0.0.0') &&
      !Object.values(Tool.tagMap).includes(v)
    ) {
      throw new Error(`unsupported custom eavesdrop tool version (${v})`);
    }

    const lstnv = semver.coerce(this.lstn);
    if (!lstnv || !semver.valid(lstnv)) {
      throw new Error(`invalid lstn version (${this.lstn})`);
    }

    // Check that the explicit version is compatible with the current lstn version
    if (!semver.eq(custom, 'v0.0.0')) {
      if (semver.gte(lstnv, 'v0.16.0')) {
        // At least lstn v0.16.0 for eavesdrop tool versions >= v0.8
        if (semver.lt(custom, 'v0.8.0')) {
          throw new Error(
            `custom eavesdrop tool version (${v}) cannot work with lstn versions >= v0.16.0`
          );
        }
      } else {
        // Max lstn v0.15.0 for custom eavesdrop versions up to v0.6
        if (semver.gte(custom, 'v0.8.0')) {
          throw new Error(
            `custom eavesdrop tool version (${v}) cannot work with lstn versions < v0.16.0`
          );
        }
      }
    } else {
      // Nightly (v0.0) only works with lstn >= v0.16.0
      if (semver.lt(lstnv, 'v0.16.0')) {
        throw new Error(
          `nightly eavesdrop tool version (${v}) cannot work with lstn versions < v0.16.0`
        );
      }
    }

    const res = custom.format();

    return res.startsWith('v') ? res : `v${res}`;
  }

  private initName(): string {
    if (!EavesdropMustRun) return '';

    const version = semver.coerce(this.version);
    if (!version || !semver.valid(version)) {
      throw new Error(`invalid eavesdrop tool version (${this.version})`);
    }

    // Switch to jibril from v0.8 onwards
    // Also, use jibril nightly for v0.0
    if (semver.eq(version, 'v0.0.0') || semver.gte(version, 'v0.8.0')) {
      return 'jibril';
    }

    return 'argus';
  }

  private initCliEnablingCommand(): string[] {
    if (!EavesdropMustRun) return [];

    const lstnv = semver.coerce(this.lstn);
    if (!lstnv || !semver.valid(lstnv)) {
      throw new Error(`invalid lstn version (${this.lstn})`);
    }

    // Switch to `ci enable` from lstn v0.16.0 onwards
    if (semver.gte(lstnv, 'v0.16.0')) {
      return ['ci', 'enable'];
    }

    return ['ci'];
  }

  private async getEnvironmentFile() {
    const environmentFile = `/var/run/${this.name}/default`;
    const res = await checkPath(environmentFile, true);
    if (!res.exists) {
      return {exists: false, content: ''};
    }

    if (!res.isFile) {
      return {exists: false, content: ''};
    }

    let file = '';
    const options: exec.ExecOptions = {
      // Redirect stdout to the writable stream
      outStream: new Writable({
        write(chunk, encoding, callback) {
          file += chunk.toString();
          callback();
        }
      })
    };
    try {
      await exec.exec('sudo', ['cat', environmentFile], options);
    } catch (error) {
      return {exists: true, content: ''};
    }

    return {exists: true, content: file};
  }

  private async download(directory: string) {
    // The eavesdrop tool only runs on linux amd64
    const plat = getPlat(process.platform.toString());
    switch (plat) {
      case 'linux':
        break;
      default:
        throw new Error(`unsupported platform: ${plat}`);
    }
    const arch = getArch(process.arch.toString());
    switch (arch) {
      case 'amd64':
        break;
      default:
        throw new Error(`unsupported arch: ${arch}`);
    }

    const tag = semver.coerce(this.version);
    if (!tag || !semver.valid(tag)) {
      throw new Error(`invalid eavesdrop version to download (${tag})`);
    }

    const owner = 'listendev';
    const repo = `${this.name}-releases`;
    const vers = await tagToVersion(
      `v${semver.major(tag)}.${semver.minor(tag)}`,
      owner,
      repo
    );
    const url = `https://github.com/${owner}/${repo}/releases/download/v${vers}/loader`;

    core.info(`downloading from ${url}`);

    const download = await tc.downloadTool(url);

    core.info(`preparing binary...`);

    const dest = path.join(directory, this.name);
    await io.mv(download, dest);
    fs.chmodSync(dest, 0o755);

    return dest;
  }

  constructor() {
    this.lstn = this.initCliVersion();
    this.version = this.initVersion();
    this.name = this.initName();
    this.cliEnablingCommand = this.initCliEnablingCommand();
  }

  public getVersion(): string {
    return this.version;
  }

  public getName(): string {
    return this.name;
  }

  public getCliEnablingCommand(): string[] {
    return this.cliEnablingCommand;
  }

  public isInstalled(): boolean {
    return this.installed;
  }

  public async install(tmpdir: string, into = '/usr/bin/') {
    if (!EavesdropMustRun) {
      return '';
    }

    return await core.group(
      `👁️‍🗨️ Installing ${this.name}... https://listen.dev`,
      async () => {
        // Install the eavesdrop tool for lstn
        const location = await this.download(tmpdir);
        // Moving the eavesdrop tool binary to /usr/bin
        const dest = `${into}${this.name}`;
        core.info(`moving ${this.name} to ${path.dirname(dest)}`);
        const code = await exec.exec('sudo', ['mv', location, dest]);
        if (code !== 0) {
          throw new Error(
            `couldn't move ${this.name} to ${path.dirname(dest)}`
          );
        }
        this.installed = true;
        store(this);

        return dest;
      }
    );
  }

  public async isActive() {
    if (!EavesdropMustRun || !this.installed) {
      return false;
    }

    const res = await core.group(
      'Check whether the CI eavesdrop tool is active',
      async (): Promise<number> => {
        return await exec.exec('sudo', ['systemctl', 'is-active', this.name], {
          ignoreReturnCode: true
        });
      }
    );

    return res === 0;
  }

  private async needsRealod() {
    return await core.group(
      'Check whether the CI eavesdrop tool needs reload',
      async (): Promise<boolean> => {
        const opts: exec.ExecOptions = {
          ignoreReturnCode: true
        };

        const {stderr, stdout, exitCode} = await exec.getExecOutput(
          'sudo',
          ['systemctl', 'show', this.name, '--property=NeedDaemonReload'],
          opts
        );

        if (exitCode !== 0) {
          core.warning(stderr);

          return false;
        }

        return stdout.trim().endsWith('=yes');
      }
    );
  }

  public async stop() {
    if (!EavesdropMustRun || !this.installed) {
      return 0; // Nothing to stop
    }

    const needsReload = await this.needsRealod();
    if (needsReload) {
      await daemonsReload();
    }

    return await core.group(
      'Stopping the CI eavesdrop tool',
      async (): Promise<number> => {
        return await exec.exec('sudo', ['systemctl', 'stop', this.name]);
      }
    );
  }

  public async classifyEnvironmentFile() {
    if (!EavesdropMustRun || !this.installed) {
      return true;
    }

    const {exists, content} = await this.getEnvironmentFile();
    if (!exists) {
      return false;
    }
    if (content.length == 0) {
      return false;
    }
    const lines = content.split('\n');

    const secrets = new Set(['OPENAI_TOKEN']);

    for (const line of lines) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;

      const match = l.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(.*)$/);
      if (match) {
        const name = match[1].trim();
        let value = match[2].trim();

        // Handle quoted values
        if (value.startsWith('"') && value.endsWith('"')) {
          // Remove quotes and handle escaped quotes
          value = value.slice(1, -1).replace(/\\"/g, '"');
        } else if (value.startsWith("'") && value.endsWith("'")) {
          // Remove quotes and handle escaped quotes
          value = value.slice(1, -1).replace(/\\'/g, "'");
        }

        if (secrets.has(name)) {
          core.setSecret(value);
        }
      }
    }

    return true;
  }
}

const s = new Serializer({classes: {Tool}});

function deserialize(data: string): Tool {
  return s.deserialize<Tool>(data);
}

function store(instance: Tool) {
  core.saveState(STATE_ID, instance.serialize());
}

export function get(): Tool {
  if (!state.IsPost) {
    try {
      const i = new Tool();
      store(i);

      return i;
    } catch (error: any) {
      core.setFailed(`Could not instantiate the eavesdrop tool.`);
      throw error;
    }
  }

  try {
    return deserialize(core.getState(STATE_ID));
  } catch (error: any) {
    throw new Error(`Could not deserialize the eavesdrop tool instance.`);
  }
}
