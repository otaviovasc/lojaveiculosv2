import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import { LandingHeroShader } from "./LandingHeroShader";
import { landingOutcomes } from "./landingContent";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[88svh] items-center overflow-hidden">
      <LandingHeroShader />
      <div className="absolute inset-0 -z-10 bg-black/68" />
      <LandingNav />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-14 pt-28 sm:px-8 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr] lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-white">
              <Sparkles className="size-3.5 text-accent" />
              SaaS para lojas de veículos
            </span>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-normal sm:text-6xl lg:text-7xl">
              Loja Veículos
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/82 sm:text-xl">
              Site profissional, estoque organizado, CRM com WhatsApp,
              financeiro, comissões e emissão de notas no mesmo painel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LandingAuthActions primaryLabel="Começar agora" />
              <a
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
                href="#como-funciona"
              >
                Ver fluxo
              </a>
            </div>
          </div>
          <HeroAppPreview />
        </div>
        <div className="grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {landingOutcomes.map(([label, text]) => (
            <div
              className="rounded-md border border-white/12 bg-white/8 p-4 backdrop-blur"
              key={label}
            >
              <p className="text-sm font-black text-white">{label}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/68">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroAppPreview() {
  return (
    <figure className="overflow-hidden rounded-lg border border-white/15 bg-black/40 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/6 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-white/25" />
        <span className="size-2.5 rounded-full bg-white/25" />
        <span className="size-2.5 rounded-full bg-white/25" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white/8 px-3 py-1 text-xs font-semibold text-white/55">
          app.lojaveiculos.com.br/estoque
        </span>
      </div>
      <img
        alt="Painel de estoque da Loja Veículos com veículos, status e ações operacionais"
        className="block aspect-[16/10] w-full object-cover object-top"
        decoding="async"
        src="/marketing/hero-app-shot.jpg"
      />
    </figure>
  );
}

export function LandingNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3" to="/">
          <Logo className="h-9 w-auto" variant="full-white" />
        </Link>
        <div className="flex items-center gap-2">
          <LandingAuthActions compact primaryLabel="Criar conta" />
        </div>
      </nav>
    </header>
  );
}
