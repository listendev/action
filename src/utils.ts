import {PathLike, promises as fs} from 'fs';
import * as exec from '@actions/exec';

export async function checkPath(path: PathLike, withSudo = false) {
  try {
    if (withSudo) {
      let isFile = false;
      const opts: exec.ExecOptions = {
        silent: true,
        ignoreReturnCode: true,
        listeners: {
          stdout: (data: Buffer) => {
            const res = data.toString().trim();
            isFile = res.startsWith('-') || res.includes('File:');
          }
        }
      };

      const exit = await exec.exec('sudo', ['stat', path.toString()], opts);
      if (exit !== 0) {
        return {exists: false};
      }

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
    } else if (error.code === 'EACCES') {
      return {exists: false};
    } else {
      throw error; // Re-throw other errors
    }
  }
}
