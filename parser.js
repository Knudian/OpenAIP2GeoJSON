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
    geoBlocks   = ['airports', 'airspaces', 'hotspots', 'navaids', 'runways'],
	fileStatus	= ['listed', 'loaded', 'analysed', 'checked', 'finished'],
	allFiles    = 0,
	datas		= [];
var readDir		= Q.denodeify(fs.readdir);
var readFile	= Q.denodeify(fs.readFile);
init()
	.then(readDir)
	.then(createFileList)
	.then(getDataFromFiles);/*
	.then(fnTest)
	.catch(function(error){
		console.error(colors.red("ERRROR :\n"+error));
	})
	.done(function(value){
		console.log(colors.cyan("DONE :"));
		console.log(colors.cyan(JSON.stringify(value)));
	});*/
function init(){
	// Shows the main menu used by this little script.
    console.log(colors.green("################################################################################"));
    console.log(colors.green("#                                                                              #"));
    console.log(colors.green("#                       OpenAIP to GeoJSON converter                           #"));
    console.log(colors.green("#                                                                              #"));
    console.log(colors.green("################################################################################"));
    console.log("\n");
    console.log(colors.green("This parser will analyse all datas in folder [input], and will analyse if there \nis any duplicates entries.\n"));
	console.log(colors.green("Be sure all your files in the \"input\" folder.\n"));

	console.log(colors.green(">>> reading [input] folder"));
	var deferred = Q.defer();
	deferred.resolve(pathInput);
	return deferred.promise;
}
function fnTest(response){
	var deferred = Q.defer();
	console.log(colors.gray("TEST :\n"));
	console.log(colors.gray(JSON.stringify(response)));
	deferred.resolve(response);
	return deferred.promise;
}
function createFileList(list){
	console.log(colors.green(">>> Create the list of files to analyse"));
	var fileList = [];
	for(var i = 0; i < list.length; i++){
		var item = {
			type: list[i].split("_")[1],
			ext : list[i].slice(-3),
			url : pathInput+list[i]
		};
		switch(item.ext){
			case 'aip' : fileList.push(item); break;
		}
	}
	allFiles = fileList.length;
	console.log(colors.green(">>> "+fileList.length +" files will be analysed"));
	return fileList;
}
function getDataFromFiles(list){
	var deferred = Q.defer();
	console.log(colors.green(">>> Getting datas from files"));
	for(var i = 0; i < list.length; i++){
		console.log(colors.blue(">>> Parsing datas from xml for " + list[i].url));
		readFile(list[i].url, 'utf8')
			.then(parseXMLdatas)
			.then(analyseParsedData)
			.then(secondPartOfTheJob)
			.then(checkDuplicatesInArray)
			.then(produceGeoJSON);
	}
	deferred.resolve(datas);
	return deferred.promise;
}
function parseXMLdatas(data){
	var deferred = Q.defer();
	xml2js.parseString(data, function(err, result){
		if(err) {
			deferred.reject(new Error(err));
		} else {
			deferred.resolve(result);
		}
	});
	return deferred.promise;
}
function analyseParsedData(data){
	var deferred = Q.defer();
	var count = 0;
	if( data.OPENAIP.HOTSPOTS !== undefined){
		count = data.OPENAIP.HOTSPOTS[0].HOTSPOT.length;
		for(var i = 0; i < count; i++){
			createHotspot(data.OPENAIP.HOTSPOTS[0].HOTSPOT[i])
				.done(function(result){
					hotspots.push(result);
				});
		}
		allFiles--;
	} else if( data.OPENAIP.AIRSPACES !== undefined){
		count = data.OPENAIP.AIRSPACES[0].ASP.length;
		for(var i = 0; i < count ; i++){
			createAirspace(data.OPENAIP.AIRSPACES[0].ASP[i])
				.done(function(result){
					airspaces.push(result);
				});
		}
		allFiles--;
	} else if( data.OPENAIP.NAVAIDS !== undefined){
		count = data.OPENAIP.NAVAIDS[0].NAVAID.length;
		for(var i = 0; i < count ; i++){
			createNavaid(data.OPENAIP.NAVAIDS[0].NAVAID[i])
				.done(function(result){
					navaids.push(result);
				});
		}
		allFiles--;
	} else if( data.OPENAIP.WAYPOINTS !== undefined){
		count = data.OPENAIP.WAYPOINTS[0].AIRPORT.length;
		for(var i = 0; i < count ; i++){
			createAirport(data.OPENAIP.WAYPOINTS[0].AIRPORT[i])
				.done(function(result){
					airports.push(result);
				});
		}
		allFiles--;
	} else {
		throw new Error("There are other data types than airports, airspaces, navaids or hotspots");
	}
	console.log(colors.yellow(">>> Found " + count +" items to work on."));
	deferred.resolve(datas);
	return deferred.promise;
}
function createHotspot(data){
	var deferred = Q.defer();
	var hotspot = {
		guid:           "",
		aeronautical : "hotspot",
		type:           data.$.TYPE,
		country:        data.COUNTRY[0],
		name:           data.NAME[0],
		latitude :      parseFloat(data.GEOLOCATION[0].LAT[0]),
		longitude :     parseFloat(data.GEOLOCATION[0].LON[0]),
		elev :          parseFloat(data.GEOLOCATION[0].ELEV[0]._),
		reliability:    parseFloat(data.RELIABILITY[0]),
		occurrence:     data.OCCURRENCE[0],
		conditions:[]
	};
	// Working on conditions.
	if(data.CONDITIONS != undefined){
		for(var i = 0; i < data.CONDITIONS.length; i++){
			var tmpCond = data.CONDITIONS[i];
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
	deferred.resolve(hotspot);
	return deferred.promise;
}
function createAirspace(data){
	var deferred = Q.defer();
	var airspace = {
        guid:       "",
        aeronautical : "airspace",
        category:   data.$.CATEGORY,
        version:    data.VERSION[0],
        id:         data.ID[0],
        country:    data.COUNTRY[0],
        name:       data.NAME[0],
        alt_limits:{
            top:{
                ref:data.ALTLIMIT_TOP[0].$.REFERENCE,
                value: data.ALTLIMIT_TOP[0].ALT[0].$.UNIT +" "+ data.ALTLIMIT_TOP[0].ALT[0]._
            },
            bottom:{
                ref:data.ALTLIMIT_BOTTOM[0].$.REFERENCE,
                value:data.ALTLIMIT_BOTTOM[0].ALT[0].$.UNIT +" "+ data.ALTLIMIT_BOTTOM[0].ALT[0]._
            }
        },
        geometry:[]
    };
    // Generate vertexes for airspaces geometry
    // A GeoJSON polygon is polygon : [ [ [Coordinates 1] ] ]
    var strGeomArr = data.GEOMETRY[0].POLYGON[0].split(', ');
    var vertexes = [];
    for(var g = 0; g < strGeomArr.length; g++){
        var tmpVertex = strGeomArr[g].split(" ");
        var vertex = [ parseFloat(tmpVertex[0]), parseFloat(tmpVertex[1])];
        vertexes.push(vertex);
    }
    airspace.geometry = [ vertexes ];
    deferred.resolve(airspace);
	return deferred.promise;
}
function createNavaid(data){
	var deferred = Q.defer();
    var navaid = {
        guid:       	"",
        aeronautical :	"navaid",
        type:       	data.$.TYPE,
        country:    	data.COUNTRY[0],
        id:         	data.ID[0],
        latitude :  	parseFloat(data.GEOLOCATION[0].LAT[0]),
        longitude : 	parseFloat(data.GEOLOCATION[0].LON[0]),
        elev :      parseFloat(data.GEOLOCATION[0].ELEV[0]._),
        radios:[],
        params:{
            range: (data.PARAMS[0].RANGE != undefined) ? parseFloat(data.PARAMS[0].RANGE[0]._) : null,
            declination : parseFloat(data.PARAMS[0].DECLINATION[0]),
            alignedtotruenorth : !(data.PARAMS[0].ALIGNEDTOTRUENORTH[0] === "FALSE")
        }
    };
    // Work on radio
    if(data.RADIO != undefined){
        for(var j =0; j < data.RADIO.length; j++){
            var radio = {
                frequency:  parseFloat(data.RADIO[j].FREQUENCY[0]),
                channel:    (data.RADIO[j].CHANNEL != undefined) ? data.RADIO[j].CHANNEL[0] : ""
            };
            navaid.radios.push(radio);
        }
    }
	deferred.resolve(navaid);
	return deferred.promise;
}
function createAirport(data){
	var deferred = Q.defer();
	var airport = {
        guid:       	"",
        aeronautical : 	"airport",
        name:       	data.NAME[0],
        type:       	data.$.TYPE,
        country:    	data.COUNTRY[0],
        icao :      	(data.ICAO != undefined ) ? data.ICAO[0] : "",
        radios:     	[],
        latitude :  	parseFloat(data.GEOLOCATION[0].LAT[0]),
        longitude : 	parseFloat(data.GEOLOCATION[0].LON[0]),
        elev :      	parseFloat(data.GEOLOCATION[0].ELEV[0]._)
    };
    // Work on radios
    if(data.RADIO != undefined){
        for(var r = 0; r < data.RADIO.length; r++){
            var tempRadio = data.RADIO[r];
            var radio = {
                category: 		tempRadio.$.CATEGORY,
                frequency: 		parseFloat(tempRadio.FREQUENCY[0]),
                type: 			tempRadio.TYPE[0],
                spec: 			(tempRadio.TYPESPEC != undefined ) ? tempRadio.TYPESPEC[0] : "",
                description: 	(tempRadio.DESCRIPTION != undefined) ? tempRadio.DESCRIPTION[0] : ""
            };
            airport.radios.push(radio);
        }
    }
    // Work on runways
    if(data.RWY != undefined){
        for(var r = 0; r < data.RWY.length; r++){
            createRunway(data.RWY[r], airport)
				.done(function(result){
					runways.push(result);
				});
		}
    }
	deferred.resolve(airport);
	return deferred.promise;
}
function createRunway(data, airport){
	var deferred = Q.defer();
	var runway = {
		guid:       	"",
		aeronautical : 	"navaid",
		operations : 	data.$.OPERATIONS,
		airport : 		airport.name,
		name : 			data.NAME[0],
		sfc : 			data.SFC[0],
		latitude :  	airport.latitude,
		longitude : 	airport.longitude,
		elev :      	airport.elev,
		length : 		parseFloat(data.LENGTH[0]._),
		width : 		parseFloat(data.WIDTH[0]._),
		directions: 	[]
	};
	if( data.DIRECTION != undefined ){
		for(var z = 0; z < data.DIRECTION.length; z++){
			runway.directions.push(data.DIRECTION[z].$.TC);
		}
	}
	deferred.resolve(runway);
	return deferred.promise;
}
function secondPartOfTheJob(){
	var deferred = Q.defer();
	if(allFiles == 0){
		var datas = {
			airports	: airports,
			airspaces	: airspaces,
			hotspots	: hotspots,
			navaids		: navaids,
			runways		: runways
		};
		deferred.resolve(datas);
	}
	return deferred.promise;
}
function checkDuplicatesInArray(datas){
	var deferred = Q.defer();
	console.log(colors.magenta(">>> Safety : Checking for duplicates entries."))
	var duplicatesCounter = 0;
	for(block in datas){
		// Creating a temporary array
		var temporaryArray = [];
		console.log(colors.magenta(">>> Safety : Checking " + block + " ("+ block.length +" items)."));
		for(item in datas[block]){
			// In this block, check for duplicates.
			// So, for each entry, loop on all next ones, and check if they are identical.
			if(temporaryArray.length == 0){
				// First item, we add it directly to our temporaryArray.
	            temporaryArray.push(item);
	        } else {
				// Other items, need to check if it's already copied.
	            var existsInArray = false;
	            for(var j = 0; j < temporaryArray.length; j++){
	                if(temporaryArray[j] == item){
						existsInArray = true;
						duplicatesCounter++;
						break;
					}
	            }
	            if(existsInArray === false){
	                temporaryArray.push(item);
	            }
	        }
		}
		// Changing the actual array.
		datas[block] = temporaryArray;
	}
	console.log(colors.magenta(">>> Safety : " + duplicatesCounter + " duplicates found and removed"))
	deferred.resolve(datas);
	return deferred.promise;
}
function produceGeoJSON(datas){
	console.log(colors.white(">>> Generating the GeoJSON Files"));
	for(block in datas){
		console.log(colors.white(">>> Generating the GeoJSON for " + block + " ("+ block.length +" items)."));
	}
}
function createFile(datas, filename){

}
