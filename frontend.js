
// simplified engage zone logic update
function checkForWin(playerHP, opponentHP) {
  if (playerHP < 1) {
    alert("You lost! Your divine fell below 1 HP.");
    return true;
  } else if (opponentHP < 1) {
    alert("You won! Your opponent’s divine fell below 1 HP.");
    return true;
  }
  return false;
}

// example engage zone swap
function renderEngageZone(playerCards, opponentCards) {
  const engageZone = document.getElementById("engage-zone");
  engageZone.innerHTML = `
    <div class="opponent">${opponentCards.map(c => `<img src='/cards/${c}.png' />`).join("")}</div>
    <div class="player">${playerCards.map(c => `<img src='/cards/${c}.png' />`).join("")}</div>
  `;
}
