import {Serializer, toSerialize, toDeserialize} from 'superserial';
import * as state from './state';
import * as core from '@actions/core';
import {EavesdropMustRun, EavesdropMustRunAlone} from './constants';
import {getArch, getFormat, getPlat, tagToVersion} from './install';
import * as tc from '@actions/tool-cache';
import * as path from 'path';
import * as exec from '@actions/exec';
import * as flags from './flags';
import {Tool as Eavesdrop} from './eavesdrop';
import * as semver from 'semver';
const {Octokit} = require('@octokit/rest');
const axios = require('axios');
const fs = require('fs');

const STATE_ID = 'lstn';

export class Tool {
  private version: string;
  private jwt: string;
  private path = '';
  private command: string;
  private args: string[];
  private cwd: string;
  private extraFlags: string[];

  serialize() {
    return s.serialize(this);
  }

  [toSerialize]() {
    return {
      version: this.version,
      jwt: this.jwt,
      path: this.path,
      command: this.command,
      args: this.args,
      cwd: this.cwd,
      extraFlags: this.extraFlags
    };
  }

  [toDeserialize](value: {
    version: string;
    jwt: string;
    path: string;
    command: string;
    args: string[];
    cwd: string;
    extraFlags: string[];
  }) {
    this.version = value.version;
    this.jwt = value.jwt;
    this.path = value.path;
    this.command = value.command;
    this.args = value.args;
    this.cwd = value.cwd;
    this.extraFlags = value.extraFlags;
  }

  constructor() {
    const versions = Object.keys(Eavesdrop.tagMap);
    const v = core.getInput('lstn');
    this.version = v == 'latest' ? versions[0] : v;

    this.jwt = core.getInput('jwt', {required: EavesdropMustRun});

    this.command = this.jwt !== '' ? 'in' : 'scan';

    const reporter = core.getInput('reporter');
    const select = core.getInput('select');
    this.args = ['--reporter', `${this.jwt != '' ? 'pro' : reporter}`]; // There's always a reporter (default)
    if (select != '') {
      this.args.push(...['--select', `${select}`]);
    }

    this.cwd = path.relative(
      process.env['GITHUB_WORKSPACE'] || process.cwd(),
      core.getInput('workdir')
    );

    // The `lstn_flags` option is only meant for expert users and tests.
    this.extraFlags = flags.parse(core.getInput('lstn_flags'));
  }

  public setConfig(file: string) {
    this.args.push(...['--config', file]);
    store(this);
  }

  public isInstalled(): boolean {
    return this.path !== '';
  }

  public getVersion(): string {
    return this.version;
  }

  // It returns the URL to download the LSTN CLI based on the parameter value `lstn`.
  // In `dev` mode it will pick the latest release from the `listendev/lstn-dev` repository.
  // Otherwise, it will use the public CLI from the `listendev/lstn` repository.
  private async buildURL() {
    const v = core.getInput('lstn');
    if (v == 'dev') {
      return 'https://github.com/listendev/lstn-dev/releases/download/v0.0.0/lstn_0.0.0_linux_amd64.tar.gz';
    }

    const owner = 'listendev';
    const repo = 'lstn';
    const vers = await tagToVersion(this.version, owner, repo);
    const plat = getPlat(process.platform.toString());
    const arch = getArch(process.arch.toString());
    const archive = getFormat(plat);
    const name = `lstn_${vers}_${plat}_${arch}`;
    const url = `https://github.com/${owner}/${repo}/releases/download/v${vers}/${name}.${archive}`;

    return url;
  }

  public async install(tmpdir: string) {
    const where = await core.group(
      '🐬 Installing lstn... https://github.com/listendev/lstn',
      async () => {
        const repo = 'lstn';
        const owner = 'listendev';
        const vers =
          core.getInput('lstn') === 'dev'
            ? '0.0.0'
            : await tagToVersion(this.version, owner, repo);

        const plat = getPlat(process.platform.toString());
        const arch = getArch(process.arch.toString());
        const archive = getFormat(plat);

        const url = await this.buildURL();
        core.info(`Downloading from ${url}`);

        let download: string = '';

        if (core.getInput('lstn') === 'dev') {
          const token = core.getInput('pat_pvt_repo');
          if (!token) {
            core.warning('Missing private repo PAT');
          }

          const octokit = new Octokit({
            auth: token
          });

          try {
            // request list of assests for release v0.0.0
            const res = await octokit.rest.repos.getReleaseByTag({
              owner: 'listendev',
              repo: 'lstn-dev',
              tag: 'v0.0.0'
            });

            // find asset id for lstn_0.0.0_linux_amd64.tar.gz
            var asset_id = 0;
            const name = 'lstn_0.0.0_linux_amd64.tar.gz';
            for (let asset of res.data.assets) {
              if (asset.name === name) {
                asset_id = asset.id;
                break;
              }
            }

            if (asset_id === 0) {
              core.warning(
                'Could not find asset id for lstn_0.0.0_linux_amd64.tar.gz'
              );

              throw new Error(
                'Could not find asset id for lstn_0.0.0_linux_amd64.tar.gz'
              );
            }

            // find url to download asset
            let resp = await octokit.rest.repos.getReleaseAsset({
              owner: 'listendev',
              repo: 'lstn-dev',
              asset_id: asset_id,
              headers: {
                Accept: 'application/octet-stream'
              }
            });

            // Start downloading the asset
            const downloadUrl = resp.url;
            const filePath = path.resolve(__dirname, name);
            const writer = fs.createWriteStream(filePath);

            // Use axios to download the file
            const downloadResponse = await axios({
              method: 'get',
              url: downloadUrl,
              responseType: 'stream'
            });

            downloadResponse.data.pipe(writer);

            writer.on('finish', () => {
              core.info(`Download completed: ${filePath}`);

              download = filePath;
            });

            writer.on('error', (e: any) => {
              core.warning('Error downloading file:', e);
            });
          } catch {
            core.error('Error downloading file');
            throw new Error('Error downloading file');
          }
        } else {
          try {
            download = await tc.downloadTool(url);
            core.info(`Download completed: ${download}`);
          } catch (error) {
            core.error(`Error downloading file: ${error}`);
            throw error;
          }
        }

        core.info(`Extracting ${download}...`);

        let res = '';
        try {
          if (archive === 'zip') {
            res = await tc.extractZip(download, tmpdir);
          } else {
            res = await tc.extractTar(download, tmpdir);
          }
        } catch (error) {
          core.error(`Error extracting archive: ${error}`);
          throw error;
        }

        const name = `lstn_${vers}_${plat}_${arch}`;
        const extractedPath = path.join(
          res,
          name,
          `lstn${archive === 'zip' ? '.exe' : ''}`
        );
        return extractedPath;
      }
    );

    this.path = where;
    store(this);

    return where;
  }

  public async exec() {
    if (EavesdropMustRunAlone || !this.isInstalled()) {
      return 0;
    }

    this.setEnv();

    return await exec.exec(
      this.path,
      [this.command, ...this.args, ...this.extraFlags],
      {
        cwd: this.cwd
        // TODO: ignoreReturnCode
        // TODO: outStream
      }
    );
  }

  public async report() {
    if (!EavesdropMustRun) {
      return 0;
    }

    if (!this.isInstalled()) {
      core.warning('missing lstn CLI installation');
      return 0;
    }

    // Check CLI version >= 0.16.0
    const version = semver.coerce(this.version);
    if (!version || !semver.valid(version)) {
      throw new Error(`invalid lstn version (${this.version})`);
    }
    if (semver.lt(version, 'v0.16.0')) {
      core.warning(
        `Coulnd't report because lstn ${this.version} lacks this ability`
      );
      return 0;
    }

    this.setEnv();

    const res = await core.group(
      'Report runtime threats if possible',
      async (): Promise<number> => {
        return await exec.exec(this.path, ['ci', 'report']);
      }
    );

    return res;
  }

  public async eavesdrop(eavesdrop: Eavesdrop) {
    if (!EavesdropMustRun) {
      return 0;
    }

    if (!this.isInstalled()) {
      core.warning('missing lstn CLI installation');
      return 0;
    }

    this.setEnv();

    const exit = await exec.exec('sudo', [
      '-E',
      this.path,
      ...eavesdrop.getCliEnablingCommand(),
      ...this.extraFlags
    ]);

    if (exit === 0) {
      const didClassify = await eavesdrop.classifyEnvironmentFile();
      if (!didClassify) {
        core.warning(
          "couldn't classify the CI eavesdrop configuration variables"
        );
      }
    }

    return exit;
  }

  private setEnv() {
    // Pass tokens down
    process.env['LSTN_GH_TOKEN'] = core.getInput('token');
    process.env['LSTN_JWT_TOKEN'] = this.jwt;
    // Ensure $PATH contains /usr/bin
    process.env['PATH'] = !process.env['PATH']
      ? '/usr/bin'
      : `${process.env['PATH']}:/usr/bin`;
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
      core.setFailed(`Could not instantiate the lstn tool.`);
      throw error;
    }
  }

  try {
    return deserialize(core.getState(STATE_ID));
  } catch (error: any) {
    throw new Error(`Could not deserialize the lstn tool instance.`);
  }
}
