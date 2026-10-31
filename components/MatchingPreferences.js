import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/browser";
import {
  DEFAULT_MATCHING_WEIGHTS,
  normalizeWeights,
} from "../lib/matching-weights.mjs";

const criteria = [
  ["skills", "Skills"],
  ["area", "Área de interés"],
  ["formacion", "Carrera y formación"],
  ["modalidad", "Modalidad"],
  ["jornada", "Jornada"],
  ["horario", "Horario"],
];

export default function MatchingPreferences({ initialPreferences, onSaved }) {
  const initial = initialPreferences || {
    mode: "recommended",
    weights: DEFAULT_MATCHING_WEIGHTS,
  };
  const [mode, setMode] = useState(initial.mode);
  const [weights, setWeights] = useState(initial.weights);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMode(initial.mode);
    setWeights(initial.weights);
  }, [initial.mode, initial.weights]);
  const normalized = useMemo(
    () => normalizeWeights({ ...weights, salario: 0 }),
    [weights],
  );

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const result = await api("/api/preferencias-matching", {
        method: "PUT",
        body: JSON.stringify({ weights: { ...weights, salario: 0 } }),
      });
      setMode(result.preferences.mode);
      setWeights(result.preferences.weights);
      onSaved(result.preferences);
      setMessage(
        "Pesos personalizados guardados. Las oportunidades se reordenarán al volver a recomendaciones.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setMessage("");
    try {
      const result = await api("/api/preferencias-matching", {
        method: "DELETE",
      });
      setMode(result.preferences.mode);
      setWeights(result.preferences.weights);
      onSaved(result.preferences);
      setMessage("Restablecimos los pesos recomendados.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="matching-preferences" aria-labelledby="matching-preferences-title">
      <p className="eyebrow">PREFERENCIAS DE MATCHING</p>
      <h3 id="matching-preferences-title">
        ¿Qué es más importante para vos al buscar trabajo?
      </h3>
      <p>
        Estos valores cambian la influencia de cada criterio y pueden modificar
        el orden de tus recomendaciones.
      </p>
      <p className="weight-mode">
        Configuración actual: <strong>{mode === "custom" ? "Pesos personalizados" : "Pesos recomendados"}</strong>
      </p>
      <fieldset disabled={busy}>
        <div className="weight-sliders">
          {criteria.map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[key] ?? 0}
                onChange={(event) =>
                  setWeights((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
              <output>{normalized[key]}%</output>
            </label>
          ))}
          <div className="disabled-weight" aria-disabled="true">
            <span>Salario</span>
            <small>
              No disponible: las ofertas actuales no publican montos comparables.
            </small>
            <output>0%</output>
          </div>
        </div>
        <p className="normalized-total">
          Distribución final al guardar: <strong>100%</strong>
        </p>
        <div className="weight-actions">
          <button type="button" className="button button-dark" onClick={save}>
            {busy ? "Guardando…" : "Guardar pesos personalizados"}
          </button>
          <button type="button" className="button button-outline" onClick={reset}>
            Restablecer pesos recomendados
          </button>
        </div>
      </fieldset>
      <p role="status">{message}</p>
    </section>
  );
}
