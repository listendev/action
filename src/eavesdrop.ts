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

export async function doesArgusNeedReload() {
  return await core.group(
    'Check whether the CI eavesdrop tool needs reload',
    async (): Promise<boolean> => {
      const opts: exec.ExecOptions = {
        ignoreReturnCode: true
      };

      const {stderr, stdout, exitCode} = await exec.getExecOutput(
        'sudo',
        ['systemctl', 'show', 'argus', '--property=NeedDaemonReload'],
        opts
      );

      if (exitCode !== 0) {
        core.warning(stderr);

        return false;
      }

      return stdout.trim().endsWith('=yes');
    }
  );
}

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
