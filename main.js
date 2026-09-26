import { CHARACTERS, aiChoice, buyProperty, createGame, currentPlayer, finishMove, makeRoll, netWorth, roll, resolveTurn, stormFeeForRound, stormStartsAfterRound, upgradeProperty } from './src/rules.js?v=4';
import { createWorld } from './src/world.js?v=3';

const $ = (id) => document.getElementById(id);
const world = createWorld($('world'));
let chosenCharacter = CHARACTERS[0].id;
let game = null;
let pendingLanding = null;
let muted = false;
let busy = false;
let aiTimer = null;

const screens = {
  intro: $('screenIntro'), character: $('screenCharacter'), table: $('screenTable'),
  game: $('screenGame'), finished: $('screenFinished'),
};

function showScreen(name) {
  document.body.classList.toggle('is-board-live', name === 'game' || name === 'finished');
  Object.entries(screens).forEach(([key, screen]) => {
    const active = key === name;
    screen.hidden = !active;
    screen.classList.toggle('is-active', active);
  });
  if (name === 'game' || name === 'intro') world.render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function character(id) {
  return CHARACTERS.find((item) => item.id === id) ?? CHARACTERS[0];
}

function renderCharacterChoices() {
  $('characterGrid').innerHTML = CHARACTERS.slice(0, 9).map((item) => `
    <button class="character-option ${item.id === chosenCharacter ? 'selected' : ''}" data-character="${item.id}" aria-pressed="${item.id === chosenCharacter}">
      <span class="character-portrait"><img src="./player/${item.id}.png" alt="" loading="lazy"></span>
      <strong>${item.name}</strong><small>BLOCK BUILDER</small>
    </button>`).join('');
  $('characterGrid').querySelectorAll('[data-character]').forEach((button) => {
    button.addEventListener('click', () => {
      chosenCharacter = button.dataset.character;
      renderCharacterChoices();
    });
  });
  hydrateAvatars($('characterGrid'));
}

function clampPlayerCount(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(2, Math.min(10, Number.isFinite(parsed) ? parsed : 2));
}

function renderRoster() {
  const count = clampPlayerCount($('playerCount').value);
  $('playerCount').value = count;
  const stormAfterRound = stormStartsAfterRound(count);
  $('roundEstimate').textContent = `STORM AFTER ${stormAfterRound} ROUNDS`;
  $('roster').innerHTML = Array.from({ length: count }, (_, index) => {
    const defaultCharacter = index === 0 ? chosenCharacter : CHARACTERS[index % 9].id;
    const playerCharacter = index === 0 ? chosenCharacter : ($(`rosterCharacter${index}`)?.value ?? defaultCharacter);
    const type = index === 0 ? 'human' : ($(`rosterType${index}`)?.value ?? (index === 1 ? 'ai' : 'human'));
    const avatar = character(playerCharacter);
    return `<div class="roster-row">
      <img src="./player/${avatar.id}.png" alt="">
      <label><strong>${index === 0 ? 'YOU' : `PLAYER ${index + 1}`}</strong><small>${index === 0 ? 'YOUR BUILDER' : 'CHOOSE A BUILDER'}</small></label>
      ${index === 0
        ? `<select aria-label="Your player type" disabled><option>HUMAN</option></select>`
        : `<select id="rosterCharacter${index}" aria-label="Player ${index + 1} character">${CHARACTERS.slice(0, 9).map((item) => `<option value="${item.id}" ${item.id === playerCharacter ? 'selected' : ''}>${item.name}</option>`).join('')}</select>
           <select id="rosterType${index}" aria-label="Player ${index + 1} type"><option value="human" ${type === 'human' ? 'selected' : ''}>HUMAN</option><option value="ai" ${type === 'ai' ? 'selected' : ''}>AI BOT</option></select>`}
    </div>`;
  }).join('');
  $('roster').querySelectorAll('select').forEach((select) => select.addEventListener('change', renderRoster));
  hydrateAvatars($('roster'));
}

function startMatch() {
  clearTimeout(aiTimer);
  busy = false;
  const count = clampPlayerCount($('playerCount').value);
  const configs = Array.from({ length: count }, (_, index) => ({
    character: index === 0 ? chosenCharacter : ($(`rosterCharacter${index}`)?.value ?? CHARACTERS[index % 9].id),
    isAI: index > 0 && $(`rosterType${index}`)?.value === 'ai',
    name: index === 0 ? 'YOU' : `PLAYER ${index + 1}`,
  }));
  game = createGame(configs);
  game.phase = 'ready';
  pendingLanding = null;
  world.sync(game);
  $('playerCountLabel').textContent = String(count).padStart(2, '0');
  $('roundReadout').innerHTML = `ROUND 1 <span>STORM IN ${game.stormAfterRound} ROUNDS</span>`;
  $('diceReadout').innerHTML = '<span>?</span><b>+</b><span>?</span>';
  $('gameToast').hidden = true;
  $('actionCard').hidden = true;
  renderGame();
  showScreen('game');
  scheduleAI();
}

function renderGame() {
  if (!game) return;
  const active = currentPlayer(game);
  const stormFee = stormFeeForRound(game);
  const stormStatus = stormFee
    ? `WORLD STORM · −${stormFee} / TURN`
    : `STORM IN ${Math.max(0, game.stormAfterRound - game.round + 1)} ROUNDS`;
  $('roundReadout').innerHTML = `ROUND ${game.round} <span>${stormStatus}</span>`;
  $('playerList').innerHTML = game.players.map((player) => {
    const face = character(player.character);
    return `<div class="player-chip ${player.id === active.id ? 'active' : ''} ${player.bankrupt ? 'out' : ''}" style="--player-color:${player.color}">
      <img src="./player/${face.id}.png" alt=""><div><strong>${player.name}</strong><small>${player.bankrupt ? 'OUT OF COINS' : player.isAI ? 'AI BUILDER' : player.id === active.id ? 'YOUR TURN' : 'AT THE TABLE'}</small></div><span class="player-cash">${player.bankrupt ? '—' : `◈ ${player.money}`}</span>
    </div>`;
  }).join('');
  const face = character(active.character);
  $('activePlayer').innerHTML = `<img src="./player/${face.id}.png" alt=""><div><strong>${active.name}</strong><small>${active.isAI ? 'AI builder is thinking…' : 'Your move. Make it count.'}</small></div>`;
  $('rollButton').disabled = busy || active.isAI || game.phase !== 'ready';
  $('rollButton').hidden = game.phase !== 'ready';
  $('actionCard').hidden = true;
  $('activityList').innerHTML = game.log.slice(0, 4).map((line) => `<div class="activity-item">${escapeHtml(line)}</div>`).join('');
  hydrateAvatars($('playerList'));
  hydrateAvatars($('activePlayer'));
}

async function takeTurn() {
  if (!game || busy || game.phase !== 'ready') return;
  const player = currentPlayer(game);
  if (!player || player.isAI || player.bankrupt) return;
  await runRoll(player);
}

async function runRoll(player) {
  if (!game || busy) return;
  const result = makeRoll();
  const movement = roll(game, player.id, result);
  if (!movement) return;
  busy = true;
  renderGame();
  playTone(440, .07);
  await world.animateRoll(result.dice);
  $('diceReadout').innerHTML = `<span>${result.dice[0]}</span><b>+</b><span>${result.dice[1]}</span>`;
  await world.movePlayer(game, player.id, movement.from, movement.to, movement.steps);
  world.sync(game);
  world.highlight(player.position);
  const landing = finishMove(game);
  game.phase = 'decision';
  pendingLanding = landing;
  busy = false;
  renderGame();
  handleLanding(player, landing, movement.stormFee);
}

function handleLanding(player, landing, stormFee = 0) {
  if (!game || game.phase !== 'decision') return;
  const stormNote = stormFee ? ` World Storm upkeep already deducted ${stormFee} coins.` : '';
  if (landing.kind === 'buy') {
    const cost = landing.space.price;
    if (player.isAI) {
      aiTimer = setTimeout(() => {
        if (aiChoice(game, player) === 'buy') buyProperty(game, player.id, landing.space.index);
        finishDecision();
      }, 850);
      return;
    }
    if (player.money < cost) {
      showAction('Not enough coins', `${landing.space.name} costs ${cost}, but you have ${player.money}.${stormNote}`, [
        { label: 'CONTINUE', primary: true, run: finishDecision },
      ]);
      return;
    }
    showAction('Open land', `${landing.space.name} is unclaimed. Claim it for ${cost} coins?`, [
      { label: `CLAIM · ${cost}`, primary: true, run: () => { buyProperty(game, player.id, landing.space.index); finishDecision(); } },
      { label: 'PASS', run: finishDecision },
    ]);
    return;
  }
  if (landing.kind === 'message' && landing.title === 'Home sweet home') {
    const space = game.board[player.position];
    const cost = Math.round(space.price * .48);
    if (player.isAI) {
      aiTimer = setTimeout(() => {
        if (space.level < 3 && player.money > cost + 500 && Math.random() < .55) upgradeProperty(game, player.id, space.index);
        finishDecision();
      }, 600);
      return;
    }
    const actions = [];
    if (space.level < 3 && player.money >= cost) actions.push({ label: `UPGRADE · ${cost}`, primary: true, run: () => { upgradeProperty(game, player.id, space.index); finishDecision(); } });
    actions.push({ label: 'KEEP MOVING', run: finishDecision });
    showAction(space.name, `Your plot is level ${space.level}. ${space.level < 3 ? `Upgrade it to pressure every rival who lands here.` : 'This plot is fully upgraded.'}${stormNote}`, actions);
    return;
  }
  if (landing.kind === 'event') {
    world.sync(game);
    showEvent({ ...landing.card, body: `${landing.card.body}${stormNote}` }, finishDecision);
    return;
  }
  if (landing.kind === 'rent') {
    showToast(`RENT PAID · ${landing.amount}`, `Coins sent to ${landing.owner.name}.${stormNote}`);
  } else if (landing.kind === 'tax') {
    showToast(`CREEPER TAX · ${landing.amount}`, `The village has its ways.${stormNote}`);
  } else if (landing.kind === 'jail') {
    showToast('NIGHTFALL!', `You lose your next turn. Keep an eye on the moon.${stormNote}`);
  } else if (landing.kind === 'rest') {
    showToast('VILLAGE TRADE · +160', `A good deal, for once.${stormNote}`);
  } else if (landing.kind === 'message') {
    showToast(landing.title, `${landing.body}${stormNote}`);
  } else if (landing.kind === 'none') {
    showToast('THE PATH IS CLEAR', 'Keep moving.');
  } else if (landing.kind === 'start') {
    showToast('SPAWN BONUS · +450', 'Fresh start, fresh coins.');
  }
  if (player.isAI) aiTimer = setTimeout(finishDecision, 850);
  else showAction('Your move is done', 'Ready to see what the next roll brings?', [{ label: 'CONTINUE', primary: true, run: finishDecision }]);
}

function showAction(title, description, actions) {
  const card = $('actionCard');
  card.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p><div class="action-buttons">${actions.map((action, index) => `<button class="button ${action.primary ? 'button-primary' : 'button-secondary'}" data-action="${index}">${escapeHtml(action.label)}</button>`).join('')}</div>`;
  card.hidden = false;
  card.querySelectorAll('[data-action]').forEach((button, index) => button.addEventListener('click', actions[index].run));
}

function showToast(title, detail) {
  const toast = $('gameToast');
  toast.innerHTML = `${escapeHtml(title)}<small>${escapeHtml(detail)}</small>`;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 1800);
}

function showEvent(card, onContinue) {
  $('eventIcon').textContent = card.icon;
  $('eventTitle').textContent = card.title;
  $('eventBody').textContent = card.body;
  $('modalBackdrop').hidden = false;
  const button = $('eventContinue');
  button.onclick = () => {
    $('modalBackdrop').hidden = true;
    game.currentEvent = null;
    onContinue();
  };
  if (currentPlayer(game).isAI) aiTimer = setTimeout(() => button.click(), 1050);
}

function finishDecision() {
  if (!game || game.phase !== 'decision') return;
  $('gameToast').hidden = true;
  $('actionCard').hidden = true;
  const result = resolveTurn(game);
  world.sync(game);
  renderGame();
  if (result.ended) {
    finishGame(result.winner);
    return;
  }
  if (result.skipped) {
    showToast('TURN SKIPPED', `${result.player.name} is laying low.`);
    aiTimer = setTimeout(finishDecisionSkip, 800);
    return;
  }
  scheduleAI();
}

function finishDecisionSkip() {
  if (!game) return;
  game.phase = 'decision';
  const result = resolveTurn(game);
  world.sync(game);
  renderGame();
  if (result.ended) finishGame(result.winner);
  else if (result.skipped) aiTimer = setTimeout(finishDecisionSkip, 800);
  else scheduleAI();
}

function scheduleAI() {
  if (!game || game.phase !== 'ready') return;
  const player = currentPlayer(game);
  renderGame();
  if (player?.isAI) aiTimer = setTimeout(() => runRoll(player), 720);
}

function finishGame(winner) {
  clearTimeout(aiTimer);
  const winnerFace = winner ? character(winner.character) : CHARACTERS[0];
  $('winnerAvatar').innerHTML = `<img src="./player/${winnerFace.id}.png" alt="">`;
  $('winnerTitle').textContent = winner ? `${winner.name} OWNS THE WORLD.` : 'THE WORLD WENT WILD.';
  $('winnerCopy').textContent = winner ? `${winnerFace.name} survived with ${winner.money} coins and an empire worth ${netWorth(game, winner)}. The last builder standing.` : 'The match is over.';
  hydrateAvatars($('winnerAvatar'));
  showScreen('finished');
}

function hydrateAvatars(root) {
  root.querySelectorAll('img[src*="/player/"]').forEach((img) => {
    if (img.dataset.avatarReady) return;
    img.dataset.avatarReady = 'true';
    const source = new Image();
    source.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 192;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const draw = (sx, sy, sw, sh, dx, dy, dw, dh) => ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
      draw(8, 8, 8, 8, 32, 0, 64, 64);
      draw(40, 8, 8, 8, 32, 0, 64, 64);
      draw(44, 20, 4, 12, 0, 64, 32, 96);
      draw(44, 20, 4, 12, 96, 64, 32, 96);
      draw(20, 20, 8, 12, 32, 64, 64, 96);
      draw(4, 20, 4, 12, 32, 128, 32, 64);
      draw(4, 20, 4, 12, 64, 128, 32, 64);
      img.src = canvas.toDataURL();
    };
    source.src = img.src;
  });
}

function playTone(frequency, duration) {
  if (muted) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => context.close();
  } catch { /* Audio is an optional layer. */ }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

$('playButton').addEventListener('click', () => { renderCharacterChoices(); showScreen('character'); });
$('characterNext').addEventListener('click', () => { renderRoster(); showScreen('table'); });
$('playerCount').addEventListener('change', renderRoster);
$('countDown').addEventListener('click', () => { $('playerCount').value = clampPlayerCount(Number($('playerCount').value) - 1); renderRoster(); });
$('countUp').addEventListener('click', () => { $('playerCount').value = clampPlayerCount(Number($('playerCount').value) + 1); renderRoster(); });
$('startGame').addEventListener('click', startMatch);
$('rollButton').addEventListener('click', takeTurn);
$('newGameButton').addEventListener('click', () => { clearTimeout(aiTimer); game = null; showScreen('intro'); });
$('rematchButton').addEventListener('click', startMatch);
$('homeButton').addEventListener('click', () => { game = null; showScreen('intro'); });
$('soundToggle').addEventListener('click', () => {
  muted = !muted;
  $('soundToggle').innerHTML = `${muted ? '♫̸' : '♫'} <span>Sound ${muted ? 'off' : 'on'}</span>`;
});
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.back)));
renderCharacterChoices();
world.sync({ players: [], board: [] });
if (window.location.hash === '#playerCount') showScreen('character');
