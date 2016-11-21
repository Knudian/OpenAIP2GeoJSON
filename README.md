# OpenAIP2GeoJSON

This little script look for files from [OpenAIP](http://www.openaip.net) in the folder ```input```, and transform those into GeoJSON files.

## TODO
- [x] parser for .aip files
- [ ] parser for .cup files
- [ ] parser for .dat files
- [ ] ask for input/output directories
- [ ] a better "check duplicates" method
- [ ] a better console output (ongoing)
- [ ] generate areas from runways, from their properties.

## How to run it

Clone the project, and install dependencies by running
```bash
npm install
```
Then run it with
```bash
cd OpenAIP2GeoJSON/
node index.js
```

The parser will then look into the ```input``` folder and parse all extensions readable by the script.
Your GeoJSON files will be exported into the ```output``` folder.

## Data structures

Following the [RFC 7946](https://tools.ietf.org/html/rfc7946), all files are following the GeoJSON structure defined by IETF.

All datas are divided into separate files :
- airports.geojson,
- airspaces.geojson,
- hotspots.geojson,
- navaids.geojson,
- runways.geojson

Each of those is a _FeatureCollection_, containing the datas.
Actually, apart from airspaces, all datas are _Points_ (airspaces are _Polygons_).

Even if not in used at the moment, a **guid** property is given for each geographical information.

### Units
- Coordinates (```[longitude, latitude]```) in decimal degrees,
- Elevation (```elev```) in decimal meters,
- Frequencies in MHz (MegaHertz).

### Sample : airports.geojson
```javascript
// Example from France OpenAIP for Abbeville airport.
{
    "type":"FeatureCollection",
    "features":[
        {
            "type":"Feature",
            "geometry":{
                "type":"Point",
                "coordinates":[1.831389,50.101667]
            },
            "properties":{
                "guid":"",
                "aeronautical":"airport",
                "name":"ABBEVILLE",
                "type":"HELI_CIVIL",
                "country":"FR",
                "icao":"",
                "radios":[
                    {
                        "category":"COMMUNICATION",
                        "frequency":134.825,
                        "type":"FIS",
                        "spec":"",
                        "description":"LILLE Information"
                    }
                ],
                "elev":24.9936
            }
        },
        ...
    ]
}
```

### Sample : airspace.geojson
```javascript
// Example from France OpenAIP for Bourg-St-Maurice airspace.
{
    "type":"FeatureCollection",
    "features":[
        {
            "type":"Feature",
            "geometry":{
                "type":"Polygon",
                "coordinates":[
                    [
                        [6.6333333333333,45.659166666667],
                        [6.7127777777778,45.697777777778],
                        [6.745,45.673888888889],
                        [6.7525,45.614444444444],
                        [6.75,45.613333333333],
                        [6.7205555555556,45.610833333333],
                        [6.6333333333333,45.659166666667]
                    ]
                ]
            },
            "properties":{
                "guid":"",
                "aeronautical":"airspace",
                "category":"DANGER",
                "version":"d10ba4b78e487033c62696d9776893c21f17479f",
                "id":"117703",
                "country":"FR",
                "name":"7 D 187 BourgStMaurice",
                "alt_limits":{
                    "top":{"ref":"STD","value":"FL 55"},
                    "bottom":{"ref":"GND","value":"F 0"}
                }
            }
        },
        ...
    ]
}
```

### Sample : hotspots.geojson
```javascript
// Example from France OpenAIP for Beynes hotspot.
{
    "type":"FeatureCollection",
    "features":[
        {
            "type":"Feature",
            "geometry":{
                "type":"Point",
                "coordinates":[6.24768066413,43.968807501452]
            },
            "properties":{
                "guid":"",
                "aeronautical":"hotspot",
                "type":"NATURAL",
                "country":"FR",
                "name":"Beynes",
                "elev":1573,
                "reliability":0.65,
                "occurrence":"IRREGULAR_INTERVAL",
                "conditions":[
                    {
                        "type":"FAVORABLE",
                        "timeofday":["NOON/AFTERNOON","AFTERNOON/LATE_AFTERNOON"],
                        "wind":[]
                    }
                ]
            }
        },
        ...
    ]
}
```
### Sample : navaids.geojson
```javascript
// Example from France OpenAIP for Abbeville navaid.
{
    "type":"FeatureCollection",
    "features":[
        {
            "type":"Feature",
            "geometry":{
                "type":"Point",
                "coordinates":[1.8547222222222,50.135277777778]
            },
            "properties":{
                "guid":"",
                "aeronautical":"navaid",
                "type":"VOR-DME",
                "country":"FR",
                "id":"ABB",
                "elev":68,
                "radios":[
                    {"frequency":108.45,"channel":"21Y"}
                ],
                "params":{
                    "range":60,
                    "declination":-0.31475,
                    "alignedtotruenorth":false
                }
            }
        },
        ...
    ]
}
```
### Sample : runways.geojson
```javascript
// Example from France OpenAIP for one of Abbeville's airport runways.
{
    "type":"FeatureCollection",
    "features":[
        {
            "type":"Feature",
            "geometry":{
                "type":"Point",
                "coordinates":[1.8325,50.143056]
            },
            "properties":{
                "guid":"",
                "aeronautical":"runway",
                "operations":"ACTIVE",
                "airport":"ABBEVILLE",
                "name":"02/20",
                "sfc":"ASPH",
                "elev":67.056,
                "length":1249.9848,
                "width":22.86,
                "directions":["024","204"]
            }
        },
        ...
    ]
}
```

## Dependencies

This parser uses :
- [colors](https://www.npmjs.com/package/colors),
- [fs](https://www.npmjs.com/package/fs),
- [geojson](https://www.npmjs.com/package/geojson),
- [q](https://www.npmjs.com/package/q),
- [xml2js](https://www.npmjs.com/package/xml2js),

## Disclaimer
Since this little parser is just a parser, and is not providing any datas - examples are just examples, don't trust those -, the datas are not qualified to be use instead of official sources (following aeronautical rules, you must have datas provided officially).
