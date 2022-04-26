#!/bin/bash
trap 'docker stop radlnavi-frontend radlnavi-backend' INT
docker run --rm -d -p 5000:5000 --name radlnavi-backend -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/out/out.osrm
docker run --env OSRM_BACKEND=http://51.15.61.199:5000 --rm -d -p 9966:9966 --name radlnavi-frontend osrm/osrm-frontend
wait
