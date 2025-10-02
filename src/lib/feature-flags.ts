const parseBooleanFlag = (value: string | undefined, fallback: boolean) => {
  if (typeof value === "undefined") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

export const featureFlags = {
  subjectsRead: parseBooleanFlag(process.env.NEXT_PUBLIC_FF_SUBJECTS_READ, false),
  subjectsWrite: parseBooleanFlag(process.env.NEXT_PUBLIC_FF_SUBJECTS_WRITE, true)
};

