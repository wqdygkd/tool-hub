export const LAUNCH_OPTION_FORM_FIELDS = {
  disableSafetyChecks: false,
  disableCors: false,
  enableCustomArgs: false,
  customArgs: '',
};

export function syncLaunchOptionsForm(form, launchOptions) {
  const opts = launchOptions || {};
  form.disableSafetyChecks = Boolean(opts.disableSafetyChecks);
  form.disableCors = Boolean(opts.disableCors);
  form.enableCustomArgs = Boolean(opts.customArgs);
  form.customArgs = opts.customArgs || '';
}

export function buildLaunchOptionsPayload(form) {
  return {
    disableSafetyChecks: form.disableSafetyChecks,
    disableCors: form.disableCors,
    customArgs: form.enableCustomArgs ? form.customArgs.trim() : '',
  };
}

export function hasLaunchOptions(metadata) {
  const opts = metadata?.launchOptions;
  if (!opts) return false;
  return Boolean(opts.disableSafetyChecks || opts.disableCors || opts.customArgs);
}
