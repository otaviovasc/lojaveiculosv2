import type { QuadraStorefrontModel } from "../quadra/quadraAdapter";

export function AuroraTestimonials({
  model,
}: {
  model: QuadraStorefrontModel;
}) {
  if (!model.testimonials.length) return null;
  return (
    <section className="aurora-testimonials" id="depoimentos">
      <div className="aurora-shell">
        <header className="aurora-section-heading">
          <div>
            <p className="aurora-eyebrow">Histórias de quem já escolheu</p>
            <h2>Confiança que continua depois da chave.</h2>
          </div>
          <p>
            {String(model.testimonials.length).padStart(2, "0")} relatos de
            clientes sobre atendimento, procedência e transparência.
          </p>
        </header>

        <div className="aurora-testimonials__track">
          {model.testimonials.map((testimonial, index) => (
            <blockquote
              className={index === 0 ? "is-featured" : undefined}
              key={testimonial.id}
            >
              <span
                aria-hidden="true"
                className="aurora-testimonials__quote-mark"
              >
                “
              </span>
              <p>{testimonial.quote}</p>

              <footer>
                {testimonial.imageUrl ? (
                  <img
                    alt={`Retrato de ${testimonial.name}`}
                    loading="lazy"
                    src={testimonial.imageUrl}
                  />
                ) : (
                  <i aria-hidden="true">{testimonial.name.slice(0, 1)}</i>
                )}
                <div>
                  <strong>{testimonial.name}</strong>
                  <small>{testimonial.role || "Comprador da Loja"}</small>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
