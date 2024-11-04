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
    this.version = core.getInput('lstn');

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

  public getVersion(): string {
    return this.version;
  }

  public isInstalled(): boolean {
    return this.path !== '';
  }

  public async install(tmpdir: string) {
    const where = await core.group(
      '🐬 Installing lstn... https://github.com/listendev/lstn',
      async () => {
        const owner = 'listendev';
        const repo = 'lstn';
        const vers = await tagToVersion(this.version, owner, repo);
        const plat = getPlat(process.platform.toString());
        const arch = getArch(process.arch.toString());
        const archive = getFormat(plat);
        const name = `lstn_${vers}_${plat}_${arch}`;
        const url = `https://github.com/${owner}/${repo}/releases/download/v${vers}/${name}.${archive}`;

        core.info(`downloading from ${url}`);

        const download = await tc.downloadTool(url);

        core.info(`extracting...`);

        let ext = '';
        let res = '';
        if (archive == 'zip') {
          res = await tc.extractZip(download, tmpdir);
          ext = '.exe';
        } else {
          res = await tc.extractTar(download, tmpdir);
        }

        return path.join(res, name, `lstn${ext}`);
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
