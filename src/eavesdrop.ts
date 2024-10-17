import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function isArgusActive() {
  return await core.group(
    'Check whether the CI eavesdrop tool is active',
    async (): Promise<number> => {
      return await exec.exec('sudo', ['systemctl', 'is-active', 'argus'], {
        ignoreReturnCode: true
      });
    }
  );
}
