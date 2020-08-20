#!/bin/bash

echo "=========================="
echo "munichways routing - setup"
echo "=========================="
echo

# cleanup last run
echo "cleaning up ..."
mkdir -p ./out
mkdir -p ./geo
rm ./out/out.pbf 2>/dev/null
rm ./out/out.geojson 2>/dev/null
echo "done."
echo

# get latest osm data
echo "downloading latest openstreetmaps data ..."
if [ ! -f ./geo/oberbayern-latest.osm.pbf ]; then
  curl --insecure https://download.geofabrik.de/europe/germany/bayern/oberbayern-latest.osm.pbf -o ./geo/oberbayern-latest.osm.pbf
else
  echo "skipping since file already present."
fi
echo "done."
echo

# get latest annotations
echo "downloading latest munichways ratings ..."
if [ ! -f ./geo/munichways.json ]; then
  curl --insecure "https://mw.mhcmuc.de/cgi-bin/qgis_mapserv.fcgi?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=Radvorrangnetz%2CRadvorrangnetz_gesamt%2Centlang_Hauptstrassen%2CGesamtnetz&outputFormat=application/json" -o geo/munichways.json
  sed -i -e 's/"Name"/"name"/g' geo/munichways.json
else
  echo "skipping since file already present."
fi
echo "done."
echo

exit 1

# create out.pbf and out.geojson
echo "integrating ratings into OpenStreetMap data ..."
python3 annotate_osm.py
echo "done."
echo

# prepare routing data
echo "preparing data for routing ..."
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /data/bike.lua /data/out/out.pbf && docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/out/out.osrm && docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/out/out.osrm
echo "done."
echo

echo "now use the serve.sh to run OSRM routing service."
