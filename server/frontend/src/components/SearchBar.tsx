import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { SearchResult } from "../lib/types";
import { useTranslate } from "../lib/i18n";
import { IconSearch, IconLock } from "./icons";
import { Avatar } from "./Avatar";

interface SearchBarProps {
  forceVisible?: boolean;
  onNavigate?: () => void;
}

type SearchFilter = "all" | "users" | "projects" | "tasks" | "comments";

export function SearchBar({ forceVisible, onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const t = useTranslate();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      api
        .get<SearchResult>(`/users/search?q=${encodeURIComponent(query.trim())}&type=${filter}`)
        .then((data) => {
          setResults(data);
          setOpen(true);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [query, filter]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToProfile(id: number) {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(`/profil/${id}`);
  }

  function goToProject(id: number) {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(`/projekty/${id}`);
  }

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.projects.length > 0 ||
      results.tasks.length > 0 ||
      results.comments.length > 0);

  const filters: { key: SearchFilter; labelKey: "search.filterAll" | "search.people" | "search.projects" | "search.tasks" | "search.comments" }[] =
    [
      { key: "all", labelKey: "search.filterAll" },
      { key: "users", labelKey: "search.people" },
      { key: "projects", labelKey: "search.projects" },
      { key: "tasks", labelKey: "search.tasks" },
      { key: "comments", labelKey: "search.comments" },
    ];

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${forceVisible ? "block" : "hidden md:block md:max-w-xs"}`}
    >
      <div className="relative">
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={t("search.placeholder")}
          className="w-full bg-panel border border-border rounded-full pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-teal focus:ring-4 focus:ring-teal/10 transition-shadow"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div
          className={`fixed inset-x-4 sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:left-0 w-auto sm:w-[min(22rem,calc(100vw-2rem))] bg-panel border border-border rounded-xl card-shadow overflow-hidden z-50 ${
            forceVisible ? "top-[4.75rem]" : "top-16"
          }`}
        >
          <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto border-b border-border">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
                  filter === f.key ? "bg-teal text-white" : "text-muted hover:text-text"
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!hasResults && (
              <p className="text-sm text-muted p-4 text-center">{t("search.noResults")}</p>
            )}
            {results && results.users.length > 0 && (
              <div className="py-1">
                <p className="text-[10px] uppercase tracking-wide text-muted px-3 py-1.5">
                  {t("search.people")}
                </p>
                {results.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => goToProfile(u.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-panel-raised transition-colors text-left"
                  >
                    <Avatar value={u.avatar} size={28} />
                    <span className="text-sm text-text flex-1 truncate">{u.name}</span>
                    {u.isPrivate && <IconLock size={13} className="text-muted" />}
                  </button>
                ))}
              </div>
            )}
            {results && results.projects.length > 0 && (
              <div className="py-1 border-t border-border">
                <p className="text-[10px] uppercase tracking-wide text-muted px-3 py-1.5">
                  {t("search.projects")}
                </p>
                {results.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => goToProject(p.id)}
                    className="w-full flex flex-col px-3 py-2 hover:bg-panel-raised transition-colors text-left"
                  >
                    <span className="text-sm text-text truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.tasks.length > 0 && (
              <div className="py-1 border-t border-border">
                <p className="text-[10px] uppercase tracking-wide text-muted px-3 py-1.5">
                  {t("search.tasks")}
                </p>
                {results.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => goToProject(task.projectId)}
                    className="w-full flex flex-col px-3 py-2 hover:bg-panel-raised transition-colors text-left"
                  >
                    <span className="text-sm text-text truncate">{task.title}</span>
                    <span className="text-[11px] text-muted truncate">{task.projectName}</span>
                  </button>
                ))}
              </div>
            )}
            {results && results.comments.length > 0 && (
              <div className="py-1 border-t border-border">
                <p className="text-[10px] uppercase tracking-wide text-muted px-3 py-1.5">
                  {t("search.comments")}
                </p>
                {results.comments.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToProject(c.projectId)}
                    className="w-full flex flex-col px-3 py-2 hover:bg-panel-raised transition-colors text-left"
                  >
                    <span className="text-sm text-text truncate">{c.body}</span>
                    <span className="text-[11px] text-muted truncate">{c.taskTitle}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
