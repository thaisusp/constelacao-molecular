"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";

const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
const INACTIVITY_MS = 2 * 60 * 60 * 1000;
const SESSION_STARTED_KEY = "cm-session-started-at";
const LAST_ACTIVITY_KEY = "cm-last-activity-at";
const USP_EMAIL = /^[^@\s]+@(?:[a-z0-9-]+\.)*usp\.br$/i;

type AuthPanelProps = {
  open: boolean;
  onClose: () => void;
  onSessionChange?: (session: Session | null) => void;
};

export function AuthPanel({
  open,
  onClose,
  onSessionChange,
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const setCurrentSession = (nextSession: Session | null) => {
      setSession(nextSession);
      onSessionChange?.(nextSession);

      if (nextSession) {
        const now = Date.now().toString();
        if (!localStorage.getItem(SESSION_STARTED_KEY)) {
          localStorage.setItem(SESSION_STARTED_KEY, now);
        }
        localStorage.setItem(LAST_ACTIVITY_KEY, now);
      } else {
        localStorage.removeItem(SESSION_STARTED_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      setCurrentSession(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setCurrentSession(nextSession),
    );

    return () => subscription.subscription.unsubscribe();
  }, [onSessionChange]);

  useEffect(() => {
    if (!session) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const recordActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    const checkTimeout = async () => {
      const now = Date.now();
      const startedAt = Number(localStorage.getItem(SESSION_STARTED_KEY) ?? now);
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? now);

      if (
        now - startedAt >= MAX_SESSION_MS ||
        now - lastActivity >= INACTIVITY_MS
      ) {
        await supabase.auth.signOut();
        setMessage("Sua sessão expirou. Solicite um novo link para entrar.");
      }
    };

    const events = ["click", "keydown", "scroll", "touchstart"];
    events.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true }),
    );
    const timer = window.setInterval(checkTimeout, 60_000);
    void checkTimeout();

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, recordActivity),
      );
      window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!USP_EMAIL.test(normalizedEmail)) {
      setError("Use um e-mail institucional da USP.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("A conexão com o Supabase ainda não foi configurada.");
      return;
    }

    setSending(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });
    setSending(false);

    if (signInError) {
      setError("Não foi possível enviar o link. Tente novamente em instantes.");
      return;
    }

    setMessage(
      "Link enviado. Ele pode ser usado uma vez e expira em 10 minutos.",
    );
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage("Você saiu da sua conta.");
  }

  if (!open) return null;

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="auth-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="auth-close" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <p className="eyebrow"><span>✦</span> Acesso da comunidade</p>
        <h2 id="auth-title">
          {session ? "Você está na constelação." : "Entre com seu e-mail USP."}
        </h2>

        {session ? (
          <div className="auth-session">
            <p>Conta conectada:</p>
            <strong>{session.user.email}</strong>
            <p className="auth-help">
              Sua sessão expira após 2 horas sem atividade ou 12 horas no total.
            </p>
            <button className="secondary-button" onClick={signOut}>
              Sair da conta
            </button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink}>
            <label htmlFor="usp-email">E-mail institucional</label>
            <input
              id="usp-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seunome@usp.br"
              autoComplete="email"
              required
            />
            <p className="auth-help">
              Enviaremos um link descartável, válido por 10 minutos.
            </p>
            <button className="primary-button" type="submit" disabled={sending}>
              {sending ? "Enviando…" : "Enviar link de acesso"}
            </button>
          </form>
        )}

        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
