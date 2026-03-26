/**
 * Pipeline stage scoring signal.
 *
 * Memories declare which stage they belong to.
 * Scoring boosts memories matching the current stage
 * and adjacent stages, deprioritizes distant stages.
 */

const STAGE_ORDER = ['discovery', 'research', 'planning', 'execution', 'review'] as const;
type Stage = typeof STAGE_ORDER[number];

/**
 * Score a memory based on pipeline stage proximity.
 * Returns 0.0 - 1.0 where 1.0 = same stage.
 */
export function scoreStageProximity(memoryStage: string | undefined, currentStage: string): number {
  if (!memoryStage) return 0.3; // untagged memories get a neutral score

  const memIdx = STAGE_ORDER.indexOf(memoryStage as Stage);
  const curIdx = STAGE_ORDER.indexOf(currentStage as Stage);

  if (memIdx === -1 || curIdx === -1) return 0.3;

  const distance = Math.abs(memIdx - curIdx);
  switch (distance) {
    case 0: return 1.0;   // same stage
    case 1: return 0.6;   // adjacent stage
    case 2: return 0.3;   // two stages away
    default: return 0.1;  // far stage
  }
}
