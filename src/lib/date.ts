export const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(date);
};

export const isDueToday = (value: string) => {
  const today = new Date();
  const date = new Date(value);
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return normalizedDate <= normalizedToday;
};

export const formatTime = (value: string | null) => {
  if (!value) return "No reminder";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};
