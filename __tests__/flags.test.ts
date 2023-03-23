import * as flags from '../src/flags';

describe('flags', () => {
  it('parses singe flag', () => {
    const input = '--debug-options';
    expect(flags.parse(input)).toEqual(['--debug-options']);
  });

  it('parses multiple flags', () => {
    const input =
      '--debug-options -r gh-pull-check,gh-pull-comment --gh-pull-id 123';
    expect(flags.parse(input)).toEqual([
      '--debug-options',
      '-r',
      'gh-pull-check,gh-pull-comment',
      '--gh-pull-id',
      '123'
    ]);
  });
});
