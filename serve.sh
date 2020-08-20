#!/bin/bash
trap 'docker stop osrm-frontend osrm-backend' INT
docker run --rm -d -p 5000:5000 --name osrm-backend -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/out/out.osrm
docker run --rm -d -p 9966:9966 --name osrm-frontend osrm/osrm-frontend
wait