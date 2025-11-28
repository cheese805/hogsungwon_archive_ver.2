// script/galleryscript.js

// 🔥 백엔드(Render) 주소
const SERVER_ORIGIN = "https://hongsungwon-gallery-server.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     0. 기본 셋업 + JSON 경로
     ========================= */
  const grid       = document.getElementById("gallery-grid");
  const tagButtons = document.querySelectorAll(".tag-chip");
  const tagInput   = document.getElementById("tag-input");
  const searchBtn  = document.getElementById("tag-search-btn");

  // overlay 루트 (배경 + 블러)
  const overlayRoot     = document.getElementById("gallery-overlay");
  const overlayBackdrop = overlayRoot
    ? overlayRoot.querySelector(".overlay-backdrop")
    : null;

  // 혹시 예전 overlay 패널 있으면 제거
  if (overlayRoot) {
    const oldPanel = overlayRoot.querySelector(".overlay-panel");
    if (oldPanel) oldPanel.remove();
  }

  // 🔥 API_BASE를 Render 주소로
  const API_BASE = SERVER_ORIGIN;
  const dataUrl  = `${API_BASE}/api/gallery`;

  let entries       = [];
  let activeTag     = null;
  let openedWrapper = null;
  let escHandler    = null;

  // 태그 자동완성용
  let allTagList    = [];
  let tagSuggestBox = null;

  /* =========================
     1. JSON 로드
     ========================= */
  fetch(dataUrl)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} - ${res.url}`);
      }
      return res.json();
    })
    .then(data => {
      // 🔥 날짜 기준 최신순 정렬
      data.sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        return db - da;
      });

      console.log("✅ API 로드 성공 (정렬 후):", data);

      entries = data;
      buildGlobalTagList();
      renderGrid();
    })
    .catch(err => {
      console.error("❌ 데이터 로드 실패:", err);
    });

  /* =========================
     2. 유틸 함수들
     ========================= */

  function normalizePath(path) {
    if (!path) return "";

    // 이미 http(s)면 그대로 사용
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    // 🔥 Render 서버 uploads 경로
    if (path.startsWith("/uploads/")) {
      return SERVER_ORIGIN + path;        // https://.../uploads/abc.jpg
    }
    if (path.startsWith("uploads/")) {
      return SERVER_ORIGIN + "/" + path;  // https://.../uploads/abc.jpg
    }

    // 그 외 (galleryimg/xxxx 등)은 프론트 쪽 상대 경로
    return path.replace(/^\//, "");
  }

  function getFirstMedia(entry) {
    if (entry.images && entry.images.length > 0) {
      return { type: "image", src: entry.images[0] };
    }
    if (entry.media && entry.media.length > 0) {
      const img = entry.media.find(m => m.type === "image");
      if (img) return img;
      const vid = entry.media.find(m => m.type === "video");
      if (vid) return vid;
    }
    return null;
  }

  function formatDate(str) {
    if (!str) return "";
    const [y, m, d] = str.split("-");
    if (!y || !m || !d) return str;
    return `${y}. ${m}. ${d}`;
  }

  function getAllTags(entry) {
    const set = new Set();

    (entry.tags || []).forEach(t => {
      if (t) set.add(String(t));
    });

    if (entry.date && entry.date.length >= 4) {
      set.add(entry.date.slice(0, 4));
    }

    if (entry.source && entry.source.type) {
      set.add(entry.source.type);
    }

    return Array.from(set);
  }

  function buildTagLine(entry) {
    const all = getAllTags(entry);
    return all.map(t => `#${t}`).join(" ");
  }

  function buildGlobalTagList() {
    const set = new Set();

    entries.forEach(entry => {
      getAllTags(entry).forEach(t => {
        if (t) set.add(String(t));
      });
    });

    allTagList = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "ko-KR")
    );
  }

  /* =========================
     TAG 자동완성 드롭다운
     ========================= */

  (function setupTagSuggestBox() {
    const searchBar = document.querySelector(".search-bar");
    if (!searchBar) return;

    tagSuggestBox = document.createElement("div");
    tagSuggestBox.className = "tag-suggest";
    tagSuggestBox.innerHTML = `<div class="tag-suggest-list"></div>`;
    searchBar.insertAdjacentElement("afterend", tagSuggestBox);
  })();

  function hideTagSuggestions() {
    if (!tagSuggestBox) return;
    tagSuggestBox.classList.remove("open");
    const listEl = tagSuggestBox.querySelector(".tag-suggest-list");
    if (listEl) listEl.innerHTML = "";
  }

  function showTagSuggestions(query) {
    if (!tagSuggestBox) return;
    const listEl = tagSuggestBox.querySelector(".tag-suggest-list");
    if (!listEl) return;

    const raw = (query || "").trim().replace(/^#/, "");
    const q = raw.toLowerCase();

    let list = allTagList;

    if (q) {
      list = allTagList.filter(tag =>
        tag.toLowerCase().includes(q)
      );
    }

    if (!list.length) {
      hideTagSuggestions();
      return;
    }

    const slice = list.slice(0, 20);

    listEl.innerHTML = slice
      .map(tag => `
        <button type="button" class="tag-suggest-item" data-tag="${tag}">
          <span>#${tag}</span>
        </button>
      `)
      .join("");

    tagSuggestBox.classList.add("open");

    listEl.querySelectorAll(".tag-suggest-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.dataset.tag || "";
        tagInput.value = t;
        applyFilter(t);
      });
    });
  }

  /* =========================
     3. 썸네일 그리드 렌더링
     ========================= */

  function renderGrid() {
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = entries.filter(entry => {
      if (!activeTag) return true;
      const allTags = getAllTags(entry);
      return allTags.includes(activeTag);
    });

    filtered.forEach(entry => {
      const hero = getFirstMedia(entry);
      if (!hero) return;

      const item = document.createElement("button");
      item.className = "gallery-item";
      item.type = "button";

      if (hero.type === "image") {
        const img = document.createElement("img");
        img.src = normalizePath(hero.src);
        img.alt = entry.id || "";
        item.appendChild(img);
      } else if (hero.type === "video") {
        const video = document.createElement("video");
        video.src = normalizePath(hero.src);
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata";
        video.className = "gallery-video-thumb";
        item.appendChild(video);
      }

      item.addEventListener("click", () => openDetailCard(entry));
      grid.appendChild(item);
    });
  }

  /* =========================
     4. 상세 카드 오버레이
     ========================= */

  function closeDetailCard() {
    if (!overlayRoot || !openedWrapper) return;

    overlayRoot.classList.remove("active");
    overlayRoot.setAttribute("aria-hidden", "true");

    openedWrapper.remove();
    openedWrapper = null;

    if (overlayBackdrop) {
      overlayBackdrop.removeEventListener("click", closeDetailCard);
    }
    if (escHandler) {
      document.removeEventListener("keydown", escHandler);
      escHandler = null;
    }
  }

  function openDetailCard(entry) {
    if (!overlayRoot) return;

    const mediaList = [];

    if (entry.images && entry.images.length > 0) {
      entry.images.forEach(src => {
        if (src) {
          mediaList.push({
            type: "image",
            src: src
          });
        }
      });
    }

    if (entry.media && entry.media.length > 0) {
      entry.media.forEach(m => {
        if (!m) return;
        const src = m.src || m.url;
        if (!src) return;
        mediaList.push({
          type: m.type || "image",
          src: src
        });
      });
    }

    if (!mediaList.length) return;

    if (openedWrapper) {
      openedWrapper.remove();
      openedWrapper = null;
    }

    let index = 0;

    const dateText  = formatDate(entry.date);
    const labelText = entry.source?.label || "";
    const tagLine   = buildTagLine(entry);

    const wrapper = document.createElement("div");
    wrapper.className = "gallery-detail-wrapper";

    wrapper.innerHTML = `
      <div class="gallery-detail-card">

        <button class="gallery-detail-close" aria-label="닫기">
          <img src="img/excit.png" alt="닫기 아이콘">
        </button>

        <div class="gallery-detail-photo-area">

          <button class="gallery-arrow left-arrow" aria-label="이전">
            <img src="img/moreleft.png" alt="이전">
          </button>

          <div class="gallery-detail-main-media"></div>

          <button class="gallery-arrow right-arrow" aria-label="다음">
            <img src="img/moreright.png" alt="다음">
          </button>

          <div class="gallery-detail-text-overlay">
            <p class="gallery-detail-date">${dateText}</p>
            <p class="gallery-detail-label">${labelText}</p>
          </div>
        </div>

        <div class="gallery-detail-bottom">
          <p class="gallery-detail-tags">${tagLine}</p>
        </div>
      </div>
    `;

    overlayRoot.appendChild(wrapper);
    openedWrapper = wrapper;

    overlayRoot.classList.add("active");
    overlayRoot.setAttribute("aria-hidden", "false");

    const closeBtn       = wrapper.querySelector(".gallery-detail-close");
    const mediaContainer = wrapper.querySelector(".gallery-detail-main-media");
    const leftBtn        = wrapper.querySelector(".left-arrow");
    const rightBtn       = wrapper.querySelector(".right-arrow");

    function renderMediaDetail() {
      const item = mediaList[index];
      if (!item) return;

      const src = normalizePath(item.src);
      let html = "";

      if (item.type === "video") {
        html = `
          <video class="gallery-detail-photo fade-in"
                 src="${src}"
                 controls
                 playsinline></video>
        `;
      } else {
        html = `
          <img class="gallery-detail-photo fade-in"
               src="${src}"
               alt="${entry.id || ""}">
        `;
      }

      mediaContainer.innerHTML = html;
    }

    function updateArrows() {
      if (!leftBtn || !rightBtn) return;

      if (mediaList.length <= 1) {
        leftBtn.style.display  = "none";
        rightBtn.style.display = "none";
        return;
      }

      leftBtn.style.display  = index === 0 ? "none" : "flex";
      rightBtn.style.display = index === mediaList.length - 1 ? "none" : "flex";
    }

    function goTo(newIndex) {
      if (newIndex < 0 || newIndex >= mediaList.length) return;
      index = newIndex;
      renderMediaDetail();
      updateArrows();
    }

    renderMediaDetail();
    updateArrows();

    if (leftBtn) {
      leftBtn.onclick = () => {
        if (index > 0) goTo(index - 1);
      };
    }
    if (rightBtn) {
      rightBtn.onclick = () => {
        if (index < mediaList.length - 1) goTo(index + 1);
      };
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeDetailCard);
    }
    if (overlayBackdrop) {
      overlayBackdrop.addEventListener("click", closeDetailCard);
    }

    escHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetailCard();
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  /* =========================
     5. 태그 필터 + 자동완성 연동
     ========================= */

  function applyFilter(tagText) {
    const cleaned = (tagText || "").trim().replace(/^#/, "");
    activeTag = cleaned || null;

    tagButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tag === activeTag);
    });

    renderGrid();
    hideTagSuggestions();
  }

  tagButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;

      if (activeTag === tag) {
        tagInput.value = "";
        applyFilter("");
      } else {
        tagInput.value = tag;
        applyFilter(tag);
      }
    });
  });

  if (searchBtn) {
    searchBtn.addEventListener("click", () => applyFilter(tagInput.value));
  }

  if (tagInput) {
    tagInput.addEventListener("focus", () => {
      showTagSuggestions(tagInput.value);
    });

    tagInput.addEventListener("input", () => {
      showTagSuggestions(tagInput.value);
    });

    tagInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFilter(tagInput.value);
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (!tagSuggestBox) return;
    if (
      e.target === tagInput ||
      tagSuggestBox.contains(e.target)
    ) {
      return;
    }
    hideTagSuggestions();
  });
});

/* =========================
   7. NOTICE 팝업
   ========================= */

const noticeIcon    = document.querySelector(".search-notice-icon");
const noticeOverlay = document.getElementById("notice-overlay");
const noticeClose   = noticeOverlay
  ? noticeOverlay.querySelector(".notice-close")
  : null;
const noticeBackdrop = noticeOverlay
  ? noticeOverlay.querySelector(".notice-backdrop")
  : null;
const noticeMailRow = noticeOverlay
  ? noticeOverlay.querySelector(".notice-mail-row")
  : null;

function openNotice(){
  if (!noticeOverlay) return;
  noticeOverlay.classList.add("active");
  noticeOverlay.setAttribute("aria-hidden", "false");
}

function closeNotice(){
  if (!noticeOverlay) return;
  noticeOverlay.classList.remove("active");
  noticeOverlay.setAttribute("aria-hidden", "true");
}

if (noticeIcon){
  noticeIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    openNotice();
  });
}

if (noticeClose){
  noticeClose.addEventListener("click", (e) => {
    e.stopPropagation();
    closeNotice();
  });
}

if (noticeBackdrop){
  noticeBackdrop.addEventListener("click", () => {
    closeNotice();
  });
}

// ESC로 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && noticeOverlay &&
      noticeOverlay.classList.contains("active")){
    closeNotice();
  }
});

// 메일 클릭 시 복사
if (noticeMailRow){
  noticeMailRow.addEventListener("click", async () => {
    const mail = "hswarchive0124@gmail.com";
    try{
      await navigator.clipboard.writeText(mail);
      alert("메일 주소가 복사되었습니다.");
    }catch(err){
      console.error("메일 복사 실패:", err);
      alert(mail + " 로 메일을 보내주세요.");
    }
  });
}

/* =========================
   6. 좌하단 글로벌 메뉴 버튼
   ========================= */

const fabRoot   = document.querySelector(".global-fab");
const fabBtn    = fabRoot ? fabRoot.querySelector(".global-fab-btn")   : null;
const fabPanel  = fabRoot ? fabRoot.querySelector(".global-fab-panel") : null;

function closeFab(){
  if (!fabRoot || !fabBtn) return;
  fabRoot.classList.remove("open");
  fabBtn.setAttribute("aria-expanded", "false");
}

function toggleFab(){
  if (!fabRoot || !fabBtn) return;
  const willOpen = !fabRoot.classList.contains("open");
  fabRoot.classList.toggle("open", willOpen);
  fabBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

if (fabBtn){
  fabBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFab();
  });
}

// 화면 다른 곳 클릭 시 닫기 (갤러리 오버레이랑 별개)
document.addEventListener("click", (e) => {
  if (!fabRoot || !fabPanel || !fabBtn) return;
  if (fabRoot.contains(e.target)) return;
  closeFab();
});

// ESC로 닫기 (갤러리 상세 오버레이 우선, 그 다음 메뉴)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape"){
    if (fabRoot && fabRoot.classList.contains("open")){
      closeFab();
    }
  }
});
