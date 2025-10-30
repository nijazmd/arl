// === CONFIG (update if your GIDs change) ===
const cupsCsv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=1665101756&single=true&output=csv";
const cupEntriesCsv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=645625740&single=true&output=csv";
const raceResultsCsv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?gid=797800265&single=true&output=csv";
const driversCsv = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ63tC7c06XWlai6B2JUDeYNFjUXgA4ZSRb-r16PRSBaSG-egHddo0RYqCmNxknnR5MjgPmvjRlZZ-n/pub?output=csv";

// OPTIONAL: set this if you add the server endpoint to persist CupStatus auto-finish
const webAppUrl = ""; // e.g. "https://script.google.com/macros/s/XXXXXXXX/exec"

const els = {
  secLive: () => document.getElementById("secLive"),
  secUpcoming: () => document.getElementById("secUpcoming"),
  secFinished: () => document.getElementById("secFinished"),
  search: () => document.getElementById("search"),
  fltLive: () => document.getElementById("fltLive"),
  fltUpcoming: () => document.getElementById("fltUpcoming"),
  fltFinished: () => document.getElementById("fltFinished"),
};

const csvParse = (text) =>
  text.trim().split("\n").map(row => {
    // simple CSV parse for your sheet format
    return row.split(",").map(c => c.replace(/^"|"$/g, "").trim());
  });

const clean = s => (s||"").trim().toLowerCase();

const state = {
  cups: [],            // [{CupID,CupName,CupStatus,AvgDistance}]
  entriesByCup: new Map(), // CupID -> [{Order,DriverName,Car,Track,PP,CupPoints}]
  racesByCup: new Map(),   // CupID -> count
  teamByDriver: new Map(), // Driver -> Team
  filters: { live:true, upcoming:true, finished:true, q:"" },
};

document.addEventListener("DOMContentLoaded", init);

async function init(){
  const cacheBust = `cb=${Date.now()}`;
  const fetchOpts = { cache: "no-store" };

  const [cupsTxt, entriesTxt, racesTxt, driversTxt] = await Promise.all([
    fetch(`${cupsCsv}&${cacheBust}`, fetchOpts).then(r=>r.text()),
    fetch(`${cupEntriesCsv}&${cacheBust}`, fetchOpts).then(r=>r.text()),
    fetch(`${raceResultsCsv}&${cacheBust}`, fetchOpts).then(r=>r.text()),
    fetch(`${driversCsv}&${cacheBust}`, fetchOpts).then(r=>r.text()),
  ]);

  // Drivers → team map
  const dRows = csvParse(driversTxt);
  const dHdr = dRows[0];
  const dDriver = dHdr.indexOf("Driver");
  const dTeam = dHdr.indexOf("Team");
  dRows.slice(1).forEach(r=>{
    const name = r[dDriver]; if(!name) return;
    state.teamByDriver.set(name, r[dTeam]||"");
  });

  // CupEntries
  const eRows = csvParse(entriesTxt);
  const eHdr = eRows[0];
  const eCup = eHdr.indexOf("CupID");
  const eOrder = eHdr.indexOf("Order");
  const eDriver = eHdr.indexOf("DriverName");
  const eCar = eHdr.indexOf("Car");
  const eTrack = eHdr.indexOf("Track");
  const ePP = eHdr.indexOf("PP");
  const ePts = eHdr.indexOf("CupPoints");

  eRows.slice(1).forEach(r=>{
    const cid = r[eCup]; if(!cid) return;
    if(!state.entriesByCup.has(cid)) state.entriesByCup.set(cid, []);
    state.entriesByCup.get(cid).push({
      CupID: cid,
      Order: parseInt(r[eOrder]||"9999",10),
      DriverName: r[eDriver] || "",
      Car: r[eCar] || "",
      Track: r[eTrack] || "",
      PP: parseFloat(r[ePP]||"") || null,
      CupPoints: parseFloat(r[ePts]||"") || null,
    });
  });
  // sort entries by Order per cup
  for(const [cid, arr] of state.entriesByCup.entries()){
    arr.sort((a,b)=> (a.Order||9999) - (b.Order||9999));
  }

  // RaceResults → races per cup
  const rRows = csvParse(racesTxt);
  const rHdr = rRows[0];
  const rCup = rHdr.indexOf("CupID");
  const rDrv = rHdr.indexOf("DriverName");
  const ranByCup = new Map(); // CupID -> Set(drivers who already ran)
  rRows.slice(1).forEach(r=>{
    const cid = r[rCup]; if(!cid) return;
    state.racesByCup.set(cid, (state.racesByCup.get(cid)||0) + 1);
    if(!ranByCup.has(cid)) ranByCup.set(cid, new Set());
    const dn = (r[rDrv]||"").trim();
    if(dn) ranByCup.get(cid).add(dn);
  });

  // Cups
  const cRows = csvParse(cupsTxt);
  const cHdr = cRows[0];
  const cID = cHdr.indexOf("CupID");
  const cName = cHdr.indexOf("CupName");
  const cStatus = cHdr.indexOf("CupStatus");
  const cAvg = cHdr.indexOf("AvgDistance");

  state.cups = cRows.slice(1).map(r=>({
    CupID: r[cID],
    CupName: r[cName],
    CupStatus: r[cStatus],
    AvgDistance: r[cAvg] || "",
  })).filter(c => !!c.CupID);

  // Build render models with derived fields
  const models = state.cups.map(c=>{
    const cid = c.CupID;
    const entries = state.entriesByCup.get(cid) || [];
    const totalNeeded = entries.length || 20; // future-proof
    const racesDone = state.racesByCup.get(cid) || 0;

    // Min/Max PP from entries
    const pps = entries.map(e=>e.PP).filter(v=>v!=null && !Number.isNaN(v));
    const minPP = pps.length ? Math.min(...pps) : null;
    const maxPP = pps.length ? Math.max(...pps) : null;

    // Next (Live only): first entry whose driver not in ran set
    const ran = ranByCup.get(cid) || new Set();
    const nextEntry = entries.find(e => !ran.has((e.DriverName||"").trim())) || null;
    const nextStr = nextEntry
      ? `${nextEntry.DriverName} (${state.teamByDriver.get(nextEntry.DriverName)||"—"}) — ${nextEntry.Car} — ${nextEntry.Track}`
      : "Completed";

    // Finished top 3 cars by CupPoints
    const top3 = entries
      .filter(e => e.CupPoints!=null && !Number.isNaN(e.CupPoints))
      .slice()
      .sort((a,b)=> (b.CupPoints - a.CupPoints))
      .slice(0,3);

    // Auto-finish (UI) if completed
    const uiStatus = (racesDone >= totalNeeded) ? "Finished" : c.CupStatus;

    return {
      ...c,
      CupStatusUI: uiStatus,
      racesDone, totalNeeded,
      minPP, maxPP,
      nextStr,
      top3,
    };
  });

  // Hook up filters
  [els.search(), els.fltLive(), els.fltUpcoming(), els.fltFinished()].forEach(el=>{
    el.addEventListener("input", ()=>{
      state.filters.q = els.search().value.trim().toLowerCase();
      state.filters.live = els.fltLive().checked;
      state.filters.upcoming = els.fltUpcoming().checked;
      state.filters.finished = els.fltFinished().checked;
      render(models);
    });
  });

  render(models);

  // OPTIONAL: persist CupStatus "Finished" if you want (needs server)
  // persistAutoFinished(models); // uncomment if you add server support
}

function render(models){
  const q = state.filters.q;
  const show = (m) => m.CupName.toLowerCase().includes(q) || m.CupID.toLowerCase().includes(q);

  const sec = { Live: [], Upcoming: [], Finished: [] };
  models.forEach(m=>{
    const status = (m.CupStatusUI||"").toLowerCase();
    if(!show(m)) return;
    if(status==="live" && state.filters.live) sec.Live.push(m);
    else if(status==="upcoming" && state.filters.upcoming) sec.Upcoming.push(m);
    else if(status==="finished" && state.filters.finished) sec.Finished.push(m);
  });

  // Sort inside sections by name (you can tweak)
  sec.Live.sort((a,b)=>a.CupName.localeCompare(b.CupName));
  sec.Upcoming.sort((a,b)=>a.CupName.localeCompare(b.CupName));
  sec.Finished.sort((a,b)=>a.CupName.localeCompare(b.CupName));

  els.secLive().innerHTML = sec.Live.map(cardHTML).join("");
  els.secUpcoming().innerHTML = sec.Upcoming.map(cardHTML).join("");
  els.secFinished().innerHTML = sec.Finished.map(cardHTML).join("");

  // animate progress bars
  document.querySelectorAll(".bar").forEach(b=>{
    const pct = parseFloat(b.dataset.pct||"0");
    requestAnimationFrame(()=>{ b.style.width = pct + "%"; });
  });
}

function cardHTML(m){
  const pct = Math.max(0, Math.min(100, Math.round((m.racesDone / Math.max(1,m.totalNeeded)) * 100)));
  const minPP = (m.minPP!=null) ? m.minPP : "—";
  const maxPP = (m.maxPP!=null) ? m.maxPP : "—";
  const nextLine = (m.CupStatusUI.toLowerCase()==="live")
    ? `<div class="nextLine"><span class="cupInfoLabel">Next</span> <span class="cupInfoValue">${m.nextStr}</span></div>`
    : "";

  const finishedBlock = (m.CupStatusUI.toLowerCase()==="finished" && m.top3.length)
    ? `<div class="winners">
        ${m.top3.map((e,i)=>{
          const rank = i+1;
          const cls = i===0 ? "winner" : "";
          const pts = (e.CupPoints!=null && !Number.isNaN(e.CupPoints)) ? e.CupPoints : "—";
          return `<div class="${cls}">
            #${rank} ${e.Car} <span class="subtle">${pts}</span>
          </div>`;
        }).join("")}
      </div>`
    : "";

  // Card body
  return `
    <div class="cup-card" onclick="location.href='cup-single.html?cup=${encodeURIComponent(m.CupID)}'">
      <h3 class="cupTitle">${m.CupName || "Unnamed Cup"}
        <span class="statusBadge">${m.CupStatusUI||"—"}</span>
      </h3>

      <div class="cupProgress">
        <div class="cupInfoValue">${m.racesDone}<span class="muted">/${m.totalNeeded}</span>
          <div class="progress"><div class="bar" data-pct="${pct}"></div></div>
        </div>
      </div>
      <div class="cupInfos">
        <div>
          <div class="cupInfoLabel">Avg. Distance</div>
          <div class="cupInfoValue">${m.AvgDistance || "—"}<span class="muted"> km</span></div>
        </div>
        <div>
          <div class="cupInfoLabel">Min PP</div>
          <div class="cupInfoValue">${minPP}</div>
        </div>
        <div>
          <div class="cupInfoLabel">Max PP</div>
          <div class="cupInfoValue">${maxPP}</div>
        </div>
      </div>

      ${nextLine}
      ${finishedBlock}
    </div>
  `;
}

// OPTIONAL: if you want to persist CupStatus -> "Finished" in the sheet when complete
async function persistAutoFinished(models){
  if(!webAppUrl) return;
  const done = models.filter(m => (m.CupStatus || "").toLowerCase() !== "finished" && m.CupStatusUI==="Finished");
  for(const m of done){
    try{
      const fd = new FormData();
      fd.append("mode","cupStatus");
      fd.append("CupID", m.CupID);
      fd.append("CupStatus", "Finished");
      await fetch(webAppUrl, { method:"POST", body:fd, mode:"no-cors" });
    }catch(e){ console.warn("Persist CupStatus failed for", m.CupID, e); }
  }
}
