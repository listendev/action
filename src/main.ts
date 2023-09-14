import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as install from './install';
import * as flags from './flags';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const version = core.getInput('lstn');
    const workdir = core.getInput('workdir');
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

    // TODO: restore cache here

    const lstnArgs = ['--reporter', `${reporter}`]; // There's a default reporter
    if (select != '') {
      lstnArgs.push(...['--select', `${select}`]);
    }

    const exit = await core.group(
      '🐬 Running lstn...',
      async (): Promise<number> => {
        process.env['LSTN_GH_TOKEN'] = core.getInput('token');

        return await exec.exec(
          lstn,
          ['scan', ...lstnArgs, ...flags.parse(lstnFlags)],
          {
            cwd
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
