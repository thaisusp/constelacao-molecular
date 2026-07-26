"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./auth-panel";
import { getSupabaseBrowserClient } from "./supabase";

const areas = [
  { name: "Computação", color: "#78a8ff", count: 34, x: 64, y: 26 },
  { name: "Biologia", color: "#72d4ad", count: 29, x: 29, y: 36 },
  { name: "Matemática", color: "#d89aff", count: 23, x: 73, y: 59 },
  { name: "Física", color: "#f1c76d", count: 21, x: 43, y: 67 },
  { name: "Química", color: "#ff9788", count: 18, x: 18, y: 69 },
  { name: "Humanidades", color: "#8bd6e6", count: 14, x: 48, y: 39 },
];

const disciplines = [
  { code: "MAC0508", name: "Introdução ao Processamento de Língua Natural", score: "4,7", load: "Alta" },
  { code: "MAE0302", name: "Probabilidade", score: "4,3", load: "Alta" },
  { code: "FLC0474", name: "Semântica", score: "4,8", load: "Média" },
];

function StarLogo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i className="orbit orbit-one" />
      <i className="orbit orbit-two" />
      <i className="star-core" />
      <i className="star-dot dot-one" />
      <i className="star-dot dot-two" />
    </span>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [peopleResults, setPeopleResults] = useState<
    Array<{ id: string; name: string; slug: string; cohort: number | null }>
  >([]);
  const [publicProjects, setPublicProjects] = useState<
    Array<{
      id: string;
      title: string;
      level: string;
      person: string;
      personSlug: string;
    }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState({
    people: 683,
    cohorts: 35,
    projects: 0,
    macroAreas: 13,
    subAreas: 0,
    evaluations: 0,
  });
  const handleSessionChange = useCallback(
    (nextSession: Session | null) => setSession(nextSession),
    [],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    async function loadStats() {
      const [
        peopleResponse,
        projectsResponse,
        macroAreasResponse,
        subAreasResponse,
        evaluationsResponse,
        recentProjectsResponse,
      ] = await Promise.all([
        client.from("people").select("cohort"),
        client.from("projects").select("*", { count: "exact", head: true }),
        client
          .from("macro_areas")
          .select("*", { count: "exact", head: true }),
        client.from("sub_areas").select("*", { count: "exact", head: true }),
        client
          .from("course_evaluations")
          .select("*", { count: "exact", head: true }),
        client
          .from("projects")
          .select("id, title, level, owner_person_id")
          .eq("status", "publicado")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const cohorts = new Set(
        (peopleResponse.data ?? [])
          .map((person) => person.cohort)
          .filter((cohort): cohort is number => cohort !== null),
      );
      setStats({
        people: peopleResponse.data?.length ?? 0,
        cohorts: cohorts.size,
        projects: projectsResponse.count ?? 0,
        macroAreas: macroAreasResponse.count ?? 0,
        subAreas: subAreasResponse.count ?? 0,
        evaluations: evaluationsResponse.count ?? 0,
      });

      const recentProjects = recentProjectsResponse.data ?? [];
      if (recentProjects.length) {
        const ownerIds = [
          ...new Set(
            recentProjects.map((project) => project.owner_person_id),
          ),
        ];
        const { data: owners } = await client
          .from("people")
          .select("id, name, slug")
          .in("id", ownerIds);
        const ownerById = new Map(
          (owners ?? []).map((owner) => [owner.id, owner]),
        );
        setPublicProjects(
          recentProjects.flatMap((project) => {
            const owner = ownerById.get(project.owner_person_id);
            return owner
              ? [
                  {
                    id: project.id,
                    title: project.title,
                    level: project.level,
                    person: owner.name,
                    personSlug: owner.slug,
                  },
                ]
              : [];
          }),
        );
      }
    }

    void loadStats();
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const safeTerm = term.replace(/[%_,()]/g, "");
      const cohortMatch = safeTerm.match(/^t?\s*(\d{1,2})$/i);
      let request = client
        .from("people")
        .select("id, name, slug, cohort")
        .order("name")
        .limit(8);

      request = cohortMatch
        ? request.eq("cohort", Number(cohortMatch[1]))
        : request.ilike("name", `%${safeTerm}%`);

      const { data } = await request;
      if (!active) return;
      setPeopleResults(data ?? []);
      setSearching(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <main>
      <div className="sky" aria-hidden="true" />
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Constelação Molecular — início">
          <StarLogo />
          <span><strong>Constelação</strong><em>Molecular</em></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          Menu
        </button>
        <nav className={menuOpen ? "nav-open" : ""} aria-label="Navegação principal">
          <a href="#pessoas">Pessoas</a>
          <a href="#projetos">Projetos</a>
          <a href="#areas">Áreas</a>
          <a href="#disciplinas">Disciplinas</a>
          <a href="#mapa">Mapa</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <button className="login-link" onClick={() => setAuthOpen(true)}>
          {session ? "Minha conta" : "Entrar"} <span>↗</span>
        </button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow"><span>✦</span> Um atlas da comunidade do CM</p>
          <h1>Encontre seu lugar na <em>constelação.</em></h1>
          <p className="lead">
            Explore as pessoas, pesquisas e trajetórias que formam o Ciências Moleculares — e descubra novas conexões.
          </p>
          <div className="search-shell">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busque uma pessoa pelo nome ou turma"
              aria-label="Buscar na Constelação Molecular"
            />
            <kbd>⌘ K</kbd>
            {query.trim().length >= 2 && (
              <div className="search-results">
                {searching ? (
                  <p>Buscando na constelação…</p>
                ) : peopleResults.length ? (
                  peopleResults.map((person) => (
                    <Link key={person.id} href={`/pessoas/${person.slug}`}>
                      <strong>{person.name}</strong>
                      <small>
                        {person.cohort ? `T${person.cohort}` : "Turma não informada"}
                      </small>
                    </Link>
                  ))
                ) : (
                  <p>Nenhuma pessoa encontrada nessa constelação.</p>
                )}
              </div>
            )}
          </div>
          <div className="hero-actions">
            <a className="primary-button" href="#mapa">Explorar a constelação <span>→</span></a>
            <a className="secondary-button" href="#perfil">Reivindicar meu perfil</a>
          </div>
          <p className="public-note"><span>●</span> Conteúdo público · Edições identificadas pela comunidade CM</p>
        </div>

        <div className="constellation-card" id="mapa">
          <div className="map-top">
            <div>
              <p>Mapa da comunidade</p>
              <strong>{activeArea ?? "Todas as áreas"}</strong>
            </div>
            <button onClick={() => setActiveArea(null)}>Visão geral ⤢</button>
          </div>
          <div className="constellation-map" role="img" aria-label="Mapa interativo das áreas da comunidade">
            <svg viewBox="0 0 100 88" preserveAspectRatio="none" aria-hidden="true">
              <path d="M29 36 L48 39 L64 26 L73 59 L43 67 L18 69 L29 36 M48 39 L43 67 M29 36 L64 26" />
            </svg>
            {areas.map((area) => (
              <button
                key={area.name}
                className={`area-node ${activeArea === area.name ? "active" : ""}`}
                style={{ left: `${area.x}%`, top: `${area.y}%`, "--node-color": area.color } as React.CSSProperties}
                onClick={() => setActiveArea(activeArea === area.name ? null : area.name)}
                aria-pressed={activeArea === area.name}
              >
                <i /><span>{area.name}<small>{area.count} pessoas</small></span>
              </button>
            ))}
            <div className="map-center"><StarLogo /><span>CM</span></div>
          </div>
          <div className="map-legend">
            <span><i className="verified" /> Perfil verificado</span>
            <span><i className="unclaimed" /> Não reivindicado</span>
            <span>Selecione uma área para explorar</span>
          </div>
        </div>
      </section>

      <section className="stats" aria-label="Números da comunidade">
        <article><strong>{stats.people}</strong><span>pessoas mapeadas</span><small>de {stats.cohorts} turmas</small></article>
        <article><strong>{stats.projects}</strong><span>projetos cadastrados</span><small>dados da comunidade</small></article>
        <article><strong>{stats.macroAreas}</strong><span>macroáreas</span><small>{stats.subAreas} subáreas</small></article>
        <article><strong>{stats.evaluations}</strong><span>avaliações de disciplinas</span><small>experiências compartilhadas</small></article>
      </section>

      <section className="content-section" id="projetos">
        <div className="section-heading">
          <div><p className="eyebrow"><span>✦</span> Projetos recentes</p><h2>Pesquisas em órbita</h2></div>
          <a href="#">Ver todos os projetos →</a>
        </div>
        <div className="project-grid">
          {publicProjects.length ? publicProjects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="card-line" />
              <span className="level">{project.level}</span>
              <h3>{project.title}</h3>
              <p>{project.person}</p>
              <Link href={`/pessoas/${project.personSlug}`}>
                Ver perfil <span>↗</span>
              </Link>
            </article>
          )) : (
            <div className="empty-content">
              <span>✦</span>
              <p>O primeiro projeto da constelação pode ser o seu.</p>
              <button onClick={() => setAuthOpen(true)}>Cadastrar projeto</button>
            </div>
          )}
        </div>
      </section>

      <section className="content-section discipline-section" id="disciplinas">
        <div className="section-heading">
          <div><p className="eyebrow"><span>✦</span> Experiências compartilhadas</p><h2>Disciplinas no radar</h2></div>
          <a href="#">Explorar disciplinas →</a>
        </div>
        <div className="discipline-list">
          {disciplines.map((discipline) => (
            <article key={discipline.code}>
              <span className="course-code">{discipline.code}</span>
              <h3>{discipline.name}</h3>
              <span className="rating">★ {discipline.score}</span>
              <span className="workload">Carga {discipline.load.toLowerCase()}</span>
              <a href="#" aria-label={`Abrir ${discipline.name}`}>→</a>
            </article>
          ))}
        </div>
      </section>

      <section className="join-section" id="perfil">
        <div className="join-stars" aria-hidden="true">✦　·　✧　　·　✦</div>
        <p className="eyebrow"><span>✦</span> Você faz parte deste mapa</p>
        <h2>Sua trajetória também forma conexões.</h2>
        <p>Reivindique seu perfil, registre seus projetos e ajude a construir a memória acadêmica do CM.</p>
        <button className="primary-button" onClick={() => setAuthOpen(true)}>
          {session ? "Acessar meu perfil" : "Reivindicar meu perfil"} <span>→</span>
        </button>
      </section>

      <footer id="sobre">
        <a className="brand footer-brand" href="#inicio"><StarLogo /><span><strong>Constelação</strong><em>Molecular</em></span></a>
        <p>Uma iniciativa independente feita para conectar a comunidade do Ciências Moleculares.</p>
        <span>São Paulo · 2026</span>
      </footer>
      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSessionChange={handleSessionChange}
      />
    </main>
  );
}
