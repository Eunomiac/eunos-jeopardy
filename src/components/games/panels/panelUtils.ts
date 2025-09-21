import type { Game } from "../../../services/games/GameService";

export const isPanelDisabled = (game: Game | null): boolean => game?.status === "lobby";

