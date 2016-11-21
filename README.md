# OpenAIP2GeoJSON

This little script look for files from [OpenAIP](http://www.openaip.net) in the folder ```input```, and transform those into GeoJSON files.

## TODO
- [x] parser for .aip files
- [ ] parser for .cup files
- [ ] parser for .dat files
- [ ] ask for input/output directories
- [ ] a better "check duplicates" method
- [ ] a better console output (ongoing)

## How to run it

Clone the project, and install dependencies by running
```bash
npm install
```
Then run it with
```bash
node index.js
```

The parser will then look into the ```input``` folder and parse all extensions readable by the script.
Your GeoJSON files will be exported into the ```output``` folder.
