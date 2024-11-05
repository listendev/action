import * as core from '@actions/core';
import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';

/**
 * Indicates whether the POST action is running
 */
export const IsPost = !!core.getState('isPost');

// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
if (!IsPost) {
  core.saveState('isPost', 'true');
}

export async function tmpdir() {
  if (!IsPost) {
    const tmpdir = await fs.mkdtemp(
      path.join(process.env['RUNNER_TEMP'] || os.tmpdir(), 'lstn-')
    );
    core.saveState('LSTN_ACTION_TMPDIR', tmpdir);

    return tmpdir;
  }

  return core.getState('LSTN_ACTION_TMPDIR');
}
