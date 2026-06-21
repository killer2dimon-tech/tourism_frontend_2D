import { apiFetch, showToast } from './utils.js';
import { openSidebar } from './reviews.js';

let map, locationsMap = {}, markers = [];
let clusterGroup;

export function initMap() {
  map = L.map('map').setView([51.4982, 31.2893], 9);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  map.setMaxBounds(L.latLngBounds([50.2, 30.2], [52.5, 34.0]));
  map.setMinZoom(8);

  // Легенда
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
      <span style="background:#6a0dad;"></span> Районні центри<br>
      <span style="background:#1f78b4;"></span> Міста<br>
      <span style="background:#d73027;"></span> Храми<br>
      <span style="background:#fc8d59;"></span> Музеї, садиби<br>
      <span style="background:#33a02c;"></span> Природні об'єкти
    `;
    return div;
  };
  legend.addTo(map);

  // Створюємо групу кластерів
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 80,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    spiderfyDistanceMultiplier: 2,
    disableClusteringAtZoom: 16,
    iconCreateFunction: createClusterIcon
  });

  loadLocations();
}

// Кольори для маркерів
const colors = {
  church: '#d73027',
  museum: '#fc8d59',
  nature: '#33a02c',
  town: '#1f78b4',
};

function coloredIcon(color) {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

// Спеціальна іконка для районного центру
function districtCenterIcon() {
  return L.divIcon({
    html: `<div style="background-color:#6a0dad;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #facc15;font-size:20px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏛️</div>`,
    className: 'custom-district-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

const icons = {
  church: coloredIcon('red'),
  museum: coloredIcon('orange'),
  nature: coloredIcon('green'),
  town: coloredIcon('blue'),
  district_center: districtCenterIcon()
};

// Функція для створення іконки кластера з пріоритетом міст
function createClusterIcon(cluster) {
  const childMarkers = cluster.getAllChildMarkers();
  const count = childMarkers.length;

  // Перевіряємо наявність районного центру (найвищий пріоритет)
  const hasDistrictCenter = childMarkers.some(m => {
    const loc = window.locationsMap?.[m.locationId];
    return loc && loc.category === 'district_center';
  });

  // Перевіряємо наявність міста (якщо немає районного центру)
  const hasTown = childMarkers.some(m => {
    const loc = window.locationsMap?.[m.locationId];
    return loc && loc.category === 'town';
  });

  if (hasDistrictCenter) {
    return L.divIcon({
      html: `<div style="background-color:#6a0dad;color:white;border-radius:50%;width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:3px solid #facc15;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
              <span>🏛️ ${count}</span>
            </div>`,
      className: 'marker-cluster-custom',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    });
  } else if (hasTown) {
    return L.divIcon({
      html: `<div style="background-color:#1f78b4;color:white;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:3px solid #facc15;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
              <span>🏙️ ${count}</span>
            </div>`,
      className: 'marker-cluster-custom',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
  } else {
    // Звичайний кластер
    return L.divIcon({
      html: `<div style="background-color:#1f2937;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #facc15;font-size:16px;">${count}</div>`,
      className: 'marker-cluster-custom',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }
}

async function loadLocations() {
  try {
    const data = await apiFetch('locations/');
    locationsMap = {};
    data.forEach(loc => {
      locationsMap[loc.id] = loc;
      const marker = L.marker([loc.latitude, loc.longitude], {
        icon: icons[loc.category] || icons.town
      });
      marker.locationId = loc.id;
      marker.on('click', function () {
        openSidebar(this.locationId);
      });
      clusterGroup.addLayer(marker);
      markers.push(marker);
    });
    map.addLayer(clusterGroup);
    window.locationsMap = locationsMap;
  } catch (err) {
    console.error('Помилка завантаження локацій:', err);
    showToast('Не вдалося завантажити локації');
  }
}

export function getLocationsMap() {
  return locationsMap;
}

export function goToLocation(locationId) {
  const loc = locationsMap[locationId];
  if (!loc) return;
  const profilePage = document.getElementById('profilePage');
  if (profilePage.classList.contains('active')) {
    profilePage.classList.remove('active');
    document.getElementById('map').style.display = 'block';
  }
  map.setView([loc.latitude, loc.longitude], 13);
  openSidebar(locationId);
}