"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "./supabase";

export type EditableProfile = {
  id: string;
  name: string;
  cohort: number | null;
  bio?: string | null;
  personal_url?: string | null;
};

type ProfileEditorProps = {
  person: EditableProfile;
  onUpdated: (person: EditableProfile) => void;
};

export function ProfileEditor({ person, onUpdated }: ProfileEditorProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [bio, setBio] = useState(person.bio ?? "");
  const [personalUrl, setPersonalUrl] = useState(person.personal_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (bio.length > 500) {
      setError("A apresentação deve ter no máximo 500 caracteres.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSaving(true);
    const { data, error: updateError } = await supabase
      .from("people")
      .update({
        name: name.trim(),
        bio: bio.trim() || null,
        personal_url: personalUrl.trim() || null,
      })
      .eq("id", person.id)
      .select("id, name, cohort, bio, personal_url")
      .single();
    setSaving(false);

    if (updateError || !data) {
      setError("Não foi possível atualizar o perfil.");
      return;
    }

    onUpdated(data);
    setOpen(false);
    setMessage("Informações do perfil atualizadas.");
  }

  return (
    <div className="profile-details-editor">
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? "Cancelar" : "Editar informações do perfil"}
      </button>
      {open && (
        <form onSubmit={saveProfile}>
          <label htmlFor="public-name">Nome público</label>
          <input
            id="public-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label htmlFor="profile-bio">Apresentação</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Conte brevemente sobre sua trajetória e seus interesses."
          />
          <small>{bio.length}/500 caracteres</small>
          <label htmlFor="personal-url">Link pessoal</label>
          <input
            id="personal-url"
            type="url"
            value={personalUrl}
            onChange={(event) => setPersonalUrl(event.target.value)}
            placeholder="https://"
          />
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Salvar informações"}
          </button>
        </form>
      )}
      {message && <p className="auth-message">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
