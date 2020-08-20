# munichways - routing

This project uses rated bikepath segments from www.munichways.com to render improved routing data for the OSRM backend.

## comparison

For comparison, you can see those two screenshots.

The first one shows the existing OSRM routing for a trip from "Münchner Freiheit" to the "Olympiastadion". The algorithm suggests to take a turn onto Winzererstraße and afterwards continue next to the big Ackermannstraße.

The improved version however, sugests to continue West after leaving Clemensstraße and taking the brige from Ackermannbogen into the Olympiapark which makes for a smoother and definitely nicer ride!

### existing routing

![existing OSM routing](img/existing.png)

### improved routing

![improved munichways routing](img/improved.png)

## usage

### requirements

- Python 3.8 with pip packages:
  - shapely
  - osmium
  - geopy
  - progress
- Docker

### prepare data

Run `./prepare.sh` to trigger the download of all needed input data (~200Mb).
After that, a python script will merge the ratings from munichways.com with the OSM data for Munich.
Eventually, different docker containers will be run to use OSRM tools to prepare the data for routing.

### run routing service

`./serve.sh` will run the OSRM backend (port 5000) and a frontend application (port 9966). Once docker containers are up and running, you can use the routing application via http://localhost:9966/
