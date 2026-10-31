import { useEffect, useState } from "react";
import { api } from "../lib/browser";
import { modalities } from "../lib/validation.mjs";
import CvSuggestions from "./CvSuggestions";
import MatchingPreferences from "./MatchingPreferences";

const blank = {
  nombre: "",
  apellido: "",
  carrera: "",
  anio_carrera: 1,
  areas_interes: [],
  skills: [],
  idiomas: [],
  experiencia_resumen: "",
  disponibilidad_horaria: "",
  horas_semanales: 20,
  modalidad_preferida: "Sin preferencia",
  cv_path: null,
};

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [formVersion, setFormVersion] = useState(0);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvMessage, setCvMessage] = useState("");
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    let active = true;
    setError("");
    api("/api/perfil")
      .then(async (response) => {
        if (!active) return;
        const loaded = response.profile || blank;
        setProfile(loaded);
        setFormVersion((value) => value + 1);
        if (loaded.cv_path)
          try {
            const analysis = await api("/api/cv-analysis");
            if (active && analysis.estado === "completado")
              setSuggestions(analysis.sugerencias);
          } catch {
            // El CV sigue disponible aunque no exista un análisis previo.
          }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    for (const key of ["anio_carrera", "horas_semanales"])
      data[key] = Number(data[key]);
    for (const key of ["areas_interes", "skills", "idiomas"])
      data[key] = data[key]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    try {
      const result = await api("/api/perfil", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setProfile(result.profile);
      setFormVersion((value) => value + 1);
      setMessage(
        "Tu perfil quedó guardado. Las recomendaciones usarán estos datos.",
      );
    } catch (requestError) {
      setMessage(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    setCvBusy(true);
    try {
      const result = await requestAnalysis("Leyendo CV…");
      setSuggestions(result.sugerencias);
      setCvMessage(
        "Análisis listo. Revisá las sugerencias antes de incorporarlas.",
      );
    } catch (requestError) {
      setCvMessage(requestError.message);
    } finally {
      setCvBusy(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("cv");
    if (!file?.size) return;
    setCvBusy(true);
    setCvMessage("");
    setSuggestions(null);
    try {
      if (file.size > 4 * 1024 * 1024)
        throw new Error("El CV debe pesar hasta 4 MB.");
      const mimeType = file.type ||
        (file.name.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf");
      const result = await api("/api/cv", {
        method: "PUT",
        headers: {
          "Content-Type": mimeType,
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      setProfile((current) => ({ ...current, cv_path: result.cv_path }));
      form.reset();
      const analysis = await requestAnalysis("CV guardado. Leyendo CV…");
      setSuggestions(analysis.sugerencias);
      setCvMessage(
        "CV guardado y analizado. Revisá las sugerencias antes de incorporarlas.",
      );
    } catch (requestError) {
      setCvMessage(requestError.message);
    } finally {
      setCvBusy(false);
    }
  }

  async function viewCv() {
    setCvBusy(true);
    setCvMessage("");
    try {
      const { url } = await api("/api/cv");
      window.location.assign(url);
    } catch (requestError) {
      setCvMessage(requestError.message);
    } finally {
      setCvBusy(false);
    }
  }

  function applySuggestions(nextProfile) {
    setProfile(nextProfile);
    setFormVersion((value) => value + 1);
    setMessage(
      "Las sugerencias se incorporaron al formulario. Revisalas y guardá el perfil.",
    );
  }

  async function requestAnalysis(initialMessage) {
    setCvMessage(initialMessage);
    const skillTimer = window.setTimeout(
      () => setCvMessage("Analizando skills e idiomas…"),
      500,
    );
    const suggestionTimer = window.setTimeout(
      () => setCvMessage("Preparando sugerencias…"),
      2200,
    );
    try {
      return await api("/api/cv-analysis", { method: "POST", body: "{}" });
    } finally {
      window.clearTimeout(skillTimer);
      window.clearTimeout(suggestionTimer);
    }
  }

  return (
    <section className="profile-panel">
      <p className="eyebrow">MI PERFIL</p>
      <h2>Contanos sobre vos.</h2>
      <p>
        Guardá tus cambios antes de volver a las oportunidades. El CV se
        almacena de forma privada y sus sugerencias requieren tu confirmación.
      </p>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button onClick={() => setRevision((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : !profile ? (
        <p role="status">Cargando tu perfil…</p>
      ) : (
        <>
          <form key={formVersion} onSubmit={save}>
            <fieldset disabled={busy}>
              <div className="form-grid">
                {[
                  ["nombre", "Nombre", 80],
                  ["apellido", "Apellido", 80],
                  ["carrera", "Carrera", 120],
                ].map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <input
                      name={key}
                      defaultValue={profile[key] || ""}
                      maxLength={max}
                      required
                      autoComplete={
                        key === "nombre"
                          ? "given-name"
                          : key === "apellido"
                            ? "family-name"
                            : "off"
                      }
                    />
                  </label>
                ))}
                <label>
                  Año de carrera
                  <input
                    name="anio_carrera"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue={profile.anio_carrera || 1}
                    required
                  />
                </label>
                {[
                  ["areas_interes", "Áreas de interés", "Datos, marketing"],
                  ["skills", "Habilidades", "Excel, SQL, Power BI"],
                  ["idiomas", "Idiomas", "Inglés, portugués"],
                ].map(([key, label, placeholder]) => (
                  <label key={key} className="wide">
                    {label}
                    <input
                      name={key}
                      defaultValue={(profile[key] || []).join(", ")}
                      placeholder={placeholder}
                      maxLength={key === "areas_interes" ? 970 : 2400}
                      required={key === "areas_interes"}
                    />
                    <small>Separá los valores con comas.</small>
                  </label>
                ))}
                <label className="wide">
                  Experiencia resumida
                  <textarea
                    name="experiencia_resumen"
                    rows="4"
                    maxLength={3000}
                    defaultValue={profile.experiencia_resumen || ""}
                  />
                </label>
                <label>
                  Disponibilidad horaria
                  <input
                    name="disponibilidad_horaria"
                    maxLength={200}
                    defaultValue={profile.disponibilidad_horaria || ""}
                    placeholder="09:00 a 18:00 o Flexible"
                    required
                  />
                  <small>Incluí días especiales si corresponde.</small>
                </label>
                <label>
                  Horas semanales disponibles
                  <input
                    name="horas_semanales"
                    type="number"
                    min="1"
                    max="60"
                    defaultValue={profile.horas_semanales || 20}
                    required
                  />
                </label>
                <label>
                  Modalidad preferida
                  <select
                    name="modalidad_preferida"
                    defaultValue={profile.modalidad_preferida || "Sin preferencia"}
                  >
                    {modalities.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="button button-dark form-submit">
                {busy ? "Guardando…" : "Guardar perfil"}
              </button>
            </fieldset>
            <p role="status">{message}</p>
          </form>
          <MatchingPreferences
            initialPreferences={profile.matching_preferences}
            onSaved={(matchingPreferences) =>
              setProfile((current) => ({
                ...current,
                matching_preferences: matchingPreferences,
              }))
            }
          />
          <section className="cv-section">
            <h3>Tu CV</h3>
            <p>
              {profile.cv_path
                ? "Tenés un CV cargado."
                : "Todavía no cargaste un CV."}
            </p>
            <div className="cv-actions">
              {profile.cv_path && (
                <button
                  className="button button-outline"
                  onClick={viewCv}
                  disabled={cvBusy}
                >
                  Ver mi CV
                </button>
              )}
              {profile.cv_path && (
                <button
                  className="button button-outline"
                  onClick={analyze}
                  disabled={cvBusy}
                >
                  Analizar nuevamente
                </button>
              )}
            </div>
            <form onSubmit={upload}>
              <label>
                CV en PDF o DOCX, hasta 4 MB
                <input
                  type="file"
                  name="cv"
                  accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  required
                  disabled={cvBusy}
                />
              </label>
              <button className="button button-dark" disabled={cvBusy}>
                {cvBusy
                  ? "Procesando…"
                  : profile.cv_path
                    ? "Reemplazar CV"
                    : "Subir CV"}
              </button>
              <p role="status">{cvMessage}</p>
            </form>
          </section>
          {suggestions && (
            <CvSuggestions
              profile={profile}
              suggestions={suggestions}
              onApply={applySuggestions}
            />
          )}
        </>
      )}
    </section>
  );
}
