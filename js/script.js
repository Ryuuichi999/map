var map = L.map("map").setView([16.402247682621997, 102.81088427798758], 9);

// เพิ่มภาพถ่ายดาวเทียม
var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});

var Stadia_AlidadeSatellite = L.tileLayer(
  "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}",
  {
    minZoom: 0,
    maxZoom: 20,
    attribution:
      '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: "jpg",
  }
);

var OpenTopoMap = L.tileLayer(
  "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 17,
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
  }
);

osm.addTo(map);

// กำหนด base map
var baseMaps = {
  OpenStreetMap: osm,
  Satellite: Stadia_AlidadeSatellite,
  Topographic: OpenTopoMap,
};

// สร้าง control และเพิ่มเป็น overlay
var layerControl = L.control.layers(baseMaps).addTo(map);

// เพิ่ม mini map
var miniMap = new L.Control.MiniMap(
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 15,
    attribution: "&copy; OpenStreetMap contributors",
  }),
  {
    toggleDisplay: true,
    position: "bottomright",
    zoomLevelOffset: -4,
  }
).addTo(map);

// แสดงพิกัดเมื่อเอาเมาส์ไปวางบนแผนที่
map.on("mousemove", (e) => {
  document.getElementById("lat").textContent = e.latlng.lat.toFixed(6);
  document.getElementById("long").textContent = e.latlng.lng.toFixed(6);
});

// แสดงข้อมูลเมื่อมีการซูมแผนที่
map.on("zoomend", () => {
  document.getElementById("zoom-level").textContent = map.getZoom();
});

// เพิ่ม kk_amphoe และเปลี่ยนสีเป็นสีแดง
var kk_amphoe = new L.GeoJSON.AJAX("/data/kk_amphoe.geojson", {
  style: function (feature) {
    return { color: "red", weight: 2 };
  },
  onEachFeature: (feature, layer) => {
    if (feature.properties && feature.properties.AMP_NAME_T) {
      layer.bindPopup("อำเภอ: " + feature.properties.AMP_NAME_T);
    }
  },
});
kk_amphoe.addTo(map);

// เพิ่ม kk_tambon
var kk_tambon = new L.GeoJSON.AJAX("/data/kk_tambon.geojson", {
  onEachFeature: (feature, layer) => {
    if (feature.properties && feature.properties.AMP_NAMT) {
      layer.bindPopup("ตำบล: " + feature.properties.AMP_NAMT);
    }
  },
});
kk_tambon.addTo(map);

// เพิ่ม mk_village_pt และเปลี่ยนสีเป็นสีดำ
var mk_village_pt = new L.GeoJSON.AJAX("/data/mk_village_pt.geojson", {
  onEachFeature: (feature, layer) => {
    if (feature.properties && feature.properties.VILL_NM_T) {
      layer.bindPopup("หมู่บ้าน: " + feature.properties.VILL_NM_T);
    }
  },
});
mk_village_pt.addTo(map);

// เพิ่ม mk_village และเปลี่ยนสีเป็นสีเขียว
var mk_village = new L.GeoJSON.AJAX("/data/mk_village.geojson", {
  style: function (feature) {
    return { color: "green", weight: 2 };
  },
  onEachFeature: (feature, layer) => {
    if (feature.properties && feature.properties.VILL_CODE) {
      layer.bindPopup("หมู่ที่: " + feature.properties.VILL_CODE);
    }
  },
});
mk_village.addTo(map);

// เพิ่ม overlay และ control ลงบนแผนที่ ขวาบน
layerControl.addOverlay(kk_amphoe, "amphoe");
layerControl.addOverlay(mk_village_pt, "village_pt");
layerControl.addOverlay(mk_village, "village");
layerControl.addOverlay(kk_tambon, "tambon");

// สร้าง marker เมื่อคลิกที่แผนที่
map.on("dblclick", (e) => {
  const dateTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Bangkok",
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const marker = L.marker(e.latlng).addTo(map);

  marker
    .bindPopup(
      "<b>Lat:</b> " +
        e.latlng.lat.toFixed(6) +
        ", <b>Lng:</b> " +
        e.latlng.lng.toFixed(6) +
        "<br><b>DateTime:</b> " +
        dateTime
    )
    .openPopup();
});

// เพิ่ม scale control
L.control
  .scale({
    imperial: false,
    metric: true,
  })
  .addTo(map);

// ฟังก์ชันดึงข้อมูลอุณหภูมิจาก OpenWeatherMap API
var amphoeTemperatureLayer = null;

async function fetchTemperature(lat, lon) {
  const apiKey = "ffc9232b21140d317004e59a3b6f381c";
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.main.temp;
  } catch (error) {
    console.error("Error fetching temperature:", error);
    return null;
  }
}

// ฟังก์ชันในการกำหนดสีตามอุณหภูมิ
function getColor(temp) {
  if (temp >= 40) return "red";
  if (temp >= 30) return "orange";
  if (temp >= 20) return "yellow";
  if (temp >= 10) return "green";
  return "blue";
}

// ฟังก์ชันในการสร้าง GeoJSON และเปลี่ยนสีตามอุณหภูมิ
function createAmphoeLayer(geojsonData) {
  if (
    !geojsonData ||
    !geojsonData.features ||
    geojsonData.features.length === 0
  ) {
    console.error("GeoJSON data is not valid or empty.");
    return;
  }

  const amphoeLayer = L.layerGroup(); // ใช้ layerGroup เพื่อให้สามารถลบทั้งหมดได้

  geojsonData.features.forEach((feature) => {
    const lat = feature.geometry.coordinates[0][0][0][1];
    const lon = feature.geometry.coordinates[0][0][0][0];

    fetchTemperature(lat, lon).then((temp) => {
      if (temp === null) return;

      const color = getColor(temp);

      var amphoeGeoJSON = L.geoJSON(feature, {
        style: function () {
          return { color: color, weight: 2 };
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.AMP_NAME_T) {
            const popupContent = `
              <b>อำเภอ:</b> ${feature.properties.AMP_NAME_T}<br>
              <b>อุณหภูมิ:</b> ${temp} °C
            `;
            layer.bindPopup(popupContent);
          }
        },
      });

      amphoeLayer.addLayer(amphoeGeoJSON);
    });
  });

  return amphoeLayer;
}

// ฟังก์ชันในการโหลดข้อมูลอำเภอและแสดงอุณหภูมิ
function fetchAndDisplayAmphoe() {
  // ถ้ามี amphoeTemperatureLayer อยู่แล้ว ให้ลบมันออกจากแผนที่
  if (amphoeTemperatureLayer) {
    map.removeLayer(amphoeTemperatureLayer); // ลบเลเยอร์ที่แสดงอุณหภูมิ
    amphoeTemperatureLayer = null; // รีเซ็ตค่า
    return;
  }

  // ถ้าไม่มี amphoeTemperatureLayer ให้โหลดและแสดงข้อมูลใหม่
  fetch("/data/kk_amphoe.geojson")
    .then((response) => response.json())
    .then((data) => {
      amphoeTemperatureLayer = createAmphoeLayer(data);
      map.addLayer(amphoeTemperatureLayer);
    })
    .catch((error) => {
      console.error("Error loading GeoJSON data:", error);
    });
}

// เพิ่มปุ่ม "โหลดอำเภอ" ที่มุมขวาบน
var loadAmphoeButton = L.control({ position: "topright" });

loadAmphoeButton.onAdd = function (map) {
  var div = L.DomUtil.create("div", "leaflet-bar");
  div.innerHTML =
    '<button style="background-color:rgb(183, 102, 69); color: white; padding: 5px; border-radius: 5px; border: none;">อุณหภูมิ</button>';

  div.firstChild.onclick = function () {
    fetchAndDisplayAmphoe();
  };
  return div;
};

// เพิ่มปุ่มเข้าไปในแผนที่
loadAmphoeButton.addTo(map);
