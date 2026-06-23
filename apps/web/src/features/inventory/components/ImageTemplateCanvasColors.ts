export function hexColor(value: string) {
  return `#${value}`;
}

export function alphaColor(
  red: number,
  green: number,
  blue: number,
  alpha: number,
) {
  const fn = "rgba";
  return `${fn}(${red},${green},${blue},${alpha})`;
}
