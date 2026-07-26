"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  id: string | number;
  name: string;
};

type SubArea = {
  id: string | number;
  name: string;
  macro_area_id: string | number;
};

type OwnedProject = {
  id: string;
  title: string;
  level: (typeof PROJECT_LEVELS)[number];
  summary: string | null;
  institution: string | null;
  project_url: string | null;
  status: string;
};

type ProjectFormProps = {
  personId: string;
};

export function ProjectForm({ personId }: ProjectFormProps) {
  const [macroAreas, setMacroAreas] = useState<MacroArea[]>([]);
  const [subAreas, setSubAreas] = useState<SubArea[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Array<string | number>>([]);
  const [projects, setProjects] = useState<OwnedProject[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const loadProjects = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data } = await supabase
      .from("projects")
      .select(
        "id, title, level, summary, institution, project_url, status, created_at",
      )
      .eq("owner_person_id", personId)
      .order("created_at", { ascending: false });
    setProjects((data ?? []) as OwnedProject[]);
  }, [personId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    async function loadInitialData() {
      const [macroResponse, subResponse, projectsResponse] = await Promise.all([
        client.from("macro_areas").select("id, name").order("name"),
        client
          .from("sub_areas")
          .select("id, name, macro_area_id")
          .order("name"),
        client
          .from("projects")
          .select(
            "id, title, level, summary, institution, project_url, status, created_at",
          )
          .eq("owner_person_id", personId)
          .order("created_at", { ascending: false }),
      ]);
      setMacroAreas(macroResponse.data ?? []);
      setSubAreas(subResponse.data ?? []);
      setProjects((projectsResponse.data ?? []) as OwnedProject[]);
    }

    void loadInitialData();
  }, [personId]);

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

  function toggleArea(id: string | number) {
    setSelectedAreas((current) =>
      current.includes(id)
        ? current.filter((areaId) => areaId !== id)
        : [...current, id],
    );
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setLevel("IC do Avançado");
    setSummary("");
    setInstitution("");
    setProjectUrl("");
    setCustomArea("");
    setSelectedAreas([]);
  }

  async function startEditing(project: OwnedProject) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setEditingId(project.id);
    setTitle(project.title);
    setLevel(project.level);
    setSummary(project.summary ?? "");
    setInstitution(project.institution ?? "");
    setProjectUrl(project.project_url ?? "");
    setMessage("");
    setError("");

    const { data: areaRows } = await supabase
      .from("project_areas")
      .select("sub_area_id, custom_area_name")
      .eq("project_id", project.id);
    setSelectedAreas(
      (areaRows ?? [])
        .map((area) => area.sub_area_id)
        .filter(
          (areaId): areaId is string | number =>
            areaId !== null && areaId !== undefined,
        ),
    );
    setCustomArea(
      (areaRows ?? [])
        .map((area) => area.custom_area_name)
        .filter(Boolean)
        .join(", "),
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

    const projectValues = {
      owner_person_id: personId,
      title: title.trim(),
      level,
      summary: summary.trim() || null,
      institution: institution.trim() || null,
      project_url: projectUrl.trim() || null,
      status: "publicado",
    };

    const projectRequest = editingId
      ? supabase
          .from("projects")
          .update(projectValues)
          .eq("id", editingId)
          .select("id")
      : supabase
          .from("projects")
          .insert(projectValues)
          .select("id");
    const { data: project, error: projectError } = await projectRequest.single();

    if (projectError || !project) {
      setSaving(false);
      setError(
        editingId
          ? "Não foi possível atualizar o projeto."
          : "Não foi possível cadastrar o projeto.",
      );
      return;
    }

    if (editingId) {
      const { error: removeAreasError } = await supabase
        .from("project_areas")
        .delete()
        .eq("project_id", editingId);
      if (removeAreasError) {
        setSaving(false);
        setError("Não foi possível atualizar as áreas do projeto.");
        return;
      }
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
      if (!editingId) {
        await supabase.from("projects").delete().eq("id", project.id);
      }
      setSaving(false);
      setError("Não foi possível salvar as áreas do projeto.");
      return;
    }

    const wasEditing = Boolean(editingId);
    resetForm();
    setSaving(false);
    setMessage(
      wasEditing
        ? "Projeto atualizado com sucesso."
        : "Projeto publicado com sucesso.",
    );
    await loadProjects();
  }

  async function changeProjectStatus(project: OwnedProject) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const nextStatus =
      project.status === "arquivado" ? "publicado" : "arquivado";
    setError("");
    setMessage("");
    const { error: statusError } = await supabase
      .from("projects")
      .update({ status: nextStatus })
      .eq("id", project.id);

    if (statusError) {
      setError("Não foi possível alterar a visibilidade do projeto.");
      return;
    }
    if (editingId === project.id) resetForm();
    setMessage(
      nextStatus === "arquivado"
        ? "Projeto arquivado e removido da visualização pública."
        : "Projeto restaurado e publicado novamente.",
    );
    await loadProjects();
  }

  return (
    <div className="project-editor">
      {projects.length > 0 && (
        <section className="owned-projects">
          <h3>Seus projetos</h3>
          <div>
            {projects.map((project) => (
              <article key={project.id}>
                <div>
                  <strong>{project.title}</strong>
                  <small>
                    {project.level} ·{" "}
                    {project.status === "arquivado"
                      ? "Arquivado"
                      : "Publicado"}
                  </small>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => startEditing(project)}
                    disabled={project.status === "arquivado"}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => changeProjectStatus(project)}
                  >
                    {project.status === "arquivado" ? "Restaurar" : "Arquivar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <div>
        <p className="eyebrow"><span>✦</span> Pesquisa</p>
        <h3>{editingId ? "Editar projeto" : "Cadastrar projeto"}</h3>
        <p>
          {editingId
            ? "As alterações serão publicadas imediatamente."
            : "Comece pelo essencial. Você poderá completar os detalhes depois."}
        </p>
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

        <div className="project-form-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving
              ? "Salvando…"
              : editingId
                ? "Salvar alterações"
                : "Publicar projeto"}
          </button>
          {editingId && (
            <button
              className="secondary-button"
              type="button"
              onClick={resetForm}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      {message && <p className="auth-message">{message}</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
    </div>
  );
}
