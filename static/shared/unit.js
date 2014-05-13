var unitLib = {
    
    protoList: ["grunt", "scout", "elven_archer", "orcish_archer"],
    protos: {},

    init: function(initCallback) {
	if(typeof createjs != "undefined") {
	    this.clientInit(initCallback);
	} else {
	    this.serverInit(initCallback);
	}
    },

    clientInit: function(initCallback) {
	// load unit data files
        var queue = new createjs.LoadQueue();
	var unitManifest = unitLib.protoList.map(function(k){
	    return { id:k, src:"/data/units/"+k+".json", type:createjs.LoadQueue.JSON }
	});

	queue.loadManifest(unitManifest);

	queue.on("fileload", function(e) {
	    // make each unit-data object into a unit prototype
	    // with the master unitProto as its prototype
	    var newProto = Object.create(unitLib.unitProto);
	    for(var prop in e.result) {
		newProto[prop] = e.result[prop];
	    }
	    unitLib.protos[e.item.id] = newProto;
        });

	// when all data files have loaded, load images
	queue.on("complete", function() {
            var queue = new createjs.LoadQueue();
            queue.on("complete", handleComplete, this);
            queue.loadManifest(
                Object.keys(unitLib.protos).map(function(k){ return {id:k, src:unitLib.protos[k].img }; })
            );

            function handleComplete() {
		for(var k in unitLib.protos) {
		    var img = queue.getResult(k);
		    unitLib.protos[k].imgObj = img;
		    unitLib.protos[k].colorImgList = [img];

		    // colorize images for teams
		    var colorCanvas = document.createElement("canvas");
		    colorCanvas.width = img.width;
		    colorCanvas.height = img.height;
		    colorContext = colorCanvas.getContext("2d");
		    var teamColors = [[255,255,0], [0,255,255], [255,255,255]]

		    for(var j=0; j<teamColors.length; ++j) {
			colorContext.drawImage(img, 0, 0);
			var imgd = colorContext.getImageData(0,0,img.width,img.height);
			var pix = imgd.data;

			// HACK, FIXME: decided to recolor a pixel if it is
			// more red than green and more blue than green
			// (this works okay-ish for the units so far)
			for(var i=0, n=pix.length; i < n; i += 4) {
			    if(pix[i] > pix[i+1] && pix[i+2] > pix[i+1]) {
				pix[i] = pix[i] & teamColors[j][0];
				pix[i+1] = pix[i+1] & teamColors[j][1];
				pix[i+2] = pix[i+2] & teamColors[j][2];
			    }
			}

			colorContext.putImageData(imgd, 0, 0);
			var coloredImg = new Image();
			coloredImg.src = colorCanvas.toDataURL();
			unitLib.protos[k].colorImgList.push(coloredImg);
		    }
		}
            }

	    initCallback();
        });
    },

    serverInit: function(initCallback) {
	var loadUnitType = require("../../loadUtils.js").loadUnitType;
	var count = 0;
	for(var i = 0; i < unitLib.protoList.length; ++i) {
	    var name = unitLib.protoList[i];
	    loadUnitType(name, function(err, typeObj) {
		var name = unitLib.protoList[count];
		count++;

		var newProto = Object.create(unitLib.unitProto);
		for(var prop in typeObj) {
		    newProto[prop] = typeObj[prop];
		}
		unitLib.protos[name] = newProto;
		if(count == unitLib.protoList.length) { 
		    initCallback();
		}
	    });
	}
    }
}

function Unit(unitData) {
    var proto = unitLib.protos[unitData.type];
    var unit = Object.create(proto);

    for(var prop in unitData) {
	unit[prop] = unitData[prop];
    }

    // client-side image business
    if(unit.colorImgList) {
	unit.imgObj = unit.colorImgList[unit.team];
	unit.img = unit.imgObj.src;

	unit.shape = new createjs.Container();
	unit.shape.owner = unit;
	unit.shape.addChild(new createjs.Bitmap(unit.imgObj));
        
	unit.drawHpBar();
	unit.drawGem();
    
	if(unit.isCommander) { unit.drawCrown(); }
    }

    return unit;
}

unitLib.unitProto = {
    constructor: Unit,

    drawHpBar: function() {
	if(this.healthBar) { this.shape.removeChild(this.healthBar); }
	
	var hpRatio = this.hp / this.maxHp;
	var barColor = ["#D00", "#DD0"][Math.floor(hpRatio * 3)] || "#0D0";
	
	this.healthBar = new createjs.Shape();
	this.healthBar.graphics.beginFill(barColor).drawRect(54, 8.5 + 20 * (1 - hpRatio), 4, 20 * hpRatio);
	this.healthBar.graphics.beginFill("rgba(0,0,0,0)").beginStroke("#FFF").drawRect(53.5, 8.5, 4, 20);
	this.shape.addChild(this.healthBar);
    },
    
    drawCrown: function() {
	var crown = new createjs.Shape();
	crown.graphics.beginFill("gold").drawRect(10,9,12,3).drawRect(10,7,3,3).drawRect(15,7,3,3).drawRect(19,7,3,3);
	this.shape.addChild(crown);
    },

    drawGem: function() {
	if(this.gem) { this.shape.removeChild(this.gem); }

	var availability = this.calculateAvailability();
	if(availability == -1) { return; }

	var color = ["red","yellow","#0D0"][availability];

	this.gem = new createjs.Shape();
	this.gem.graphics.beginStroke("black").beginFill(color).drawRect(10.5,15.5,5,10);
	this.shape.addChild(this.gem);
    },

    calculateAvailability: function() {
	if(gameInfo.activeTeam != this.team) { return -1; }

	if(this.moveLeft == this.move) {
	    return 2;
	} else if(this.moveLeft != 0) {
	    return 1;
	} else if(!this.hasAttacked) {
	    var neighbors = world.getNeighbors(this);
	    for(var i = 0; i < neighbors.length; ++i) { 
		var adjUnit = world.getUnitAt(neighbors[i]);
		if(adjUnit && adjUnit.team != this.team) {
		    return 1;
		}
	    }
	}
	
	return 0;
    },
	    
    update: function(update) {
	for(prop in update) {
	    this[prop] = update[prop];
	}
	ui.updateUnitSidebar();
	this.drawHpBar();
	this.drawGem();
	world.stage.update();
    },

    // select a defnsive attack to counter the attack `offense` offered by `offender`
    // TODO: calculte odds of damage, killing, etc.
    selectDefense: function(offender, offense) {
	var defense = null;
	var defenseIndex = -1;
	for(var j=0; j < this.attacks.length; ++j){
	    if(offense.type == this.attacks[j].type) {
		defenseIndex = j;
		defense = this.attacks[j];
	    }
	}
	return { defense: defense, defenseIndex: defenseIndex };
    },

    // return a new attack object that shows how some attack would apply to this unit
    applyAttack: function(attack) {
	if(!attack) { return attack; }

	var result = {};
	for(var prop in attack) {
	    result[prop] = attack[prop];
	}
	result.damage = Math.round(result.damage * (1 - this.resistances[result.damageType]));
	return result;
    },

    getCoverOnSpace: function(space) {
	var unit = this;
	return Math.max.apply(Math,
		      space.terrain.properties.map(function(i) {
			  return unit.terrain[i].cover || 0;
		      })
	       );
    },

    getMoveCostForSpace: function(space) {
	var unit = this;
        var terrain = space.terrain || space;
	var costs = terrain.properties.map(function(i) {
	                if(unit.terrain[i].move == -1) { return Infinity; }
			return unit.terrain[i].move || Infinity;
		    });
	return Math.min.apply(Math, costs);
    },

    // returns a plain Object with only the object's own properties
    // used for storing the database (i.e., because prototype properties
    // are implied by the unit's type and do not need to be stored)
    getStorableObj: function() {
	var storableObj = {};
	var ownProps = Object.getOwnPropertyNames(this);
	for(var i = 0; i < ownProps.length; i++) {
	    var prop = ownProps[i];
	    storableObj[prop] = this[prop];
	}
	return storableObj;
    }
};

var genId;
(function() {
    var id = 0;
    genId = function() { return id++; }
})();

if(typeof module != "undefined") {
    module.exports.unitLib = unitLib;
    module.exports.Unit = Unit;
} else {
    window.unitLib = unitLib;
    window.Unit = Unit;
}
