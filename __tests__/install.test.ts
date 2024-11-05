import {promises as fs} from 'fs';
import * as path from 'path';

const tmpdir = path.join(__dirname, '_temp');
process.env['RUNNER_TEMP'] = tmpdir;

import * as io from '@actions/io';
import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as eavesdrop from '../src/eavesdrop';
import * as lstn from '../src/lstn';

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
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.3.1',
            workdir: '.',
            reporter: 'gh-pull-comment',
            lstn_flags: '',
            jwt: '12345'
          };

          return data[name];
        });

      const tool = new lstn.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('jwt', {required: true});
      expect(getInputSpy).toHaveBeenCalledWith('reporter');
      expect(getInputSpy).toHaveBeenCalledWith('select');
      expect(getInputSpy).toHaveBeenCalledWith('workdir');
      expect(getInputSpy).toHaveBeenCalledWith('lstn_flags');

      expect(tool.getVersion()).toEqual('v0.3.1');

      const dir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));

      const res = await tool.install(dir);

      expect(res.startsWith(dir)).toBe(true);
      expect(tool.isInstalled()).toBe(true);

      const out = await exec.getExecOutput(res, ['version']);
      expect(out.exitCode).toBe(0);
      expect(out.stderr.trim()).toEqual('lstn v0.3.1');
    },
    5 * 60 * 1000
  );

  it.skipWindows(
    'installs the latest version of lstn',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'latest',
            workdir: '.',
            reporter: 'gh-pull-comment',
            lstn_flags: '',
            jwt: '12345'
          };

          return data[name];
        });

      const tool = new lstn.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('jwt', {required: true});
      expect(getInputSpy).toHaveBeenCalledWith('reporter');
      expect(getInputSpy).toHaveBeenCalledWith('select');
      expect(getInputSpy).toHaveBeenCalledWith('workdir');
      expect(getInputSpy).toHaveBeenCalledWith('lstn_flags');

      expect(tool.getVersion()).toEqual('latest');

      const dir = await fs.mkdtemp(path.join(tmpdir, 'lstn-'));

      const res = await tool.install(dir);

      expect(res.startsWith(dir)).toBe(true);
      expect(tool.isInstalled()).toBe(true);

      const code = await exec.exec(res, ['version']);
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
      expect(getInputSpy).toHaveBeenCalledWith('eavesdrop_version');

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
      expect(getInputSpy).toHaveBeenCalledWith('eavesdrop_version');

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
    'installs custom eavesdrop tool version lt v0.8',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.15.0',
            eavesdrop_version: 'v0.3'
          };

          return data[name];
        });

      const tool = new eavesdrop.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('eavesdrop_version');

      expect(tool.getVersion()).toEqual('v0.3.0');
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

  it.skipWindows(
    'installs nightly eavesdrop tool version with lstn gte v0.16.0',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.16.0',
            eavesdrop_version: '0.0'
          };

          return data[name];
        });

      const tool = new eavesdrop.Tool();

      expect(getInputSpy).toHaveBeenCalledWith('lstn');
      expect(getInputSpy).toHaveBeenCalledWith('eavesdrop_version');

      expect(tool.getVersion()).toEqual('v0.0.0');
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

  it.skipWindows(
    'installs custom eavesdrop tool version lt v0.8 with lstn gte v0.16.0 should error',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.16.0',
            eavesdrop_version: 'v0.3'
          };

          return data[name];
        });

      expect(() => new eavesdrop.Tool()).toThrow(
        'custom eavesdrop tool version (v0.3) cannot work with lstn versions >= v0.16.0'
      );
    },
    5 * 60 * 1000
  );

  it.skipWindows(
    'installs custom eavesdrop tool version gte v0.8 with lstn lt v0.16.0 should error',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.15.0',
            eavesdrop_version: 'v0.8'
          };

          return data[name];
        });

      expect(() => new eavesdrop.Tool()).toThrow(
        'custom eavesdrop tool version (v0.8) cannot work with lstn versions < v0.16.0'
      );
    },
    5 * 60 * 1000
  );

  it.skipWindows(
    'installs nightly eavesdrop tool version with lstn lt v0.16.0 should error',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'v0.15.0',
            eavesdrop_version: 'v0.0'
          };

          return data[name];
        });

      expect(() => new eavesdrop.Tool()).toThrow(
        'nightly eavesdrop tool version (v0.0) cannot work with lstn versions < v0.16.0'
      );
    },
    5 * 60 * 1000
  );

  it.skipWindows(
    'installs unsupported eavesdrop tool version throws',
    async () => {
      const getInputSpy = jest
        .spyOn(core, 'getInput')
        .mockImplementation((name: string) => {
          const data: {[key: string]: string} = {
            lstn: 'latest',
            eavesdrop_version: 'v0.2'
          };

          return data[name];
        });

      expect(() => new eavesdrop.Tool()).toThrow(
        `unsupported custom eavesdrop tool version (v0.2)`
      );
    },
    5 * 60 * 1000
  );
});
