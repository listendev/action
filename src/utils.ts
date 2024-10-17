import {PathLike, promises as fs} from 'fs';
import * as exec from '@actions/exec';

export async function checkPath(path: PathLike, withSudo = false) {
  try {
    if (withSudo) {
      let isFile = false;
      const opts: exec.ExecOptions = {
        silent: true,
        listeners: {
          stdout: (data: Buffer) => {
            const res = data.toString().trim();
            isFile = res.startsWith('-') || res.includes('File:');
          },
          stderr: () => {
            throw new Error(
              `couldn't check "${path.toString()}" path with sudo`
            );
          }
        }
      };

      await exec.exec('sudo', ['stat', path.toString()], opts);

      return {exists: true, isFile: isFile};
    } else {
      const stats = await fs.stat(path);
      if (stats.isFile()) {
        return {exists: true, isFile: true};
      } else if (stats.isDirectory()) {
        return {exists: true, isFile: false};
      } else {
        // Handle other types (unlikely in most cases)
        return {exists: true, isFile: undefined};
      }
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {exists: false};
    } else {
      throw error; // Re-throw other errors
    }
  }
}
