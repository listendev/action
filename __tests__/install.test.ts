import {promises as fs} from 'fs';
import * as path from 'path';

const tmpdir = path.join(__dirname, '_temp');
process.env['RUNNER_TEMP'] = tmpdir;

import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as installer from '../src/install';
import * as eavesdrop from '../src/eavesdrop';

jest.mock('../src/constants', () => ({
  EavesdropMustRun: true
}));

describe('installer', () => {
  beforeAll(async () => {
    await io.mkdirP(tmpdir);
  });

  afterAll(async () => {
    await io.rmRF(tmpdir);
  });

  it.skipWindows(
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

  it.skipWindows(
    'installs the latest version of lstn',
    async () => {
      const dir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const lstn = await installer.lstn('latest', dir);
      const code = await exec.exec(lstn, ['version']);
      expect(code).toBe(0);
    },
    5 * 60 * 1000
  );

  it.onLinux(
    'installs eavesdrop tool for the lstn v0.13.0',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.13.0'
          };

          return data[name];
        });

      const tool = new eavesdrop.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('argus_version');

      expect(tool.getName()).toEqual('argus');
      expect(tool.getVersion()).toEqual('v0.1');
      expect(tool.getCliEnablingCommand()).toEqual(['ci']);

      const fileDir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const destDir = await fs.mkdtemp(path.join(tmpdir, 'eavesdrop-'));
      const toolPath = await tool.install(fileDir, destDir);

      expect(tool.isInstalled()).toBe(true);

      const code = await exec.exec(toolPath, ['-v']);
      expect(code).toBe(0);
    },
    5 * 60 * 1000
  );

  it.onLinux(
    'installs eavesdrop tool for the latest lstn',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'latest'
          };

          return data[name];
        });

      const tool = new eavesdrop.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('argus_version');

      expect(tool.getVersion()).toEqual('v0.8');
      expect(tool.getCliEnablingCommand()).toEqual(['ci', 'enable']);
      expect(tool.getName()).toEqual('jibril');

      const fileDir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const destDir = await fs.mkdtemp(path.join(tmpdir, 'eavesdrop-'));
      const toolPath = await tool.install(fileDir, destDir);

      expect(tool.isInstalled()).toBe(true);

      const code = await exec.exec(toolPath, ['--version']);
      expect(code).toBe(0);
    },
    5 * 60 * 1000
  );

  it.onLinux(
    'installs custom eavesdrop tool version',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'latest',
            argus_version: 'v0.3'
          };

          return data[name];
        });

      const tool = new eavesdrop.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('argus_version');

      expect(tool.getVersion()).toEqual('v0.3');
      expect(tool.getCliEnablingCommand()).toEqual(['ci', 'enable']);
      expect(tool.getName()).toEqual('argus');

      const fileDir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));
      const destDir = await fs.mkdtemp(path.join(tmpdir, 'eavesdrop-'));
      const toolPath = await tool.install(fileDir, destDir);

      expect(tool.isInstalled()).toBe(true);

      const code = await exec.exec(toolPath, ['--version']);
      expect(code).toBe(0);
    },
    5 * 60 * 1000
  );
});
