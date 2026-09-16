export function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, "");
}