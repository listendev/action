import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as install from './install';
import * as github from '@actions/github';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const version = core.getInput('lstn');
    const workdir = core.getInput('workdir');
    const cwd = path.relative(
      process.env['GITHUB_WORKSPACE'] || process.cwd(),
      workdir
    );

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
       const env = {
          LSTN_GH_TOKEN: core.getInput('token'),
          HOME: tmpdir,
       }
       const prNumber = github.context.payload.pull_request?.number;
       const repoName = github.context.payload.repository?.name;
       const ownerName = github.context.payload.repository?.owner.login;
       if (prNumber == null) {
          throw new Error('No pull request number found');
       }
        if (repoName == null) {
          throw new Error('No repository name found');
        }
        if (ownerName == null) {
          throw new Error('No owner name found');
        }
       return await exec.exec(lstn, [
          'scan',
          '--reporter=github-pr-review',
          '--github_pr_owner',
          ownerName,
          '--github_pr_repository',
          repoName,
          '--github_pr_id',
          prNumber.toString(),
        ], {
          cwd,
          env,
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
