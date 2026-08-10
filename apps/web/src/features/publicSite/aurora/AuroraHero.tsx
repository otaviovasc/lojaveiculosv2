import {
  ArrowDownRight,
  Pause,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";

export function AuroraHero({
  listingCount,
  model,
  onSearch,
  query,
}: {
  listingCount: number;
  model: QuadraStorefrontModel;
  onSearch: (query: string) => void;
  query: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPaused, setVideoPaused] = useState(true);
  const normalizedTitle = model.hero.title.replaceAll("**", "");
  const title =
    normalizedTitle === "Nossas Ofertas"
      ? "Escolha o extraordinário. Dirija o seu."
      : normalizedTitle;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    document.getElementById("estoque")?.scrollIntoView({ behavior: "smooth" });
  };
  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setVideoPaused(false);
      } catch {
        setVideoPaused(true);
      }
      return;
    }
    video.pause();
    setVideoPaused(true);
  };

  return (
    <section className="aurora-hero" id="inicio">
      <div className="aurora-hero__texture" aria-hidden="true" />
      <div className="aurora-shell aurora-hero__grid">
        <div className="aurora-hero__copy">
          <p className="aurora-eyebrow">
            <Sparkles aria-hidden="true" /> Curadoria automotiva
          </p>
          <h1>{title}</h1>
          <p className="aurora-hero__subtitle">{model.hero.subtitle}</p>
          <div className="aurora-hero__stats" aria-label="Resumo do estoque">
            <div>
              <strong>{listingCount}</strong>
              <span>veículos disponíveis</span>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" />
              <span>Compra com procedência</span>
            </div>
          </div>
          <form className="aurora-search" onSubmit={submit}>
            <Search aria-hidden="true" />
            <input
              aria-label="Buscar no estoque"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Busque por marca, modelo ou versão"
              type="search"
              value={query}
            />
            <button type="submit">
              Explorar <ArrowDownRight aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="aurora-hero__visual">
          {model.hero.imageUrl && model.hero.imageKind === "video" ? (
            <video
              aria-label="Vídeo de destaque da loja"
              loop
              muted
              playsInline
              preload="metadata"
              ref={videoRef}
              src={model.hero.imageUrl}
            />
          ) : model.hero.imageUrl ? (
            <img
              alt="Veículo em destaque"
              fetchPriority="high"
              src={model.hero.imageUrl}
            />
          ) : (
            <div className="aurora-hero__placeholder" aria-hidden="true" />
          )}
          {model.hero.imageKind === "video" && model.hero.imageUrl ? (
            <button
              aria-label={videoPaused ? "Reproduzir vídeo" : "Pausar vídeo"}
              className="aurora-hero__video-toggle"
              onClick={() => void toggleVideo()}
              type="button"
            >
              {videoPaused ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
            </button>
          ) : null}
          <a className="aurora-hero__visual-label" href="#estoque">
            <small>Seleção da loja</small>
            <strong>Conheça o estoque</strong>
            <ArrowDownRight aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
