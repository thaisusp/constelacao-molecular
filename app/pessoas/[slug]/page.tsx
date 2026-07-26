"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../../supabase";

type PublicProfile = {
  name: string;
  cohort: number | null;
  bio: string | null;
  personal_url: string | null;
};

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let active = true;

    async function loadProfile() {
      const { data, error } = await client
        .from("people")
        .select("name, cohort, bio, personal_url")
        .eq("slug", params.slug)
        .eq("status", "publicado")
        .maybeSingle();

      if (!active) return;
      setProfile(data);
      setNotFound(Boolean(error) || !data);
      setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [params.slug]);

  return (
    <main className="profile-page">
      <div className="sky" aria-hidden="true" />
      <header className="profile-header">
        <Link href="/">← Voltar para a constelação</Link>
        <span>Constelação Molecular</span>
      </header>

      {loading ? (
        <section className="profile-state">Carregando perfil…</section>
      ) : notFound || !profile ? (
        <section className="profile-state">
          <p className="eyebrow"><span>✦</span> Ponto não encontrado</p>
          <h1>Este perfil não está disponível.</h1>
          <Link className="secondary-button" href="/">Voltar ao início</Link>
        </section>
      ) : (
        <section className="public-profile">
          <p className="eyebrow"><span>✦</span> Pessoa da comunidade CM</p>
          <div className="profile-title">
            <div className="profile-avatar" aria-hidden="true">
              {profile.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <h1>{profile.name}</h1>
              <p>
                {profile.cohort
                  ? `Turma T${profile.cohort}`
                  : "Turma não informada"}
              </p>
            </div>
          </div>

          <div className="profile-information">
            <article>
              <span>Sobre</span>
              <p>
                {profile.bio ??
                  "Este perfil ainda não adicionou uma apresentação."}
              </p>
            </article>
            <article>
              <span>Pesquisa</span>
              <p>Os projetos de pesquisa aparecerão aqui quando forem cadastrados.</p>
            </article>
          </div>

          {profile.personal_url && (
            <div className="profile-links">
              <a href={profile.personal_url} target="_blank" rel="noreferrer">
                Página pessoal ↗
              </a>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
