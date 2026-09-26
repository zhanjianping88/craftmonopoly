export const CHARACTERS = [
  { id: 'steve', name: 'Steve', color: '#55d889', tone: 0x55d889 },
  { id: 'alex', name: 'Alex', color: '#ff8c56', tone: 0xff8c56 },
  { id: 'ari', name: 'Ari', color: '#75a7ff', tone: 0x75a7ff },
  { id: 'efe', name: 'Efe', color: '#f4d35e', tone: 0xf4d35e },
  { id: 'kai', name: 'Kai', color: '#c78bff', tone: 0xc78bff },
  { id: 'makena', name: 'Makena', color: '#56dbe0', tone: 0x56dbe0 },
  { id: 'noor', name: 'Noor', color: '#ff6e8a', tone: 0xff6e8a },
  { id: 'sunny', name: 'Sunny', color: '#d7a06c', tone: 0xd7a06c },
  { id: 'zuri', name: 'Zuri', color: '#b9d64b', tone: 0xb9d64b },
  { id: 'efe', name: 'Builder', color: '#e8efff', tone: 0xe8efff },
];

const propertySpecs = [
  [1, 'Mossy Hollow', 'Meadow', 420, 90], [2, 'Fernbridge', 'Meadow', 480, 105],
  [3, 'Cloverfield', 'Meadow', 540, 120], [6, 'Sunstone Dunes', 'Desert', 560, 115],
  [7, 'Cactus Crossing', 'Desert', 620, 130], [9, 'Red Mesa', 'Desert', 680, 145],
  [10, 'Pinewatch', 'Taiga', 700, 150], [11, 'Frostpine', 'Taiga', 760, 165],
  [13, 'Timberline', 'Taiga', 820, 180], [14, 'Coral Cove', 'Coast', 850, 185],
  [16, 'Driftwood Bay', 'Coast', 920, 205], [17, 'Tideglass', 'Coast', 980, 220],
  [19, 'Cloudstep', 'Highlands', 1040, 235], [20, 'Eagle Peak', 'Highlands', 1120, 255],
  [22, 'Skyforge', 'Highlands', 1200, 275], [23, 'Glowstone Row', 'Cavern', 1280, 295],
  [25, 'Obsidian Gate', 'Cavern', 1380, 320], [26, 'Diamond District', 'Cavern', 1500, 350],
];

const propertyByIndex = new Map(propertySpecs.map(([index, name, group, price, rent]) => [index, {
  index, type: 'property', name, group, price, rent: Math.round(rent * 1.25), owner: null, level: 0,
}]));

const specialSpaces = new Map([
  [0, { type: 'start', name: 'Spawn Point' }],
  [4, { type: 'event', name: 'Loot Chest' }],
  [5, { type: 'event', name: 'Lucky Block' }],
  [8, { type: 'tax', name: 'Creeper Tax', amount: 260 }],
  [12, { type: 'event', name: 'Lucky Block' }],
  [15, { type: 'rest', name: 'Village' }],
  [18, { type: 'event', name: 'Loot Chest' }],
  [21, { type: 'tax', name: 'Creeper Tax', amount: 340 }],
  [24, { type: 'jail', name: 'Nightfall' }],
  [27, { type: 'event', name: 'Lucky Block' }],
]);

export const BOARD = Array.from({ length: 28 }, (_, index) => ({
  ...(propertyByIndex.get(index) ?? specialSpaces.get(index) ?? { type: 'property', name: `Wildlands ${index}`, group: 'Wildlands', price: 520, rent: 110, owner: null, level: 0 }),
  index,
}));

export const GROUP_COLORS = {
  Meadow: 0x72cc83, Desert: 0xe9b65b, Taiga: 0x689d88,
  Coast: 0x63c9d2, Highlands: 0x9a8bea, Cavern: 0xf06d88,
  Wildlands: 0xb5c77d,
};

export const CARD_EVENTS = [
  { title: 'Supply drop!', body: 'A friendly villager sent you 180 coins.', money: 180, icon: '📦' },
  { title: 'Found emeralds!', body: 'A lucky mining run adds 260 coins.', money: 260, icon: '💎' },
  { title: 'Trading post tax', body: 'The village takes 160 coins.', money: -160, icon: '🧾' },
  { title: 'Fast travel', body: 'Warp ahead 3 spaces. Collect Spawn bonus if you pass it.', move: 3, icon: '🌀' },
  { title: 'Monster raid', body: 'Repair costs: 220 coins.', money: -220, icon: '🧟' },
  { title: 'Builder’s bounty', body: 'Complete a build contract and collect 320 coins.', money: 320, icon: '🪙' },
];

export function stormStartsAfterRound(count) {
  if (count <= 2) return 20;
  if (count <= 4) return 14;
  return 12;
}

export function stormFeeForRound(game) {
  const count = game.players.length;
  const start = game.stormAfterRound;
  if (game.round <= start) return 0;
  const base = count <= 2 ? 120 : count <= 6 ? 150 : 200;
  const increase = count <= 2 ? 30 : count <= 6 ? 40 : 50;
  return base + (game.round - start - 1) * increase;
}

export function createGame(configs) {
  const stormAfterRound = stormStartsAfterRound(configs.length);
  return {
    players: configs.map((config, index) => ({
      id: index + 1, name: config.name || `Player ${index + 1}`,
      character: config.character, isAI: Boolean(config.isAI),
      money: 2400, position: 0, properties: [], skipTurns: 0,
      bankrupt: false, color: CHARACTERS.find((c) => c.id === config.character)?.color ?? '#ffffff',
    })),
    board: BOARD.map((space) => ({ ...space })),
    turn: 0, round: 1, stormAfterRound, phase: 'ready',
    log: ['A new world is waiting. Roll to begin.'],
    winner: null, lastRoll: null, currentEvent: null,
  };
}

export function currentPlayer(game) {
  return game.players[game.turn];
}

export function rentFor(game, space, owner) {
  const rent = Math.round(space.rent * [1, 1.8, 3.2, 5][space.level]);
  const group = game.board.filter((tile) => tile.type === 'property' && tile.group === space.group);
  const controlled = group.filter((tile) => tile.owner === owner.id).length;
  const controlsBiome = controlled >= Math.ceil(group.length * 2 / 3);
  return Math.round(rent * (controlsBiome ? 1.4 : 1));
}

export function makeRoll() {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  return { dice: [a, b], total: a + b };
}

export function roll(game, playerId, result = makeRoll()) {
  const player = currentPlayer(game);
  if (game.phase !== 'ready' || !player || player.id !== playerId || player.bankrupt || player.skipTurns > 0) return null;
  const stormFee = stormFeeForRound(game);
  if (stormFee) {
    player.money -= stormFee;
    game.log.unshift(`${player.name} paid ${stormFee} coins to the World Storm.`);
  }
  game.phase = 'moving';
  game.lastRoll = result;
  const oldPosition = player.position;
  player.position = (player.position + result.total) % game.board.length;
  if (player.position < oldPosition) {
    player.money += 300;
    game.log.unshift(`${player.name} passed Spawn and collected 300 coins.`);
  }
  return { from: oldPosition, to: player.position, steps: result.total, dice: result.dice, stormFee };
}

export function finishMove(game) {
  const player = currentPlayer(game);
  if (!player) return { kind: 'none' };
  const space = game.board[player.position];
  if (space.type === 'start') {
    player.money += 450;
    game.log.unshift(`${player.name} landed on Spawn and collected 450 coins.`);
    return { kind: 'message', title: 'Spawn bonus', body: '+450 coins' };
  }
  if (space.type === 'property') {
    if (space.owner === null) return { kind: 'buy', space };
    if (space.owner === player.id) return { kind: 'message', title: 'Home sweet home', body: 'You own this plot.' };
    const owner = game.players.find((p) => p.id === space.owner);
    const rent = rentFor(game, space, owner);
    player.money -= rent;
    owner.money += rent;
    game.log.unshift(`${player.name} paid ${owner.name} ${rent} coins in rent.`);
    return { kind: 'rent', amount: rent, owner };
  }
  if (space.type === 'tax') {
    player.money -= space.amount;
    game.log.unshift(`${player.name} paid ${space.amount} coins in Creeper Tax.`);
    return { kind: 'tax', amount: space.amount };
  }
  if (space.type === 'event') {
    const card = CARD_EVENTS[Math.floor(Math.random() * CARD_EVENTS.length)];
    player.money += card.money ?? 0;
    if (card.move) {
      const old = player.position;
      player.position = (player.position + card.move) % game.board.length;
      if (player.position < old) player.money += 300;
    }
    game.currentEvent = card;
    game.log.unshift(`${player.name}: ${card.title}`);
    return { kind: 'event', card };
  }
  if (space.type === 'jail') {
    player.skipTurns = 1;
    game.log.unshift(`${player.name} got caught after dark and will miss one turn.`);
    return { kind: 'jail' };
  }
  if (space.type === 'rest') {
    player.money += 160;
    game.log.unshift(`${player.name} traded with the village and earned 160 coins.`);
    return { kind: 'rest', amount: 160 };
  }
  return { kind: 'message', title: 'Wildlands', body: 'The path is clear.' };
}

export function buyProperty(game, playerId, spaceIndex) {
  const player = currentPlayer(game);
  const space = game.board[spaceIndex];
  if (game.phase !== 'decision' || player?.id !== playerId || !space || space.type !== 'property' || space.owner !== null || player.money < space.price) return false;
  player.money -= space.price;
  space.owner = player.id;
  player.properties.push(space.index);
  game.log.unshift(`${player.name} claimed ${space.name} for ${space.price} coins.`);
  return true;
}

export function upgradeProperty(game, playerId, spaceIndex) {
  const player = currentPlayer(game);
  const space = game.board[spaceIndex];
  const cost = space ? Math.round(space.price * 0.48) : Infinity;
  if (game.phase !== 'decision' || player?.id !== playerId || !space || space.owner !== player.id || space.level >= 3 || player.money < cost) return false;
  player.money -= cost;
  space.level += 1;
  game.log.unshift(`${player.name} upgraded ${space.name} to level ${space.level}.`);
  return true;
}

export function resolveTurn(game) {
  const player = currentPlayer(game);
  if (!player) return { ended: true };
  if (player.money < 0) {
    player.bankrupt = true;
    for (const space of game.board) if (space.owner === player.id) space.owner = null;
    player.properties = [];
    game.log.unshift(`${player.name} ran out of coins and left the game.`);
  }
  const alive = game.players.filter((p) => !p.bankrupt);
  if (alive.length <= 1) {
    game.winner = alive[0] ?? null;
    game.phase = 'finished';
    return { ended: true, winner: game.winner };
  }
  const prior = game.turn;
  let next = prior;
  do {
    next = (next + 1) % game.players.length;
    if (next === 0 && prior !== 0) game.round += 1;
  } while (game.players[next].bankrupt);
  game.turn = next;
  const nextPlayer = currentPlayer(game);
  if (nextPlayer.skipTurns > 0) {
    nextPlayer.skipTurns -= 1;
    game.log.unshift(`${nextPlayer.name} missed a turn. Nightfall is rough.`);
    return { skipped: true, player: nextPlayer };
  }
  game.phase = 'ready';
  return { ended: false, player: nextPlayer };
}

export function netWorth(game, player) {
  const land = game.board.filter((space) => space.owner === player.id).reduce((sum, space) => sum + space.price + space.level * Math.round(space.price * 0.48), 0);
  return player.money + land;
}

export function aiChoice(game, player) {
  const space = game.board[player.position];
  if (!space || space.type !== 'property' || space.owner !== null) return 'skip';
  const groupSpaces = game.board.filter((tile) => tile.group === space.group && tile.type === 'property');
  const owned = groupSpaces.filter((tile) => tile.owner === player.id).length;
  const budgetAfter = player.money - space.price;
  return budgetAfter > 320 || (owned > 0 && budgetAfter > 80) ? 'buy' : 'skip';
}
