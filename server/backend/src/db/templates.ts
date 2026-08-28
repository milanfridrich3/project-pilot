export interface TemplateDefinition {
  key: string;
  label: { cs: string; en: string };
  milestones: { cs: string[]; en: string[] };
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    key: "blank",
    label: { cs: "Prázdný projekt", en: "Blank project" },
    milestones: { cs: [], en: [] },
  },
  {
    key: "presentation",
    label: { cs: "Prezentační projekt", en: "Presentation" },
    milestones: {
      cs: ["Research", "Tvorba obsahu", "Design", "Revize", "Prezentace"],
      en: ["Research", "Content creation", "Design", "Review", "Presentation"],
    },
  },
  {
    key: "research",
    label: { cs: "Výzkumný projekt", en: "Research" },
    milestones: {
      cs: ["Definice cíle", "Sběr informací", "Analýza dat", "Tvorba výstupu", "Prezentace výsledků"],
      en: ["Define objective", "Gather information", "Analyze data", "Produce output", "Present results"],
    },
  },
  {
    key: "school_assignment",
    label: { cs: "Školní úkol", en: "School assignment" },
    milestones: {
      cs: ["Zadání a plán", "Zpracování", "Kontrola", "Odevzdání"],
      en: ["Assignment and plan", "Work in progress", "Review", "Submission"],
    },
  },
  {
    key: "startup",
    label: { cs: "Startup", en: "Startup" },
    milestones: {
      cs: ["Nápad a validace", "MVP", "Zpětná vazba", "Spuštění"],
      en: ["Idea and validation", "MVP", "Feedback", "Launch"],
    },
  },
  {
    key: "event",
    label: { cs: "Akce", en: "Event" },
    milestones: {
      cs: ["Plánování", "Pozvánky a propagace", "Příprava na místě", "Realizace akce", "Vyhodnocení"],
      en: ["Planning", "Invitations and promotion", "On-site preparation", "Event day", "Wrap-up"],
    },
  },
  {
    key: "personal",
    label: { cs: "Osobní projekt", en: "Personal project" },
    milestones: {
      cs: ["Nápad", "Rozjezd", "Pravidelný postup", "Dokončení"],
      en: ["Idea", "Getting started", "Steady progress", "Completion"],
    },
  },
];

export type TemplateLanguage = "cs" | "en";

export function getTemplateLabel(t: TemplateDefinition, lang: TemplateLanguage): string {
  return t.label[lang] || t.label.en;
}

export function getTemplateMilestones(t: TemplateDefinition, lang: TemplateLanguage): string[] {
  return t.milestones[lang] || t.milestones.en;
}
