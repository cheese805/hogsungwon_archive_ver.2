// 이메일 복사만 있으면 됨
(() => {
  const input = document.getElementById('info-email-input');
  const btn   = document.getElementById('info-copy-btn');
  const toast = document.querySelector('.copy-toast');
  if (!input || !btn) return;

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      toast.style.opacity = 1;
      setTimeout(() => (toast.style.opacity = 0), 1400);
    } catch {
      input.select();
      alert('복사가 안 되면 직접 복사해주세요 :)');
    }
  });
})();
(() => {
  const wrap  = document.querySelector('.info-email-wrap');
  if (!wrap) return;

  const input = wrap.querySelector('#info-email-input');
  const btn   = wrap.querySelector('#info-copy-btn');
  const toast = wrap.querySelector('.copy-toast');

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      toast.style.opacity = 1;
      setTimeout(() => (toast.style.opacity = 0), 1400);
    } catch {
      input.select();
      alert('복사가 안 되면 직접 복사해주세요 :)');
    }
  });
})();

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
