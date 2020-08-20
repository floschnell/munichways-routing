import osmium
import json
from shapely.geometry import shape, Point, Polygon
import shapely.wkb as wkblib
from typing import List, Optional
import shapely
from shapely.ops import nearest_points, shared_paths
import geopy.distance
from shapely.prepared import prep
from shapely.strtree import STRtree
from progress.bar import Bar

wkbfab = osmium.geom.WKBFactory()


def get_color(color):
    if color == "rot":
        return "red"
    if color == "gelb":
        return "yellow"
    if color == "schwarz":
        return "black"
    if color == "grün":
        return "green"


def accessible_to_bikes(way) -> bool:
    if "cycleway" in way.tags:
        return True
    if "highway" in way.tags and "bicycle" in way.tags:
        if way.tags["bicycle"] == "use_sidepath" or way.tags["bicycle"] == "no":
            return False
        else:
            return True
    elif "highway" in way.tags:
        if way.tags["highway"] == "motorway" or way.tags["highway"] == "trunk" or way.tags["highway"] == "footway" or way.tags["highway"] == "pedestrian":
            return False
        return True
    else:
        return False


class Match:
    def __init__(self, way):
        super().__init__()
        self.hits = 1
        self.way = way


class CounterHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.way_count = 0
        self.node_count = 0
        self.relation_count = 0

    def way(self, way):
        if accessible_to_bikes(way):
            self.way_count += 1

    def node(self, node):
        self.node_count += 1

    def relation(self, r):
        self.relation_count += 1


class AnnotationHandler(osmium.SimpleHandler):
    def __init__(self, test, ways, stree, progress_bar_nodes, progress_bar_ways, progress_bar_relations):
        osmium.SimpleHandler.__init__(self)
        self.test = test
        self.num_nodes = 0
        self.ways = ways
        self.writer = None
        if not self.test:
            self.writer = osmium.SimpleWriter("out/out.pbf")
        self.features = list()
        self.processed = 0
        self.stree = stree
        self.progress_bar_nodes = progress_bar_nodes
        self.progress_bar_ways = progress_bar_ways
        self.progress_bar_relations = progress_bar_relations

    def way(self, way):
        updated_way = way

        if not self.test or self.processed < 10000:
            if accessible_to_bikes(way):
                self.processed += 1
                if self.processed % 1000 == 0:
                    self.progress_bar_ways.next()
                wkb = wkbfab.create_linestring(way)
                line = wkblib.loads(wkb, hex=True)
                colors = dict()
                for match in self.stree.query(line):
                    hits = 0
                    for i in range(0, int(line.length * 50000)):
                        coord = line.interpolate(i / 50000.0)
                        if self.ways[match.id].prepared_shape.contains(Point(coord)):
                            color = get_color(match.color)
                            colors[i] = color

                if len(colors) > int(line.length * 50000 * 0.7):
                    total = 0
                    for color in colors.values():
                        if color == "black":
                            total += 4
                        elif color == "red":
                            total += 3
                        elif color == "yellow":
                            total += 2
                        elif color == "green":
                            total += 1
                    final_color = int(round(total / len(colors)))
                    color = ""
                    if final_color == 1:
                        color = "green"
                    elif final_color == 2:
                        color = "yellow"
                    elif final_color == 3:
                        color = "red"
                    elif final_color == 4:
                        color = "black"
                    t = dict(way.tags)
                    t["color"] = color
                    updated_way = way.replace(tags=t)
                    feature = {
                        'type': 'Feature',
                        'properties': {
                            'color': color
                        },
                        'geometry': shapely.geometry.mapping(line)
                    }
                    self.features.append(feature)

        if not self.test and self.writer is not None:
            try:
                self.writer.add_way(updated_way)
            except Exception:
                print("err.")
                self.writer.add_way(way)

    def node(self, node):
        self.processed += 1
        if self.processed % 10000 == 0:
            self.progress_bar_nodes.next()
        if not self.test and self.writer is not None:
            self.writer.add_node(node)

    def relation(self, r):
        self.processed += 1
        if self.processed % 1000 == 0:
            self.progress_bar_relations.next()
        if not self.test and self.writer is not None:
            self.writer.add_relation(r)


class Way:
    def __init__(self, shape, name, color):
        self.shape = shape
        self.prepared_shape = prep(shape)
        self.name: str = name
        self.color: str = color


if __name__ == '__main__':

    ways: List[Way] = list()
    with open('geo/munichways.json') as f:
        js = json.load(f)
        for feature in js["features"]:
            if "geometry" in feature and "type" in feature["geometry"] and (feature["geometry"]["type"] == "LineString" or feature["geometry"]["type"] == "MultiLineString"):
                geometry = shape(
                    feature["geometry"]).buffer(0.0003)
                geometry.color = feature["properties"]["farbe"]
                geometry.id = len(ways)
                ways.append(
                    Way(geometry, feature["properties"]["name"], feature["properties"]["farbe"]))

    print("loaded " + str(len(ways)) + " rated bikeways")

    print("calculating size ...")
    counter_handler = CounterHandler()
    counter_handler.apply_file("geo/oberbayern-latest.osm.pbf")
    print("found " + str(counter_handler.way_count) + " ways, " + str(counter_handler.node_count) +
          " nodes and " + str(counter_handler.relation_count) + " relations.")

    stree = STRtree(list(map(lambda w: w.shape, ways)))

    progress_bar_nodes = Bar("processing nodes", max=int(
        counter_handler.node_count/10000))
    progress_bar_ways = Bar("processing ways", max=int(
        counter_handler.way_count/1000))
    progress_bar_relations = Bar(
        "processing relations", max=int(counter_handler.relation_count/1000))

    annotation_handler = AnnotationHandler(
        False, ways, stree, progress_bar_nodes, progress_bar_ways, progress_bar_relations)
    annotation_handler.apply_file(
        "geo/oberbayern-latest.osm.pbf", locations=True)

    progress_bar_nodes.finish()
    progress_bar_ways.finish()
    progress_bar_relations.finish()

    content = json.dumps({'type': 'FeatureCollection',
                          'features': annotation_handler.features})

    text_file = open("out/out.geojson", "w")
    text_file.write(content)
    text_file.close()
