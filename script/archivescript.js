// script/archivescript.js

document.addEventListener('DOMContentLoaded', () => {
/* =========================
   1. 필터 로직
   ========================= */
  const filterButtons = document.querySelectorAll('.filter-btn');  // ← 전체 버튼 다 잡기
  const applyBtn = document.getElementById('filter-apply-btn');
  const cards = document.querySelectorAll('.archive-card');

  const selected = {
    year: new Set(),
    genre: new Set()
  };

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // 1) 먼저 비주얼 토글 (색 바뀌는 부분)
      btn.classList.toggle('active');

      // 2) 실제 필터 데이터는 data-* 있는 버튼만 반영
      const type = btn.dataset.filterType;
      const value = btn.dataset.filterValue;
      if (!type || !value) return;

      if (btn.classList.contains('active')) {
        selected[type].add(value);
      } else {
        selected[type].delete(value);
      }
    });
  });


  function applyFilters() {
    const hasYear = selected.year.size > 0;
    const hasGenre = selected.genre.size > 0;

    let visibleCount = 0; 

    cards.forEach((card) => {
      const yearAttr = card.dataset.year || '';
      const genre = card.dataset.genre || '';

      const yearTokens = yearAttr
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

      let visible = true;

      if (hasYear) {
        const matchYear = yearTokens.some((y) => selected.year.has(y));
        if (!matchYear) visible = false;
      }

      if (hasGenre && !selected.genre.has(genre)) {
        visible = false;
      }

      card.style.display = visible ? '' : 'none';
      if (visible) {
        visibleCount++;          // 🔥 보이는 카드 개수++
      } else {
        card.classList.remove('is-centered');
      }
    });

    // 🔥 결과 카드 수에 따라 문구 토글
    const noResultMsg = document.getElementById('no-result');
    if (noResultMsg) {
      noResultMsg.style.display = (visibleCount === 0) ? 'block' : 'none';
    }

    updateCenterCard();
  }

  if (applyBtn) {
    applyBtn.addEventListener('click', applyFilters);
  }

  /* =========================
   2. 카드 → 상세 모달 (X 버튼 버전)
   ========================= */
  const overlay = document.getElementById('archive-overlay');
  const overlayBackdrop = overlay ? overlay.querySelector('.overlay-backdrop') : null;
  const page = document.querySelector('.archive-page');
  const list = document.getElementById('archive-list');

  let openedWrapper = null;
  let escDetailHandler = null;

  function openDetail(card) {
    if (openedWrapper) return;

    const detail = card.querySelector('.archive-detail');
    if (!detail) return;

    // wrapper + 상세카드
    const wrapper = document.createElement('div');
    wrapper.className = 'expanded-wrapper';

    wrapper.innerHTML = `
      <div class="expanded-card">
        <img src="img/excit.png" class="expanded-close-img" alt="close">
        ${detail.innerHTML}
      </div>
    `;

    document.body.appendChild(wrapper);

    const cardEl = wrapper.querySelector('.expanded-card');
    const closeImg = wrapper.querySelector('.expanded-close-img');

    // 페이드 인
    requestAnimationFrame(() => {
      if (overlay) overlay.classList.add('is-open');
      if (page) page.classList.add('is-blurred');
      wrapper.classList.add('is-open');
      if (cardEl) cardEl.classList.add('is-open');
    });

    openedWrapper = wrapper;

    const handleClose = () => closeDetail();

    // 오른쪽 상단 X 클릭
    if (closeImg) closeImg.addEventListener('click', handleClose);

    // 배경 클릭 → 닫기
    if (overlayBackdrop) overlayBackdrop.addEventListener('click', handleClose);

    // ESC → 닫기
    escDetailHandler = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', escDetailHandler);
  }

  function closeDetail() {
    if (!openedWrapper) return;

    const wrapper = openedWrapper;
    const cardEl = wrapper.querySelector('.expanded-card');

    if (overlay) overlay.classList.remove('is-open');
    if (page) page.classList.remove('is-blurred');

    wrapper.classList.remove('is-open');
    if (cardEl) cardEl.classList.remove('is-open');

    openedWrapper = null;

    const removeNow = () => wrapper.remove();

    // 트랜지션 끝나면 제거
    if (cardEl) {
      const onEnd = () => {
        cardEl.removeEventListener('transitionend', onEnd);
        removeNow();
      };
      cardEl.addEventListener('transitionend', onEnd);
      setTimeout(removeNow, 400);
    } else {
      removeNow();
    }

    if (overlayBackdrop) overlayBackdrop.removeEventListener('click', closeDetail);
    if (escDetailHandler) {
      document.removeEventListener('keydown', escDetailHandler);
      escDetailHandler = null;
    }
  }

  // More 버튼 → 상세 열기
  if (list) {
    list.addEventListener('click', (e) => {
      const moreBtn = e.target.closest('.card-more');
      if (!moreBtn) return;
      const card = moreBtn.closest('.archive-card');
      if (!card) return;
      openDetail(card);
    });
  }


  /* =========================
     3. PHOTO 라이트박스
     ========================= */
  const photoLightbox = document.getElementById('photo-lightbox');
  const lbBackdrop = photoLightbox
    ? photoLightbox.querySelector('.photo-lightbox-backdrop')
    : null;
  const lightboxImg = document.getElementById('lightbox-img');
  const arrowLeft = photoLightbox
    ? photoLightbox.querySelector('.left-arrow')
    : null;
  const arrowRight = photoLightbox
    ? photoLightbox.querySelector('.right-arrow')
    : null;

  let photoList = [];
  let photoIndex = 0;

  function updateArrows() {
    if (!arrowLeft || !arrowRight) return;
    if (photoList.length <= 1) {
      arrowLeft.style.display = 'none';
      arrowRight.style.display = 'none';
    } else {
      arrowLeft.style.display = '';
      arrowRight.style.display = '';
    }
  }

  function renderLightbox() {
    if (!lightboxImg || !photoList.length) return;
    lightboxImg.src = photoList[photoIndex];
  }

  function openPhotoLightbox(src, list, index) {
    if (!photoLightbox || !lightboxImg) return;

    if (Array.isArray(list) && list.length) {
      photoList = list.slice();
    } else {
      photoList = [src];
    }
    photoIndex = typeof index === 'number' ? index : 0;

    updateArrows();
    renderLightbox();

    photoLightbox.classList.add('is-open');
    photoLightbox.setAttribute('aria-hidden', 'false');
  }

  function closePhotoLightbox() {
    if (!photoLightbox) return;
    photoLightbox.classList.remove('is-open');
    photoLightbox.setAttribute('aria-hidden', 'true');
  }

  function showPrev() {
    if (!photoList.length) return;
    photoIndex = (photoIndex - 1 + photoList.length) % photoList.length;
    renderLightbox();
  }

  function showNext() {
    if (!photoList.length) return;
    photoIndex = (photoIndex + 1) % photoList.length;
    renderLightbox();
  }

  // 상세 카드 안 사진 클릭 → 라이트박스
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.detail-photo img');
    if (!img) return;

    const grid = img.closest('.detail-photo-grid');
    let srcList = [img.src];
    let idx = 0;

    if (grid) {
      const imgs = Array.from(grid.querySelectorAll('img'));
      srcList = imgs.map((i) => i.src);
      idx = imgs.indexOf(img);
    }

    openPhotoLightbox(img.src, srcList, idx);
  });

  if (arrowLeft) {
    arrowLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      showPrev();
    });
  }

  if (arrowRight) {
    arrowRight.addEventListener('click', (e) => {
      e.stopPropagation();
      showNext();
    });
  }

  if (lbBackdrop) {
    lbBackdrop.addEventListener('click', closePhotoLightbox);
  }

  if (photoLightbox) {
    photoLightbox.addEventListener('click', (e) => {
      if (e.target === photoLightbox) closePhotoLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!photoLightbox || !photoLightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closePhotoLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  function openLightbox(src) {
    const lightbox = document.querySelector('.photo-lightbox');
    const img = document.getElementById('lightbox-img');

    img.src = src;
    lightbox.classList.add('is-open');
  }

  function closeLightbox() {
    const lightbox = document.querySelector('.photo-lightbox');
    lightbox.classList.remove('is-open');
  }

  document.addEventListener('click', (e)=>{
    const thumb = e.target.closest('.detail-photo img');
    if(thumb){
      openLightbox(thumb.src);
    }
  });

  document.addEventListener('click', (e)=>{
    if(e.target.classList.contains('lightbox-close')){
      closeLightbox();
    }
  });

  /* =========================
     4. 화면 중앙 카드 하이라이트
     ========================= */
  function updateCenterCard() {
    const viewportCenter = window.innerHeight / 2;
    let closestCard = null;
    let closestDist = Infinity;

    cards.forEach((card) => {
      if (card.style.display === 'none') {
        card.classList.remove('is-centered');
        return;
      }

      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const dist = Math.abs(cardCenter - viewportCenter);

      if (dist < closestDist) {
        closestDist = dist;
        closestCard = card;
      }
    });

    cards.forEach((card) => {
      card.classList.toggle('is-centered', card === closestCard);
    });
  }

  window.addEventListener('scroll', updateCenterCard, { passive: true });
  window.addEventListener('resize', updateCenterCard);
  updateCenterCard();
});

  /* =========================
     PHOTO: 마우스 휠 → 가로 스크롤
     ========================= */
  const photoRows = document.querySelectorAll('.detail-photo-grid');

  photoRows.forEach(row => {
    row.addEventListener('wheel', (e) => {
      // 세로 휠을 가로 스크롤로 바꿈
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        row.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  });

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
