// profilescript.js
document.addEventListener('DOMContentLoaded', () => {
  const wrapper   = document.getElementById('fullpage-wrapper');
  const sections  = [...document.querySelectorAll('.section')];
  const triggers  = document.querySelectorAll('[data-next-section]');

  // 내부 스크롤 가능한 요소(예: 필모그래피) – 없으면 자동 무시됨
  // 필요 시 여러 개도 자연스럽게 동작하도록 제네릭 처리
  const isScrollable = (el) => {
    if (!el) return false;
    const style = getComputedStyle(el);
    const oy = style.overflowY;
    return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight;
  };

  // ===== 튜닝 포인트 =====
  const WHEEL_THRESHOLD = 30;   // 트랙패드 대응 (낮을수록 민감)
  const TOUCH_THRESHOLD = 60;   // 스와이프 민감도(px)
  const SNAP_LOCK_MS    = 700;  // 섹션 스냅 후 잠금 시간(ms)

  let isSnapping = false;

  const vh = () => wrapper.clientHeight; // svh 보정
  const indexByScroll = () => Math.round(wrapper.scrollTop / vh());

  const snapTo = (idx) => {
    idx = Math.max(0, Math.min(idx, sections.length - 1));
    isSnapping = true;
    wrapper.scrollTo({ top: idx * vh(), behavior: 'smooth' });
    setTimeout(() => { isSnapping = false; }, SNAP_LOCK_MS);
  };

  // 이벤트 타깃에서 wrapper까지 타고 올라가며
  // 내부 스크롤을 더 할 수 있으면 true
  const canScrollInside = (startEl, deltaY) => {
    let el = startEl;
    while (el && el !== wrapper && el !== document.body) {
      if (isScrollable(el)) {
        const atTop    = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (deltaY > 0 && !atBottom) return true; // 아래로 더 가능
        if (deltaY < 0 && !atTop)    return true; // 위로 더 가능
        return false; // 경계 도달 → 섹션 스냅 가능
      }
      el = el.parentElement;
    }
    return false;
  };

  // ===== 화살표(버튼) – 위/아래 둘 다 지원 =====
  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isSnapping) return;
      const idx = indexByScroll();
      if (btn.id === 'scroll-to-filmography') snapTo(idx + 1);
      else if (btn.id === 'scroll-to-profile') snapTo(idx - 1);
      else snapTo(idx + 1); // 아이디 없으면 기본적으로 아래로
    });
  });

  // ===== 휠/트랙패드 =====
  window.addEventListener('wheel', (e) => {
    if (isSnapping) { e.preventDefault(); return; }
    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;

    // 내부 스크롤 여지가 있으면 섹션 스냅 금지
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

  // ===== 터치 스와이프 =====
  let touchStartY = 0, touchStartTarget = null;
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartTarget = e.target;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (isSnapping) return;
    const deltaY = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(deltaY) < TOUCH_THRESHOLD) return;

    // 내부 스크롤 여지가 있으면 섹션 스냅 금지
    if (canScrollInside(touchStartTarget, deltaY)) return;

    const idx = indexByScroll();
    if (deltaY > 0 && idx < sections.length - 1) snapTo(idx + 1);
    else if (deltaY < 0 && idx > 0)             snapTo(idx - 1);
  }, { passive: true });

  // ===== 리사이즈 시 현재 섹션으로 다시 스냅(주소창/툴바 변화 대응) =====
  window.addEventListener('resize', () => {
    const idx = indexByScroll();
    snapTo(idx);
  });

  // ===== 키보드(선택): ↑/↓로 섹션 이동 =====
  window.addEventListener('keydown', (e) => {
    if (isSnapping) return;
    const idx = indexByScroll();
    if (e.key === 'ArrowDown' && idx < sections.length - 1) snapTo(idx + 1);
    if (e.key === 'ArrowUp'   && idx > 0)                   snapTo(idx - 1);
  });

  // 초기 위치 고정
  snapTo(0);
});

