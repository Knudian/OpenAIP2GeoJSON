// Import dependencies
var xml2js		= require('xml2js'),
	fs			= require('fs'),
	colors		= require('colors/safe'),
	request		= require('request'),
	Q			= require('q'),
	GeoJSON		= require('geojson');
// Declare global vars
var airports	= [],
	runways		= [],
	airspaces	= [],
	navaids		= [],
	hotspots	= [],
	pathInput   = "./input/",
	pathOutput	= "./output/",
    points      = [],
    polygons    = [],
    fileTypes   = ['airports', 'airspace', 'hotspot', 'navaid'],
    geoBlocks   = ['airports', 'airspaces', 'hotspots', 'navaids', 'runways'];

init();

function init(){
	// Shows the main menu used by this little script.
	console.log(">>> OpenAIP to GeoJSON converter");
	console.log(colors.red("Be sure all your files in the \"input\" folder."));
	console.log(colors.green(">>> reading [input] folder"));
	fs.readdir(pathInput, function(err, items) {
		for (var i=0; i<items.length; i++) {
			for(var j=0; j < fileTypes.length; j++){
				if(items[i].indexOf(fileTypes[j]) !== -1){
					getFileData(items[i], fileTypes[j]);
				}
			}
		}
	});
}

function analyseDatas(data, block){
	console.log(colors.yellow('>>> Staring analysis of ' + block));
	switch (block) {
		case 'airports'	: doAirports(data, block); break;
		case 'airspace'	: doAirspaces(data, block); break;
		case 'hotspot'	: doHotspot(data, block); break;
		case 'navaid'	: doNavaid(data, block); break;
	}
}

function doAirports(inputData, block){
    var airportList = inputData.OPENAIP.WAYPOINTS[0].AIRPORT;
    for(var a = 0; a < airportList.length; a++){
        var tempAirport = airportList[a];
        var airport = {
            guid:       "",
            aeronautical : "airport",
            name:       tempAirport.NAME[0],
            type:       tempAirport.$.TYPE,
            country:    tempAirport.COUNTRY[0],
            icao :      (tempAirport.ICAO != undefined ) ? tempAirport.ICAO[0] : "",
            radios:     [],
            latitude :  parseFloat(tempAirport.GEOLOCATION[0].LAT[0]),
            longitude : parseFloat(tempAirport.GEOLOCATION[0].LON[0]),
            elev :      parseFloat(tempAirport.GEOLOCATION[0].ELEV[0]._)
        };
        // Work on radios
        if(tempAirport.RADIO != undefined){
            for(var r = 0; r < tempAirport.RADIO.length; r++){
                var tempRadio = tempAirport.RADIO[r];
                var radio = {
                    category: tempRadio.$.CATEGORY,
                    frequency: parseFloat(tempRadio.FREQUENCY[0]),
                    type: tempRadio.TYPE[0],
                    spec: (tempRadio.TYPESPEC != undefined ) ? tempRadio.TYPESPEC[0] : "",
                    description: (tempRadio.DESCRIPTION != undefined) ? tempRadio.DESCRIPTION[0] : ""
                };
                airport.radios.push(radio);
            }
        }
        // Work on runways
        if(tempAirport.RWY != undefined){
            for(var r = 0; r < tempAirport.RWY.length; r++){
                var tempRnw = tempAirport.RWY[r];
                var rnw = {
                    guid:       "",
                    aeronautical : "runway",
                    operations : tempRnw.$.OPERATIONS,
                    airport : airport.name,
                    name : tempRnw.NAME[0],
                    sfc : tempRnw.SFC[0],
                    latitude :  airport.latitude,
                    longitude : airport.longitude,
                    elev :      airport.elev,
                    length : parseFloat(tempRnw.LENGTH[0]._),
                    width : parseFloat(tempRnw.WIDTH[0]._),
                    directions: []
                };
                if( tempRnw.DIRECTION != undefined ){
                    for(var z = 0; z < tempRnw.DIRECTION.length; z++){
                        rnw.directions.push(tempRnw.DIRECTION[z].$.TC);
                    }
                }
                runways.push(rnw);
            }
        }
        airports.push(airport);
    }
    console.log(colors.yellow(">>> DONE : "+ airports.length + " airports"));
    checkContinueProcess(block);
}

function doAirspaces(inputData, block){
    var airspacesList = inputData.OPENAIP.AIRSPACES[0].ASP;
    for(var a = 0; a < airspacesList.length; a ++){
        var tempAirspace = airspacesList[a];
        var airspace = {
            guid:       "",
            aeronautical : "airspace",
            category:   tempAirspace.$.CATEGORY,
            version:    tempAirspace.VERSION[0],
            id:         tempAirspace.ID[0],
            country:    tempAirspace.COUNTRY[0],
            name:       tempAirspace.NAME[0],
            alt_limits:{
                top:{
                    ref:tempAirspace.ALTLIMIT_TOP[0].$.REFERENCE,
                    value: tempAirspace.ALTLIMIT_TOP[0].ALT[0].$.UNIT +" "+ tempAirspace.ALTLIMIT_TOP[0].ALT[0]._
                },
                bottom:{
                    ref:tempAirspace.ALTLIMIT_BOTTOM[0].$.REFERENCE,
                    value:tempAirspace.ALTLIMIT_BOTTOM[0].ALT[0].$.UNIT +" "+ tempAirspace.ALTLIMIT_BOTTOM[0].ALT[0]._
                }
            },
            geometry:[]
        };
        // Generate vertexes for airspaces geometry
        // A GeoJSON polygon is polygon : [ [ [Coordinates 1] ] ]
        var strGeomArr = tempAirspace.GEOMETRY[0].POLYGON[0].split(', ');
        var vertexes = [];
        for(var g = 0; g < strGeomArr.length; g++){
            var tmpVertex = strGeomArr[g].split(" ");
            var vertex = [ parseFloat(tmpVertex[0]), parseFloat(tmpVertex[1])];
            vertexes.push(vertex);
        }
        airspace.geometry = [ vertexes ];
        airspaces.push(airspace);
    }
    console.log(colors.yellow(">>> DONE : "+ airspaces.length + " airspaces"));
    checkContinueProcess(block);
}

function doHotspot(inputData, block){
    var hotspotList = inputData.OPENAIP.HOTSPOTS[0].HOTSPOT;
    for(var h = 0; h < hotspotList.length; h++){
        var tempHotspot = hotspotList[h];
        var hotspot = {
            guid:           "",
            aeronautical : 	"hotspot",
            type:           tempHotspot.$.TYPE,
            country:        tempHotspot.COUNTRY[0],
            name:           tempHotspot.NAME[0],
            latitude :      parseFloat(tempHotspot.GEOLOCATION[0].LAT[0]),
            longitude :     parseFloat(tempHotspot.GEOLOCATION[0].LON[0]),
            elev :          parseFloat(tempHotspot.GEOLOCATION[0].ELEV[0]._),
            reliability:    parseFloat(tempHotspot.RELIABILITY[0]),
            occurrence:     tempHotspot.OCCURRENCE[0],
            conditions:[]
        };
        // Working on conditions.
        if(tempHotspot.CONDITIONS != undefined){
            for(var i = 0; i < tempHotspot.CONDITIONS.length; i++){
                var tmpCond = tempHotspot.CONDITIONS[i];
                var cond = {
                    type: tmpCond.$.TYPE,
                    timeofday: [],
                    wind:[]
                };
                // Work on times
                if(tmpCond.TIMEOFDAY != undefined){
                    for(var j=0; j < tmpCond.TIMEOFDAY[0].TIME.length; j++){
                        cond.timeofday.push(tmpCond.TIMEOFDAY[0].TIME[j]);
                    }
                }
                // Work on winds
                if(tmpCond.WIND != undefined){
                    for(var j = 0; j < tmpCond.WIND[0].DIRECTION.length; j++){
                        cond.wind.push(tmpCond.WIND[0].DIRECTION[j]);
                    }
                }
                hotspot.conditions.push(cond);
            }
        }
        hotspots.push(hotspot);
    }
    console.log(colors.yellow(">>> DONE : "+ hotspots.length + " hotspots"));
    checkContinueProcess(block);
}

function doNavaid(inputData, block){
    var navaidList = inputData.OPENAIP.NAVAIDS[0].NAVAID;
    for(var i = 0; i < navaidList.length; i++){
        var tempNavaid = navaidList[i];
        var navaid = {
            guid:       "",
            aeronautical : "navaid",
            type:       tempNavaid.$.TYPE,
            country:    tempNavaid.COUNTRY[0],
            id:         tempNavaid.ID[0],
            latitude :  parseFloat(tempNavaid.GEOLOCATION[0].LAT[0]),
            longitude : parseFloat(tempNavaid.GEOLOCATION[0].LON[0]),
            elev :      parseFloat(tempNavaid.GEOLOCATION[0].ELEV[0]._),
            radios:[],
            params:{
                range: (tempNavaid.PARAMS[0].RANGE != undefined) ? parseFloat(tempNavaid.PARAMS[0].RANGE[0]._) : null,
                declination : parseFloat(tempNavaid.PARAMS[0].DECLINATION[0]),
                alignedtotruenorth : !(tempNavaid.PARAMS[0].ALIGNEDTOTRUENORTH[0] === "FALSE")
            }
        };
        // Work on radio
        if(tempNavaid.RADIO != undefined){
            for(var j =0; j < tempNavaid.RADIO.length; j++){
                var radio = {
                    frequency:  parseFloat(tempNavaid.RADIO[j].FREQUENCY[0]),
                    channel:    (tempNavaid.RADIO[j].CHANNEL != undefined) ? tempNavaid.RADIO[j].CHANNEL[0] : ""
                };
                navaid.radios.push(radio);
            }
        }
        navaids.push(navaid);
    }
    console.log(colors.yellow(">>> DONE : "+ navaids.length + " navaids"));
    checkContinueProcess(block);
}

function getFileData(item, block){
	var file = pathInput+item;
    var ext = item.slice(-3);
    if( ext === 'aip'){
        fs.readFile(file, 'utf8', function(err, data){
            if(err){ return console.err(err); }
            xml2js.parseString(data, function(err, result){
                if(err) { return console.err(err);}
                return analyseDatas(result, block);
            });
        });
    } else {
        console.log(colors.red(">> Files with extension " + ext + " are not supported at the moment."));
    }
}

function checkContinueProcess(block){
    // Set the filtype corresponding to null
    for(var i = 0; i < fileTypes.length; i++){
        if(fileTypes[i] === block){
            fileTypes[i] = null;
        }
    }
    // Checks if a type of datas has been done or not.
    var t = fileTypes; t.sort();

    if(t[0] == null){
        startProcess();
    }
}

function startProcess(){
    console.log(colors.green(">>> Pre-work finished, starting generating GeoJSON files"));
    for(var i = 0; i < geoBlocks.length; i++){
        var data = null;
        switch(geoBlocks[i]){
            case 'airports'	: data = airports; break;
            case 'airspaces': data = airspaces; break;
            case 'hotspots'	: data = hotspots; break;
            case 'navaids'	: data = navaids; break;
            case 'runways'  : data = runways; break;
        }
        createGeoFile(checkDuplicatesInArray(data, geoBlocks[i]), geoBlocks[i]);
    }
}

function createGeoFile(data, block){
    var geoData = GeoJSON.parse(data, ( block !== 'airspaces') ? {Point:['latitude','longitude']} : {'Polygon':'geometry'});
    fs.writeFile('./output/'+block+'.geojson', JSON.stringify(geoData), (err) => {
        if (err) throw err;
        console.log(colors.green(">>> Saved geojson file for "+ block));
    });
}

function checkDuplicatesInArray(data, block){
    // Creates a duplicate Array, in which unique items will be stored.
    var tempArray = [];
    for(var i = 0; i < data.length; i++){
        var item = data[i];
        if(tempArray.length == 0){
            tempArray.push(item);
        } else {
            var existsInArray = false;
            for(var j = 0; j < tempArray.length; j++){
                if(existsInArray === false){
                    existsInArray = (tempArray[j] == item);
                }
            }
            if(!existsInArray){
                tempArray.push(item);
            }
        }
    }
    return tempArray;
}
