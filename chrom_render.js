// 0. Objects


/**
 * DNAStructure objects represent 3D structures for display.
 *
 * */
function DNAStructure(objectText, bedText) {
    this.objectText = objectText || "";
    this.bedText = bedText || "";
    this.coords = null;
    this.colorMap = null;
    this.colorValues = [];
    this.colors = [];
    // array of geometries returned by constructGeometryArray
    this.geometries = null;
    // THREE.Material object
    this.material = null;
    // array of meshes returned by addGeometriesToScene
    this.meshes = null;
    this.graphicsLevel = "medium";
    // an array as seen in geometries...
    this.graphicsOptions = null;
    // other stuff
    this.chrom = null;
}

/**
 * DNAView objects represent views for displaying 3d structures.
 *
 * */
function DNAView() {
    this.structures = [];
    this.camera = null;
    this.ambientLight = null;
    this.trackingLight = null;
    this.scene = null;
    this.renderer = null;
    this.controls = null;
    // whether or not to allow multiple structures in one view
    this.multipleStructures = false;
}

/**
 * Creates a new DNAView, initializing all its fields.
 * Initializes the scene, camera, renderer, controls, and lights.
 *
 * Arguments:
 *  w - width
 *  h - height
 */
function createNewView(w, h) {
    var view1 = new DNAView();
    view1.scene = new THREE.Scene();
    view1.camera = new THREE.PerspectiveCamera(60, 
            w/h, 0.001, 1000);
    view1.camera.position.z = 5;
    view1.renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: false 
    });
    view1.renderer.setSize(w, h);
    view1.renderer.setClearColor("rgb(100,100,100)");
    // TODO: weird bug - if this is done afterwards, mouse click
    // controls don't work.
    document.body.appendChild(view1.renderer.domElement);

    var controls = new THREE.TrackballControls(view1.camera, 
            view1.renderer.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.noZoom = false;
    controls.noPan = false;
    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;
    controls.keys = [ 65, 83, 68 ];
    controls.addEventListener( 'change', render );
    view1.controls = controls;

    view1.trackingLight = new THREE.DirectionalLight( 0xf0f0f0 , 0.9);
    view1.trackingLight.position.set(view1.camera.position.x, 
            view1.camera.position.y, view1.camera.position.z);
    view1.ambientLight = new THREE.AmbientLight( 0x404040 , 0.5);
    view1.ambientLight.position.set(0, 0, 0);
    view1.scene.add(view1.trackingLight);
    view1.scene.add(view1.ambientLight);
    return view1;
}

/**
 * Creates a DNAStructure object.
 * */
function createDNAStructure(objectText, bedText, colorValues, 
        graphicsLevel, tubeRadius, colorMap) {
    var structure = new DNAStructure(objectText, bedText);
    tubeRadius = tubeRadius || 0.01;
    graphicsLevel = graphicsLevel || "medium";
    colorMap = colorMap || BLUE_WHITE_RED_SCHEME;
    colorValues = colorValues || null;
    structure.graphicsLevel = graphicsLevel;
    structure.tubeRadius = tubeRadius;
    structure.colorMap = colorMap;
    structure.colorValues = colorValues;
    var all_coords = pointsToCurve(objectText);
    structure.coords = all_coords;
    var g = graphicsOptions[graphicsLevel];
    structure.graphicsOptions = g;
    var geometry = constructGeometryArray(all_coords, tubeRadius, 
            g.tubeSegments, g.sphereWidthSegments, g.sphereHeightSegments);
    // colors... this is terrible because we can't just take in a bedfile...
    var colors = [];
    if (colorValues != null && colorValues.length == all_coords.length) {
        colors = coordsToColors(all_coords.length, colorMap, colorValues);
    } else {
        colors = coordsToColors(all_coords.length, colorMap, null);
    }
    structure.colors = colors;
    setGeometryColors(geometry, colors, g.tubeSegments);
    //console.log(geometry);
    var material = new THREE.MeshPhongMaterial( { color : 0xffffff, opacity:0, 
          shading: THREE.FlatShading, vertexColors: THREE.VertexColors} ); 
    var splineObject = createMeshes(all_coords, geometry, material);
    structure.meshes = splineObject;
    return structure;
}

// 1. setting up the basic scene
var views = [];
var h = window.innerHeight;
var w = window.innerWidth;
var view1 = createNewView(w, h);
views.push(view1);

// 2. setting up the geometry...

// global parameters
var structures = [];
var structure1 = new DNAStructure();
structures.push(structure1);

// graphics options
var graphicsOptions = {
    low: {tubeSegments: 8, sphereWidthSegments: 4, sphereHeightSegments: 4},
    medium: {tubeSegments: 32, sphereWidthSegments: 8, sphereHeightSegments: 6},
    high: {tubeSegments: 64, sphereWidthSegments: 16, sphereHeightSegments: 12}};

/**
 * Given a string of coords, this returns an array of Vector3 objects.
 * */
function pointsToCurve(coords) {
    var coords_str = coords.trim().split("\n");
    //console.log(coords_str);
    var all_coords = Array(Number(coords_str[0]));
    for (var i in coords_str) {
        var c = coords_str[i];
        var c_nums = c.trim().split(" ");
        if (c_nums.length == 1)
            continue;
        else if (c_nums.length == 3) {
            all_coords[i-1] = new THREE.Vector3(Number(c_nums[0]), 
                    Number(c_nums[1]), Number(c_nums[2]));
        }
    }
    return all_coords;
}

/**
 * Given an array of Vector3 objects, this returns an array containing
 * THREE.Color objects for each point. Right now this just does linear
 * interpolation.
 * */
function coordsToColors(num_points, colorScheme, values) {
    var l = num_points;
    var colors = [];
    if (values == null) {
        // do linear interpolation
        for (var i = 0; i<num_points; i++) {
            colors.push(new THREE.Color(makeColor(i, 0, l-1, colorScheme)));
        }
    } else {
        // need to get min, max
        var cmin = min(values);
        var cmax = max(values);
        for (var i = 0; i<num_points; i++) {
            colors.push(new THREE.Color(makeColor(values[i], cmin, cmax, colorScheme)));
        }
    }
    return colors;
}

/**
 * Given a text file, this generates a geometry and replaces oldObject.
 * */
function reloadObject(view, newStructure, oldStructure, noRemove) {
    if (oldStructure && !noRemove) {
        removeObjectsFromScene(oldStructure.meshes, view.scene);
        var oldIndex = view.structures.indexOf(oldStructure);
        view.structures.splice(oldIndex, 1);
    }
    addMeshesToScene(newStructure.meshes, view.scene);
    view.structures.push(newStructure);
}

/**
 * simple check to update the color values...
 * */
function updateColors(newValues, structure) {
    structure.colorValues = newValues;
    if (newValues != null && newValues.length == structure.coords.length) {
        structure.colorValues = newValues;
    } else if (newValues.length > structure.coords.length) {
        structure.colorValues = newValues.slice(0, structure.coords.length);
    }
}
// 3. Setting up mouse interactions
// No need

// registering mouse events - unnecessary since this is all done in control
//renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
//renderer.domElement.addEventListener( 'mousedown', onMouseDown, false );
//renderer.domElement.addEventListener( 'mouseup', onMouseUp, false );
window.addEventListener('resize', onWindowResizeListenerGenerator(view1), false);


// 4. Setting up data tracks / colors

/**
 * Given a bedfile (as a string), this should return a list of values...
 * Params:
 *  - bedfile - a string
 *  - resolution - the resolution of the 3d model
 *  - chrom - the chromosome number
 *  - value_name - the name of the header corresponding to the value that
 *    should be plotted.
 *  - arm - no use for now
 *  - removed_bins - the bins that should be removed - an array of ints
 * */
function readBedfile(bedfile, resolution, chrom, value_name, arm, removed_bins) {
    console.log("readBedfile");
    if (bedfile.length == 0) {
        return [];
    }
    var values = [];
    var bedfile_split = bedfile.trim().split("\n");
    var line1 = bedfile_split[0].split(/\s+/);
    // ldict maps column headers to column indices
    // it should contain "chr", "start", "end", and something else
    var ldict = {};
    for (var j = 0; j<line1.length; j++) {
        if (line1[j].length > 0)
            ldict[line1[j]] = j;
    }
    console.log(line1);
    console.log(ldict);
    var current_bin = [];
    var bin_id = 1;
    var bin_start = 0;
    var selectedArm = 0 || arm;
    // default value for ldict - position of each column
    ldict.chr = ldict.chr || 0;
    ldict.start = ldict.start || 1;
    ldict.end = ldict.end || 2;
    if (selectedArm != 0 && ldict.arm == undefined) {
        console.log("Bedfile contains no arm information, ignoring");
        selectedArm = 0;
    }
    ldict[value_name] = ldict[value_name] || (line_values.length - 1);
    for (var i = 0; i<bedfile_split.length; i++) {
        var line_values = bedfile_split[i].split(/\s+/);
        //console.log(line_values);
        var chr = line_values[ldict.chr];
        // TODO: something like bedtools intersect
        if (chr == chrom) {
            if (selectedArm != 0) {
                var bin_arm = line.values[ldict.arm];
                if (bin_arm != selectedArm) {
                    continue;
                }
            }
            var start = line_values[ldict.start];
            var end = line_values[ldict.end];
            var val = line_values[ldict[value_name]];
            if (removed_bins != null && !contains(removed_bins, bin_id)) {
                var bin_val = Number(val);
                if (end-start < resolution) {
                    current_bin.push(bin_val);
                    if (end >= bin_start + resolution) {
                        bin_val = mean(current_bin);
                        values.push(bin_val);
                        bin_start += end - start
                    }
                }
                if (end-start > resolution) {
                    // TODO: I have no idea what to do
                }
                if (end-start == resolution) {
                    values.push(bin_val);
                }
            }
            bin_id++;
        }
    }
    return values;
}


// 5. rendering
function onWindowResizeListenerGenerator(view) {
    return function(evt) {
        view.camera.aspect = window.innerWidth / window.innerHeight;
        view.camera.updateProjectionMatrix();
        view.renderer.setSize( window.innerWidth, window.innerHeight );
        view.controls.handleResize();
        render();
    };
}

/**
 * Resets the camera to its original position by re-generating all the global
 * variables
 * */
function resetCamera(zoomSetting, viewId) {
    var v = views[viewId];
    var renderer = v.renderer;
    var camera = new THREE.PerspectiveCamera(60, 
        window.innerWidth/window.innerHeight, 0.001, 1000);
    camera.position.z = 5*zoomSetting;
    //camera.lookAt(THREE.Vector3(0,0,0));
    camera.updateProjectionMatrix();
    var controls = new THREE.TrackballControls( camera , renderer.domElement);
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = true;
    controls.dynamicDampingFactor = 0.3;

    controls.keys = [ 65, 83, 68 ];

    controls.addEventListener( 'change', render );
    v.camera = camera;
    v.controls = controls;
    render();
}

function animate() {
    for (var i = 0; i<views.length; i++) {
        requestAnimationFrame( animate );
        views[i].controls.update();
    }
}

function render() { 
    for (var i = 0; i<views.length; i++) {
        var camera = views[i].camera;
        var light2 = views[i].trackingLight;
        var scene = views[i].scene;
        light2.position.set(camera.position.x, 
                camera.position.y, camera.position.z);
        views[i].renderer.render( scene, camera ); 
    }
} 

/**
 * Takes a screenshot...
 * */
function snapshot(viewId) {
    render();
    var urlData = views[viewId].renderer.domElement.toDataURL();
    window.open(urlData, "_blank");

}


// Running
objectText = "5\n0.566046 0.297772 0.928499\n0.610989 0.358840 0.944009\n0.702651 0.392072 0.915918\n0.788991 0.373088 0.865537\n0.885824 0.423299 0.798283\n0.938226 0.431045 0.807664\n0.979563 0.436933 0.850140\n0.879564 0.392228 0.872330\n0.986126 0.514608 0.806436\n1.014283 0.272586 0.776961\n1.023788 0.293796 0.818363\n1.070421 0.368948 0.809370\n1.111069 0.396415 0.776139\n1.173737 0.444256 0.861438\n1.197271 0.408099 0.874555\n1.138319 0.335163 0.959901\n1.068201 0.324114 0.975166\n0.991536 0.322119 0.996538\n0.893452 0.358959 0.987836\n0.827682 0.372347 0.959612\n0.741301 0.335776 0.994867";

var structure1 = createDNAStructure(objectText, ""); 
reloadObject(view1, structure1, null);


