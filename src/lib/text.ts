/** Shorten a model-ish label for dense chart annotations. */
export function scatterLabel(label: string, max = 22): string {
  const model = label.split(' · ')[0]?.trim() || label
  if (model.length <= max) return model
  return `${model.slice(0, max - 1)}…`
}
