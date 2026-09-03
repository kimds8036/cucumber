/* global L, api, esc */

let opsSchoolMap = null;
let opsSchoolMapLayer = null;
let opsSchoolGeoCache = null;

function ensureLeafletLoaded() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }
    const existingCss = document.querySelector('link[data-ops-leaflet]');
    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-ops-leaflet', '1');
      document.head.appendChild(link);
    }
    const existingScript = document.querySelector('script[data-ops-leaflet]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L));
      existingScript.addEventListener('error', () =>
        reject(new Error('Leaflet 로드 실패')),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.setAttribute('data-ops-leaflet', '1');
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Leaflet 로드 실패'));
    document.head.appendChild(script);
  });
}

function opsMapRadius(userCount, maxCount) {
  const n = Math.max(1, Number(userCount) || 1);
  const max = Math.max(1, Number(maxCount) || 1);
  const t = Math.sqrt(n / max);
  return Math.max(6, Math.min(28, 6 + t * 22));
}

function destroyOpsSchoolMap() {
  if (opsSchoolMap) {
    opsSchoolMap.remove();
    opsSchoolMap = null;
    opsSchoolMapLayer = null;
  }
}

async function loadOpsSchoolGeo() {
  const status = document.getElementById('ops-map-status');
  const kpis = document.getElementById('ops-map-kpis');
  const regionsHost = document.getElementById('ops-map-regions');
  if (status) status.textContent = '불러오는 중…';

  try {
    const Leaflet = await ensureLeafletLoaded();
    const { data } = await api('/analytics/school-geo');
    opsSchoolGeoCache = data;
    renderOpsSchoolGeoKpis(data);
    renderOpsSchoolGeoRegions(data);
    renderOpsSchoolMap(Leaflet, data);
    if (status) {
      status.textContent = `학교 ${Number(data?.summary?.schools || 0).toLocaleString()}곳 · 학생 ${Number(data?.summary?.users || 0).toLocaleString()}명`;
    }
  } catch (error) {
    if (kpis) kpis.innerHTML = '';
    if (regionsHost) {
      regionsHost.innerHTML = `<div class="txt-muted">${esc(error?.message || '불러오지 못했습니다.')}</div>`;
    }
    if (status) status.textContent = error?.message || '지도를 불러오지 못했습니다.';
    throw error;
  }
}

function renderOpsSchoolGeoKpis(data) {
  const kpis = document.getElementById('ops-map-kpis');
  if (!kpis) return;
  const s = data?.summary || {};
  kpis.innerHTML = `
    <div class="stat-card"><div class="stat-num">${Number(s.users || 0).toLocaleString()}</div><div class="stat-label">학생</div></div>
    <div class="stat-card"><div class="stat-num">${Number(s.schools || 0).toLocaleString()}</div><div class="stat-label">학교(좌표)</div></div>
    <div class="stat-card"><div class="stat-num">${Number(s.regions || 0).toLocaleString()}</div><div class="stat-label">시·도</div></div>
  `;
}

function renderOpsSchoolGeoRegions(data) {
  const host = document.getElementById('ops-map-regions');
  if (!host) return;
  const regions = data?.regions || [];
  if (!regions.length) {
    host.innerHTML = '<div class="txt-muted">지역 데이터가 없습니다.</div>';
    return;
  }
  const max = Math.max(...regions.map((r) => Number(r.userCount) || 0), 1);
  host.innerHTML = `
    <div class="ops-map-regions-title">시·도별 인원</div>
    <div class="ops-map-regions-list">
      ${regions
        .map((r) => {
          const count = Number(r.userCount) || 0;
          const pct = Math.round((count / max) * 100);
          return `
            <button type="button" class="ops-map-region-row" data-ops-region="${esc(r.region)}">
              <div class="ops-map-region-top">
                <span>${esc(r.region)}</span>
                <strong>${count.toLocaleString()}</strong>
              </div>
              <div class="ops-map-region-bar"><span style="width:${pct}%"></span></div>
              <div class="ops-map-region-meta">학교 ${Number(r.schoolCount || 0).toLocaleString()}곳</div>
            </button>`;
        })
        .join('')}
    </div>
  `;

  host.querySelectorAll('[data-ops-region]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const region = btn.getAttribute('data-ops-region');
      focusOpsMapRegion(region);
    });
  });
}

function focusOpsMapRegion(region) {
  if (!opsSchoolMap || !opsSchoolGeoCache) return;
  const points = (opsSchoolGeoCache.schools || []).filter(
    (s) => String(s.region || '미상') === String(region),
  );
  if (!points.length) return;
  const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
  opsSchoolMap.fitBounds(bounds.pad(0.25));
}

function renderOpsSchoolMap(Leaflet, data) {
  const el = document.getElementById('ops-school-map');
  if (!el) return;

  const schools = (data?.schools || []).filter(
    (s) =>
      Number.isFinite(Number(s.latitude)) &&
      Number.isFinite(Number(s.longitude)),
  );

  if (!opsSchoolMap) {
    opsSchoolMap = Leaflet.map(el, {
      zoomControl: true,
      attributionControl: true,
    }).setView([36.5, 127.8], 7);
    Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(opsSchoolMap);
  }

  if (opsSchoolMapLayer) {
    opsSchoolMap.removeLayer(opsSchoolMapLayer);
    opsSchoolMapLayer = null;
  }

  const maxCount = Math.max(...schools.map((s) => Number(s.userCount) || 0), 1);
  const layer = Leaflet.layerGroup();

  schools.forEach((school) => {
    const count = Number(school.userCount) || 0;
    const radius = opsMapRadius(count, maxCount);
    const marker = Leaflet.circleMarker([school.latitude, school.longitude], {
      radius,
      color: '#2f6fed',
      weight: 1,
      fillColor: '#4c8dff',
      fillOpacity: 0.55,
    });
    marker.bindPopup(
      `<strong>${esc(school.name)}</strong><br/>${esc(school.region || '미상')}<br/>학생 <strong>${count.toLocaleString()}</strong>명`,
    );
    marker.bindTooltip(
      `${school.name} · ${count}명`,
      { direction: 'top', opacity: 0.9 },
    );
    layer.addLayer(marker);
  });

  layer.addTo(opsSchoolMap);
  opsSchoolMapLayer = layer;

  if (schools.length) {
    const bounds = Leaflet.latLngBounds(
      schools.map((s) => [s.latitude, s.longitude]),
    );
    opsSchoolMap.fitBounds(bounds.pad(0.12));
  } else {
    opsSchoolMap.setView([36.5, 127.8], 7);
  }

  setTimeout(() => {
    opsSchoolMap?.invalidateSize();
  }, 80);
}

window.loadOpsSchoolGeo = loadOpsSchoolGeo;
window.destroyOpsSchoolMap = destroyOpsSchoolMap;
