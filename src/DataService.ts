import gameItems from "../data/gameItems.json";

export interface GameItem {
  id: number;
  item_id: string;
  item_name: string;
  item_value: number;
  rarity: number;
  type: string;
  consume: number;
}

export const classifyData: GameItem[] = gameItems;

export const getItemById = (id: number): GameItem | null => {
  return classifyData.find((item) => item.id === id) || null;
};
