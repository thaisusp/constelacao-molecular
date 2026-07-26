"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../../supabase";

type PublicProfile = {
  id: string;
  name: string;
  cohort: number | null;
  bio: string | null;
  personal_url: string | null;
};

type PublicProject = {
  id: string;
  title: string;
  level: string;
  summary: string | null;
  institution: string | null;
  project_url: string | null;
  areas: string[];
};

export default function PublicProfilePage() {
  const params = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [projects, setProjects] = useState<PublicProject[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let active = true;

    async function loadProfile() {
      const { data, error } = await client
        .from("people")
        .select("id, name, cohort, bio, personal_url")
        .eq("slug", params.slug)
        .eq("status", "publicado")
        .maybeSingle();

      if (!active) return;
      setProfile(data);
      setNotFound(Boolean(error) || !data);
      if (data) {
        const { data: projectRows } = await client
          .from("projects")
          .select(
            "id, title, level, summary, institution, project_url, created_at",
          )
          .eq("owner_person_id", data.id)
          .eq("status", "publicado")
          .order("created_at", { ascending: false });

        const projectIds = (projectRows ?? []).map((project) => project.id);
        let areaLinks: Array<{
          project_id: string;
          sub_area_id: string | null;
          custom_area_name: string | null;
        }> = [];
        if (projectIds.length) {
          const { data: links } = await client
            .from("project_areas")
            .select("project_id, sub_area_id, custom_area_name")
            .in("project_id", projectIds);
          areaLinks = links ?? [];
        }

        const subAreaIds = areaLinks
          .map((area) => area.sub_area_id)
          .filter((id): id is string => id !== null);
        const { data: subAreaRows } = subAreaIds.length
          ? await client
              .from("sub_areas")
              .select("id, name")
              .in("id", subAreaIds)
          : { data: [] };
        const subAreaById = new Map(
          (subAreaRows ?? []).map((area) => [area.id, area.name]),
        );

        setProjects(
          (projectRows ?? []).map((project) => ({
            ...project,
            areas: areaLinks
              .filter((area) => area.project_id === project.id)
              .map(
                (area) =>
                  area.custom_area_name ??
                  (area.sub_area_id
                    ? subAreaById.get(area.sub_area_id)
                    : undefined),
              )
              .filter((name): name is string => Boolean(name)),
          })),
        );
      }
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
              <p>
                {projects.length
                  ? `${projects.length} projeto${projects.length === 1 ? "" : "s"} cadastrado${projects.length === 1 ? "" : "s"}.`
                  : "Os projetos de pesquisa aparecerão aqui quando forem cadastrados."}
              </p>
            </article>
          </div>

          {projects.length > 0 && (
            <section className="profile-projects">
              <p className="eyebrow"><span>✦</span> Projetos de pesquisa</p>
              <div>
                {projects.map((project) => (
                  <article key={project.id}>
                    <span>{project.level}</span>
                    <h2>{project.title}</h2>
                    {project.summary && <p>{project.summary}</p>}
                    {project.institution && (
                      <small>{project.institution}</small>
                    )}
                    <div>
                      {project.areas.map((area) => (
                        <span className="tag" key={area}>{area}</span>
                      ))}
                    </div>
                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Acessar projeto ↗
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

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
