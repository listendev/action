import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
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

    const exit = await core.group(
      '🐬 Running lstn...',
      async (): Promise<number> => {
<<<<<<< HEAD
        process.env['LSTN_GITHUB_API_TOKEN'] = core.getInput('token');
        return await exec.exec(lstn, ['--help', ...flags.parse(lstnFlags)], {
=======
        process.env['LSTN_GH_TOKEN'] = core.getInput('token');

        process.env['LSTN_GH_PULL_ID'] =
          github.context.payload.pull_request?.number.toString();
        if (process.env['LSTN_GH_PULL_ID'] == null) {
          throw new Error(`couldn't find the pull request number`);
        }

        process.env['LSTN_GH_REPO'] = github.context.payload.repository?.name;
        if (process.env['LSTN_GH_REPO'] == null) {
          throw new Error(`couldn't find the repository name`);
        }

        process.env['LSTN_GH_OWNER'] =
          github.context.payload.repository?.owner.login;
        if (process.env['LSTN_GH_OWNER'] == null) {
          throw new Error(`couldn't find the owner name`);
        }

        return await exec.exec(lstn, ['scan', `--reporter ${reporter}`], {
>>>>>>> 66668ae (feat: scan)
          cwd
        });
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
