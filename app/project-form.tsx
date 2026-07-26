"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "./supabase";

const PROJECT_LEVELS = [
  "IC do Avançado",
  "IC Externa",
  "Mestrado",
  "Doutorado",
  "Pós-doutorado",
  "Projeto Independente",
  "Outro",
] as const;

type MacroArea = {
  id: string;
  name: string;
};

type SubArea = {
  id: string;
  name: string;
  macro_area_id: string;
};

type ProjectFormProps = {
  personId: string;
};

export function ProjectForm({ personId }: ProjectFormProps) {
  const [macroAreas, setMacroAreas] = useState<MacroArea[]>([]);
  const [subAreas, setSubAreas] = useState<SubArea[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<(typeof PROJECT_LEVELS)[number]>(
    "IC do Avançado",
  );
  const [summary, setSummary] = useState("");
  const [institution, setInstitution] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    async function loadAreas() {
      const [macroResponse, subResponse] = await Promise.all([
        client.from("macro_areas").select("id, name").order("name"),
        client
          .from("sub_areas")
          .select("id, name, macro_area_id")
          .order("name"),
      ]);
      setMacroAreas(macroResponse.data ?? []);
      setSubAreas(subResponse.data ?? []);
    }

    void loadAreas();
  }, []);

  const groupedAreas = useMemo(
    () =>
      macroAreas.map((macroArea) => ({
        ...macroArea,
        subAreas: subAreas.filter(
          (subArea) => subArea.macro_area_id === macroArea.id,
        ),
      })),
    [macroAreas, subAreas],
  );

  function toggleArea(id: string) {
    setSelectedAreas((current) =>
      current.includes(id)
        ? current.filter((areaId) => areaId !== id)
        : [...current, id],
    );
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedAreas.length && !customArea.trim()) {
      setError("Selecione ao menos uma subárea ou informe outra área.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSaving(true);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_person_id: personId,
        title: title.trim(),
        level,
        summary: summary.trim() || null,
        institution: institution.trim() || null,
        project_url: projectUrl.trim() || null,
        status: "publicado",
      })
      .select("id")
      .single();

    if (projectError || !project) {
      setSaving(false);
      setError("Não foi possível cadastrar o projeto.");
      return;
    }

    const areaRows = [
      ...selectedAreas.map((subAreaId) => ({
        project_id: project.id,
        sub_area_id: subAreaId,
        custom_area_name: null,
      })),
      ...(customArea.trim()
        ? [
            {
              project_id: project.id,
              sub_area_id: null,
              custom_area_name: customArea.trim(),
            },
          ]
        : []),
    ];
    const { error: areasError } = await supabase
      .from("project_areas")
      .insert(areaRows);

    if (areasError) {
      await supabase.from("projects").delete().eq("id", project.id);
      setSaving(false);
      setError("Não foi possível salvar as áreas do projeto.");
      return;
    }

    setTitle("");
    setLevel("IC do Avançado");
    setSummary("");
    setInstitution("");
    setProjectUrl("");
    setCustomArea("");
    setSelectedAreas([]);
    setSaving(false);
    setMessage("Projeto publicado com sucesso.");
  }

  return (
    <div className="project-editor">
      <div>
        <p className="eyebrow"><span>✦</span> Pesquisa</p>
        <h3>Cadastrar projeto</h3>
        <p>Comece pelo essencial. Você poderá completar os detalhes depois.</p>
      </div>

      <form onSubmit={createProject}>
        <label htmlFor="project-title">Título do projeto</label>
        <input
          id="project-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />

        <label htmlFor="project-level">Nível</label>
        <select
          id="project-level"
          value={level}
          onChange={(event) =>
            setLevel(event.target.value as (typeof PROJECT_LEVELS)[number])
          }
        >
          {PROJECT_LEVELS.map((projectLevel) => (
            <option key={projectLevel}>{projectLevel}</option>
          ))}
        </select>

        <fieldset>
          <legend>Áreas do projeto</legend>
          <p>Selecione uma ou mais subáreas.</p>
          <div className="area-checklist">
            {groupedAreas.map((macroArea) => (
              <details key={macroArea.id}>
                <summary>{macroArea.name}</summary>
                <div>
                  {macroArea.subAreas.map((subArea) => (
                    <label key={subArea.id}>
                      <input
                        type="checkbox"
                        checked={selectedAreas.includes(subArea.id)}
                        onChange={() => toggleArea(subArea.id)}
                      />
                      <span>{subArea.name}</span>
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <label htmlFor="custom-area">Outra área</label>
          <input
            id="custom-area"
            value={customArea}
            onChange={(event) => setCustomArea(event.target.value)}
            placeholder="Preencha somente se não encontrou a área"
          />
        </fieldset>

        <details className="optional-project-fields">
          <summary>Adicionar informações opcionais</summary>
          <div>
            <label htmlFor="project-summary">Resumo</label>
            <textarea
              id="project-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
            />
            <label htmlFor="project-institution">Instituição</label>
            <input
              id="project-institution"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
            />
            <label htmlFor="project-url">Link do projeto</label>
            <input
              id="project-url"
              type="url"
              value={projectUrl}
              onChange={(event) => setProjectUrl(event.target.value)}
              placeholder="https://"
            />
          </div>
        </details>

        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? "Publicando…" : "Publicar projeto"}
        </button>
      </form>

      {message && <p className="auth-message">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
