export function calculateTotalScore(input: {
  fitScore: number;
  timingScore: number;
  opportunityScore: number;
  contactScore: number;
  confidence: number;
}) {
  return Math.round(
    input.fitScore * 0.3 +
      input.timingScore * 0.25 +
      input.opportunityScore * 0.2 +
      input.contactScore * 0.15 +
      input.confidence * 0.1
  );
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
