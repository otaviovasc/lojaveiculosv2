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
