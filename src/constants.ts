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
