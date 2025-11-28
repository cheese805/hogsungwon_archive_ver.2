// script/profilescript.js

document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('fullpage-wrapper');
  const sections  = [...document.querySelectorAll('.section')];
  const triggers  = document.querySelectorAll('[data-next-section]');

  // 내부 스크롤 가능한 요소 감지
  const isScrollable = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const oy = style.overflowY;
    return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight;
  };

  const WHEEL_THRESHOLD = 30;
  const TOUCH_THRESHOLD = 60;
  const SNAP_LOCK_MS    = 700;

  let isSnapping = false;

  const vh = () => wrapper.clientHeight;
  const indexByScroll = () => Math.round(wrapper.scrollTop / vh());

  const snapTo = (idx) => {
    idx = Math.max(0, Math.min(idx, sections.length - 1));
    isSnapping = true;
    wrapper.scrollTo({ top: idx * vh(), behavior: 'smooth' });
    setTimeout(() => { isSnapping = false; }, SNAP_LOCK_MS);
  };

  const canScrollInside = (startEl, deltaY) => {
    let el = startEl;
    while (el && el !== wrapper && el !== document.body) {
      if (isScrollable(el)) {
        const atTop    = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (deltaY > 0 && !atBottom) return true;
        if (deltaY < 0 && !atTop)    return true;
        return false;
      }
      el = el.parentElement;
    }
    return false;
  };

  // 버튼으로 섹션 이동
  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isSnapping) return;
      const idx = indexByScroll();

      if (btn.id === 'scroll-to-filmography') {
        snapTo(idx + 1);
      } else if (btn.id === 'scroll-to-profile') {
        snapTo(idx - 1);
      } else {
        snapTo(idx + 1);
      }
    });
  });

  // 휠/트랙패드
  window.addEventListener('wheel', (e) => {
    if (isSnapping) { e.preventDefault(); return; }
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;

    if (canScrollInside(e.target, e.deltaY)) return;

    const idx = indexByScroll();
    if (e.deltaY > 0 && idx < sections.length - 1) {
      e.preventDefault();
      snapTo(idx + 1);
    } else if (e.deltaY < 0 && idx > 0) {
      e.preventDefault();
      snapTo(idx - 1);
    }
  }, { passive: false });

  // 터치 스와이프
  let touchStartY = 0, touchStartTarget = null;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartTarget = e.target;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isSnapping) return;
    const deltaY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;

    if (canScrollInside(touchStartTarget, deltaY)) return;

    const idx = indexByScroll();
    if (deltaY > 0 && idx < sections.length - 1) snapTo(idx + 1);
    else if (deltaY < 0 && idx > 0)             snapTo(idx - 1);
  }, { passive: true });

  // 리사이즈 시 현재 섹션으로 다시 스냅
  window.addEventListener('resize', () => {
    const idx = indexByScroll();
    snapTo(idx);
  });

  // 키보드 ↑ ↓
  window.addEventListener('keydown', (e) => {
    if (isSnapping) return;
    const idx = indexByScroll();
    if (e.key === 'ArrowDown' && idx < sections.length - 1) snapTo(idx + 1);
    if (e.key === 'ArrowUp'   && idx > 0)                   snapTo(idx - 1);
  });

  // 초기 위치
  snapTo(0);
});

/* =========================
   More 패널 토글 (모든 화면 공통)
   ========================= */
document.addEventListener('DOMContentLoaded', () => {
  const card      = document.querySelector('.profile-card');
  const panel     = document.getElementById('more-panel');
  const toggleBtn = document.getElementById('more-toggle');
  const closeBtn  = document.getElementById('more-close');

  if (!card || !panel || !toggleBtn || !closeBtn) return;

  const setOpen = (open) => {
    card.classList.toggle('is-more-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  };

  // 처음에는 닫힌 상태(오른쪽에서 빼꼼)
  setOpen(false);

  // + More about 클릭 → 슬라이드 업/다운 토글
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !card.classList.contains('is-more-open');
    setOpen(willOpen);
  });

  // X (excit.png) 클릭 → 닫기
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(false);
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!card.classList.contains('is-more-open')) return;
    if (panel.contains(e.target)) return;
    setOpen(false);
  });
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
