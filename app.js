(() => {
  const categories = [
    "한식", "국밥·탕", "고기·구이", "해산물", "중식", "일식", "면요리", "분식",
    "양식", "아시안", "패스트푸드", "도시락·덮밥", "샐러드·포케", "브런치",
    "디저트·간식", "야식·안주", "가벼운 한 끼"
  ];
  const moods = ["국물", "매콤", "가벼운", "든든", "바삭", "담백", "달콤", "시원한", "따뜻한", "디저트", "혼밥", "나눠먹기"];
  const exclusions = ["오이", "갑각류", "매운 음식", "고수", "견과류", "유제품"];
  const moodAliases = {
    바삭: ["바삭", "바삭한"],
    달콤: ["달콤", "달콤한", "달콤짭짤"],
    담백: ["담백", "담백한"],
    디저트: ["디저트"],
    혼밥: ["혼밥"],
    나눠먹기: ["나눠먹기"],
    가벼운: ["가벼운"],
    매콤: ["매콤"],
    든든: ["든든"],
    따뜻한: ["따뜻한"],
    시원한: ["시원한"],
    국물: ["국물"]
  };
  const moodCopy = {
    국물: "국물 있는", 매콤: "매콤한", 가벼운: "가벼운", 든든: "든든한",
    바삭: "바삭한", 담백: "담백한", 달콤: "달콤한", 시원한: "시원한",
    따뜻한: "따뜻한", 디저트: "달콤한 디저트", 혼밥: "혼밥하기 좋은",
    나눠먹기: "함께 나눠 먹기 좋은"
  };
  const storageKeys = { preferences: "menu-gacha-preferences", history: "menu-gacha-history", spins: "menu-gacha-spin-count", sound: "menu-gacha-sound" };
  const capsuleColors = ["coral", "yellow", "mint", "lavender", "blue", "pink", "orange", "green", "cream", "lilac", "rose", "sky"];
  const capsulePositions = [
    [20, 14], [43, 14], [66, 14],
    [8, 31], [32, 31], [55, 31], [78, 31],
    [8, 51], [32, 51], [55, 51], [78, 51],
    [20, 68], [43, 68], [66, 68]
  ];
  const dayparts = [
    { name: "아침", start: 7, end: 11, tags: ["가벼운", "따뜻한"] },
    { name: "점심", start: 11, end: 15, tags: ["든든"] },
    { name: "저녁", start: 17, end: 22, tags: ["든든", "따뜻한"] }
  ];
  const elements = Object.fromEntries([
    "daypart-label", "machine", "capsule-pile", "capsule-slot", "capsule-landing", "spin-button", "machine-hint",
    "category-filters", "mood-filters", "exclude-filters", "filter-count", "reset-filters",
    "result-card", "result-number", "food-art", "result-category", "result-name", "result-reason",
    "result-tags", "map-link", "delivery-link", "share-button", "reroll-button", "sound-toggle",
    "toast", "history-section", "history-list", "clear-history", "filter-dialog",
    "open-filters", "open-history", "close-filters", "close-filters-done",
    "preference-count", "done-count", "history-count"
  ].map(id => [id, document.getElementById(id)]));

  const readStored = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`저장된 설정을 읽지 못했습니다 (${key}).`, error);
      return fallback;
    }
  };
  const saveStored = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`설정을 저장하지 못했습니다 (${key}).`, error);
      showToast("기기에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
  };

  const savedPreferences = readStored(storageKeys.preferences, {});
  const savedHistory = readStored(storageKeys.history, []);
  const state = {
    categories: Array.isArray(savedPreferences?.categories) ? savedPreferences.categories.filter(value => categories.includes(value)) : [],
    moods: Array.isArray(savedPreferences?.moods) ? savedPreferences.moods.filter(value => moods.includes(value)) : [],
    exclusions: Array.isArray(savedPreferences?.exclusions) ? savedPreferences.exclusions.filter(value => exclusions.includes(value)) : [],
    history: Array.isArray(savedHistory) ? savedHistory : [],
    spinCount: Number(readStored(storageKeys.spins, 0)) || 0,
    current: null,
    phase: "idle",
    lastCapsuleColor: null,
    sound: readStored(storageKeys.sound, true) !== false,
    audioContext: null,
    toastTimer: null
  };

  function getDaypart(hour = new Date().getHours()) {
    if (hour >= 22 || hour < 7) return { name: "야식", tags: ["가벼운", "간식", "디저트"] };
    return dayparts.find(part => hour >= part.start && hour < part.end) || {
      name: "언제든 맛있게", tags: ["든든"]
    };
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2600);
  }

  function playSound(cue = "pop") {
    if (!state.sound) return;
    try {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextConstructor) return;
      if (!state.audioContext) state.audioContext = new AudioContextConstructor();
      const context = state.audioContext;
      if (context.state === "suspended") {
        context.resume().catch(error => console.error("효과음 출력을 시작하지 못했습니다.", error));
      }
      const start = context.currentTime;

      const tone = (frequency, offset, duration, volume, type = "sine") => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start + offset);
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(volume, start + offset + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration + 0.015);
      };
      const noise = (offset, duration, volume, frequency) => {
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length);
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = buffer;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(frequency, start + offset);
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(volume, start + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        source.start(start + offset);
        source.stop(start + offset + duration);
      };

      if (cue === "spin") {
        [392, 523, 440, 659, 523, 784, 659, 880].forEach((frequency, index) => {
          tone(frequency, index * 0.075, 0.12, 0.035, "triangle");
          noise(index * 0.075, 0.055, 0.028, 1800 + index * 190);
        });
        tone(130, 0.48, 0.2, 0.055, "sine");
      } else if (cue === "reveal") {
        noise(0, 0.09, 0.055, 1250);
        tone(523, 0, 0.34, 0.07, "sine");
        tone(659, 0.07, 0.36, 0.055, "triangle");
        tone(784, 0.14, 0.42, 0.05, "sine");
        tone(1047, 0.22, 0.56, 0.045, "triangle");
      } else if (cue === "toggle") {
        tone(659, 0, 0.13, 0.035, "sine");
        tone(880, 0.08, 0.18, 0.03, "triangle");
      } else {
        tone(440, 0, 0.1, 0.025, "sine");
        tone(660, 0.04, 0.16, 0.035, "triangle");
      }
    } catch (error) {
      console.error("효과음을 재생하지 못했습니다.", error);
    }
  }

  function updateClock() {
    const now = new Date();
    const part = getDaypart(now.getHours());
    elements["daypart-label"].textContent = `${part.name} 추천`;
  }

  function renderChips(container, options, selected, group, emojiMap = {}) {
    container.replaceChildren(...options.map(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip${selected.includes(option) ? " is-selected" : ""}`;
      button.setAttribute("aria-pressed", String(selected.includes(option)));
      button.disabled = state.phase === "spinning" || state.phase === "capsule";
      button.textContent = `${emojiMap[option] || ""}${emojiMap[option] ? " " : ""}${option}`;
      button.addEventListener("click", () => {
        const values = state[group];
        const index = values.indexOf(option);
        if (index >= 0) values.splice(index, 1);
        else values.push(option);
        if (state.phase === "result" && !availableMenus().includes(state.current)) {
          state.current = null;
          state.phase = "idle";
          elements["result-card"].hidden = true;
          elements["capsule-slot"].replaceChildren();
          elements["capsule-slot"].classList.remove("has-capsule");
          elements["capsule-landing"].replaceChildren();
          const placeholder = document.createElement("span");
          placeholder.className = "slot-placeholder";
          placeholder.textContent = "캡슐이 여기에 도착해요";
          elements["capsule-slot"].append(placeholder);
          elements["machine-hint"].textContent = "필터에 맞는 새 메뉴를 뽑아보세요";
        }
        saveStored(storageKeys.preferences, {
          categories: state.categories, moods: state.moods, exclusions: state.exclusions
        });
        updateFilters();
      });
      return button;
    }));
  }

  function availableMenus() {
    return window.MENUS.filter(menu => {
      const matchesCategory = !state.categories.length || state.categories.includes(menu.category);
      const matchesMoods = state.moods.every(mood => (moodAliases[mood] || [mood]).some(tag => menu.tags.includes(tag)));
      const hasExcludedIngredient = menu.ingredients.some(ingredient => state.exclusions.includes(ingredient));
      return matchesCategory && matchesMoods && !hasExcludedIngredient;
    });
  }

  function updateFilters() {
    renderChips(elements["category-filters"], categories, state.categories, "categories", {
      "한식": "🍚", "국밥·탕": "🍲", "고기·구이": "🥩", "해산물": "🐟", "중식": "🥢",
      "일식": "🍣", "면요리": "🍜", "분식": "🍢", "양식": "🍝", "아시안": "🥢",
      "패스트푸드": "🍔", "도시락·덮밥": "🍱", "샐러드·포케": "🥗", "브런치": "🥐",
      "디저트·간식": "🍰", "야식·안주": "🍗", "가벼운 한 끼": "🥑"
    });
    renderChips(elements["mood-filters"], moods, state.moods, "moods", {
      국물: "🍲", 매콤: "🌶️", 가벼운: "🥗", 든든: "🍚", 바삭: "🍤", 담백: "🍵",
      달콤: "🍯", 시원한: "🧊", 따뜻한: "☀️", 디저트: "🍰", 혼밥: "🙋", 나눠먹기: "🫶"
    });
    renderChips(elements["exclude-filters"], exclusions, state.exclusions, "exclusions", { 오이: "🥒", 갑각류: "🦐", "매운 음식": "🌶️", 고수: "🌿", 견과류: "🥜", 유제품: "🥛" });
    const count = availableMenus().length;
    elements["filter-count"].textContent = count
      ? `지금 뽑을 수 있는 메뉴 ${count}가지`
      : "조건에 맞는 메뉴가 없어요. 필터를 조금 풀어주세요.";
    elements["spin-button"].disabled = count === 0 || state.phase === "spinning" || state.phase === "capsule";
    elements["reset-filters"].disabled = state.phase === "spinning" || state.phase === "capsule";
    const selectedCount = state.categories.length + state.moods.length + state.exclusions.length;
    elements["preference-count"].textContent = selectedCount ? `${selectedCount}개 선택` : "전체";
    elements["done-count"].textContent = count ? `· ${count}가지 메뉴` : "";
  }

  function renderCapsules() {
    elements["capsule-pile"].replaceChildren(...capsulePositions.map(([x, y], index) => {
      const capsule = document.createElement("span");
      capsule.className = `mini-capsule capsule-${capsuleColors[(index * 7 + Math.floor(Math.random() * capsuleColors.length)) % capsuleColors.length]}`;
      capsule.style.setProperty("--capsule-x", `${x}%`);
      capsule.style.setProperty("--capsule-y", `${y}%`);
      capsule.style.setProperty("--capsule-r", `${Math.floor(Math.random() * 21) - 10}deg`);
      capsule.style.setProperty("--idle-delay", `${-((index * 193) % 2800)}ms`);
      return capsule;
    }));
  }

  function chooseCapsuleColor() {
    const choices = capsuleColors.filter(color => color !== state.lastCapsuleColor);
    state.lastCapsuleColor = choices[Math.floor(Math.random() * choices.length)];
    return state.lastCapsuleColor;
  }

  function mixCapsules() {
    const pile = elements["capsule-pile"];
    const bounds = pile.getBoundingClientRect();
    const capsules = [...pile.querySelectorAll(".mini-capsule")];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !capsules.length) {
      return Promise.resolve();
    }

    const animations = capsules.map(capsule => {
      const rect = capsule.getBoundingClientRect();
      const radius = rect.width / 2;
      const x = rect.left + radius - bounds.left;
      const y = rect.top + radius - bounds.top;
      const roomX = Math.max(2, Math.min(x - radius, bounds.width - x - radius));
      const roomY = Math.max(2, Math.min(y - radius, bounds.height - y - radius));
      const moveX = Math.min(10, roomX * 0.72);
      const moveY = Math.min(8, roomY * 0.68);
      const randomOffset = amount => (Math.random() * 2 - 1) * amount;
      const baseAngle = parseFloat(getComputedStyle(capsule).getPropertyValue("--capsule-r")) || 0;
      const tilt = randomOffset(9);
      const x1 = randomOffset(moveX);
      const y1 = randomOffset(moveY);
      const x2 = randomOffset(moveX);
      const y2 = randomOffset(moveY);
      capsule.style.willChange = "transform";
      return capsule.animate([
        { transform: `translate(0, 0) rotate(${baseAngle}deg)`, offset: 0 },
        { transform: `translate(${x1.toFixed(1)}px, ${y1.toFixed(1)}px) rotate(${(baseAngle + tilt).toFixed(1)}deg)`, offset: 0.3 },
        { transform: `translate(${x2.toFixed(1)}px, ${y2.toFixed(1)}px) rotate(${(baseAngle - tilt * 0.6).toFixed(1)}deg)`, offset: 0.68 },
        { transform: `translate(0, 0) rotate(${baseAngle}deg)`, offset: 1 }
      ], {
        duration: 950 + Math.random() * 350,
        delay: Math.random() * 140,
        easing: "cubic-bezier(.2, .7, .25, 1)",
        fill: "both"
      });
    });
    pile.classList.add("is-spinning");
    return new Promise(resolve => {
      Promise.all(animations.map(animation => animation.finished)).then(() => {
        for (const animation of animations) animation.cancel();
        for (const capsule of capsules) capsule.style.willChange = "";
        pile.classList.remove("is-spinning");
        resolve();
      }).catch(error => {
        for (const animation of animations) animation.cancel();
        for (const capsule of capsules) capsule.style.willChange = "";
        pile.classList.remove("is-spinning");
        console.error("캡슐 섞기 애니메이션을 마치지 못했습니다.", error);
        resolve();
      });
    });
  }

  function getReason(menu) {
    const matchingMood = state.moods.find(mood => (moodAliases[mood] || [mood]).some(tag => menu.tags.includes(tag)));
    if (matchingMood) return `오늘은 ${moodCopy[matchingMood]} 메뉴가 당긴다고 했어요. ${menu.name}${objectParticle(menu.name)} 맛있게 즐겨봐요!`;
    const part = getDaypart();
    if (part.tags.some(tag => (moodAliases[tag] || [tag]).some(alias => menu.tags.includes(alias)))) return `${part.name}에 잘 어울리는 메뉴예요. ${menu.name}${objectParticle(menu.name)} 한 끼 어떠세요?`;
    return `오늘의 행운이 고른 메뉴예요. ${menu.name}, 오늘 한 끼로 어때요?`;
  }

  function objectParticle(word) {
    const last = Array.from(word).pop().charCodeAt(0) - 0xac00;
    if (last < 0 || last > 11171) return "로";
    const finalConsonant = last % 28;
    return finalConsonant === 0 || finalConsonant === 8 ? "로" : "으로";
  }

  function revealMenu(menu) {
    state.current = menu;
    state.phase = "result";
    state.spinCount += 1;
    state.history = [menu.name, ...state.history.filter(name => name !== menu.name)].slice(0, 5);
    saveStored(storageKeys.spins, state.spinCount);
    saveStored(storageKeys.history, state.history);
    elements["result-number"].textContent = `NO. ${String(state.spinCount).padStart(3, "0")}`;
    elements["food-art"].textContent = menu.emoji;
    elements["result-category"].textContent = menu.category;
    elements["result-name"].textContent = menu.name;
    elements["result-reason"].textContent = getReason(menu);
    elements["result-tags"].textContent = menu.tags.slice(0, 3).map(tag => `#${tag}`).join("  ");
    const query = encodeURIComponent(menu.name);
    elements["map-link"].href = `https://map.naver.com/p/search/${query}`;
    elements["delivery-link"].href = `https://www.baemin.com/search?keyword=${query}`;
    elements["result-card"].hidden = false;
    elements["result-card"].classList.remove("result-enter");
    void elements["result-card"].offsetWidth;
    elements["result-card"].classList.add("result-enter");
    elements["machine-hint"].textContent = "오늘의 메뉴 공개! 마음에 들면 주변 식당을 찾아봐요.";
    const capsule = elements["capsule-landing"].querySelector(".drawn-capsule");
    if (capsule) {
      const landedCapsule = document.createElement("span");
      landedCapsule.className = `landed-capsule capsule-${state.lastCapsuleColor || "yellow"}`;
      landedCapsule.setAttribute("aria-hidden", "true");
      capsule.replaceWith(landedCapsule);
    }
    renderHistory();
    updateFilters();
    playSound("reveal");
    if ("vibrate" in navigator) navigator.vibrate(45);
    elements["result-card"].scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function drawMenu() {
    const candidates = availableMenus();
    if (!candidates.length) {
      showToast("조건에 맞는 메뉴가 없어요. 필터를 바꿔주세요.");
      return;
    }
    const recentNames = new Set(state.history.slice(0, Math.min(3, candidates.length - 1)));
    const unseen = candidates.filter(menu => !recentNames.has(menu.name));
    const pool = unseen.length ? unseen : candidates;
    const partTags = getDaypart().tags;
    const preferred = pool.filter(menu => partTags.some(tag => (moodAliases[tag] || [tag]).some(alias => menu.tags.includes(alias))));
    const weightedPool = preferred.length ? [...preferred, ...pool] : pool;
    const menu = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    const capsuleColor = chooseCapsuleColor();
    state.phase = "spinning";
    elements["result-card"].hidden = true;
    elements["capsule-landing"].replaceChildren();
    elements["machine-hint"].textContent = "캡슐들이 섞이고 있어요...";
    elements["spin-button"].classList.add("is-spinning");
    updateFilters();
    playSound("spin");
    if ("vibrate" in navigator) navigator.vibrate([25, 30, 25]);
    mixCapsules().then(() => {
      elements["spin-button"].classList.remove("is-spinning");
      elements["capsule-slot"].replaceChildren();
      elements["capsule-slot"].classList.add("has-capsule");
      const capsule = document.createElement("button");
      capsule.type = "button";
      capsule.disabled = true;
      capsule.className = `falling-capsule capsule-${capsuleColor}`;
      capsule.setAttribute("aria-hidden", "true");
      const landCapsule = () => {
        capsule.style.removeProperty("left");
        capsule.style.removeProperty("top");
        capsule.className = `drawn-capsule capsule-${capsuleColor}`;
        capsule.disabled = false;
        capsule.setAttribute("aria-hidden", "false");
        capsule.setAttribute("aria-label", "캡슐을 열어 메뉴 확인하기");
        capsule.addEventListener("click", () => revealMenu(menu), { once: true });
        elements["capsule-landing"].append(capsule);
        state.phase = "capsule";
        elements["machine-hint"].textContent = "캡슐을 한 번 눌러 메뉴를 확인해요.";
        updateFilters();
        if ("vibrate" in navigator) navigator.vibrate(20);
      };
      const wrapperRect = elements["machine"].parentElement.getBoundingClientRect();
      const outletRect = elements["capsule-slot"].getBoundingClientRect();
      const landingRect = elements["capsule-landing"].getBoundingClientRect();
      const startX = outletRect.left + outletRect.width / 2 - wrapperRect.left;
      const startY = outletRect.top + outletRect.height / 2 - wrapperRect.top;
      const endX = landingRect.left + landingRect.width / 2 - wrapperRect.left;
      const endY = landingRect.top + landingRect.height / 2 - wrapperRect.top;
      capsule.style.left = `${startX}px`;
      capsule.style.top = `${startY}px`;
      elements["machine"].parentElement.append(capsule);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        capsule.style.left = `${endX}px`;
        capsule.style.top = `${endY}px`;
        landCapsule();
      } else {
        const capsuleDrop = capsule.animate([
          { transform: "translate(-50%, -50%) scale(.78) rotate(-8deg)", offset: 0 },
          { transform: `translate(-50%, calc(-50% + ${Math.round((endY - startY) * 0.82)}px)) scale(1.04) rotate(350deg)`, offset: 0.84, easing: "cubic-bezier(.16, .72, .28, 1)" },
          { transform: `translate(-50%, calc(-50% + ${endY - startY}px)) scale(1) rotate(360deg)`, offset: 1 }
        ], { duration: 380, easing: "cubic-bezier(.32, 0, .66, .16)", fill: "forwards" });
        capsuleDrop.onfinish = () => {
          capsuleDrop.cancel();
          capsule.style.left = `${endX}px`;
          capsule.style.top = `${endY}px`;
          landCapsule();
        };
      }
    });
  }

  function renderHistory() {
    state.history = state.history.filter(name => window.MENUS.some(menu => menu.name === name)).slice(0, 5);
    saveStored(storageKeys.history, state.history);
    elements["history-section"].hidden = !state.history.length;
    elements["history-count"].textContent = String(state.history.length);
    elements["history-list"].replaceChildren(...state.history.map(name => {
      const menu = window.MENUS.find(item => item.name === name);
      const item = document.createElement("button");
      item.type = "button";
      item.className = "history-item";
      const emoji = document.createElement("span");
      emoji.className = "history-emoji";
      emoji.textContent = menu.emoji;
      const label = document.createElement("span");
      label.textContent = menu.name;
      item.append(emoji, label);
      item.addEventListener("click", () => revealMenu(menu));
      return item;
    }));
  }

  function drawWrappedText(context, text, x, y, maxWidth, lineHeight) {
    let line = "";
    for (const character of Array.from(text)) {
      const nextLine = line + character;
      if (line && context.measureText(nextLine).width > maxWidth) {
        context.fillText(line, x, y);
        line = character;
        y += lineHeight;
      } else {
        line = nextLine;
      }
    }
    if (line) context.fillText(line, x, y);
    return y + lineHeight;
  }

  function createShareImage(menu) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("공유 이미지 캔버스를 만들 수 없습니다."));
        return;
      }

      const background = context.createLinearGradient(0, 0, 1080, 1350);
      background.addColorStop(0, "#f5f5ec");
      background.addColorStop(1, "#e9efe2");
      context.fillStyle = background;
      context.fillRect(0, 0, 1080, 1350);
      context.fillStyle = "#f4c769";
      [[100, 145, 12], [968, 224, 18], [930, 1100, 10], [142, 1130, 15], [890, 440, 8]].forEach(([x, y, size]) => {
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      });

      context.shadowColor = "rgba(91, 67, 38, 0.13)";
      context.shadowBlur = 44;
      context.shadowOffsetY = 18;
      context.fillStyle = "#fffdf9";
      roundedRect(context, 60, 65, 960, 1220, 48);
      context.fill();
      context.shadowColor = "transparent";
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;

      const accent = context.createLinearGradient(60, 0, 1020, 0);
      accent.addColorStop(0, "#245c4b");
      accent.addColorStop(0.52, "#efc96e");
      accent.addColorStop(1, "#7ca68b");
      context.fillStyle = accent;
      roundedRect(context, 60, 65, 960, 13, 7);
      context.fill();

      context.textAlign = "center";
      context.fillStyle = "#245c4b";
      context.font = "700 30px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText("✳  MENU GACHA", 540, 160);
      context.fillStyle = "#887964";
      context.font = "500 30px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText("오늘의 행운 메뉴", 540, 225);

      const plate = context.createLinearGradient(350, 290, 730, 690);
      plate.addColorStop(0, "#fffdf7");
      plate.addColorStop(1, "#e9efe2");
      context.fillStyle = plate;
      context.beginPath();
      context.arc(540, 490, 180, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#efe1cc";
      context.lineWidth = 5;
      context.stroke();
      context.font = "150px Apple Color Emoji, Segoe UI Emoji, sans-serif";
      context.fillText(menu.emoji, 540, 545);

      context.fillStyle = "#617661";
      context.font = "600 25px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(menu.category, 540, 755);
      context.fillStyle = "#292520";
      context.font = "800 64px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText(menu.name, 540, 840);
      context.fillStyle = "#7e7468";
      context.font = "400 29px -apple-system, BlinkMacSystemFont, sans-serif";
      drawWrappedText(context, getReason(menu), 540, 910, 770, 46);

      context.strokeStyle = "#eee6da";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(160, 1082);
      context.lineTo(920, 1082);
      context.stroke();

      context.font = "600 26px -apple-system, BlinkMacSystemFont, sans-serif";
      const tags = menu.tags.slice(0, 3).map(tag => `#${tag}`);
      const tagWidths = tags.map(tag => context.measureText(tag).width + 44);
      const totalWidth = tagWidths.reduce((total, width) => total + width, 0) + (tags.length - 1) * 16;
      let tagX = (1080 - totalWidth) / 2;
      tags.forEach((tag, index) => {
        context.fillStyle = "#f7f1e7";
        roundedRect(context, tagX, 1120, tagWidths[index], 58, 29);
        context.fill();
        context.fillStyle = "#526b54";
        context.fillText(tag, tagX + tagWidths[index] / 2, 1158);
        tagX += tagWidths[index] + 16;
      });

      context.fillStyle = "#89947f";
      context.font = "500 22px -apple-system, BlinkMacSystemFont, sans-serif";
      context.fillText("고민은 가챠에게, 맛있는 한 끼는 우리에게.", 540, 1235);
      if (typeof canvas.toBlob === "function") {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("공유 이미지 파일을 만들지 못했습니다."));
        }, "image/png");
      } else {
        const encoded = canvas.toDataURL("image/png").split(",")[1];
        const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
        resolve(new Blob([bytes], { type: "image/png" }));
      }
    });
  }

  function downloadShareImage(image) {
    if (!URL.createObjectURL) return false;
    const url = URL.createObjectURL(image);
    const link = document.createElement("a");
    link.href = url;
    link.download = "menu-gacha.png";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  }

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  async function shareMenu() {
    if (!state.current) return;
    const menu = state.current;
    const text = `오늘의 메뉴가챠 결과는 ${menu.emoji} ${menu.name}! ${getReason(menu)}`;
    const shareData = { title: "오늘의 메뉴가챠", text, url: window.location.href };
    try {
      const image = await createShareImage(menu);
      if (typeof File === "function" && navigator.canShare && navigator.share) {
        const imageFile = new File([image], "menu-gacha.png", { type: "image/png" });
        if (navigator.canShare({ files: [imageFile] })) {
          await navigator.share({ ...shareData, files: [imageFile] });
          return;
        }
      }
      const imageSaved = downloadShareImage(image);
      if (navigator.share) {
        if (imageSaved) showToast("공유용 메뉴 이미지를 저장했어요.");
        await navigator.share(shareData);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast(imageSaved
          ? "공유용 이미지를 저장하고 메뉴 문구도 복사했어요."
          : "메뉴 결과를 복사했어요. 친구에게 공유해 보세요!");
      } else {
        window.prompt(imageSaved
          ? "공유용 이미지를 저장했어요. 아래 문구도 함께 공유해 보세요."
          : "아래 메뉴 결과를 복사해 공유해 보세요.", text);
      }
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("메뉴 결과를 공유하지 못했습니다.", error);
      showToast("공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  elements["spin-button"].addEventListener("click", drawMenu);
  elements["reroll-button"].addEventListener("click", drawMenu);
  elements["share-button"].addEventListener("click", shareMenu);
  elements["sound-toggle"].addEventListener("click", () => {
    state.sound = !state.sound;
    saveStored(storageKeys.sound, state.sound);
    elements["sound-toggle"].setAttribute("aria-pressed", String(state.sound));
    elements["sound-toggle"].setAttribute("aria-label", state.sound ? "효과음 끄기" : "효과음 켜기");
    showToast(state.sound ? "효과음을 켰어요." : "효과음을 껐어요.");
    playSound("toggle");
  });
  elements["open-filters"].addEventListener("click", () => elements["filter-dialog"].showModal());
  elements["open-history"].addEventListener("click", () => {
    if (!state.history.length) {
      showToast("아직 뽑은 메뉴가 없어요. 먼저 캡슐을 뽑아봐요!");
      return;
    }
    elements["filter-dialog"].showModal();
    window.setTimeout(() => elements["history-section"].scrollIntoView({ block: "nearest", behavior: "smooth" }), 80);
  });
  elements["close-filters"].addEventListener("click", () => elements["filter-dialog"].close());
  elements["close-filters-done"].addEventListener("click", () => elements["filter-dialog"].close());
  elements["filter-dialog"].addEventListener("click", event => {
    if (event.target === elements["filter-dialog"]) elements["filter-dialog"].close();
  });
  elements["reset-filters"].addEventListener("click", () => {
    state.categories = [];
    state.moods = [];
    state.exclusions = [];
    state.current = null;
    state.phase = "idle";
    elements["result-card"].hidden = true;
    elements["capsule-slot"].classList.remove("has-capsule");
    elements["capsule-slot"].replaceChildren();
    elements["capsule-landing"].replaceChildren();
    const placeholder = document.createElement("span");
    placeholder.className = "slot-placeholder";
    placeholder.textContent = "";
    elements["capsule-slot"].append(placeholder);
    elements["machine-hint"].textContent = "딱 한 번 눌러봐. 오늘 메뉴가 나올 거야.";
    saveStored(storageKeys.preferences, { categories: [], moods: [], exclusions: [] });
    updateFilters();
  });
  elements["clear-history"].addEventListener("click", () => {
    state.history = [];
    saveStored(storageKeys.history, state.history);
    renderHistory();
    showToast("최근 메뉴 기록을 지웠어요.");
  });

  renderCapsules();
  elements["sound-toggle"].setAttribute("aria-pressed", String(state.sound));
  elements["sound-toggle"].setAttribute("aria-label", state.sound ? "효과음 끄기" : "효과음 켜기");
  updateClock();
  window.setInterval(updateClock, 60_000);
  updateFilters();
  renderHistory();

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(error => {
        console.error("오프라인 지원을 준비하지 못했습니다.", error);
      });
    });
  }
})();
