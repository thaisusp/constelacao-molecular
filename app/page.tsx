"use client";

import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthPanel } from "./auth-panel";

const areas = [
  { name: "Computação", color: "#78a8ff", count: 34, x: 64, y: 26 },
  { name: "Biologia", color: "#72d4ad", count: 29, x: 29, y: 36 },
  { name: "Matemática", color: "#d89aff", count: 23, x: 73, y: 59 },
  { name: "Física", color: "#f1c76d", count: 21, x: 43, y: 67 },
  { name: "Química", color: "#ff9788", count: 18, x: 18, y: 69 },
  { name: "Humanidades", color: "#8bd6e6", count: 14, x: 48, y: 39 },
];

const projects = [
  {
    title: "Conceitos emocionais em modelos de linguagem",
    person: "Thaís Martins",
    level: "IC do Avançado",
    areas: ["Computação", "Linguística"],
    color: "#78a8ff",
  },
  {
    title: "Dinâmica de ecossistemas urbanos",
    person: "Marina Oliveira",
    level: "Mestrado",
    areas: ["Biologia", "Matemática"],
    color: "#72d4ad",
  },
  {
    title: "Matéria escura e lentes gravitacionais",
    person: "Rafael Santos",
    level: "IC Independente",
    areas: ["Física"],
    color: "#f1c76d",
  },
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
  const handleSessionChange = useCallback(
    (nextSession: Session | null) => setSession(nextSession),
    [],
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...projects
        .filter((item) => `${item.title} ${item.person} ${item.areas.join(" ")}`.toLowerCase().includes(term))
        .map((item) => ({ primary: item.title, secondary: `${item.person} · Projeto` })),
      ...disciplines
        .filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(term))
        .map((item) => ({ primary: item.name, secondary: `${item.code} · Disciplina` })),
      ...areas
        .filter((item) => item.name.toLowerCase().includes(term))
        .map((item) => ({ primary: item.name, secondary: `${item.count} pessoas · Área` })),
    ].slice(0, 5);
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
              placeholder="Busque pessoas, projetos, áreas ou disciplinas"
              aria-label="Buscar na Constelação Molecular"
            />
            <kbd>⌘ K</kbd>
            {query && (
              <div className="search-results">
                {results.length ? results.map((result) => (
                  <button key={`${result.primary}-${result.secondary}`} onClick={() => setQuery(result.primary)}>
                    <strong>{result.primary}</strong><small>{result.secondary}</small>
                  </button>
                )) : <p>Nenhum ponto encontrado nessa constelação.</p>}
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
        <article><strong>186</strong><span>pessoas mapeadas</span><small>de 35 turmas</small></article>
        <article><strong>94</strong><span>projetos cadastrados</span><small>61 em andamento</small></article>
        <article><strong>12</strong><span>macroáreas</span><small>47 subáreas</small></article>
        <article><strong>328</strong><span>disciplinas avaliadas</span><small>em 19 unidades da USP</small></article>
      </section>

      <section className="content-section" id="projetos">
        <div className="section-heading">
          <div><p className="eyebrow"><span>✦</span> Projetos recentes</p><h2>Pesquisas em órbita</h2></div>
          <a href="#">Ver todos os projetos →</a>
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.title}>
              <div className="card-line" style={{ background: project.color }} />
              <span className="level">{project.level}</span>
              <h3>{project.title}</h3>
              <p>{project.person}</p>
              <div>{project.areas.map((area) => <span className="tag" key={area}>{area}</span>)}</div>
              <a href="#">Conhecer projeto <span>↗</span></a>
            </article>
          ))}
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
