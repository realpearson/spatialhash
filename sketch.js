var cnv, cnvWidth, cnvHeight;

let gobjs = [];
let collisionChecks = 0;
let useBruteForce = true;
let frameRateBuffer = 0;

//UI Global Setup
let numObjects = 100;
let objectDensity = 1;
let objectMinSize = 3;
let objectMaxSize = 16

//UI Global Runtime
let gridSize = 50; //num
let searchSize = 1; //num
let sortBySize = false; //bool
let dynamicSearchSize = false; //bool
let querryType = "brute" //"brute" | "cache"

//Dynamic grid size that scales with number of objects?

//Breaking example:
//A line with the length of the world passing through the center and rotating
//This would have a bounding area the size of the world & could cause system to melt down
//Although the sort by bounding size option with max search size should solve this!
//Another alternative is to have another layer where large dynamic objects live that has larger grid size...

let spatialCacher = new SpatialHashSystem();
let staticSpatialMap = new SpatialHashSystem(); //Separate map for static objects
//let competeCacher = new SpatialCacheSystemMap();

//Make utility that uses brute force to check that spatial system caught all collisions

function setup() {
  //createCanvas(800, 600); //800, 600
  cnvWidth = document.getElementById("container").offsetWidth;
  cnvHeight = document.getElementById("container").offsetHeight;
  cnv = createCanvas(cnvWidth, cnvHeight).parent("container"); 
  noSmooth();
  stroke(220);
  //Instantiate Gobjs  
}

//ToDo
//Reset framecounter
//Missed collision check
//Framerate display

//Input
function generateObjects(){
  frameCount = 0;
  frameRateBuffer = 0;
  gobjs.length = 0;
  for(let i = 0; i < numObjects; i++) gobjs.push(circ(random(objectMinSize, objectMaxSize), createVector(random(width*objectDensity), random(height*objectDensity))))
  gobjs = spatialCacher.sortByBoundingSize(gobjs);
}

const numObjectsInput = document.getElementById("numObjects");
numObjectsInput.addEventListener("input", ()=>{ numObjects = parseFloat(numObjectsInput.value);})

const densityInput = document.getElementById("density");
densityInput.addEventListener("input", ()=>{ objectDensity = parseFloat(densityInput.value);})

const minSizeInput = document.getElementById("minSize");
minSizeInput.addEventListener("input", ()=>{ objectMinSize = parseFloat(minSizeInput.value);})

const maxSizeInput = document.getElementById("maxSize");
maxSizeInput.addEventListener("input", ()=>{ objectMaxSize = parseFloat(maxSizeInput.value);})

const gridSizeInput = document.getElementById("gridSize");
gridSizeInput.addEventListener("input", ()=>{ gridSize = parseFloat(gridSizeInput.value);})

const searchSizeInput = document.getElementById("searchSize");
searchSizeInput.addEventListener("input", ()=>{ searchSize = parseFloat(searchSizeInput.value);})

const sortBySizeInput = document.getElementById("sortBySize");
sortBySizeInput.addEventListener("input", ()=>{ sortBySize = sortBySizeInput.checked;})

const dynSearchSizeInput = document.getElementById("dynSearchSize");
dynSearchSizeInput.addEventListener("input", ()=>{ dynamicSearchSize = dynSearchSizeInput.checked;})

const querryTypeInput = document.getElementById("querryType");
querryTypeInput.addEventListener("input", ()=>{ useBruteForce = querryTypeInput.value === "BruteForce"; })



function draw(){
  background(40);
  //console.log(gridSize)
  for(const gobj of gobjs){
    gobj.collided = false;
    gobj.pos.x += random(-2, 2);
    gobj.pos.y += random(-2, 2);
  }
  

  //querryTest();
  //cacherOneshotDebug();
  bruteVScache();

  //Render
  stroke(255);
  for(const obj of gobjs) {
    if(obj.collided) fill(230, 20, 10);
    else if(obj.missed) fill(20, 240, 40);
    else noFill();
    circle(obj.pos.x, obj.pos.y, obj.rad*2)
  }
  
    //Grid
  strokeWeight(1)
  stroke(20, 200, 30);
  for(let x = 0; x <= width; x+= gridSize){
    line(x, 0, x, height);
  }
  for(let y = 0; y <= height; y+= gridSize){
    line(0, y, width, y);
  }
  
  push()
  fill(20, 200);
  rect(width/2 -20, 0, 300, 75)
  fill(255)
  textSize(20)
  text(("ColChecks: " + collisionChecks), width/2, 20);
  text(("FR: " + (frameRateBuffer/ frameCount)), width/2, 50);
  pop();
  collisionChecks = 0;
}

function windowResized(){
  cnvWidth = document.getElementById("container").offsetWidth;
  cnvHeight = document.getElementById("container").offsetHeight;
  resizeCanvas(cnvWidth, cnvHeight);
}

function querryTest(){
  spatialCacher.buildCache(gobjs);
  let objsToCheck = spatialCacher.querryObjects({x:mouseX, y:mouseY}, {x: 20, y:2});
  for(const chkObj of objsToCheck){
      chkObj.collided = true;
  }
}

function cacherOneshotDebug(){
  noLoop()
  spatialCacher.buildCache(gobjs);
  spatialCacher.checkForCollision(gobjs);
  console.log("checks: " + collisionChecks)
  bruteForceQC();
}

function bruteVScache(){
  if(useBruteForce) {
    bruteForceColCheck();
    //competeCacher.buildCache(gobjs);
    //competeCacher.checkForCollision(gobjs);
  }
  else {
    spatialCacher.buildCache(gobjs);
    spatialCacher.checkForCollision(gobjs);
  }
  
  frameRateBuffer += frameRate();
  //if(frameCount % 15 === 0) console.log("checks: " + collisionChecks + " fr: " + (frameRateBuffer/ frameCount));
  //collisionChecks = 0;
}

function mousePressed(){
  //const gobj = circ(5, createVector(mouseX, mouseY));
  //gobjs.push(gobj);
  //console.log({x: Math.floor(gobj.pos.x/5), y: Math.floor(gobj.pos.y/5)});
  frameRateBuffer = 0;
  frameCount = 0;
}

function keyPressed(){
  //useBruteForce = !useBruteForce
  frameRateBuffer = 0;
  frameCount = 0;
}

function circ(_rad, _pos){
  return {
    rad: _rad,
    boundingArea: _rad,
    pos: _pos,
    collided: false,
    missed: false
  }
}


function getBoundingRect(_pos, _rad){
  return{
    pt1: {x: _pos.x - _rad, y: _pos.y - _rad},
    pt2: {x: _pos.x + _rad, y: _pos.y - _rad},
    pt3: {x: _pos.x + _rad, y: _pos.y + _rad},
    pt4: {x: _pos.x - _rad, y: _pos.y + _rad}
  }
}

//Switch out for of to foreach...
function SpatialHashSystem(){
  let self = this;
  let hashMap = new Map(); //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
  //let gridSize = 50; //12
  //let searchSize = 3; //should be 2 dimensional... {x,y}
  //let dynamicSearchSize = true; //Flag for if search size should be determined by object bounding box size
  //let sortBySize = true; //Flag for if objects are presorted by size (large->small)
  let maxSearchSize = 15; //Avoid overhead by iterating over map & filtering results rather than all possible
  //grid locations. Ideal for very large/long objects. Example querryEdges func...
  
  //Store all the arrays we need so we dont have to keep instantiating them
  let storage = [];
  let storageInc = 0;
  //in the addObject func retrieve an array from storage when needed
  //if there are no arrays left instantiate a new one and add to storage
  //clean the storage at beginning of next frame (make sure all array lengths = 0) & reset inc
  
  
  //Setup spatial cache, runs typically every frame after objects positions change
  this.buildCache = function(_gobjs){
    cleanStorage();
    hashMap.clear(); //guarantee no memory leaks...
    for(const gobj of _gobjs) addObject(gobj);
  }
  
  
  this.checkForCollision = function(_gobjs){
    
    for(let i = 0; i < _gobjs.length; i++){
      const gobj = _gobjs[i];
      let nextSize = objectMaxSize; //largest possible size
      if(sortBySize && i < _gobjs.length-1) nextSize = _gobjs[i+1].rad;
      const sSize = dynamicSearchSize ? Math.ceil((nextSize + gobj.rad)/gridSize) : searchSize;
      let objsToCheck = self.querryObjects(gobj.pos, {x: sSize, y: sSize});
      const checkKey = getKey(gobj.pos);

      if(searchSize === 0) objsToCheck = objsToCheck.concat(hashMap.get(checkKey));

      //Checked obj against gathered objs for collision
      for(const chkObj of objsToCheck){
        if(chkObj === gobj) continue; //dont check self
        checkCollision(gobj, chkObj); //<-- pass in function here to make modular
      }
      
      //Check if objects sorted by bounding size
      if(sortBySize) removeElementByRef(gobj, hashMap.get(checkKey)); 
      if(hashMap.has(checkKey).length === 0) hashMap.delete(checkKey);
    }    
  }
  
  //Find objects within specified range of given position
  //Add options for bounding raw, box, circle
  //range should be 2 dimensional {x, y}
  this.querryObjects = function(_pos, _range){
    let querryResult = [];
    const refKey = getKey({x:_pos.x, y: _pos.y});

    //Gather objects within search area
    for(let x = -_range.x; x <= _range.x; x++){
      for(let y = -_range.y; y <= _range.y; y++){
        const checkKey = getKey({x: _pos.x + x * gridSize, y: _pos.y + y * gridSize});
        if(hashMap.get(checkKey)) querryResult = querryResult.concat(hashMap.get(checkKey));
      }
    }
    if(searchSize === 0 && hashMap.has(refKey)) querryResult = querryResult.concat(hashMap.get(refKey));    
    return querryResult;
  }
  
  this.querryCircle = function(_pos, _radius, _largestBoundingRad){
    //WE only need to check edge cases, any bucket fully inside search area should be included
    const size = Math.ceil(_radius/gridSize);
    const querry = self.querryObjects(_pos, {x: size, y: size});
    const result = [];
    //Last param optional, if we don't supply it only objects with pos inside search grid
    //with size of radius*2 returned. If we get the parameter we increase search grid to
    //include objects that protrude into search radius
    //Collision check...
    //Create Utility Collider system for using collision check system without
    //triggering events & responses
    //for(const item of querry) 
  }
  
  this.querryRect = function(_pos, _sizeX, _sizeY){
    //WE only need to check edge cases, any bucket fully inside search area should be included
    const querry = self.querryObjects(_pos, {x: Math.floor((_sizeX/2)/gridSize) + 1, 
                                             y: Math.floor((_sizeY/2)/gridSize) + 1});
  }
  
  this.querryEdge = function(_edgeAxis, _edgePos, _range){
    let result = [];
    //Still need to take into account bounding size to know what range to choose...
    hashMap.forEach((_value, _key)=>{
      if(_edgeAxis === 'x'){
        if(Math.abs(_value.loc.x-_edgePos) < _range) result = result.concat(_value);
      } else if(_edgeAxis === 'y'){
        if(Math.abs(_value.loc.y-_edgePos) < _range) result = result.concat(_value);
      }
    });
    
    return result;
  }
  
  function getArrayFromStorage(){
    if(storageInc >= storage.length) console.log("added storage arr")
    if(storageInc >= storage.length) storage.push([]);
    storageInc++;
    return storage[storageInc-1];
  }
  
  function cleanStorage(){
    storageInc = 0;
    for(const arr of storage) arr.length = 0;
  }
  
  /*
  function addObject(_gobj){
    const hashKey = getKey(_gobj.pos);
    if(!hashMap.has(hashKey)) hashMap.set(hashKey, []);
    hashMap.get(hashKey).push(_gobj);
  }*/
  
  
  function addObject(_gobj){
    const hashKey = getKey(_gobj.pos);
    if(!hashMap.has(hashKey)) hashMap.set(hashKey, getArrayFromStorage());
    hashMap.get(hashKey).push(_gobj);
  }
  
  
  function getKey(_pos){return `x:${Math.floor(_pos.x/gridSize)}, y:${Math.floor(_pos.y/gridSize)}`}

  function parseKey(_key){
    const r = /\d+/g;
    const result = [];
    let n;
    while ((n = r.exec(_key)) != null) {
      result.push(n[0]);
    }
    return {x: +result[0], y: +result[1]}
  }
  
  this.sortByBoundingSize = function(_gobjs){
    const sorted = [];
    for(const gobj of _gobjs) insertByBoundingSize(sorted, gobj);
    return sorted;
  }
  
  //Is there a better sorting algo for this or do we insert each gobj 1 at a time?
  function insertByBoundingSize(_gobjs, _gobj){
    let lowIndex = 0;
    let highIndex = _gobjs.length;
    
    while(lowIndex < highIndex){
      const midIndex = (lowIndex + highIndex) >> 1;
      if(_gobjs[midIndex].boundingArea > _gobj.boundingArea) lowIndex = midIndex + 1;
      else highIndex = midIndex;
    }
    
    _gobjs.splice(lowIndex, 0, _gobj);
  }
}

//Unary string to int
//https://www.scaler.com/topics/string-to-number-javascript/
//RegEx get numbers from string
//https://stackoverflow.com/questions/1623221/how-to-find-a-number-in-a-string-using-javascript


function bruteForceQC(){
  //Brute Force Collision Check
  for(let i = 0; i < gobjs.length; i++){
    for(let j = i + 1; j < gobjs.length; j++){
      if(gobjs[i] === gobjs[j]) continue; //dont check self
      checkCollisionQC(gobjs[i], gobjs[j]);
    }
  }
}

function checkCollisionQC(_colA, _colB){
  collisionChecks++;
  /*
  for(let i = 0; i < 20; i++){
    let u = Math.sqrt(34829);
  }*/
  if(sqDistLessThan(_colA.pos, _colB.pos, _colA.rad + _colB.rad)){
    if(!_colA.collided) _colA.missed = true;
    if(!_colB.collided) _colB.missed = true;
    if(_colA.missed || _colB.missed) console.log("missed collision")
    //_colA.collided = true;
    //_colB.collided = true;
    return true;
  }
}


function bruteForceColCheck(){
  //Brute Force Collision Check
  for(let i = 0; i < gobjs.length; i++){
    for(let j = i + 1; j < gobjs.length; j++){
      if(gobjs[i] === gobjs[j]) continue; //dont check self
      checkCollision(gobjs[i], gobjs[j]);
    }
  }
}

function checkCollision(_colA, _colB){
  collisionChecks++;
  /*
  for(let i = 0; i < 20; i++){
    let u = Math.sqrt(34829);
  }*/
  if(sqDistLessThan(_colA.pos, _colB.pos, _colA.rad + _colB.rad)){
    _colA.collided = true;
    _colB.collided = true;
    return true;
  }
}


//To Util
function removeElementByRef(_el, _arr){
  const index = _arr.indexOf(_el);
  if(index > -1) _arr.splice(index, 1);
  return index > -1;
}

//https://stackoverflow.com/questions/1344500/efficient-way-to-insert-a-number-into-a-sorted-array-of-numbers
function sortedIndex(array, value) {
    let low = 0;
    let high = array.length;

    while (low < high) {
        var mid = (low + high) >>> 1;
        if (array[mid] < value) low = mid + 1;
        else high = mid;
    }
    return low;
}

//TO MATH
function sqDistLessThan(_v1, _v2, _dist) {return Math.pow((_v2.x - _v1.x), 2) + Math.pow((_v2.y - _v1.y), 2) < Math.pow(_dist, 2)}
function sqDistLessThanOrEqual(_v1, _v2, _dist) {return Math.pow((_v2.x - _v1.x), 2) + Math.pow((_v2.y - _v1.y), 2) <= Math.pow(_dist, 2)}
function sqDist(_v1, _v2) {return Math.pow((_v2.x - _v1.x), 2) + Math.pow((_v2.y - _v1.y), 2)}


//https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/
//https://www.youtube.com/watch?v=sx4IIQL0x7c
