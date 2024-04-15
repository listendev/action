import {PathLike, promises as fs} from 'fs';

export async function checkPath(path: PathLike) {
  try {
    const stats = await fs.stat(path);
    if (stats.isFile()) {
      return {exists: true, isFile: true};
    } else if (stats.isDirectory()) {
      return {exists: true, isFile: false};
    } else {
      // Handle other types (unlikely in most cases)
      return {exists: true, isFile: undefined};
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {exists: false};
    } else {
      throw error; // Re-throw other errors
    }
  }
}
