const recentKey = "recentPlays";
const favKey = "favoriteGames";

fetch("games.json?ver=" + Date.now())
  .then(res => res.json())
  .then(games => {
    const list = document.querySelector(".game-list");
    const favList = document.querySelector(".favorite-list");
    const recentGrid = document.querySelector(".game-grid.recent");
    const allGrid = document.querySelector(".game-grid.all");
    const newGrid = document.querySelector(".game-grid.new");
    const rankingList = document.querySelector(".ranking-list");

    // 左メニュー（全ゲーム）
    games.forEach(game => {
      const li = document.createElement("li");
      li.textContent = game.title;
      list.appendChild(li);

      li.addEventListener("click", () => {
        const opened = li.querySelector(".dropdown");
        if (opened) {
          opened.remove();
          return;
        }

        const dropdown = document.createElement("div");
        dropdown.className = "dropdown";
        dropdown.innerHTML = `
          <button class="launch-btn">起動する</button>
        `;
        li.appendChild(dropdown);

        dropdown.querySelector(".launch-btn").addEventListener("click", () => {
          playGame(game);
        });
      });

      li.addEventListener("mouseleave", () => {
        const opened = li.querySelector(".dropdown");
        if (opened) opened.remove();
      });
    });

    // 新着ゲーム
    games.forEach(game => {
      if (game.category === "new") {
        const card = createGameCard(game, true, games);
        newGrid.appendChild(card);
      }
    });

    // すべてのゲーム
    games.forEach(game => {
      const card = createGameCard(game, false, games);
      allGrid.appendChild(card);
    });

    // 最近プレイ
    updateRecentPlays(games, recentGrid);

    // お気に入り一覧
    updateFavorites(games, favList);

    // プレイ時間ランキング
    updateRanking(games, rankingList);

    // 検索
    const searchBox = document.querySelector(".search-box");
    searchBox.addEventListener("input", () => {
      const keyword = searchBox.value.toLowerCase();
      const gameItems = document.querySelectorAll(".game-list li");

      gameItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.startsWith(keyword) ? "block" : "none";
      });
    });
  });

function createGameCard(game, isNew, games) {
  const playKey = `playCount_${game.title}`;
  const timeKey = `playTime_${game.title}`;
  const favs = JSON.parse(localStorage.getItem(favKey) || "[]");

  let count = Number(localStorage.getItem(playKey) || 0);
  let totalTime = Number(localStorage.getItem(timeKey) || 0);
  let isFav = favs.includes(game.title);

  const card = document.createElement("div");
  card.className = "game-card";

  card.innerHTML = `
    <div class="card-top">
      <img src="${game.image}">
      ${isNew ? `<span class="new-badge">NEW</span>` : ""}
      <span class="fav-btn ${isFav ? "on" : ""}">★</span>
    </div>
    <div class="card-bottom">
      <p class="game-title">${game.title}</p>
      <div class="play-row">
        <button class="play-btn">▶ プレイ</button>
        <span class="play-count">${count} 回</span>
      </div>
      <div class="play-time">総プレイ時間：${formatTime(totalTime)}</div>
    </div>
  `;

  // お気に入りボタン
  const favBtn = card.querySelector(".fav-btn");
  favBtn.addEventListener("click", () => {
    toggleFavorite(game.title);
    favBtn.classList.toggle("on");
    updateFavorites(games, document.querySelector(".favorite-list"));
  });

  // プレイボタン
  card.querySelector(".play-btn").addEventListener("click", () => {
    playGame(game);

    count++;
    localStorage.setItem(playKey, count);
    card.querySelector(".play-count").textContent = `${count} 回`;

    const start = Date.now();
    localStorage.setItem("playingNow", JSON.stringify({
      title: game.title,
      start: start
    }));
  });

  // PC専用ホバー詳細
  card.addEventListener("mouseenter", () => {
    if (window.innerWidth > 768) showHoverDetail(game, card);
  });
  card.addEventListener("mouseleave", hideHoverDetail);

  return card;
}

// お気に入り ON/OFF
function toggleFavorite(title) {
  let favs = JSON.parse(localStorage.getItem(favKey) || "[]");

  if (favs.includes(title)) {
    favs = favs.filter(t => t !== title);
  } else {
    favs.push(title);
  }

  localStorage.setItem(favKey, JSON.stringify(favs));
}

// お気に入り一覧更新
function updateFavorites(games, favList) {
  favList.innerHTML = "";

  const favs = JSON.parse(localStorage.getItem(favKey) || "[]");

  favs.forEach(title => {
    const game = games.find(g => g.title === title);
    if (!game) return;

    const li = document.createElement("li");
    li.textContent = `★ ${game.title}`;
    favList.appendChild(li);

    li.addEventListener("click", () => {
      window.open(game.url, "_blank");
    });
  });
}

// プレイ終了時
window.addEventListener("beforeunload", () => {
  const playing = JSON.parse(localStorage.getItem("playingNow") || "null");
  if (!playing) return;

  const timeKey = `playTime_${playing.title}`;
  const start = playing.start;
  const end = Date.now();
  const diff = Math.floor((end - start) / 1000);

  let total = Number(localStorage.getItem(timeKey) || 0);
  total += diff;
  localStorage.setItem(timeKey, total);

  localStorage.removeItem("playingNow");
});

function playGame(game) {
  let recent = JSON.parse(localStorage.getItem(recentKey) || "[]");

  recent = recent.filter(t => t.title !== game.title);

  recent.unshift({
    title: game.title,
    time: Date.now()
  });

  recent = recent.slice(0, 10);

  localStorage.setItem(recentKey, JSON.stringify(recent));

  window.open(game.url, "_blank");
}

function updateRecentPlays(games, recentGrid) {
  recentGrid.innerHTML = "";

  let recent = JSON.parse(localStorage.getItem(recentKey) || "[]");

  recent
    .sort((a, b) => b.time - a.time)
    .forEach(item => {
      const game = games.find(g => g.title === item.title);
      if (!game) return;

      const card = createGameCard(game, false, games);
      recentGrid.appendChild(card);
    });
}

function updateRanking(games, rankingList) {
  rankingList.innerHTML = "";

  const ranking = games
    .map(g => {
      const time = Number(localStorage.getItem(`playTime_${g.title}`) || 0);
      return { title: g.title, time };
    })
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  ranking.forEach(r => {
    const li = document.createElement("li");
    li.textContent = `${r.title} - ${formatTime(r.time)}`;
    rankingList.appendChild(li);
  });
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}時間 ${m}分`;
}

function showHoverDetail(game, card) {
  const detail = document.getElementById("hoverDetail");
  detail.innerHTML = `
    <img src="${game.image}">
    <p>${game.title}</p>
  `;

  const rect = card.getBoundingClientRect();
  detail.style.left = rect.right + 10 + "px";
  detail.style.top = rect.top + "px";
  detail.style.display = "block";
}

function hideHoverDetail() {
  document.getElementById("hoverDetail").style.display = "none";
}

// スマホ用メニュー
document.querySelector(".menu-toggle").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});