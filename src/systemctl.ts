import * as core from '@actions/core';
import * as exec from '@actions/exec';

export async function daemonsReload() {
  return await core.group('Reload daemons', async (): Promise<void> => {
    const opts: exec.ExecOptions = {
      ignoreReturnCode: true
    };

    const {stderr, exitCode} = await exec.getExecOutput(
      'sudo',
      ['systemctl', 'daemon-reload'],
      opts
    );

    if (exitCode !== 0) {
      // Handle error case, you can log stderr or throw an error
      core.warning(stderr);
    } else {
      core.info('Successfull reload');
    }
  });
}
