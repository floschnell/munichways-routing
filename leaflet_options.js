'use strict';

var L = require('leaflet');

var osm = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright/en">OpenStreetMap</a> contributors'
});
var streets = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases">CyclOSM</a> contributors'
});


module.exports = {
    defaultState: {
        center: L.latLng(48.142494, 11.574783),
        zoom: 13,
        waypoints: [],
        language: 'de',
        alternative: 0,
        layer: streets
    },
    services: [{
        label: 'Fahrrad',
        path: 'https://www.radlnavi.de'
    }],
    layer: [{
        'Mapbox Streets': streets,
        'OpenStreetMap': osm,
    }],
    overlay: {},
    baselayer: {
        one: streets,
        two: osm,
    }
};