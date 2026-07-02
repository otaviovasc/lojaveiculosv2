import { StorefrontImagePicker } from "./StorefrontImagePicker";

export function WebsiteBuilderImageUrlField({
  imageClassName,
  label,
  onChange,
  value,
}: {
  imageClassName: string;
  label: string;
  onChange: (value: string | null) => void;
  value: string;
}) {
  return (
    <StorefrontImagePicker
      imageClassName={imageClassName}
      label={label}
      onChange={onChange}
      value={value}
    />
  );
}

export function WebsiteBuilderHeroImageField({
  onChange,
  value,
}: {
  onChange: (value: string | null) => void;
  value: string;
}) {
  return (
    <StorefrontImagePicker
      imageClassName="h-40 w-full rounded-lg"
      label="Imagem de Fundo"
      onChange={onChange}
      value={value}
    />
  );
}
