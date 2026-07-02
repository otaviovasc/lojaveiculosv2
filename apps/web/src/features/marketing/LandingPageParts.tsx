import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/ui";
import { LandingAuthActions } from "./LandingAuthActions";
import {
  landingFeatures,
  landingOutcomes,
  landingSteps,
} from "./landingContent";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[88svh] items-center overflow-hidden">
      <video
        aria-label="Demonstração da plataforma Loja Veículos"
        autoPlay
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        loop
        muted
        playsInline
        src="https://cdn.lojaveiculos.com.br/videos-lv/landings/VSL%20LV%202.mp4"
      />
      <div className="absolute inset-0 -z-10 bg-black/68" />
      <LandingNav />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-14 pt-28 sm:px-8 lg:px-10">
        <div className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/8 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-emerald-200">
            <Sparkles className="size-3.5" />
            SaaS para lojas de veiculos
          </span>
          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.95] tracking-normal sm:text-6xl lg:text-7xl">
            Loja Veiculos
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/82 sm:text-xl">
            Venda online com site profissional, estoque organizado, leads no
            WhatsApp, CRM, financeiro e publicacao em marketplaces no mesmo
            painel.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LandingAuthActions primaryLabel="Comecar agora" />
            <a
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-black text-white transition hover:bg-white/10"
              href="#como-funciona"
            >
              Ver fluxo
            </a>
          </div>
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

export function OutcomeStrip() {
  return (
    <section className="border-y border-line bg-panel text-app-text">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-10">
        {["Sem adesao", "Site incluido", "Operacao auditada"].map((item) => (
          <div
            className="flex items-center gap-3 text-sm font-black"
            key={item}
          >
            <Check className="size-5 text-emerald-600" />
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section
      className="bg-app px-5 py-16 text-app-text sm:px-8 lg:px-10"
      id="como-funciona"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-accent">
          Como funciona
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">
          Da conta Clerk ao site publicado, em um fluxo direto.
        </h2>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {landingSteps.map(([label, text], index) => (
            <article
              className="rounded-md border border-line bg-panel p-6 shadow-sm"
              key={label}
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-black text-white">
                {index + 1}
              </span>
              <h3 className="mt-5 text-xl font-black">{label}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureSection() {
  return (
    <section className="bg-panel px-5 py-16 text-app-text sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-700">
              Plataforma
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">
              Tudo o que a loja usa no dia a dia.
            </h2>
          </div>
          <LandingAuthActions primaryLabel="Testar com Clerk" />
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map(({ icon: Icon, label, text }) => (
            <article className="rounded-md border border-line p-5" key={label}>
              <Icon className="size-6 text-accent" />
              <h3 className="mt-4 text-lg font-black">{label}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-primary px-5 py-16 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-200">
            Loja Veiculos V2
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black sm:text-4xl">
            Entre, crie sua loja e continue direto no painel operacional.
          </h2>
        </div>
        <LandingAuthActions primaryLabel="Criar minha loja" />
      </div>
    </section>
  );
}
