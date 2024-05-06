// argusVersion maps the lstn tags to the argus ones.
const argusTags: Record<string, string> = {
  latest: 'v0.1',
  'v0.13.1': 'v0.1',
  'v0.13.0': 'v0.1'
} as const;

export function getArgusTag(lstnTag: string): string {
  if (!Object.keys(argusTags).includes(lstnTag)) {
    throw new Error(`missing argus version for lstn ${lstnTag}`);
  }

  return argusTags[lstnTag];
}
