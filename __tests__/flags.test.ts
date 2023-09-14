import * as flags from '../src/flags';

describe('flags', () => {
  it('empty', () => {
    const input = "";
    expect(flags.parse(input)).toEqual([]);
  });

  it('parses singe bool flag', () => {
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
      '123',
    ]);
  });

  it('parses multiple flags with double quotes', () => {
    const input =
      '--debug-options -r "gh-pull-check, gh-pull-comment" --gh-pull-id 123';
    expect(flags.parse(input)).toEqual([
      '--debug-options',
      '-r',
      'gh-pull-check, gh-pull-comment',
      '--gh-pull-id',
      '123',
    ]);
  });

  it('parses multiple flags with single quotes', () => {
    const input =
      "--debug-options --npm-registry 'https://registry.npmjs.org'";
    expect(flags.parse(input)).toEqual([
      '--debug-options',
      '--npm-registry',
      'https://registry.npmjs.org',
    ]);
  });

  it('parses flag with nested quotes', () => {
    const input =
      "--select '(@.severity == \"high\")'";
    expect(flags.parse(input)).toEqual([
      '--select',
      '(@.severity == "high")',
    ]);
  });

  it('parses short flag (value with quotes)', () => {
    const input =
      "-s '(@.severity == \"high\")'";
    expect(flags.parse(input)).toEqual([
      '-s',
      '(@.severity == "high")',
    ]);
  });

  it('parses short flag with equal', () => {
    const input =
      `-s='@.severity == "high"'`;
    expect(flags.parse(input)).toEqual([
      '-s',
      `@.severity == "high"`,
    ]);
  });

  it('parses short flag', () => {
    const input =
      '-r=gh-pull-check,gh-pull-comment';
    expect(flags.parse(input)).toEqual([
      '-r',
      'gh-pull-check,gh-pull-comment'
    ]);
  });

  it('parses flag with equal and nested quotes', () => {
    const input =
      `--select='"network" in @.categories' --json`;
    expect(flags.parse(input)).toEqual([
      '--select',
      `"network" in @.categories`,
      '--json',
    ]);
  });

  it('complex', () => {
    const input =
      "--select '(@.file =~ \"^dynamic\" && \"process\" in @.categories)' --json -r=gh-pull-check,gh-pull-comment --gh-pull-id 123";
    expect(flags.parse(input)).toEqual([
      "--select",
      "(@.file =~ \"^dynamic\" && \"process\" in @.categories)",
      "--json",
      "-r",
      "gh-pull-check,gh-pull-comment",
      "--gh-pull-id",
      "123"
    ]);
  });
});