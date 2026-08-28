import type { ActivityEntry } from "../lib/types";
import { useTranslate, type TranslationKey } from "../lib/i18n";
import { IconClockHistory } from "./icons";

interface ActivityTimelineProps {
  entries: ActivityEntry[];
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  const t = useTranslate();

  function describe(entry: ActivityEntry): string {
    const p = entry.payload || {};
    const key = `activity.${entry.type}` as TranslationKey;
    let text = t(key);
    if (text === key) return "";
    text = text.replace("{actor}", entry.actorName || "—");
    if (p.title) text = text.replace("{title}", String(p.title));
    if (p.userName) text = text.replace("{userName}", String(p.userName));
    return text;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-muted italic">{t("project.activityEmpty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        const text = describe(entry);
        if (!text) return null;
        return (
          <li key={entry.id} className="flex items-start gap-2.5 text-sm">
            <IconClockHistory size={13} className="text-muted mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-text">{text}</span>
              <span className="font-data text-[10px] text-muted ml-2">{entry.createdAt}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
