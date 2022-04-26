#!/bin/bash

echo "=========================="
echo "munichways routing - setup"
echo "=========================="
echo

SKIP_ANNOTATION=false
if [ "$1" = "--skip-annotation" ]; then
  SKIP_ANNOTATION=true
fi

# cleanup last run
if [ "$SKIP_ANNOTATION" = false ]; then
  echo "cleaning up ..."
  mkdir -p ./out
  mkdir -p ./geo
  rm ./out/out.pbf 2>/dev/null
  rm ./out/out.geojson 2>/dev/null
  echo "done."
  echo

  # get latest osm data
  echo "downloading latest OSM data for Munich ..."
  if [ ! -f ./geo/oberbayern-latest.osm.pbf ]; then
    curl --insecure https://download.geofabrik.de/europe/germany/bayern/oberbayern-latest.osm.pbf -o ./geo/oberbayern-latest.osm.pbf
  else
    echo "skipping since file already present."
  fi
  echo "done."
  echo

  # get latest annotations
  echo "downloading latest munichways.com ratings ..."
  if [ ! -f ./geo/munichways.json ]; then
    curl --insecure "https://radwegplanung-muenchen.de/cgi-bin/qgis_mapserv.fcgi?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=IstRadlvorrangnetzMunichWays&outputFormat=application/json" -o geo/munichways.json
    sed -i -e 's/"Name"/"name"/g' geo/munichways.json
  else
    echo "skipping since file already present."
  fi
  echo "done."
  echo

  # create out.pbf and out.geojson
  echo "integrating ratings into OSM data ..."
  docker run -it -v "${PWD}":/a -w /a python:3 bash -c "apt-get update && apt-get install libgeos-dev build-essential cmake libboost-dev libexpat1-dev zlib1g-dev libbz2-dev && pip install -r requirements.txt && python annotate_osm.py"
  echo "done."
  echo

else

  echo "skipping annotation."
  echo

fi

# prepare routing data
echo "preparing data for routing ..."
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /data/bike.lua /data/out/out.pbf && docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/out/out.osrm && docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/out/out.osrm
echo "done."
echo

echo "now use the serve.sh to run OSRM routing service."
