/**
 * 등교 미니게임 레지스트리 — 새 게임은 여기에만 등록하면 호스트에서 불러 씀
 */
import BreakoutGame from './breakout/BreakoutGame';
import HunminGame from './hunmin/HunminGame';

/** @typedef {{ id: string, title: string, Component: import('react').ComponentType<any> }} MiniGameDef */

/** @type {Record<string, MiniGameDef>} */
export const MINI_GAMES = {
  hunmin: {
    id: 'hunmin',
    title: '훈민정음',
    Component: HunminGame,
  },
  breakout: {
    id: 'breakout',
    title: '벽돌깨기',
    Component: BreakoutGame,
  },
};

/** 등교 세션 기본 게임 */
export const DEFAULT_COMMUTE_GAME_ID = 'hunmin';

export function getMiniGame(id) {
  return MINI_GAMES[id] || MINI_GAMES[DEFAULT_COMMUTE_GAME_ID];
}
