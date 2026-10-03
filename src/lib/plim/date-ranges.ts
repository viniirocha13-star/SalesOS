import { endOfDay, startOfDay, subDays } from "date-fns";

export type PlimResultsPeriod = "today" | "yesterday" | "7d" | "30d" | "custom";

export function resolvePlimPeriod(
  period: PlimResultsPeriod,
  customFrom?: string | null,
  customTo?: string | null,
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  switch (period) {
    case "today":
      return { from: todayStart, to: todayEnd, label: "Hoje" };
    case "yesterday": {
      const y = subDays(todayStart, 1);
      return { from: startOfDay(y), to: endOfDay(y), label: "Ontem" };
    }
    case "7d":
      return { from: subDays(todayStart, 6), to: todayEnd, label: "Últimos 7 dias" };
    case "30d":
      return { from: subDays(todayStart, 29), to: todayEnd, label: "Últimos 30 dias" };
    case "custom": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : subDays(todayStart, 6);
      const to = customTo ? endOfDay(new Date(customTo)) : todayEnd;
      return { from, to, label: "Personalizado" };
    }
    default:
      return { from: todayStart, to: todayEnd, label: "Hoje" };
  }
}
