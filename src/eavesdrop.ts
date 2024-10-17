import * as core from '@actions/core';
import * as exec from '@actions/exec';
import {checkPath} from './utils';
import {Writable} from 'stream';

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

export async function stopArgus() {
  const needsReload = await doesArgusNeedReload();
  if (needsReload) {
    await daemonsReload();
  }

  return await core.group(
    'Stopping the CI eavesdrop tool',
    async (): Promise<number> => {
      return await exec.exec('sudo', ['systemctl', 'stop', 'argus']);
    }
  );
}

async function getArgusEnvironmentFile() {
  const argusEnvironmentFile = `/var/run/argus/default`;
  const res = await checkPath(argusEnvironmentFile, true);
  if (!res.exists) {
    return {exists: false, content: ''};
  }

  if (!res.isFile) {
    return {exists: false, content: ''};
  }

  let file = '';
  const options: exec.ExecOptions = {
    // Redirect stdout to the writable stream
    outStream: new Writable({
      write(chunk, encoding, callback) {
        file += chunk.toString();
        callback();
      }
    })
  };
  try {
    await exec.exec('sudo', ['cat', argusEnvironmentFile], options);
  } catch (error) {
    return {exists: true, content: ''};
  }

  return {exists: true, content: file};
}
