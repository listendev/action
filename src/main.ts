import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as install from './install';
import * as flags from './flags';
import * as utils from './utils';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const runArgus = core.getInput('ci') == 'true';
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
    const lstnFlags = core.getInput('lstn_flags');

    const lstn = await core.group(
      '🐬 Installing lstn... https://github.com/listendev/lstn',
      async () => {
        return await install.lstn(version, tmpdir);
      }
    );

    let argus: string;
    if (runArgus) {
      // Install argus for lstn
      argus = await core.group(
        '👁️‍🗨️ Installing argus... https://listen.dev',
        async () => {
          return await install.argusFor(version, tmpdir);
        }
      );
      // Moving argus to /usr/bin
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
      `🐬 Running lstn${runArgus ? ' with CI eavesdropper' : '...'}`,
      async (): Promise<number> => {
        // Pass tokens down
        process.env['LSTN_GH_TOKEN'] = core.getInput('token');
        process.env['LSTN_JWT_TOKEN'] = jwt;
        // Ensure $PATH contains /usr/bin
        process.env['PATH'] = !process.env['PATH']
          ? '/usr/bin'
          : `${process.env['PATH']}:/usr/bin`;

        if (runArgus) {
          // TODO: what to do when status code != 0
          await exec.exec('sudo', [
            '-E',
            lstn,
            'ci',
            '--dir',
            path.dirname(argus)
          ]);
        }

        return await exec.exec(
          lstn,
          [lstnCommand, ...lstnArgs, ...flags.parse(lstnFlags)],
          {
            cwd
            // TODO: ignoreReturnCode
            // TODO: outStream
          }
        );
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

run();
