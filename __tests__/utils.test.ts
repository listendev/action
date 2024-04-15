import * as utils from '../src/utils';
import * as path from 'path';

describe('checkPath', () => {
  const cwd = path.basename(__dirname);

  it('empty', async () => {
    const res = await utils.checkPath('');
    expect(res).toEqual({exists: false});
  });

  it('existing folder', async () => {
    const res = await utils.checkPath(path.join(cwd, 'testdata'));

    expect(res).toEqual({exists: true, isFile: false});
  });

  it('existing file', async () => {
    const res = await utils.checkPath(
      path.join(cwd, 'testdata', 'from_root.yaml')
    );

    expect(res).toEqual({exists: true, isFile: true});
  });
});
