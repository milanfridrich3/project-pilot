// Odesilani emailu pres Resend (https://resend.com). Pokud neni nastaveny
// RESEND_API_KEY, obsah se misto odeslani jen zaloguje do konzole (server-side
// log, nikdy ne do odpovedi API) - appka tak funguje i bez nastaveneho
// mailoveho poskytovatele, napr. pri lokalnim vyvoji nebo demu.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Project Pilot <onboarding@resend.dev>";

export type EmailLanguage = "cs" | "en";

async function sendEmail(to: string, subject: string, html: string, devLogLabel: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set - ${devLogLabel} for ${to}`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[email] Send failed (${response.status}): ${body}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Error while sending:", err);
    return false;
  }
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  language: EmailLanguage = "en"
): Promise<boolean> {
  const copy =
    language === "cs"
      ? {
          subject: "Ověřovací kód pro Project Pilot",
          heading: "Project Pilot",
          intro: "Tvůj ověřovací kód je:",
          note: "Kód platí 15 minut. Pokud jsi o něj nežádal/a, tento email ignoruj.",
        }
      : {
          subject: "Your Project Pilot verification code",
          heading: "Project Pilot",
          intro: "Your verification code is:",
          note: "This code is valid for 15 minutes. If you didn't request it, you can ignore this email.",
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#1E40AF;">${copy.heading}</h2>
      <p>${copy.intro}</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p style="color:#666; font-size: 13px;">${copy.note}</p>
    </div>
  `;

  return sendEmail(to, copy.subject, html, `verification code: ${code}`);
}

export async function sendWelcomeEmail(to: string, name: string, language: EmailLanguage = "en"): Promise<boolean> {
  const copy =
    language === "cs"
      ? {
          subject: "Vítej v Project Pilot",
          heading: "Vítej v Project Pilot, " + name + "!",
          body: "Díky, že sis založil/a účet. Než začneš, ověř prosím svou emailovou adresu v aplikaci — najdeš tam k tomu jednoduchý postup.",
          footer: "Ať se ti projekty daří!",
        }
      : {
          subject: "Welcome to Project Pilot",
          heading: "Welcome to Project Pilot, " + name + "!",
          body: "Thanks for creating an account. Before you get started, please verify your email address in the app — you'll find simple instructions there.",
          footer: "Happy building!",
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#1E40AF;">${copy.heading}</h2>
      <p>${copy.body}</p>
      <p style="color:#666; font-size: 13px;">${copy.footer}</p>
    </div>
  `;

  return sendEmail(to, copy.subject, html, "welcome email");
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  language: EmailLanguage = "en"
): Promise<boolean> {
  const copy =
    language === "cs"
      ? {
          subject: "Obnova hesla - Project Pilot",
          heading: "Project Pilot",
          intro: "Někdo (doufejme že ty) požádal o obnovu hesla. Tvůj kód je:",
          note: "Kód platí 15 minut. Pokud jsi o obnovu nežádal/a, tento email ignoruj - tvé heslo zůstane beze změny.",
        }
      : {
          subject: "Password reset - Project Pilot",
          heading: "Project Pilot",
          intro: "Someone (hopefully you) requested a password reset. Your code is:",
          note: "This code is valid for 15 minutes. If you didn't request this, you can ignore this email - your password stays unchanged.",
        };

  const html = `
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2 style="color:#1E40AF;">${copy.heading}</h2>
      <p>${copy.intro}</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p style="color:#666; font-size: 13px;">${copy.note}</p>
    </div>
  `;

  return sendEmail(to, copy.subject, html, `password reset code: ${code}`);
}

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
