import { useState } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useTranslate, type TranslationKey } from "../lib/i18n";
import { IconRocket, IconPlus, IconSearch, IconBell, IconSettings } from "./icons";
import { Logo } from "./Logo";

interface Step {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

const STEPS: Step[] = [
  { icon: IconRocket, titleKey: "tutorial.step1Title", bodyKey: "tutorial.step1Body" },
  { icon: IconPlus, titleKey: "tutorial.step2Title", bodyKey: "tutorial.step2Body" },
  { icon: IconSearch, titleKey: "tutorial.step3Title", bodyKey: "tutorial.step3Body" },
  { icon: IconBell, titleKey: "tutorial.step4Title", bodyKey: "tutorial.step4Body" },
  { icon: IconSettings, titleKey: "tutorial.step5Title", bodyKey: "tutorial.step5Body" },
];

export function TutorialModal() {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);
  const t = useTranslate();

  async function finish() {
    if (closing) return;
    setClosing(true);
    try {
      if (user) {
        const updated = await api.patch("/auth/me", { onboarded: true });
        updateUser(updated as typeof user);
      }
    } catch {
      // I kdyz se ulozeni nezdari, nechceme uzivatele blokovat tutorialem navzdy
      if (user) updateUser({ ...user, onboarded: true });
    }
  }

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 sm:px-6 z-[60]">
      <div className="bg-panel border border-border rounded-2xl p-6 w-full max-w-sm card-shadow animate-fade-in">
        <div className="flex items-center justify-center mb-5">
          <Logo size={24} />
        </div>

        <div className="w-14 h-14 rounded-full bg-teal/10 text-teal flex items-center justify-center mx-auto mb-4">
          <Icon size={24} />
        </div>

        <h2 className="font-display text-lg font-semibold text-center mb-2">{t(current.titleKey)}</h2>
        <p className="text-sm text-muted text-center mb-6">{t(current.bodyKey)}</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-teal" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button onClick={finish} className="text-sm text-muted hover:text-text transition-colors">
            {t("tutorial.skip")}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm border border-border rounded-lg px-3 py-1.5 text-muted hover:text-text transition-colors"
              >
                {t("tutorial.back")}
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              disabled={closing}
              className="btn-primary text-sm rounded-lg px-4 py-1.5 transition-all disabled:opacity-60"
            >
              {isLast ? t("tutorial.finish") : t("tutorial.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
