import * as os from 'os';
import {promises as fs} from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as utils from './utils';
import * as state from './state';
import * as eavesdropcli from './eavesdrop';
import * as lstncli from './lstn';
import {EavesdropMustRun, EavesdropMustRunAlone} from './constants';

async function run() {
  const runnertmp = process.env['RUNNER_TEMP'] || os.tmpdir();
  const tmpdir = await fs.mkdtemp(path.join(runnertmp, 'lstn-'));

  try {
    const lstn = lstncli.get();
    await lstn.install(tmpdir);

    const eavesdrop = eavesdropcli.get();
    await eavesdrop.install(tmpdir);

    // TODO: restore cache here

    // Handle lstn config
    const config = core.getInput('config');
    if (config != '') {
      const res = await utils.checkPath(config);
      if (!res.exists) {
        core.setFailed(`${config} does not exists`);

        return;
      }
      if (res.isFile) {
        lstn.setConfig(config);
      } else {
        // The input config is a directory
        const defaultFile = path.join(config, '.lstn.yaml');
        const fallback = await utils.checkPath(defaultFile);
        if (!fallback.exists) {
          core.setFailed(`${defaultFile} config file does not exists`);

          return;
        }
        // Assuming that defaultFile is a proper file now
        lstn.setConfig(defaultFile);
      }
    }

    const exit = await core.group(
      `🐬 Running lstn${EavesdropMustRun ? ' with CI eavesdropper' : '...'}${
        EavesdropMustRunAlone ? ' only' : ''
      }`,
      async (): Promise<number> => {
        // TODO: what to do when status code != 0
        let code = await lstn.eavesdrop(eavesdrop);
        code = await lstn.exec();

        return code;
      }
    );

    // TODO: save cache here

    if (exit !== 0) {
      core.setFailed(`status code: ${exit}`);
    }
  } catch (error: any) {
    core.setFailed(error);
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
  try {
    const eavesdrop = eavesdropcli.get();
    const isActive = await eavesdrop.isActive();
    if (!isActive) {
      core.info(`Moving on since the CI eavesdrop tool isn't active`);

      return;
    }

    const exit = await eavesdrop.stop();
    if (exit !== 0) {
      core.warning(`Couldn't properly stop the CI eavesdrop tool`);
    }

    // TODO: report
  } catch (error: any) {
    core.setFailed(error);
  }
}

if (!state.IsPost) {
  run();
} else {
  post();
}
