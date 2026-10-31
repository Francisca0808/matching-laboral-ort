import { useEffect, useState } from "react";
import { api } from "../lib/browser";
const empty = {
  id_ort: "",
  puesto: "",
  descripcion: "",
  requisitos: "",
  horario: "",
  modalidad: "No informado",
  jornada: "No informado",
  facultades: "",
  tipo_contrato: "",
  tipo_cargo: "",
  plazo_contratacion: "",
  enlace: "",
  estado: "activa",
};
export default function Admin() {
  const [result, setResult] = useState(null),
    [editing, setEditing] = useState(null),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState(null);
  useEffect(() => {
    let active = true;
    setError("");
    api("/api/admin?page=" + page)
      .then((r) => {
        if (active) setResult(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page, revision]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const data = {
      ...Object.fromEntries(new FormData(e.currentTarget)),
      ...(editing.id ? { id: editing.id } : {}),
    };
    try {
      await api("/api/admin", {
        method: editing.id ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      setEditing(null);
      setRevision((x) => x + 1);
      setMessage("Oferta guardada.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin", {
        method: "DELETE",
        body: JSON.stringify({ id: deleting.id }),
      });
      setDeleting(null);
      setPage(1);
      setRevision((x) => x + 1);
      setMessage("Oferta archivada. Ya no aparece para estudiantes.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <p className="eyebrow">ADMINISTRACIÓN</p>
      <h1>Ofertas laborales</h1>
      <p>Este panel mantiene el catálogo de oportunidades.</p>
      <p role="status">{message}</p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setRevision((x) => x + 1)}>Reintentar</button>
        </p>
      )}
      {deleting && (
        <section className="delete-confirm" role="alert">
          <p>
            ¿Archivar la oferta «{deleting.puesto}»? Dejará de aparecer para
            estudiantes y se conservará su historial.
          </p>
          <button
            className="button button-dark"
            disabled={busy}
            onClick={remove}
          >
            Confirmar archivado
          </button>
          <button
            className="button button-outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Cancelar
          </button>
        </section>
      )}
      {editing ? (
        <form
          key={editing.id || "new"}
          onSubmit={save}
          className="profile-panel"
        >
          <h2>{editing.id ? "Editar oferta" : "Nueva oferta"}</h2>
          <fieldset disabled={busy}>
            <div className="form-grid">
              {Object.entries({
                id_ort: "ID ORT",
                puesto: "Puesto",
                horario: "Horario",
                facultades: "Facultades",
                tipo_contrato: "Tipo de contrato",
                tipo_cargo: "Tipo de cargo",
                plazo_contratacion: "Plazo",
                enlace: "Enlace original de ORT",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    defaultValue={editing[key] || ""}
                    maxLength={500}
                    type={key === "enlace" ? "url" : "text"}
                    required={["id_ort", "puesto", "enlace"].includes(key)}
                  />
                </label>
              ))}
              {[
                [
                  "modalidad",
                  "Modalidad",
                  ["Presencial", "Híbrida", "Remota", "No informado"],
                ],
                [
                  "jornada",
                  "Jornada",
                  ["Part-time", "Full-time", "Indistinto", "No informado"],
                ],
                ["estado", "Estado", ["activa", "inactiva"]],
              ].map(([key, label, options]) => (
                <label key={key}>
                  {label}
                  <select name={key} defaultValue={editing[key]}>
                    {options.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
              ))}
              {[
                ["descripcion", "Descripción"],
                ["requisitos", "Requisitos"],
              ].map(([key, label]) => (
                <label className="wide" key={key}>
                  {label}
                  <textarea
                    name={key}
                    defaultValue={editing[key] || ""}
                    rows={6}
                    maxLength={20000}
                  />
                </label>
              ))}
            </div>
            <div className="card-actions">
              <button className="button button-dark">Guardar oferta</button>
              <button
                type="button"
                className="button button-outline"
                onClick={() => setEditing(null)}
              >
                Cancelar
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <>
          <button
            className="button button-dark"
            onClick={() => {
              setEditing(empty);
              setMessage("");
            }}
          >
            Crear oferta
          </button>
          {!result && !error ? (
            <p>Cargando catálogo…</p>
          ) : (
            result && (
              <>
                <p>{result.total} ofertas en el catálogo</p>
                <div className="admin-list">
                  {result.offers.map((o) => (
                    <article key={o.id}>
                      <div>
                        <strong>{o.puesto}</strong>
                        <p>
                          {o.id_ort} · {o.modalidad} · {o.jornada} · {o.estado}
                        </p>
                      </div>
                      <div className="card-actions">
                        <button
                          className="button button-outline"
                          onClick={() => {
                            setEditing(o);
                            setMessage("");
                          }}
                        >
                          Editar
                        </button>
                        {o.estado === "activa" && (
                          <button
                            className="button button-outline"
                            onClick={() => setDeleting(o)}
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
                <div className="pagination">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((x) => x - 1)}
                  >
                    Anterior
                  </button>
                  <span>Página {page}</span>
                  <button
                    disabled={page * result.pageSize >= result.total}
                    onClick={() => setPage((x) => x + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
