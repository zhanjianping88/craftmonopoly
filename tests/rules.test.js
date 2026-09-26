import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  aiChoice,
  buyProperty,
  currentPlayer,
  finishMove,
  makeRoll,
  rentFor,
  roll,
  resolveTurn,
  stormFeeForRound,
  stormStartsAfterRound,
  upgradeProperty,
} from '../src/rules.js';

const players = [
  { name: 'P1', character: 'steve' },
  { name: 'P2', character: 'alex' },
];

test('storm onset leaves enough setup turns across player counts', () => {
  assert.deepEqual([2, 3, 4, 5, 6, 7, 10].map(stormStartsAfterRound), [20, 14, 14, 12, 12, 12, 12]);
  assert.equal(createGame(players).players[0].money, 2400);
});

test('storm upkeep starts after the setup window and escalates each round', () => {
  const twoPlayerGame = createGame(players);
  twoPlayerGame.round = 20;
  assert.equal(stormFeeForRound(twoPlayerGame), 0);
  twoPlayerGame.round = 21;
  assert.equal(stormFeeForRound(twoPlayerGame), 120);
  twoPlayerGame.round = 22;
  assert.equal(stormFeeForRound(twoPlayerGame), 150);

  const tenPlayerGame = createGame(Array.from({ length: 10 }, (_, index) => ({
    name: `P${index + 1}`,
    character: ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri'][index % 9],
  })));
  tenPlayerGame.round = 13;
  assert.equal(stormFeeForRound(tenPlayerGame), 200);
  tenPlayerGame.round = 14;
  assert.equal(stormFeeForRound(tenPlayerGame), 250);

  const fourPlayerGame = createGame(Array.from({ length: 4 }, (_, index) => ({
    name: `P${index + 1}`,
    character: ['steve', 'alex', 'ari', 'efe'][index],
  })));
  fourPlayerGame.round = 15;
  assert.equal(stormFeeForRound(fourPlayerGame), 150);
  fourPlayerGame.round = 16;
  assert.equal(stormFeeForRound(fourPlayerGame), 190);
});

test('controlling two of three biome plots unlocks monopoly rent', () => {
  const game = createGame(players);
  const meadow = game.board.filter((space) => space.type === 'property' && space.group === 'Meadow');
  meadow[0].owner = 1;
  assert.equal(rentFor(game, meadow[0], game.players[0]), meadow[0].rent);
  meadow[1].owner = 1;
  const owner = game.players[0];
  assert.equal(rentFor(game, meadow[0], owner), Math.round(meadow[0].rent * 1.4));
  assert.equal(rentFor(game, meadow[2], owner), Math.round(meadow[2].rent * 1.4));
});

test('storm upkeep is charged once when the active player rolls', () => {
  const game = createGame(players);
  game.round = 21;
  const before = game.players[0].money;
  const movement = roll(game, 1, { dice: [1, 2], total: 3 });
  assert.equal(movement.stormFee, 120);
  assert.equal(game.players[0].money, before - 120);
  assert.equal(roll(game, 1, { dice: [1, 2], total: 3 }), null);
  assert.equal(game.players[0].money, before - 120);
});

test('the round threshold never ends a match by net-worth scoring', () => {
  const game = createGame(players);
  game.round = 100;
  game.phase = 'decision';
  const result = resolveTurn(game);
  assert.equal(result.ended, false);
  assert.equal(game.phase, 'ready');
  assert.equal(game.winner, null);
});

test('bankruptcy releases plots and the last solvent player wins', () => {
  const game = createGame(players);
  game.players[0].money = -1;
  game.board[1].owner = 1;
  game.players[0].properties.push(1);
  game.phase = 'decision';

  const result = resolveTurn(game);

  assert.equal(result.ended, true);
  assert.equal(result.winner.id, 2);
  assert.equal(game.board[1].owner, null);
  assert.deepEqual(game.players[0].properties, []);
  assert.equal(game.players[0].bankrupt, true);
});

test('representative 2-player and 10-player games end with one solvent survivor', () => {
  const originalRandom = Math.random;
  let seed = 721;
  Math.random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  try {
    for (const count of [2, 10]) {
      const characterIds = ['steve', 'alex', 'ari', 'efe', 'kai', 'makena', 'noor', 'sunny', 'zuri'];
      const game = createGame(Array.from({ length: count }, (_, index) => ({
        name: `P${index + 1}`,
        character: characterIds[index % characterIds.length],
        isAI: true,
      })));
      let turns = 0;

      while (game.phase !== 'finished' && turns < count * 80) {
        const player = currentPlayer(game);
        if (player.skipTurns > 0) {
          game.phase = 'decision';
          let result = resolveTurn(game);
          while (result.skipped && !result.ended) {
            game.phase = 'decision';
            result = resolveTurn(game);
          }
          continue;
        }

        const movement = roll(game, player.id, makeRoll());
        assert.ok(movement, 'active player should be able to roll');
        const landing = finishMove(game);
        game.phase = 'decision';
        if (landing.kind === 'buy' && aiChoice(game, player) === 'buy') {
          buyProperty(game, player.id, landing.space.index);
        } else if (landing.kind === 'message' && landing.title === 'Home sweet home') {
          const space = game.board[player.position];
          const cost = Math.round(space.price * 0.48);
          if (space.level < 3 && player.money > cost + 500 && Math.random() < 0.55) {
            upgradeProperty(game, player.id, space.index);
          }
        }

        let result = resolveTurn(game);
        while (result.skipped && !result.ended) {
          game.phase = 'decision';
          result = resolveTurn(game);
        }
        turns += 1;
      }

      assert.equal(game.phase, 'finished', `${count}-player game should finish within the guard`);
      assert.ok(game.winner, `${count}-player game should have a winner`);
      assert.equal(game.players.filter((player) => player.bankrupt).length, count - 1);
    }
  } finally {
    Math.random = originalRandom;
  }
});
