export const requestSubmitIfDirty = (
  form: {requestSubmit: () => void},
  field: {defaultValue: string; value: string},
): void => {
  if (field.value === field.defaultValue) return;
  form.requestSubmit();
};
