import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as install from './install';
import * as flags from './flags';
import * as utils from './utils';
import * as state from './state';
import * as eavesdrop from './eavesdrop';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const jwt = core.getInput('jwt', {
      required: eavesdrop.MustRun
    });
    const version = core.getInput('lstn');
    const workdir = core.getInput('workdir');
    const config = core.getInput('config');
    const reporter = core.getInput('reporter');
    const select = core.getInput('select');
    const cwd = path.relative(
      process.env['GITHUB_WORKSPACE'] || process.cwd(),
      workdir
    );
    // This option is only meant for expert users and tests.
    const lstnFlags = core.getInput('lstn_flags');

    const lstn = await core.group(
      '🐬 Installing lstn... https://github.com/listendev/lstn',
      async () => {
        return await install.lstn(version, tmpdir);
      }
    );

    const eavesdropTool = eavesdrop.get();
    await eavesdropTool.install(tmpdir);

    // TODO: restore cache here

    const lstnCommand = jwt != '' ? 'in' : 'scan';

    const lstnArgs = ['--reporter', `${jwt != '' ? 'pro' : reporter}`]; // There's always a reporter (default)
    if (select != '') {
      lstnArgs.push(...['--select', `${select}`]);
    }
    if (config != '') {
      const res = await utils.checkPath(config);
      if (!res.exists) {
        core.setFailed(`${config} does not exists`);

        return;
      }
      if (res.isFile) {
        lstnArgs.push(...['--config', `${config}`]);
      } else {
        // The input config is a directory
        const defaultFile = path.join(config, '.lstn.yaml');
        const fallback = await utils.checkPath(defaultFile);
        if (!fallback.exists) {
          core.setFailed(`${defaultFile} config file does not exists`);

          return;
        }
        // Assuming that defaultFile is a proper file now
        lstnArgs.push(...['--config', `${defaultFile}`]);
      }
    }

    const exit = await core.group(
      `🐬 Running lstn${eavesdrop.MustRun ? ' with CI eavesdropper' : '...'}${
        eavesdrop.MustRunAlone ? ' only' : ''
      }`,
      async (): Promise<number> => {
        // Pass tokens down
        process.env['LSTN_GH_TOKEN'] = core.getInput('token');
        process.env['LSTN_JWT_TOKEN'] = jwt;
        // Ensure $PATH contains /usr/bin
        process.env['PATH'] = !process.env['PATH']
          ? '/usr/bin'
          : `${process.env['PATH']}:/usr/bin`;

        let exitCode = -1;
        if (eavesdrop.MustRun) {
          // Here for `ci: true` or `ci:only`
          // TODO: what to do when status code != 0
          exitCode = await exec.exec('sudo', [
            '-E',
            lstn,
            ...eavesdropTool.getCliEnablingCommand(),
            ...flags.parse(lstnFlags)
          ]);
          const didClassify = await eavesdropTool.classifyEnvironmentFile();
          if (!didClassify) {
            core.warning(
              "couldn't classify the CI eavesdrop configuration variables"
            );
          }
        }

        if (!eavesdrop.MustRunAlone) {
          // Here for `ci: true` or `ci: false`
          exitCode = await exec.exec(
            lstn,
            [lstnCommand, ...lstnArgs, ...flags.parse(lstnFlags)],
            {
              cwd
              // TODO: ignoreReturnCode
              // TODO: outStream
            }
          );
        }

        return exitCode;
      }
    );

    // TODO: save cache here

    if (exit !== 0) {
      core.setFailed(`status code: ${exit}`);
    }
  } catch (error: any) {
    core.setFailed(error);
  } finally {
    // Cleanup
    try {
      await io.rmRF(tmpdir);
    } catch (error) {
      // Suppress these errors
      if (error instanceof Error) {
        core.info(`Couldn't clean up: ${error.message}`);
      } else {
        core.info(`Couldn't clean up: ${error}`);
      }
    }
  }
}

async function post() {
  try {
    const eavesdropTool = eavesdrop.get();
    const isActive = await eavesdropTool.isActive();
    if (!isActive) {
      core.info(`Moving on since the CI eavesdrop tool isn't active`);

      return;
    }

    const exit = await eavesdropTool.stop();
    if (exit !== 0) {
      core.warning(`Couldn't properly stop the CI eavesdrop tool`);
    }
  } catch (error: any) {
    core.setFailed(error);
  }
}

if (!state.IsPost) {
  run();
} else {
  post();
}
