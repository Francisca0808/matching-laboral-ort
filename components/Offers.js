import { useEffect, useState } from "react";
import { api } from "../lib/browser";
import { modalities, safeOfferLink } from "../lib/validation.mjs";
import { titleSuggestions } from "../lib/opportunities.mjs";
import ApplicationInstructions from "./ApplicationInstructions";
const criterionLabels = {
  skills: "Skills",
  area: "Área de interés",
  formacion: "Carrera y formación",
  modalidad: "Modalidad",
  jornada: "Jornada",
  horario: "Horario",
  salario: "Salario",
};
const emptyFilters = {
  search: "",
  modality: "",
  jornada: "",
  faculties: [],
  page: 1,
};
export default function Offers({ view = "recommended" }) {
  const [filters, setFilters] = useState(emptyFilters),
    [draft, setDraft] = useState(emptyFilters),
    [catalog, setCatalog] = useState({ titles: [], faculties: [] }),
    [suggesting, setSuggesting] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    const params = new URLSearchParams({
      search: filters.search,
      modality: filters.modality,
      jornada: filters.jornada,
      page: filters.page,
      view,
    });
    filters.faculties.forEach((f) => params.append("faculty", f));
    api("/api/ofertas?" + params, {
      signal: abort.signal,
    })
      .then((r) => {
        if (!abort.signal.aborted) {
          setResult(r);
          setCatalog(r.catalog);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [filters, revision, view]);
  async function interaction(job, state) {
    setBusy(job.id);
    setNotice("");
    try {
      await api("/api/interacciones", {
        method: state ? "PUT" : "DELETE",
        body: JSON.stringify({ oferta_id: job.id, estado: state }),
      });
      setNotice(
        state === "guardada"
          ? "Oferta guardada."
          : state === "descartada"
            ? "Oferta descartada. Podés recuperarla en Descartadas."
            : "Se quitó la selección de esta oferta.",
      );
      setFilters((f) => ({ ...f, page: 1 }));
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  }
  function search(e) {
    e.preventDefault();
    setSuggesting(false);
    setFilters({ ...draft, page: 1 });
  }
  const suggestions = suggesting
    ? titleSuggestions(catalog.titles, draft.search)
    : [];

  return (
    <section className="opportunities">
      <div className="section-heading">
        <div>
          <p className="eyebrow">EXPLORÁ POSIBILIDADES</p>
          <h2>
            {view === "saved"
              ? "Ofertas guardadas"
              : view === "discarded"
                ? "Ofertas descartadas"
                : "Oportunidades recomendadas"}
          </h2>
          <p>
            Ordenadas de mayor a menor afinidad con tu perfil. Revisá la
            vigencia en la publicación original.
          </p>
        </div>
      </div>
      <details className="matching-help">
        <summary>Cómo calculamos la afinidad</summary>
        <p>
          Si no personalizaste tus pesos usamos la distribución recomendada:
          área 25%, skills 30%, formación 15%, jornada 10%, horario 10% y
          modalidad 10%.
        </p>
        <p>
          Cuando una oferta no informa un criterio, lo excluimos y redistribuimos
          su peso entre los criterios disponibles. El salario no participa porque
          las ofertas actuales no informan montos comparables.
        </p>
      </details>
      <form className="search-bar" onSubmit={search}>
        <label>
          Buscar por puesto
          <input
            name="search"
            maxLength={100}
            placeholder="Ej. asistente marketing"
            value={draft.search}
            autoComplete="off"
            aria-controls="job-suggestions"
            onChange={(e) => {
              setDraft({ ...draft, search: e.target.value });
              setSuggesting(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSuggesting(false);
            }}
          />
        </label>
        {suggestions.length > 0 && (
          <ul
            id="job-suggestions"
            className="job-suggestions"
            aria-label="Sugerencias de puestos"
          >
            {suggestions.map((title) => (
              <li key={title}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, search: title });
                    setSuggesting(false);
                  }}
                >
                  {title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <label>
          Modalidad
          <select
            name="modality"
            value={draft.modality}
            onChange={(e) => setDraft({ ...draft, modality: e.target.value })}
          >
            <option value="">Todas</option>
            {modalities.slice(0, 3).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Jornada
          <select
            name="jornada"
            value={draft.jornada}
            onChange={(e) => setDraft({ ...draft, jornada: e.target.value })}
          >
            <option value="">Todas</option>
            {["Part-time", "Full-time", "Indistinto", "No informado"].map(
              (x) => (
                <option key={x}>{x}</option>
              ),
            )}
          </select>
        </label>
        <fieldset className="faculty-filter">
          <legend>Facultad</legend>
          <details>
            <summary>
              {draft.faculties.length
                ? `${draft.faculties.length} seleccionadas`
                : "Todas las facultades"}
            </summary>
            {catalog.faculties.map((faculty) => (
              <label key={faculty}>
                <input
                  type="checkbox"
                  checked={draft.faculties.includes(faculty)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faculties: e.target.checked
                        ? [...draft.faculties, faculty]
                        : draft.faculties.filter((f) => f !== faculty),
                    })
                  }
                />
                {faculty}
              </label>
            ))}
            <small>
              Seleccioná una o más. Se incluye cualquiera de las elegidas.
            </small>
          </details>
        </fieldset>
        <button className="button button-dark">Buscar</button>
        <button
          type="button"
          className="button button-outline"
          onClick={() => {
            setDraft(emptyFilters);
            setFilters({ ...emptyFilters });
            setSuggesting(false);
          }}
        >
          Limpiar filtros
        </button>
      </form>
      <p role="status">{notice}</p>
      {loading && <p role="status">Cargando oportunidades…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRevision((x) => x + 1)}>Reintentar</button>
        </div>
      )}
      {result && (
        <>
          {!result.profileComplete && (
            <p className="demo-notice">
              Completá tu perfil para obtener una comparación útil. Los datos
              faltantes no suman puntos.
            </p>
          )}
          <p role="status">{result.total} ofertas encontradas</p>
          <div className="job-grid">
            {result.offers.map((job) => (
              <article className="job-card" key={job.id}>
                <div className="score-header">
                  <p className="eyebrow">{job.id_ort}</p>
                  <strong className="score">
                    {job.match.score}% <small>de afinidad</small>
                  </strong>
                </div>
                <h3>{job.puesto}</h3>
                <div className="job-tags">
                  <span>{job.modalidad || "Modalidad no informada"}</span>
                  <span>{job.jornada || "Jornada no informada"}</span>
                </div>
                <p>
                  <strong>Horario:</strong> {job.horario || "No informado"}
                </p>
                <p className="job-description">
                  {job.descripcion?.slice(0, 180) || "Consultá el detalle."}
                  {job.descripcion?.length > 180 ? "…" : ""}
                </p>
                <details>
                  <summary>Ver detalle</summary>
                  <div className="offer-detail">
                    <h4>Coincidencias principales</h4>
                    {job.match.matches.length ? (
                      <ul>
                        {job.match.matches.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        No se identificaron coincidencias con los datos
                        disponibles.
                      </p>
                    )}
                    <h4>Puntos a revisar</h4>
                    {job.match.review.length ? (
                      <ul>
                        {job.match.review.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Confirmá los requisitos y la vigencia con la publicación
                        original.
                      </p>
                    )}
                    <h4>Cómo se compone la afinidad</h4>
                    <ul className="criterion-breakdown">
                      {Object.entries(job.match.criteria).map(([key, item]) => (
                        <li key={key}>
                          <strong>{criterionLabels[key]}</strong>{" "}
                          {item.available ? (
                            <>
                              {item.score}% de compatibilidad · importancia elegida{" "}
                              {item.weight}% · aporte {item.contribution} puntos
                              {item.effectiveWeight !== item.weight
                                ? ` · peso aplicado ${item.effectiveWeight}% por datos faltantes`
                                : ""}
                            </>
                          ) : (
                            <>Sin datos suficientes · excluido del cálculo</>
                          )}
                        </li>
                      ))}
                    </ul>
                    {[
                      ["Descripción", job.descripcion],
                      ["Requisitos", job.requisitos],
                      ["Horario", job.horario],
                      ["Modalidad", job.modalidad],
                      ["Jornada", job.jornada],
                      ["Facultades", job.facultades],
                      ["Tipo de contrato", job.tipo_contrato],
                      ["Plazo", job.plazo_contratacion],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <strong>{label}</strong>
                        <p>{value || "No informado"}</p>
                      </div>
                    ))}
                    <ApplicationInstructions job={job} />
                  </div>
                </details>
                <div className="card-actions">
                  <button
                    className="button button-outline"
                    disabled={busy !== null}
                    onClick={() =>
                      interaction(
                        job,
                        job.interaction === "guardada" ? null : "guardada",
                      )
                    }
                  >
                    {job.interaction === "guardada"
                      ? "Quitar de guardadas"
                      : "Guardar"}
                  </button>
                  <button
                    className="button button-outline"
                    disabled={busy !== null}
                    onClick={() =>
                      interaction(
                        job,
                        job.interaction === "descartada" ? null : "descartada",
                      )
                    }
                  >
                    {job.interaction === "descartada"
                      ? "Recuperar"
                      : "Descartar"}
                  </button>
                </div>
                {safeOfferLink(job.enlace) && (
                  <a
                    className="text-link original-link"
                    href={safeOfferLink(job.enlace)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ir a la publicación original
                  </a>
                )}
              </article>
            ))}
          </div>
          {result.total === 0 && (
            <p className="empty-state">
              No hay ofertas para esta selección. Probá otros filtros o revisá
              tus ofertas guardadas y descartadas.
            </p>
          )}
          <div className="pagination">
            <button
              className="button button-outline"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Anterior
            </button>
            <span>
              Página {result.page} de{" "}
              {Math.max(1, Math.ceil(result.total / result.pageSize))}
            </span>
            <button
              className="button button-outline"
              disabled={filters.page * result.pageSize >= result.total}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}
