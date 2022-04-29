#!/bin/bash
docker stop radlnavi-frontend radlnavi-backend
docker run --rm -d -p 5000:5000 --name radlnavi-backend -v $(pwd):/data osrm/osrm-backend osrm-routed --algorithm mld /data/out/out.osrm
docker run --rm -d -p 9966:9966 --name radlnavi-frontend floschnell/radlnavi-frontend
