console.log("hi");

(async () => {

  const accidents = await loadGeoJson('geo/accidents_2018.geojson');
  const route = await loadGeoJson('geo/route.geojson');
  const road_collection = await parseGeoJson();
  const roads = road_collection.features;



  const vectorSource = new ol.source.Vector({
    features: (new ol.format.GeoJSON()).readFeatures(accidents, {
      featureProjection: 'EPSG:3857',
    }),
  })

  const test = turf.featureCollection([turf.feature(route)]);
  console.log(test);
  vectorSource.addFeatures((new ol.format.GeoJSON()).readFeatures(test, {
    featureProjection: 'EPSG:3857',
  }));

  vectorSource.addFeatures((new ol.format.GeoJSON()).readFeatures(road_collection, {
    featureProjection: 'EPSG:3857',
  }));

  for (const accident of accidents.features) {
    const distance = turf.pointToLineDistance(accident, route);
    if (distance < 0.01) {
      console.log("match!");
    }
  }

  const vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: getStyle,
  });

  const map = new ol.Map({
    target: 'map',
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      vectorLayer,
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([11.57549, 48.13743]),
      zoom: 12,
    })
  });
})();

function getColor(kategorie) {
  if (kategorie == 1) {
    return 'red';
  } else if (kategorie == 2) {
    return 'orange';
  } else if (kategorie == 3) {
    return 'yellow'
  } else {
    return 'green';
  }
}

function getStyle(feature) {
  switch (feature.getGeometry().getType()) {
    case 'Point':
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: null,
          stroke: new ol.style.Stroke({
            color: getColor(feature.getProperties().kategorie),
            width: 1
          }),
        }),
      });

    case 'LineString':
    default:
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: 'red',
          width: 2
        })
      });
  }
}

async function convert() {
  const road_collection = await parseGeoJson();
  const roads = road_collection.features;

  const accidents = await parseCSV();

  const accidents_for_roads = new Map();

  const roads_with_accidents = roads
    .filter(road => road.geometry.type == 'LineString')
    .map(road => {
      const accidents_on_road = accidents
        .filter(accident => turf.pointToLineDistance(accident.point, road) < 0.01);
      accidents_for_roads.set(road.properties.cartodb_id, accidents_on_road);
      return {
        ...road,
        properties: {
          ...road.properties,
          accidents_on_road: accidents_on_road.length,
          accidents_fatal: accidents_on_road.filter(a => a.kategorie == 1).length,
          accidents_bad: accidents_on_road.filter(a => a.kategorie == 2).length,
        }
      };
    });

  const collection = turf.featureCollection(roads_with_accidents);

  download(collection, "collection.geojson");
}

function download(data, filename) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", filename);
  document.body.appendChild(dlAnchorElem);
  dlAnchorElem.click();
  dlAnchorElem.remove();
}


async function loadGeoJson(file) {
  const response = await fetch(file);
  return await response.json();
}

async function parseGeoJson() {
  const response = await fetch("geo/gesamtnetz_unfall.geojson");
  return await response.json();
}

async function converUnfallorte() {
  const response = await fetch("unfallorte_2018.csv");
  const unfallorte = await response.text();
  const lines = unfallorte.split("\r\n");
  const data = lines
    .map(line => {
      const cols = line.split(";");
      return {
        id: cols[0],
        land: cols[1],
        reg_bez: cols[2],
        kreis: cols[3],
        gemeinde: cols[4],
        jahr: cols[5],
        monat: cols[6],
        stunde: cols[7],
        wochentag: cols[8],
        kategorie: cols[9],
        art: cols[10],
        unfalltyp: cols[12],
        lichtverhaeltnis: cols[11],
        rad: cols[13],
        pkw: cols[14],
        fussgaenger: cols[15],
        motorrad: cols[16],
        gkfz: cols[17],
        sonstige: cols[18],
        strassenzustand: cols[19],
        longitude: parseFloat(cols[22].replace(",", ".")),
        latitude: parseFloat(cols[23].replace(",", ".")),
      };
    })
    .filter(entry => entry.rad == 1)
    .filter(entry => entry.land == 9 && entry.reg_bez == 1 && entry.kreis == 62) // only munich
    .filter(entry => !isNaN(entry.longitude) && !isNaN(entry.latitude))
    .map(entry => ({
      ...turf.point([entry.longitude, entry.latitude]),
      properties: {
        ...entry,
      }
    }));
  const accidentsCollection = turf.featureCollection(data);
  download(accidentsCollection, 'accidents_2018.geojson');
}