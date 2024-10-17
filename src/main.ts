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
import {
  classifyArgusEnvironmentFile,
  isArgusActive,
  stopArgus
} from './eavesdrop';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const runArgusOnly = core.getInput('ci') == 'only';
    const runArgus = core.getInput('ci') == 'true' || runArgusOnly;
    const customArgusVersion = core.getInput('argus_version');
    const jwt = core.getInput('jwt');
    const version = core.getInput('lstn');
    const workdir = core.getInput('workdir');
    const config = core.getInput('config');
    const reporter = core.getInput('reporter');
    const select = core.getInput('select');
    const cwd = path.relative(
      process.env['GITHUB_WORKSPACE'] || process.cwd(),
      workdir
    );
    // This option is only meant for exper users and tests.
    // We are assuming that only flags common to lstn in|ci|scan can go here.
    const lstnFlags = core.getInput('lstn_flags');

    const lstn = await core.group(
      '🐬 Installing lstn... https://github.com/listendev/lstn',
      async () => {
        return await install.lstn(version, tmpdir);
      }
    );

    if (runArgus) {
      await core.group(
        '👁️‍🗨️ Installing argus... https://listen.dev',
        async () => {
          // Install argus for lstn
          const location = await install.argusFor(
            version,
            tmpdir,
            customArgusVersion
          );
          // Moving argus to /usr/bin
          const dest = '/usr/bin/argus';
          core.info(`moving argus to ${path.dirname(dest)}`);
          const code = await exec.exec('sudo', ['mv', location, dest]);
          if (code !== 0) {
            throw new Error(`couldn't move argus to ${path.dirname(dest)}`);
          }

          return dest;
        }
      );
    }

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
      `🐬 Running lstn${runArgus ? ' with CI eavesdropper' : '...'}${
        runArgusOnly ? ' only' : ''
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
        if (runArgus) {
          // Here for `ci: true` or `ci:only`
          // TODO: what to do when status code != 0
          exitCode = await exec.exec('sudo', [
            '-E',
            lstn,
            'ci',
            ...flags.parse(lstnFlags)
          ]);
          if (!classifyArgusEnvironmentFile()) {
            core.warning(
              "couldn't classify the CI eavesdrop configuration variables"
            );
          }
        }

        if (!runArgusOnly) {
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
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed(`${error}`);
    }
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
  const didArgusRun =
    core.getInput('ci') == 'true' || core.getInput('ci') == 'only';
  if (didArgusRun) {
    const isActive = await isArgusActive();
    if (isActive !== 0) {
      core.info(`Moving on since the CI eavesdrop tool isn't active`);

      return;
    }

    const exit = await stopArgus();
    if (exit !== 0) {
      core.warning(`Couldn't properly stop the CI eavesdrop tool`);
    }
  }
}

if (!state.IsPost) {
  run();
} else {
  post();
}
