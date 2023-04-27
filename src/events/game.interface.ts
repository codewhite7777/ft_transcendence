export interface GameData {
  left: PlayerObject;
  right: PlayerObject;
  ball: BallObject;
  type: GameType;
}

export function createGameData(
  left: PlayerObject,
  right: PlayerObject,
  ball: BallObject,
  type: GameType,
): GameData {
  return { left, right, ball, type };
}

const canvasW = 600;
const canvasH = 400;
const moveValue = 4;

export interface GameType {
  flag: boolean;
}

export interface BallObject {
  x: number;
  y: number;
  radius: number;
  speed: number;
  velocityX: number;
  velocityY: number;
}

export interface PlayerObject {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  state: number;
  nick: string;
}

export function createGameType(flag = false): GameType {
  return { flag };
}

export function createLeftPlayerObject(
  x = 0,
  y: number = canvasH / 2 - 100 / 2,
  width = 10,
  height = 100,
  score = 0,
  state = 0,
  nick = '',
): PlayerObject {
  return { x, y, width, height, score, state, nick };
}

export function createRightPlayerObject(
  x: number = canvasW - 10,
  y: number = canvasH / 2 - 100 / 2,
  width = 10,
  height = 100,
  score = 0,
  state = 0,
  nick = '',
): PlayerObject {
  return { x, y, width, height, score, state, nick };
}

export function createBallObject(
  x: number = canvasW / 2,
  y: number = canvasH / 2,
  radius = 10,
  speed = 5,
  velocityX = 5,
  velocityY = 5,
): BallObject {
  return { x, y, radius, speed, velocityX, velocityY };
}

export interface SocketInfo {
  roomName: string;
  playerId: number;
}

export interface QueueData {
  socketId: string;
  gameType: boolean;
}
