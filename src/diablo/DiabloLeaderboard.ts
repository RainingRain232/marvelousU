import type { GRLeaderboardEntry } from "./DiabloTypes";

export function loadLeaderboard(): GRLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem('diablo_gr_leaderboard');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveLeaderboard(entries: GRLeaderboardEntry[]): void {
  localStorage.setItem('diablo_gr_leaderboard', JSON.stringify(entries));
}

export function addLeaderboardEntry(entries: GRLeaderboardEntry[], entry: GRLeaderboardEntry): GRLeaderboardEntry[] {
  entries.push(entry);
  entries.sort((a, b) => b.grLevel - a.grLevel || b.timeRemaining - a.timeRemaining);
  const trimmed = entries.slice(0, 10);
  saveLeaderboard(trimmed);
  return trimmed;
}

export function showLeaderboard(menuEl: HTMLDivElement, entries: GRLeaderboardEntry[], onClose: () => void): void {
  menuEl.innerHTML = '';
  const panel = document.createElement('div');
  panel.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,15,10,0.95);border:2px solid #8b6914;border-radius:8px;padding:20px;color:#fff;font-family:Georgia,serif;min-width:450px;z-index:100;';

  const title = document.createElement('h2');
  title.style.cssText = 'text-align:center;color:#ffd700;margin:0 0 15px;';
  title.textContent = 'Greater Rift Leaderboard';
  panel.appendChild(title);

  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'text-align:center;color:#888;';
    empty.textContent = 'No records yet. Complete a Greater Rift!';
    panel.appendChild(empty);
  } else {
    const table = document.createElement('div');
    table.style.cssText = 'font-size:13px;';
    table.innerHTML = '<div style="display:flex;padding:4px 0;border-bottom:1px solid #555;color:#ffd700;"><span style="flex:0.5;">#</span><span style="flex:2;">Player</span><span style="flex:1;">Class</span><span style="flex:0.5;">Lv</span><span style="flex:0.5;">GR</span><span style="flex:1;">Time</span><span style="flex:1;">Date</span></div>';

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const mins = Math.floor(e.timeRemaining / 60);
      const secs = Math.floor(e.timeRemaining % 60);
      const medalColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#aaa';
      table.innerHTML += `<div style="display:flex;padding:3px 0;border-bottom:1px solid #333;"><span style="flex:0.5;color:${medalColor};">${i + 1}</span><span style="flex:2;">${e.playerName}</span><span style="flex:1;">${e.class}</span><span style="flex:0.5;">${e.level}</span><span style="flex:0.5;color:#ff8800;">${e.grLevel}</span><span style="flex:1;">${mins}:${secs.toString().padStart(2, '0')}</span><span style="flex:1;color:#888;">${e.date}</span></div>`;
    }
    panel.appendChild(table);
  }

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'display:block;margin:15px auto 0;padding:8px 20px;background:#555;color:#fff;border:1px solid #888;border-radius:4px;cursor:pointer;font-family:Georgia,serif;';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => onClose());
  panel.appendChild(closeBtn);

  menuEl.appendChild(panel);
}
