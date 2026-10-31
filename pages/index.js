import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { getSupabase, api } from "../lib/browser";
import Profile from "../components/Profile";
import Offers from "../components/Offers";
import Admin from "../components/Admin";
function Auth({ client }) {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = e.currentTarget,
      values = new FormData(form);
    const credentials = {
      email: String(values.get("email")).trim(),
      password: String(values.get("password")),
    };
    try {
      const result =
        mode === "signup"
          ? await client.auth.signUp({
              ...credentials,
              options: { emailRedirectTo: window.location.origin },
            })
          : await client.auth.signInWithPassword(credentials);
      if (result.error) {
        const code = result.error.code;
        throw new Error(
          code === "email_not_confirmed"
            ? "Confirmá tu correo antes de iniciar sesión."
            : code === "over_email_send_rate_limit"
              ? "Se alcanzó el límite de correos. Esperá unos minutos e intentá nuevamente."
              : mode === "login"
                ? "No pudimos iniciar sesión. Revisá el correo y la contraseña."
                : "No pudimos crear la cuenta. Revisá tus datos o intentá más tarde.",
        );
      }
      form.reset();
      if (mode === "signup" && !result.data.session)
        setMessage(
          "Revisá tu correo para confirmar la cuenta. Después volvé e iniciá sesión.",
        );
    } catch (err) {
      setMessage(err.message || "No se pudo conectar. Intentá nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-panel" id="acceso">
      <p className="eyebrow">TU PUNTO DE PARTIDA</p>
      <h2>{mode === "login" ? "Entrá a tu cuenta." : "Creá tu cuenta."}</h2>
      <p>
        Guardá tu perfil y consultá las oportunidades cargadas para este
        proyecto.
      </p>
      <div className="tabs">
        <button
          className={"tab " + (mode === "login" ? "active" : "")}
          onClick={() => {
            setMode("login");
            setMessage("");
          }}
          disabled={busy}
          aria-pressed={mode === "login"}
        >
          Iniciar sesión
        </button>
        <button
          className={"tab " + (mode === "signup" ? "active" : "")}
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          disabled={busy}
          aria-pressed={mode === "signup"}
        >
          Registrarme
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Correo electrónico
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={mode === "signup" ? 8 : 1}
            maxLength={128}
            required
          />
        </label>
        {mode === "signup" && (
          <p className="form-note">
            Usá al menos 8 caracteres. Este es un prototipo académico; la cuenta
            no acredita tu vínculo con ORT.
          </p>
        )}
        <button className="button button-dark" disabled={busy || !client}>
          {busy ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
export default function Home() {
  const [client, setClient] = useState(null),
    [session, setSession] = useState(null),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState(""),
    [view, setView] = useState("recommended"),
    [role, setRole] = useState(null),
    [roleError, setRoleError] = useState(""),
    [roleRevision, setRoleRevision] = useState(0);
  const currentUser = useRef(null);
  useEffect(() => {
    const sb = getSupabase();
    setClient(sb);
    if (!sb) {
      setReady(true);
      return;
    }
    let active = true;
    sb.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(data.session);
        setReady(true);
        if (error)
          setNotice("No se pudo recuperar tu sesión. Volvé a ingresar.");
      }
    });
    const { data } = sb.auth.onAuthStateChange((_event, next) => {
      if (active) {
        if (currentUser.current !== next?.user.id) {
          setView("recommended");
          setRole(null);
        }
        currentUser.current = next?.user.id;
        setSession(next);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const userId = session?.user?.id;
  useEffect(() => {
    let active = true;
    setRole(null);
    setRoleError("");
    if (userId)
      api("/api/sesion")
        .then((r) => {
          if (active) setRole(r.role);
        })
        .catch((e) => {
          if (active) setRoleError(e.message);
        });
    return () => {
      active = false;
    };
  }, [userId, roleRevision]);
  async function logout() {
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setSession(null);
      setRole(null);
      setView("recommended");
      setNotice("");
    } catch {
      setNotice("No se pudo cerrar la sesión. Intentá nuevamente.");
    }
  }
  return (
    <>
      <Head>
        <title>Matching Laboral · ORT</title>
        <meta
          name="description"
          content="Tu perfil y oportunidades laborales con afinidad explicable. Proyecto académico ORT."
        />
      </Head>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>
      <header className="header">
        <a className="brand" href="/">
          <span className="brand-icon">m.</span>
          <span>
            matching<span className="brand-sub">LABORAL · PROYECTO ORT</span>
          </span>
        </a>
        {session ? (
          <nav aria-label="Principal">
            {role === "estudiante" &&
              [
                ["recommended", "Oportunidades"],
                ["profile", "Mi perfil"],
                ["saved", "Guardadas"],
                ["discarded", "Descartadas"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className="nav-button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                >
                  {label}
                </button>
              ))}
            <button className="button button-outline" onClick={logout}>
              Cerrar sesión
            </button>
          </nav>
        ) : (
          <a className="button button-outline" href="#acceso">
            Ingresar
          </a>
        )}
      </header>
      <main id="contenido">
        {notice && <p role="alert">{notice}</p>}
        {!ready ? (
          <p role="status">Cargando…</p>
        ) : !client ? (
          <section className="auth-panel">
            <h1>Estamos preparando la aplicación.</h1>
            <p>
              Falta completar la conexión con la base de datos. Intentá
              nuevamente más tarde.
            </p>
          </section>
        ) : session ? (
          <div key={session.user.id}>
            {roleError ? (
              <p role="alert">
                {roleError}{" "}
                <button onClick={() => setRoleRevision((x) => x + 1)}>
                  Reintentar
                </button>
              </p>
            ) : !role ? (
              <p role="status">Verificando acceso…</p>
            ) : role === "admin" ? (
              <Admin />
            ) : view === "profile" ? (
              <Profile />
            ) : (
              <Offers key={view} view={view} />
            )}
          </div>
        ) : (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">TU CARRERA EMPIEZA A CONECTAR</p>
                <h1>
                  Tu próximo paso.
                  <br />
                  <em>Más cerca de vos.</em>
                </h1>
                <p className="hero-description">
                  Explorá oportunidades de ORT según tus intereses, habilidades
                  y disponibilidad.
                </p>
                <p className="hero-note">
                  Afinidad explicable para ayudarte a decidir tu próximo paso.
                </p>
              </div>
              <Auth client={client} />
            </section>
          </>
        )}
      </main>
      <footer>
        <span className="brand">matching laboral</span>
        <p>Proyecto académico · ORT Uruguay</p>
        <span>Primera versión</span>
      </footer>
    </>
  );
}
