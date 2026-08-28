import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useTranslate } from "../lib/i18n";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { SearchBar } from "./SearchBar";
import { NotificationsBell } from "./NotificationsBell";
import { IconSettings, IconLogout, IconSearch, IconX } from "./icons";

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const t = useTranslate();
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/prihlaseni");
  }

  return (
    <div className="min-h-screen bg-base text-text">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          <Link to="/" className="hover:opacity-90 transition-opacity shrink-0">
            <Logo size={24} />
          </Link>

          {user && <SearchBar />}

          {user && (
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                onClick={() => setMobileSearchOpen((v) => !v)}
                aria-label={t("search.placeholder")}
                className="w-9 h-9 rounded-full border border-border hover:border-teal-dim text-muted hover:text-text flex items-center justify-center transition-colors md:hidden"
              >
                {mobileSearchOpen ? <IconX size={16} /> : <IconSearch size={15} />}
              </button>
              <NotificationsBell />
              <Link
                to="/nastaveni"
                title={t("nav.settings")}
                className="w-9 h-9 rounded-full border border-border hover:border-teal-dim text-muted hover:text-text flex items-center justify-center transition-colors"
              >
                <IconSettings size={16} />
              </Link>
              <Link to="/profil" className="rounded-full ring-1 ring-border hover:ring-teal-dim transition-all">
                <Avatar value={user.avatar} size={34} />
              </Link>
              <span className="text-sm text-muted hidden lg:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
                className="w-9 h-9 rounded-full border border-border hover:border-danger/50 text-muted hover:text-danger flex items-center justify-center transition-colors"
              >
                <IconLogout size={16} />
              </button>
            </div>
          )}
        </div>

        {user && mobileSearchOpen && (
          <div className="md:hidden px-4 sm:px-6 pb-3 -mt-1">
            <SearchBar forceVisible onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
