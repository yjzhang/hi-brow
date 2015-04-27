//File upload handler
function handleFileSelect(evt) {
    var target = document.getElementById("files");
    var files = evt.target.files; // FileList object
    console.log(files);
    var f = target.files[0];
    console.log(f);
    var r = new FileReader();
    r.onload = function(e) {
        var fileData = e.target.result;
        objectText = fileData;
        splineObject = reloadObject(fileData, splineObject);
    };
    r.readAsText(f);
    //files is a FileList of File objects. List some properties.
    var output = [];
}

function handleBedfileSelect(evt) {
    var target = document.getElementById("bedfiles");
    var files = evt.target.files; // FileList object
    console.log(files);
    var f = target.files[0];
    console.log(f);
    var r = new FileReader();
    r.onload = function(e) {
        // parse removed_bins, resolution
        var res = Number(document.getElementById("resolution").value);
        var chrom = document.getElementById("chrom").value;
        var fileData = e.target.result;
        bedText = fileData;
        var excludedBins = document.getElementById("excluded").value;
        var columnName = document.getElementById("value-name").value;
        excludedBins = excludedBins.split(",").map(function (x) {return Number(x)});
        var newValues = readBedfile(fileData, res, chrom, columnName, null, excludedBins);
        updateColors(newValues);
        splineObject = reloadObject(objectText, splineObject);
    };
    r.readAsText(f);
    //files is a FileList of File objects. List some properties.
    var output = [];
}

/**
 * Callback for the "update" button
 * */
function updateOptions(evt) {
    var res = Number(document.getElementById("resolution").value);
    var chrom = document.getElementById("chrom").value;
    var excludedBins = document.getElementById("excluded").value;
    tubeRadius = document.getElementById("radius").value;
    var selectedColorScheme = document.getElementById("color-scheme").value;
    var newExcludedBins = excludedBins.split(",").map(function (x) Number(x));
    var columnName = document.getElementById("value-name").value;
    if (bedText) {
        var newValues = readBedfile(bedText, res, chrom, columnName, null, newExcludedBins);
        updateColors(newValues);
    }
    colorMap = colorSchemes[selectedColorScheme];
    splineObject = reloadObject(objectText, splineObject);
    resetCamera(document.getElementById('zoom-number').value;
}

document.getElementById('files').addEventListener('change', 
        handleFileSelect, false);

document.getElementById('bedfiles').addEventListener('change', 
        handleBedfileSelect, false);

