import { useEffect, useState } from "react";
import { mergeCvSuggestions } from "../lib/cv/review.mjs";

const SEMANTIC_HIGH_CONFIDENCE = 0.7;

const textFields = [
  ["nombre", "Nombre"],
  ["apellido", "Apellido"],
  ["formacion", "Formación o carrera"],
  ["experiencia_resumen", "Experiencia resumida"],
];

export default function CvSuggestions({ profile, suggestions, onApply }) {
  const [draft, setDraft] = useState(suggestions);
  const [selected, setSelected] = useState({});
  useEffect(() => {
    setDraft(suggestions);
    setSelected({
      nombre: !profile.nombre && Boolean(suggestions.nombre),
      apellido: !profile.apellido && Boolean(suggestions.apellido),
      formacion: !profile.carrera && Boolean(suggestions.formacion),
      experiencia_resumen:
        !profile.experiencia_resumen && Boolean(suggestions.experiencia_resumen),
      skills: (suggestions.skills || [])
        .filter(
          (item) =>
            item.origen !== "semantica" ||
            item.confianza >= SEMANTIC_HIGH_CONFIDENCE,
        )
        .map((item) => item.nombre),
      idiomas: (suggestions.idiomas || []).map((item) => item.nombre),
    });
  }, [profile, suggestions]);
  if (!draft) return null;

  function updateList(key, index, field, value) {
    const previous = draft[key][index]?.[field];
    const wasSelected = (selected[key] || []).includes(previous);
    setDraft((current) => ({
      ...current,
      [key]: current[key].map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
    if (field === "nombre")
      setSelected((current) => ({
        ...current,
        [key]: [
          ...(current[key] || []).filter((item) => item !== previous),
          ...(wasSelected && value ? [value] : []),
        ],
      }));
  }
  function removeItem(key, index) {
    const removed = draft[key][index]?.nombre;
    setDraft((current) => ({
      ...current,
      [key]: current[key].filter((_, i) => i !== index),
    }));
    setSelected((current) => ({
      ...current,
      [key]: (current[key] || []).filter((value) => value !== removed),
    }));
  }
  function toggleList(key, value) {
    setSelected((current) => ({
      ...current,
      [key]: (current[key] || []).includes(value)
        ? current[key].filter((item) => item !== value)
        : [...(current[key] || []), value],
    }));
  }
  function addSkill() {
    const item = {
      detectada: "",
      nombre: "",
      normalizada: false,
      skill_id: null,
    };
    setDraft((current) => ({ ...current, skills: [...current.skills, item] }));
  }
  const currentValue = (field) =>
    field === "formacion" ? profile.carrera : profile[field];

  return (
    <section className="cv-detected" aria-labelledby="cv-detected-title">
      <p className="eyebrow">REVISIÓN OBLIGATORIA</p>
      <h3 id="cv-detected-title">Información detectada en tu CV</h3>
      <p>
        Revisá las sugerencias. Incorporarlas solo cambia el formulario; se
        guardan cuando presionás Guardar perfil.
      </p>
      {draft.analisis?.semantica_disponible === false && (
        <p role="status">
          El modelo semántico no estuvo disponible. Las coincidencias exactas y
          los aliases se analizaron con normalidad.
        </p>
      )}
      <div className="cv-detected-fields">
        {textFields.map(([field, label]) =>
          draft[field] ? (
            <label key={field} className="cv-suggestion-field">
              <span>
                <input
                  type="checkbox"
                  checked={Boolean(selected[field])}
                  onChange={(event) =>
                    setSelected((current) => ({
                      ...current,
                      [field]: event.target.checked,
                    }))
                  }
                />{" "}
                {label}
              </span>
              {field === "experiencia_resumen" ? (
                <textarea
                  rows="4"
                  value={draft[field]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  value={draft[field]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              )}
              {currentValue(field) && (
                <small>Actual: {currentValue(field)}</small>
              )}
            </label>
          ) : null,
        )}
      </div>

      <h4>Skills y herramientas</h4>
      <div className="cv-suggestion-list">
        {draft.skills.map((item, index) => (
          <div className="cv-suggestion-row" key={index}>
            <input
              type="checkbox"
              aria-label={`Incorporar ${item.nombre || "skill"}`}
              checked={(selected.skills || []).includes(item.nombre)}
              onChange={() => toggleList("skills", item.nombre)}
            />
            <input
              aria-label="Skill detectada"
              value={item.nombre}
              onChange={(event) =>
                updateList("skills", index, "nombre", event.target.value)
              }
            />
            <small>
              {item.origen === "semantica"
                ? `Sugerencia semántica · ${Math.round(item.confianza * 100)}%`
                : item.normalizada
                  ? "Coincidencia exacta del catálogo"
                  : "Sin normalizar"}
            </small>
            <button type="button" onClick={() => removeItem("skills", index)}>
              Quitar
            </button>
          </div>
        ))}
        <button type="button" className="button button-outline" onClick={addSkill}>
          Agregar skill manualmente
        </button>
      </div>

      <h4>Idiomas</h4>
      <div className="cv-suggestion-list">
        {draft.idiomas.map((item, index) => (
          <div className="cv-suggestion-row" key={index}>
            <input
              type="checkbox"
              aria-label={`Incorporar ${item.nombre}`}
              checked={(selected.idiomas || []).includes(item.nombre)}
              onChange={() => toggleList("idiomas", item.nombre)}
            />
            <input
              aria-label="Idioma detectado"
              value={item.nombre}
              onChange={(event) =>
                updateList("idiomas", index, "nombre", event.target.value)
              }
            />
            <input
              aria-label="Nivel detectado"
              placeholder="Nivel no indicado"
              value={item.nivel}
              onChange={(event) =>
                updateList("idiomas", index, "nivel", event.target.value)
              }
            />
            <button type="button" onClick={() => removeItem("idiomas", index)}>
              Quitar
            </button>
          </div>
        ))}
      </div>

      {draft.experiencias?.length > 0 && (
        <details>
          <summary>Experiencias detectadas ({draft.experiencias.length})</summary>
          {draft.experiencias.map((item, index) => (
            <p key={index}>
              <strong>{item.cargo || "Cargo no indicado"}</strong>
              {item.empresa ? ` en ${item.empresa}` : ""}
              {item.descripcion ? `. ${item.descripcion}` : ""}
            </p>
          ))}
        </details>
      )}
      <button
        type="button"
        className="button button-dark"
        onClick={() => onApply(mergeCvSuggestions(profile, draft, selected))}
      >
        Incorporar selecciones al formulario
      </button>
    </section>
  );
}
