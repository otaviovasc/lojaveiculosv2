import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";
import type { BuilderBlockProps } from "./pageBuilderRenderTypes";
import { boolProp, recordArrayProp, textProp } from "./pageBuilderRenderUtils";
import { VehicleVitrineImage } from "./VehicleVitrineComponents";

export function VehicleVitrineGallery({
  component,
  context,
}: BuilderBlockProps) {
  const images = recordArrayProp(component.props.images).filter((image) =>
    textProp(image.url),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const lightboxEnabled =
    boolProp(component.props.lightboxEnabled, true) && !context.preview;
  if (!images.length) return null;
  const activeIndex =
    selectedIndex !== null ? Math.min(selectedIndex, images.length - 1) : 0;
  const selected = images[activeIndex];
  const navigate = (direction: number) =>
    setSelectedIndex((activeIndex + direction + images.length) % images.length);
  return (
    <section className="vehicle-vitrine-gallery bg-panel" id="gallery">
      <div className="public-storefront-shell px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Galeria do veículo
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-app-text">
              {textProp(component.props.title) ?? "Veja cada detalhe"}
            </h2>
            {textProp(component.props.subtitle) ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                {textProp(component.props.subtitle)}
              </p>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-muted">
            {images.length} {images.length === 1 ? "foto" : "fotos"}
          </p>
        </div>
        <div
          className={`vehicle-vitrine-gallery-grid mt-8 grid gap-4 ${images.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-4xl"}`}
        >
          {images.map((image, index) => {
            const photo = (
              <VehicleVitrineImage
                alt={textProp(image.alt) ?? `Foto ${index + 1} do veículo`}
                src={textProp(image.url)}
                className="aspect-[4/3] w-full object-cover"
              />
            );
            return (
              <figure className="min-w-0" key={textProp(image.id) ?? index}>
                {lightboxEnabled ? (
                  <button
                    aria-label={`Ver foto ${index + 1} de ${images.length}`}
                    className="group relative block w-full overflow-hidden rounded-xl border border-line bg-app text-left"
                    onClick={() => setSelectedIndex(index)}
                    title={`Ampliar foto ${index + 1}`}
                    type="button"
                  >
                    {photo}
                    <span className="absolute bottom-3 right-3 rounded bg-panel p-2 text-app-text">
                      <Expand aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-line">
                    {photo}
                  </div>
                )}
                {boolProp(component.props.showCaptions, true) &&
                textProp(image.caption) ? (
                  <figcaption className="mt-2 text-sm text-muted">
                    {textProp(image.caption)}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      </div>
      <Dialog
        open={selectedIndex !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedIndex(null);
        }}
      >
        <DialogContent
          className="public-light-surface vehicle-vitrine-lightbox w-[calc(100vw-2rem)] max-w-5xl overflow-hidden"
          padding="none"
          radius="xl"
          surface="panel"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              navigate(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
        >
          <div className="border-b border-line px-5 py-5 pr-14">
            <DialogTitle>Fotos do veículo</DialogTitle>
            <p aria-live="polite" className="mt-1 text-sm text-muted">
              Foto {activeIndex + 1} de {images.length}
            </p>
          </div>
          <VehicleVitrineImage
            alt={
              textProp(selected?.alt) ?? `Foto ${activeIndex + 1} do veículo`
            }
            src={textProp(selected?.url)}
            className="h-[min(65svh,42rem)] w-full object-contain"
          />
          {images.length > 1 ? (
            <div className="flex items-center justify-between border-t border-line p-3">
              <button
                aria-label="Foto anterior"
                className="rounded border border-line bg-panel p-3 text-app-text"
                onClick={() => navigate(-1)}
                title="Foto anterior"
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <span className="text-xs text-muted">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                aria-label="Próxima foto"
                className="rounded border border-line bg-panel p-3 text-app-text"
                onClick={() => navigate(1)}
                title="Próxima foto"
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
