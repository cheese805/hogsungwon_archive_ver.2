// index.html 전용 풀페이지 스크롤
document.addEventListener('DOMContentLoaded', () => {
  const wrapper  = document.getElementById('fullpage-wrapper');
  const sections = Array.from(document.querySelectorAll('.section'));

  if (!wrapper || sections.length === 0) return;

  let currentIndex = 0;
  let isSnapping   = false;
  let touchStartY  = 0;

  // ===== 감도 설정 (숫자 높을수록 둔감해짐) =====
  const WHEEL_THRESHOLD = 80;   // 마우스 휠
  const TOUCH_THRESHOLD = 90;   // 터치 스와이프
  const SNAP_LOCK       = 700;  // ms, 한 번 스냅 후 잠금 시간

  const snapTo = (index) => {
    if (index < 0 || index >= sections.length) return;
    isSnapping = true;
    currentIndex = index;

    const targetTop = sections[index].offsetTop;
    wrapper.scrollTo({
      top: targetTop,
      behavior: 'smooth',
    });

    // 일정 시간 동안은 추가 입력 막기
    setTimeout(() => {
      isSnapping = false;
    }, SNAP_LOCK);
  };

  // 현재 스크롤 위치 기준으로 "가장 가까운 섹션" 계산
  const updateIndexByScroll = () => {
    if (isSnapping) return;

    const scrollTop = wrapper.scrollTop;
    let closest = 0;
    let minDiff = Infinity;

    sections.forEach((sec, i) => {
      const diff = Math.abs(sec.offsetTop - scrollTop);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    });

    currentIndex = closest;
  };

  // 스크롤이 멈췄을 때, 섹션 사이에 걸쳐 있으면 가까운 쪽으로 스냅
  wrapper.addEventListener('scroll', () => {
    if (isSnapping) return;

    clearTimeout(wrapper._snapTimeout);
    wrapper._snapTimeout = setTimeout(() => {
      const scrollTop = wrapper.scrollTop;
      let closest = 0;
      let minDiff = Infinity;

      sections.forEach((sec, i) => {
        const diff = Math.abs(sec.offsetTop - scrollTop);
        if (diff < minDiff) {
          minDiff = diff;
          closest = i;
        }
      });

      // 화면 높이의 40% 이내면 "가까운 섹션"으로 정렬
      if (minDiff < window.innerHeight * 0.4) {
        snapTo(closest);
      } else {
        // 그래도 좀 떨어져 있으면 인덱스만 업데이트
        currentIndex = closest;
      }
    }, 120); // 스크롤 멈춘 뒤 살짝 텀 두고 동작
  });

  // 마우스 휠로 한 칸씩만 이동 (감도 낮게)
  wrapper.addEventListener('wheel', (e) => {
    if (isSnapping) {
      e.preventDefault();
      return;
    }

    if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) {
      // 가벼운 미끄러짐은 무시
      return;
    }

    e.preventDefault();
    updateIndexByScroll();

    if (e.deltaY > 0 && currentIndex < sections.length - 1) {
      snapTo(currentIndex + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      snapTo(currentIndex - 1);
    }
  }, { passive: false });

  // 터치 시작 위치 기록
  wrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  // 터치 끝났을 때 방향/거리 보고 섹션 이동
  wrapper.addEventListener('touchend', (e) => {
    if (isSnapping) return;

    const touchEndY = (e.changedTouches && e.changedTouches[0].clientY) || touchStartY;
    const diff = touchStartY - touchEndY; // 양수: 위로 쓸어올림(다음 섹션)

    updateIndexByScroll();

    // 손가락 살짝만 움직였으면, 그냥 가까운 섹션으로 재정렬
    if (Math.abs(diff) < TOUCH_THRESHOLD) {
      snapTo(currentIndex);
      return;
    }

    if (diff > 0 && currentIndex < sections.length - 1) {
      // 위로 쓸어올림 → 아래 섹션
      snapTo(currentIndex + 1);
    } else if (diff < 0 && currentIndex > 0) {
      // 아래로 쓸어내림 → 위 섹션
      snapTo(currentIndex - 1);
    }
  }, { passive: true });

  // data-next-section 버튼(있으면)도 한 칸씩 이동하게
  document.querySelectorAll('[data-next-section]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isSnapping) return;

      updateIndexByScroll();

      const target = btn.dataset.nextSection;
      if (!target || target === 'next') {
        if (currentIndex < sections.length - 1) {
          snapTo(currentIndex + 1);
        }
      } else {
        const idx = sections.findIndex(sec => sec.id === target);
        if (idx !== -1) snapTo(idx);
      }
    });
  });

  // 처음 로딩 시 0번 섹션에 딱 붙이기
  snapTo(0);
});
