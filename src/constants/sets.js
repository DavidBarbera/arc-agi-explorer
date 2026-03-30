/**
 * The three dataset splits available in ARC-AGI-2.
 * "train" and "evaluation" include solutions;
 * "test" has no ground-truth solutions (users create them).
 */
export const SETS = ["train", "evaluation", "test"];

/** Human-readable labels for each set tab. */
export const SET_LABELS = {
  train: "Train",
  evaluation: "Eval",
  test: "Test",
};
