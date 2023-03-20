import {promises as fs} from 'fs';
import * as path from 'path';

const tmpdir = path.join(__dirname, '_temp');
process.env['RUNNER_TEMP'] = tmpdir;

import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as installer from '../src/install';

describe('installer', () => {
  beforeAll(async () => {
    await io.mkdirP(tmpdir);
  });

  afterAll(async () => {
    await io.rmRF(tmpdir);
  });

  it(
    'installs specific lstn version',
    async () => {
      const dir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const lstn = await installer.lstn('v0.3.1', dir);
      const out = await exec.getExecOutput(lstn, ['version']);
      expect(out.exitCode).toBe(0);
      expect(out.stderr.trim()).toEqual('lstn v0.3.1');
    },
    5 * 60 * 1000
  );

  it(
    'installs the latest version of lstn',
    async () => {
      const dir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const lstn = await installer.lstn('latest', dir);
      const code = await exec.exec(lstn, ['version']);
      expect(code).toBe(0);
    },
    5 * 60 * 1000
  );
});
