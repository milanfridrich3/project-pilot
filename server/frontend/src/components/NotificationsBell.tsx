import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AppNotification } from "../lib/types";
import { useTranslate } from "../lib/i18n";
import { IconBell, IconCheck, IconX } from "./icons";

export function NotificationsBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const t = useTranslate();

  function load() {
    api.get<AppNotification[]>("/notifications").then(setItems).catch(() => {});
  }

  useEffect(() => {
    load();
    // Realtime pres SSE - jakmile prijde udalost, jen dotahneme cerstvy
    // seznam (jednodussi a spolehlivejsi nez rucne slucovat diffy).
    // EventSource se pri vypadku spojeni sam automaticky znovu pripoji.
    const token = localStorage.getItem("pilot_token");
    let source: EventSource | null = null;
    if (token) {
      source = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
      source.onmessage = () => load();
    }
    // Polling jako zalozni mechanismus, kdyby SSE spojeni z nejakeho duvodu
    // (napr. proxy bez podpory) nefungovalo.
    const interval = setInterval(load, 30000);
    return () => {
      clearInterval(interval);
      source?.close();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.isRead).length;

  async function markAllRead() {
    await api.post("/notifications/read-all");
    load();
  }

  async function handleAccept(fromUserId: number, notifId: string) {
    setBusyId(notifId);
    try {
      await api.post(`/follows/requests/${fromUserId}/accept`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(fromUserId: number, notifId: string) {
    setBusyId(notifId);
    try {
      await api.post(`/follows/requests/${fromUserId}/decline`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAcceptJoinRequest(requestId: number, notifId: string) {
    setBusyId(notifId);
    try {
      await api.post(`/projects/join-requests/${requestId}/accept`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeclineJoinRequest(requestId: number, notifId: string) {
    setBusyId(notifId);
    try {
      await api.post(`/projects/join-requests/${requestId}/decline`);
      load();
    } finally {
      setBusyId(null);
    }
  }

  function describe(n: AppNotification): string {
    switch (n.type) {
      case "follow_request":
        return t("notif.followRequest").replace("{name}", n.payload.fromUserName || "");
      case "follow_accepted":
        return t("notif.followAccepted").replace("{name}", n.payload.fromUserName || "");
      case "new_follower":
        return t("notif.newFollower").replace("{name}", n.payload.fromUserName || "");
      case "task_due":
        return t("notif.taskDue").replace("{task}", n.payload.taskTitle || "");
      case "verify_email":
        return t("notif.verifyEmail");
      case "join_request":
        return t("notif.joinRequest")
          .replace("{name}", n.payload.fromUserName || "")
          .replace("{project}", n.payload.projectName || "");
      case "join_request_accepted":
        return t("notif.joinRequestAccepted").replace("{project}", n.payload.projectName || "");
      case "join_request_rejected":
        return t("notif.joinRequestRejected").replace("{project}", n.payload.projectName || "");
      case "task_assigned":
        return t("notif.taskAssigned")
          .replace("{name}", n.payload.fromUserName || "")
          .replace("{task}", n.payload.taskTitle || "");
      case "task_comment":
        return t("notif.taskComment")
          .replace("{name}", n.payload.fromUserName || "")
          .replace("{task}", n.payload.taskTitle || "");
      case "milestone_due":
        return t("notif.milestoneDue").replace("{milestone}", n.payload.milestoneTitle || "");
      case "important_task_completed":
        return t("notif.importantTaskCompleted")
          .replace("{name}", n.payload.fromUserName || "")
          .replace("{task}", n.payload.taskTitle || "");
      default:
        return "";
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notif.title")}
        className="relative w-9 h-9 rounded-full border border-border hover:border-teal-dim text-muted hover:text-text flex items-center justify-center transition-colors"
      >
        <IconBell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 w-auto sm:w-[min(20rem,calc(100vw-2rem))] bg-panel border border-border rounded-xl card-shadow overflow-hidden z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
            <span className="text-sm font-medium text-text">{t("notif.title")}</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-teal hover:text-teal-dim">
                {t("notif.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-muted p-4 text-center">{t("notif.empty")}</p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2.5 border-b border-border last:border-b-0 ${
                  !n.isRead ? "bg-panel-raised" : ""
                }`}
              >
                <p className="text-sm text-text">{describe(n)}</p>
                <p className="text-[11px] text-muted mt-0.5">
                  {new Date(n.createdAt).toLocaleDateString()}
                </p>
                {n.type === "follow_request" && n.payload.fromUserId && (
                  <div className="flex gap-2 mt-2">
                    <button
                      disabled={busyId === n.id}
                      onClick={() => handleAccept(n.payload.fromUserId as number, n.id)}
                      className="flex items-center gap-1 text-xs bg-teal text-white rounded-lg px-2.5 py-1 hover:bg-teal-dim transition-colors disabled:opacity-60"
                    >
                      <IconCheck size={12} />
                      {t("notif.accept")}
                    </button>
                    <button
                      disabled={busyId === n.id}
                      onClick={() => handleDecline(n.payload.fromUserId as number, n.id)}
                      className="flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 py-1 text-muted hover:text-text transition-colors disabled:opacity-60"
                    >
                      <IconX size={12} />
                      {t("notif.decline")}
                    </button>
                  </div>
                )}
                {n.type === "join_request" && n.payload.requestId && (
                  <div className="flex gap-2 mt-2">
                    <button
                      disabled={busyId === n.id}
                      onClick={() => handleAcceptJoinRequest(n.payload.requestId as number, n.id)}
                      className="flex items-center gap-1 text-xs bg-teal text-white rounded-lg px-2.5 py-1 hover:bg-teal-dim transition-colors disabled:opacity-60"
                    >
                      <IconCheck size={12} />
                      {t("notif.accept")}
                    </button>
                    <button
                      disabled={busyId === n.id}
                      onClick={() => handleDeclineJoinRequest(n.payload.requestId as number, n.id)}
                      className="flex items-center gap-1 text-xs border border-border rounded-lg px-2.5 py-1 text-muted hover:text-text transition-colors disabled:opacity-60"
                    >
                      <IconX size={12} />
                      {t("notif.decline")}
                    </button>
                  </div>
                )}
                {(n.type === "join_request_accepted" || n.type === "join_request_rejected") &&
                  n.payload.projectId && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(`/projekty/${n.payload.projectId}`);
                      }}
                      className="text-xs text-teal hover:text-teal-dim mt-1.5"
                    >
                      {n.payload.projectName}
                    </button>
                  )}
                {n.type === "task_due" && n.payload.projectId && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate(`/projekty/${n.payload.projectId}`);
                    }}
                    className="text-xs text-teal hover:text-teal-dim mt-1.5"
                  >
                    {n.payload.projectName}
                  </button>
                )}
                {(n.type === "task_assigned" || n.type === "task_comment" || n.type === "milestone_due" ||
                  n.type === "important_task_completed") &&
                  n.payload.projectId && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(`/projekty/${n.payload.projectId}`);
                      }}
                      className="text-xs text-teal hover:text-teal-dim mt-1.5"
                    >
                      {n.payload.projectName}
                    </button>
                  )}
                {(n.type === "follow_accepted" || n.type === "new_follower") &&
                  n.payload.fromUserId && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(`/profil/${n.payload.fromUserId}`);
                      }}
                      className="text-xs text-teal hover:text-teal-dim mt-1.5"
                    >
                      {t("notif.viewProfile")}
                    </button>
                  )}
                {n.type === "verify_email" && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/overeni");
                    }}
                    className="text-xs text-teal hover:text-teal-dim mt-1.5"
                  >
                    {t("settings.verifyEmail")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
