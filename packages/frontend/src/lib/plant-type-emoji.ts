export const PLANT_TYPE_EMOJI: Record<string, string> = {
  vegetable: '🥬',
  fruit: '🍎',
  herb: '🌿',
  flower: '💐',
  tree: '🌳',
  shrub: '🌿',
  vine: '🍇',
  grass: '🌾',
  succulent: '🪴',
  other: '🌱',
};

/** Returns the category emoji for a plant type, falling back to 🌱 */
export function plantTypeEmoji(plantType?: string | null): string {
  return (plantType && PLANT_TYPE_EMOJI[plantType]) || PLANT_TYPE_EMOJI.other;
}
