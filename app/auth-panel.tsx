"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase";
import { ProjectForm } from "./project-form";
import {
  ProfileEditor,
  type EditableProfile,
} from "./profile-editor";

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

type PersonOption = EditableProfile;

export function AuthPanel({
  open,
  onClose,
  onSessionChange,
}: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [claimedProfile, setClaimedProfile] = useState<PersonOption | null>(null);
  const [profileQuery, setProfileQuery] = useState("");
  const [profileResults, setProfileResults] = useState<PersonOption[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [editingCohort, setEditingCohort] = useState(false);
  const [cohortDraft, setCohortDraft] = useState("");
  const [savingCohort, setSavingCohort] = useState(false);

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
    if (!session) return;

    let active = true;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    const userId = session.user.id;

    async function loadClaimedProfile() {
      setProfileLoading(true);
      const { data: claim, error: claimError } = await client
        .from("profile_claims")
        .select("person_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!active) return;
      if (claimError) {
        setError("Não foi possível consultar seu perfil agora.");
        setProfileLoading(false);
        return;
      }

      if (claim) {
        const { data: person } = await client
          .from("people")
          .select("id, name, cohort, bio, personal_url")
          .eq("id", claim.person_id)
          .single();

        if (active && person) {
          setClaimedProfile(person);
          setCohortDraft(person.cohort?.toString() ?? "");
        }
      }
      if (active) setProfileLoading(false);
    }

    void loadClaimedProfile();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || claimedProfile || profileQuery.trim().length < 2) return;

    let active = true;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    const timer = window.setTimeout(async () => {
      setProfileLoading(true);
      const safeQuery = profileQuery.trim().replace(/[%_]/g, "");
      const { data, error: searchError } = await client
        .from("people")
        .select("id, name, cohort")
        .ilike("name", `%${safeQuery}%`)
        .order("name")
        .limit(8);

      if (!active) return;
      setProfileLoading(false);
      if (searchError) {
        setError("Não foi possível buscar os perfis agora.");
        return;
      }
      setProfileResults(data ?? []);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [session, claimedProfile, profileQuery]);

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
    setClaimedProfile(null);
    setProfileResults([]);
    setProfileQuery("");
    setMessage("Você saiu da sua conta.");
  }

  async function claimProfile(person: PersonOption) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setClaimingId(person.id);
    setError("");
    setMessage("");
    const { data, error: claimError } = await supabase.rpc("claim_profile", {
      target_person_id: person.id,
    });
    setClaimingId(null);

    if (claimError) {
      setError(
        claimError.message.includes("usp")
          ? "Sua conta precisa usar um e-mail USP confirmado."
          : "Não foi possível reivindicar este perfil agora.",
      );
      return;
    }

    if (data === "contestacao_enviada") {
      setMessage(
        "Este perfil já estava associado. Seu pedido foi enviado para análise manual.",
      );
      return;
    }

    if (
      data === "perfil_associado" ||
      data === "perfil_ja_associado_a_voce"
    ) {
      setClaimedProfile(person);
      setCohortDraft(person.cohort?.toString() ?? "");
      setProfileResults([]);
      setProfileQuery("");
      setMessage("Perfil associado à sua conta com sucesso.");
      return;
    }

    setMessage("Solicitação registrada.");
  }

  async function saveCohort(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!claimedProfile) return;

    const cohort = Number(cohortDraft);
    if (!Number.isInteger(cohort) || cohort < 1 || cohort > 99) {
      setError("Informe uma turma entre T1 e T99.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSavingCohort(true);
    setError("");
    setMessage("");
    const { data, error: updateError } = await supabase
      .from("people")
      .update({ cohort })
      .eq("id", claimedProfile.id)
      .select("id, name, cohort")
      .single();
    setSavingCohort(false);

    if (updateError || !data) {
      setError("Não foi possível atualizar a turma.");
      return;
    }

    setClaimedProfile(data);
    setEditingCohort(false);
    setMessage("Turma atualizada e registrada no histórico de edições.");
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
            <div className="profile-claim">
              <h3>Seu perfil público</h3>
              {claimedProfile ? (
                <>
                  <div className="claimed-profile">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>{claimedProfile.name}</strong>
                      <small>
                        {claimedProfile.cohort
                          ? `Turma T${claimedProfile.cohort}`
                          : "Turma não informada"}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="profile-edit-button"
                      onClick={() => setEditingCohort(!editingCohort)}
                    >
                      {editingCohort ? "Cancelar" : "Editar turma"}
                    </button>
                  </div>
                  {editingCohort && (
                    <form className="cohort-form" onSubmit={saveCohort}>
                      <label htmlFor="cohort-number">Número da turma</label>
                      <div>
                        <span>T</span>
                        <input
                          id="cohort-number"
                          type="number"
                          min="1"
                          max="99"
                          step="1"
                          value={cohortDraft}
                          onChange={(event) =>
                            setCohortDraft(event.target.value)
                          }
                          required
                        />
                        <button type="submit" disabled={savingCohort}>
                          {savingCohort ? "Salvando…" : "Salvar"}
                        </button>
                      </div>
                      <small>
                        Use sua turma de origem, mesmo que tenha mudado depois.
                      </small>
                    </form>
                  )}
                  <ProfileEditor
                    person={claimedProfile}
                    onUpdated={setClaimedProfile}
                  />
                </>
              ) : (
                <>
                  <p>
                    Busque seu nome para ligar esta conta USP à sua identidade.
                  </p>
                  <label htmlFor="profile-search">Nome completo</label>
                  <input
                    id="profile-search"
                    type="search"
                    value={profileQuery}
                    onChange={(event) => setProfileQuery(event.target.value)}
                    placeholder="Digite pelo menos duas letras"
                    autoComplete="off"
                  />
                  {profileLoading && (
                    <p className="profile-search-status">Buscando…</p>
                  )}
                  {!profileLoading &&
                    profileQuery.trim().length >= 2 &&
                    profileResults.length === 0 && (
                      <p className="profile-search-status">
                        Nenhum perfil encontrado.
                      </p>
                    )}
                  {profileResults.length > 0 && (
                    <div className="profile-results">
                      {profileResults.map((person) => (
                        <div className="profile-result" key={person.id}>
                          <div>
                            <strong>{person.name}</strong>
                            <small>
                              {person.cohort
                                ? `Turma T${person.cohort}`
                                : "Turma não informada"}
                            </small>
                          </div>
                          <button
                            type="button"
                            onClick={() => claimProfile(person)}
                            disabled={claimingId === person.id}
                          >
                            {claimingId === person.id
                              ? "Associando…"
                              : "Este é meu perfil"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {claimedProfile && <ProjectForm personId={claimedProfile.id} />}
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
