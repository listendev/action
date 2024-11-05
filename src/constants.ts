import * as core from '@actions/core';

/**
 * EavesdropMustRunAlone is true when the eavesdrop tool is the only one that must run.
 */
export const EavesdropMustRunAlone: boolean = core.getInput('ci') == 'only';

/**
 * EavesdropMustRun is true when the eavesdrop tool will run, either alone or together with other tools.
 */
export const EavesdropMustRun: boolean =
  core.getInput('ci') == 'true' || EavesdropMustRunAlone;

/**
 * TagMap maps the lstn tags to the eavesdrop tool versions.
 */
export const TagMap: Record<string, string> = {
  'v0.16.0': 'v0.8',
  'v0.15.0': 'v0.6',
  'v0.14.0': 'v0.4',
  'v0.13.2': 'v0.3',
  'v0.13.1': 'v0.1',
  'v0.13.0': 'v0.1'
} as const;
