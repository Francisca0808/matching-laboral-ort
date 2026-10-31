import { applicationInstructions } from "../lib/opportunities.mjs";
import { safeOfferLink } from "../lib/validation.mjs";
export default function ApplicationInstructions({ job }) {
  const info = applicationInstructions(job);
  return (
    <section className="application-instructions" aria-label="Cómo postularte">
      <h4>Cómo postularte</h4>
      {info.method === "email" ? (
        <>
          <p>
            <b>Postulación por email</b>
          </p>
          <ol>
            <li>Prepará tu CV.</li>
            <li>
              Enviá tu postulación al correo indicado en la publicación:{" "}
              {info.emails.map((email, i) => (
                <span key={email}>
                  {i > 0 ? ", " : ""}
                  <a href={`mailto:${email}`}>{email}</a>
                </span>
              ))}
              .
            </li>
            <li>
              {info.subject ? (
                <>
                  Usá el asunto: <b>{info.subject}</b>.
                </>
              ) : (
                "Revisá en la publicación si se indica un asunto u otros documentos."
              )}
            </li>
          </ol>
          <p>Indicaciones del texto original:</p>
          <blockquote>{info.excerpt}</blockquote>
          <p>
            La app no envía tu CV ni registra una postulación al abrir el
            correo.
          </p>
        </>
      ) : (
        <>
          <p>
            <b>Postulación desde el portal de empleos de ORT</b>
          </p>
          <ol>
            <li>Abrí la publicación original.</li>
            <li>Revisá los requisitos y las instrucciones de postulación.</li>
            <li>Iniciá sesión en el portal de ORT si te lo solicita.</li>
            <li>
              Completá la postulación allí siguiendo lo indicado en la
              publicación.
            </li>
          </ol>
        </>
      )}
      {safeOfferLink(job.enlace) && (
        <a
          className="button button-outline"
          href={safeOfferLink(job.enlace)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ir a la publicación original
        </a>
      )}
    </section>
  );
}
