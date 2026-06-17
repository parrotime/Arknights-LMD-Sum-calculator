type DateParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

const getBeijingDateParts = (date = new Date()): DateParts => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

export const isCEOpenInBeijing = (date = new Date()): boolean => {
  const parts = getBeijingDateParts(date);
  const beijingTime = new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  beijingTime.setHours(beijingTime.getHours() - 4);

  return [0, 2, 4, 6].includes(beijingTime.getDay());
};
