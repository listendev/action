export function parse(flags: string): string[] {
  flags = flags.trim();
  if (flags === '') {
    return [];
  }

  return flags.split(/\s+/);
}
