(() => {
  let cursor = new Date();   // 현재 연월 기준
  let eventsData = [];
  let eventMap = new Map();

  const COLOR_MAP = {
    "뮤지컬 [개와 고양이의 시간]": "#7f83ce",
    "뮤지컬 [번 더 위치]": "#bc67b3",
    "뮤지컬 [클로버]": "#64d534",
    "뮤지컬 [무명, 준희]": "#c7b59e",
    "뮤지컬 [데카브리]": "#3b2e66",
  };

  const $monthYear     = document.getElementById("month-year");
  const $tbody         = document.getElementById("calendar-body");
  const $prevBtn       = document.getElementById("prev-month");
  const $nextBtn       = document.getElementById("next-month");
  const $eventBox      = document.getElementById("event-box");
  const $eventContent  = document.getElementById("event-content");
  const $eventTitle    = document.getElementById("event-title");
  const $closeEvent    = document.getElementById("close-event");

  const pad2 = (n) => String(n).padStart(2, "0");
  const ymdKey = (y,m,d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const getColor = t => COLOR_MAP[t] || "#000";

  /* -----------------------------
      달력 렌더
  ------------------------------ */
  function renderCalendar(base) {
    $tbody.innerHTML = "";

    const year  = base.getFullYear();
    const month = base.getMonth() + 1;

    $monthYear.textContent = `${month}월`;

    const firstDay    = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    let row = document.createElement("tr");

    for (let i=0;i<firstDay;i++){
      row.appendChild(document.createElement("td"));
    }

    for (let day=1; day<=daysInMonth; day++){
      const td = document.createElement("td");
      const key = ymdKey(year, month, day);

      const dayNum = document.createElement("span");
      dayNum.className = "day-num";
      dayNum.textContent = day;
      td.appendChild(dayNum);

      const evts = eventMap.get(key) || [];
      if (evts.length > 0) {
        const dotWrap = document.createElement("div");
        dotWrap.className = "dot-wrap";
        evts.forEach(ev=>{
          const dot = document.createElement("span");
          dot.className = "dot";
          dot.style.backgroundColor = getColor(ev.title);
          dotWrap.appendChild(dot);
        });
        td.appendChild(dotWrap);

        td.style.cursor = "pointer";
        td.addEventListener("click", e => {
          e.stopPropagation();
          showEvents(key, evts);
        });
      }

      row.appendChild(td);

      if ((firstDay + day) % 7 === 0) {
        $tbody.appendChild(row);
        row = document.createElement("tr");
      }
    }

    if (row.children.length > 0) $tbody.appendChild(row);
  }

  /* -----------------------------
      이벤트 팝업
  ------------------------------ */
  function showEvents(key, events) {
    const [y,m,d] = key.split("-").map(Number);

    $eventTitle.textContent = `${m}월 ${d}일`;

    const html = events.map(ev => `
      <div class="event-item">
        <div class="event-title" style="color:${getColor(ev.title)};">
          ${ev.title}
        </div>
        <div><span class="event-label">TIME :</span>
             <span class="event-detail">${ev.time || "-"}</span></div>
        <div><span class="event-label">CAST :</span>
             <span class="event-detail">${ev.cast || "-"}</span></div>
      </div>
    `).join(`<hr style="margin:10px 0;">`);

    $eventContent.innerHTML = html;
    $eventBox.style.display = "block";
  }

  function hideEventBox(){
    $eventBox.style.display = "none";
  }

  document.addEventListener("click", hideEventBox);
  $closeEvent.addEventListener("click", hideEventBox);
  $eventBox.addEventListener("click", e => e.stopPropagation());

  /* -----------------------------
      월 전환 기능 여기!!!
  ------------------------------ */
  $prevBtn.addEventListener("click", e => {
    e.stopPropagation();
    cursor.setMonth(cursor.getMonth() - 1);
    renderCalendar(cursor);
  });

  $nextBtn.addEventListener("click", e => {
    e.stopPropagation();
    cursor.setMonth(cursor.getMonth() + 1);
    renderCalendar(cursor);
  });

  /* -----------------------------
      CSV 로드
  ------------------------------ */
  function loadCSV() {
    Papa.parse("schedule.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data || [];
        const list = [];

        rows.forEach(r => {
          const year  = Number(r.year);
          const month = Number(r.month);
          const day   = Number(r.day);
          if (!year || !month || !day) return;

          list.push({
            year, month, day,
            time:  r.time  || "",
            title: r.title || "",
            cast:  r.cast  || ""
          });
        });

        eventsData = list;

        // Event map 생성
        list.forEach(ev => {
          const key = ymdKey(ev.year, ev.month, ev.day);
          if (!eventMap.has(key)) eventMap.set(key, []);
          eventMap.get(key).push(ev);
        });

        renderCalendar(cursor);
      }
    });
  }

  loadCSV();
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

