// script/galleryscript.js

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

  // 현재 페이지 기준으로 gallery.json 절대주소 계산
  const dataUrl = new URL("gallery.json", window.location.href).toString();

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
      console.log("✅ gallery.json 로드 성공:", data);
      entries = data;

      buildGlobalTagList();  // 전체 태그 리스트 만들기
      renderGrid();
    })
    .catch(err => {
      console.error("❌ 갤러리 데이터 로드 실패:", err);
      if (grid) {
        grid.innerHTML =
          "<p style='font-size:0.8rem;color:#aaa;'>갤러리 데이터를 불러올 수 없어요.</p>";
      }
    });

  /* =========================
     2. 유틸 함수들
     ========================= */

  // "/galleryimg/xxx.jpg" → "galleryimg/xxx.jpg"
  function normalizePath(path) {
    if (!path) return "";
    return path.replace(/^\//, "");
  }

  function getFirstMedia(entry) {
    // 1순위: images 배열
    if (entry.images && entry.images.length > 0) {
      return { type: "image", src: entry.images[0] };
    }
    // 2순위: media 배열 (image → video)
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

  // 이 엔트리에서 검색/필터용 태그들 전부 뽑기:
  // - JSON tags
  // - 날짜 연도 (예: "2025")
  // - source.type (예: "official_stage", "instagram_story")
  function getAllTags(entry) {
    const set = new Set();

    // JSON에서 온 기본 태그들
    (entry.tags || []).forEach(t => {
      if (t) set.add(String(t));
    });

    // 연도
    if (entry.date && entry.date.length >= 4) {
      set.add(entry.date.slice(0, 4)); // "2025"
    }

    // type (official_stage, instagram_story 등)
    if (entry.source && entry.source.type) {
      set.add(entry.source.type);
    }

    return Array.from(set); // ["성원한_순간","2025","official_stage", ...]
  }

  // 상세 카드 아래 회색 태그 라인
  function buildTagLine(entry) {
    const all = getAllTags(entry);
    return all.map(t => `#${t}`).join(" ");
  }

  // 전체 엔트리에서 태그 하나로 모아서 리스트 만들기
  function buildGlobalTagList() {
    const set = new Set();

    entries.forEach(entry => {
      getAllTags(entry).forEach(t => {
        if (t) set.add(String(t));
      });
    });

    // 정렬 (한글/영문 섞여도 자연스럽게)
    allTagList = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "ko-KR")
    );
  }

  /* =========================
     TAG 자동완성 드롭다운
     ========================= */

  // 검색창 아래에 추천 박스 DOM 만들기
  (function setupTagSuggestBox() {
    const searchBar = document.querySelector(".search-bar");
    if (!searchBar) return;

    tagSuggestBox = document.createElement("div");
    tagSuggestBox.className = "tag-suggest";
    tagSuggestBox.innerHTML = `<div class="tag-suggest-list"></div>`;

    // 검색바 바로 아래에 삽입
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

    // 클릭 시 입력창에 넣고 필터 적용
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
        const thumb = hero.thumbnail || "img/video-thumb-default.jpg";
        video.setAttribute("poster", normalizePath(thumb));
        item.appendChild(video);
      }

      // 썸네일 클릭 → 상세 카드
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

    // 1) 이미지 + 비디오 모두 한 리스트로 합치기
    const mediaList = [];

    // images 배열 → 전부 image 타입으로
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

    // media 배열 → type, src/url 그대로
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

    // 보여줄 게 하나도 없으면 종료
    if (!mediaList.length) return;

    // 이전 카드 제거
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

    // mediaList[index]를 실제 DOM으로 렌더링
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

    // 초기 렌더
    renderMediaDetail();
    updateArrows();

    // 화살표
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

    // 닫기
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
    // 사용자가 # 붙여서 쳐도 처리되게 앞의 # 제거
    const cleaned = (tagText || "").trim().replace(/^#/, "");
    activeTag = cleaned || null;

    tagButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tag === activeTag);
    });

    renderGrid();
    hideTagSuggestions();   // 검색 실행 시 드롭다운 닫기
  }

  tagButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag; // "성원한_순간", "instagram_story", "2025" 등

      if (activeTag === tag) {
        tagInput.value = "";
        applyFilter("");
      } else {
        // 검색창에는 # 안 붙이고 순수 태그만
        tagInput.value = tag;
        applyFilter(tag);
      }
    });
  });

  if (searchBtn) {
    searchBtn.addEventListener("click", () => applyFilter(tagInput.value));
  }

  if (tagInput) {
    // 포커스만 해도 전체 태그 보여주기
    tagInput.addEventListener("focus", () => {
      showTagSuggestions(tagInput.value);
    });

    // 타이핑 할 때마다 자동완성 갱신
    tagInput.addEventListener("input", () => {
      showTagSuggestions(tagInput.value);
    });

    // Enter → 필터 적용
    tagInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyFilter(tagInput.value);
      }
    });
  }

  // 인풋/추천 영역 밖을 클릭하면 드롭다운 닫기
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
    if (fabRoot.contains(e.target)) return; // 메뉴 내부 클릭이면 유지
    closeFab();
  });

  // ESC로 닫기 (갤러리 상세 오버레이 우선, 그 다음 메뉴)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      // 상세 오버레이가 이미 처리하고 있으면 그쪽에 맡기고,
      // 메뉴만 열려 있는 상황이면 여기서 닫힘
      if (fabRoot && fabRoot.classList.contains("open")){
        closeFab();
      }
    }
  });
