/**
    Copyright 2014 Andrew P. Sillers

    This file is part of Lords of the Fey.

    Lords of the Fey is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Lords of the Fey is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with Lords of the Fey.  If not, see <http://www.gnu.org/licenses/>.
*/

/** @module unit */

/**
   @typedef UnitData
   @see {@link https://github.com/apsillers/lords-of-the-fey/wiki/Adding-new-content|Adding new content} from the wiki
   @prop {string} name - human-readable unit type name
   @prop {string} img - path to the unit's image (rooted in the web-root)
   @prop {number} cost - gold cost
   @prop {number} move - number of move points
   @prop {string} alignment - `chaotic`, `neutral`, or `lawful`
   @prop {number} maxHp - max HP
   @prop {number} maxXp - XP amount that causes the unit to level up
   @prop {number} level - unit level
   @prop {string[]} advancesTo - names of types this unit can level up into
   @prop {number} attributeCount - how many attributes the unit is created with
   @prop {string[]} attributePool - array of extra attributes the unit might be
     created beyond the basic 4 (quick, strong, intelligent, resilient)
   @prop {string[]} fixedAttributes - attributes this unit always has (these do
     not count toward the attributeCount)
   @prop {Object<string,unit~UnitTerrainStat>} terrain - mapping of terrain
     type strings ("flat", "swamp", etc.) to objects with `cover` and `move`
     properties
   @prop {AttackSpec[]} attack - list of attacks
   @prop {Object<string, number>} resistances - mapping damage types to
     resistance percentages (-1.0 to 1.0, or even higher or lower)
*/

/**
   Stats for how well a unit does on a particular terrain type
   @typedef UnitTerrainStat
   @prop {number} move - movemet cost for this terrain
   @prop {number} cover - defensive cover percentage, 0.0 to 1.0
*/

/**
   @typedef AttackSpec
   @prop {string} name - human-readable name of attack
   @prop {string} type - `melee` or `ranged`
   @prop {string} damageType - category of damage: `arcane`, `blade`, `cold`,
     `fire`, `impact`, or `pierce`
   @prop {number} number - number of swings
   @prop {number} damage - damage per swing
   @prop {string[]} properties - array of attack properties, e.g., `poison`
*/

/**
   @namespace unitLib
   @prop {string[]} protoList - array of all unit type file names 
   @prop {Object<string, Object>} protos - mapping of file name to prototype
*/
var unitLib = {
    /** */
    protoList: ["orcish_grunt", "orcish_warrior", "orcish_warlord", "scout", "elven_archer", "elvish_shaman", "elvish_fighter", "elvish_captain", "elvish_marshal", "elvish_hero", "elvish_champion", "orcish_archer", "orcish_crossbowman", "orcish_slurbow", "orcish_assassin", "orcish_slayer"],
    protos: {},

    /**
       @memberof unitLib
       @param initCallback - called when all unit data has finished
       @param progressCallback - called each time a prototype loads
    */
    init: function(initCallback, progressCallback) {
	if(typeof createjs != "undefined") {
	    this.clientInit(initCallback, progressCallback);
	} else {
	    this.serverInit(initCallback);
	}
    },

    clientInit: function(initCallback, progressCallback) {
	// load unit data files
        var queue = new createjs.LoadQueue();
	queue.on("progress", progressCallback);
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
	    queue.on("progress", progressCallback);
            queue.on("complete", handleComplete, this);
            queue.loadManifest(
                Object.keys(unitLib.protos).map(function(k){ return {id:k, src:unitLib.protos[k].img }; })
            );

	    var attackAnimationList = [];
	    for(var p in unitLib.protos) {
		var proto = unitLib.protos[p];
		for(var a=0; a < proto.attacks.length; ++a) {
		    var attackObj = proto.attacks[a];
		    for(var direction in attackObj.img) {
			var imgPath = attackObj.img[direction];
			attackAnimationList.push({ id: p+"|"+a+"|"+direction, src: imgPath });
		    }
		}
	    }
	    queue.loadManifest(attackAnimationList);

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
		    var teamColors = [[255,255,0],[0,255,255], [255,255,255], [0,255,0]]

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

		    // load attack images
		    /*
		    for(var i=0; i < unitLib.proto[k].attacks.length; ++i) {
			var attack = unitLib.proto[k].attacks[i];
			var img = queue.getResult(k);
		    }
		    */
		}

		initCallback();
            }
        });
    },

    serverInit: function(initCallback) {
	var loadUnitType = require("../../loadUtils.js").loadUnitType;
	var count = 0;
	(function loadType() {
	    var name = unitLib.protoList[count];
	    loadUnitType(name, function(err, typeObj) {
		count++;

		var newProto = Object.create(unitLib.unitProto);
		for(var prop in typeObj) {
		    newProto[prop] = typeObj[prop];
		}
		unitLib.protos[name] = newProto;
		if(count == unitLib.protoList.length) { 
		    initCallback();
		} else {
		    loadType();
		}
	    });
	})();
    }
}

unitLib.abilityDict = {
    "resilient": {
	onCreate: function(unit) { unit.maxHp += 4 + unit.level; }
    },
    "intelligent": {
	onCreate: function(unit) { unit.maxXp = Math.round(unit.maxXp * 0.8); }
    },
    "quick": {
	onCreate: function(unit) { unit.maxHp = Math.round(unit.maxHp * .95); unit.move += 1; }
    },
    "strong": {
	onCreate: function(unit) {
	    var newAttacks = [];
	    for(var i=0; i < unit.attacks.length; ++i) {
		var attack = unit.attacks[i];
		var newAttack = Object.create(attack);

		if(attack.type == "melee") {
		    newAttack.damage += 1;
		}
		newAttacks.push(newAttack);
	    }
	    unit.attacks = newAttacks;
	}
    },
    "dextrous": {
	onCreate: function(unit) {
	    var newAttacks = [];
	    for(var i=0; i < unit.attacks.length; ++i) {
		var attack = unit.attacks[i];
		var newAttack = Object.create(attack);

		if(attack.type == "ranged") {
		    newAttack.damage += 1;
		}
		newAttacks.push(newAttack);
	    }
	    unit.attacks = newAttacks;
	}
    }
}

/**

@constructor
@param {module:unit~UnitData} unitData - object from the mongo store with unit data
@param {boolean} isCreation - is this constructor being called to create a new unit?
@param {boolean} isLevelUp - is this constructor being called to level-up a unit?
*/
function Unit(unitData, isCreation, isLevelUp) {
    if(unitData == null) { return unitData; }

    var proto = unitLib.protos[unitData.type];
    var unit = Object.create(proto);

    for(var prop in unitData) {
	unit[prop] = unitData[prop];
    }

    // if unit data has attacks, it only specifies how this unit's attacks differ from the prototype unit
    // so we use each the prototype's attacks as a prototype for each of this unit's attacks
    if(unitData.attacks) {
	var prototypedAttackList = [];
	for(var i=0; i<unit.attacks.length; ++i) {
	    var prototypedAttack = Object.create(proto.attacks[i]);
	    for(var ownAttackProp in unit.attacks[i]) {
		prototypedAttack[ownAttackProp] = unit.attacks[i][ownAttackProp];
	    }
	    prototypedAttackList.push(prototypedAttack);
	}
	unit.attacks = prototypedAttackList;
    }

    // if this is creation time, set random attributes
    if(isCreation) {
	unit.attributes = [];

	if(unit.fixedAttributes) {
	    unit.attributes = unit.attributes.concat(unit.fixedAttributes);
	}

	var attributePool = ["quick", "strong", "resilient", "intelligent"];
	if("attributePool" in unit) {
	    attributePool.push.apply(attributePool, unit.attributePool);
	}

	if(!("attributeCount" in unit)) {
	    var attributeCount = 2;
	} else {
	    var attributeCount = unit.attributeCount;
	}

	for(var i = 0; i < attributeCount && attributePool.length > 0; ++i) {
	    var randomAttribute = attributePool.splice(Math.floor(Math.random()*attributePool.length), 1)[0];
	    unit.attributes.push(randomAttribute);
	}

	for(var i = 0; i < unit.attributes.length; ++i) {
	    ((unitLib.abilityDict[unit.attributes[i]] || {}).onCreate || function(){})(unit);
	}

	// if this is creation time, set initial stats
	unit.xp = 0;
	unit.hp = unit.maxHp;
	unit.moveLeft = unit.move;
    }

    if(isLevelUp) {
	if(unit.fixedAttributes) {
	    // add any fixed attributes that unit doesn't already have
	    for(var i = 0; i < unit.fixedAttributes.length; ++i) {
		if(unit.attributes.indexOf(unit.fixedAttributes[i]) == -1) {
		    unit.attributes.push(unit.fixedAttributes[i]);
		}
	    }
	}

	// delete old properties that might be augmented by attributes
	// we will recompute them for the new unit type values
	delete unit.attacks;
	delete unit.move;
	delete unit.maxXp;
	delete unit.maxHp;

	unit.attributes = unit.attributes || [];

	// re-apply attributes for new level, new attacks
	for(var i = 0; i < unit.attributes.length; ++i) {
	    ((unitLib.abilityDict[unit.attributes[i]] || {}).onCreate || function(){})(unit);
	}

	// if this unit has AMLA'd, add 8 HP per bonus level
	if(unit.hasOwnProperty("level")) {
	    unit.maxHp += (unit.level - proto.level) * 8
	}

	// if we're leveling up, refill HP
	unit.hp = unit.maxHp;
    }

    // client-side image business
    if(unit.colorImgList) {
	unit.imgObj = unit.colorImgList[unit.team];
	unit.img = unit.imgObj.src;

	unit.shape = new createjs.Container();
	unit.shape.owner = unit;
	unit.bodyShape = new createjs.Bitmap(unit.imgObj);
	unit.shape.addChild(unit.bodyShape);

	// forward click to underlying space
	unit.shape.addEventListener("click", Space.passthroughFunc);
	unit.shape.addEventListener("rollover", Space.passthroughFunc);

	var teamColors = [0, "#F00", "#00F", "#F0F", "#444"];

	unit.minishape = new createjs.Shape();
	unit.minishape.graphics.beginFill(teamColors[unit.team]).drawRect(0, 0, minimap.spaceWidth, minimap.spaceHeight);
        
	unit.drawHpBar();
	unit.drawXpBar();
	unit.drawGem();
	unit.redrawConditions();

	if(unit.isCommander) { unit.drawCrown(); }
    }

    return unit;
}

unitLib.unitProto = {
    constructor: Unit,

    /**
       Reutrns a new, leveled-up unit

       @param {number} pathChoice - index of which AdvanceTo option is being used for this level up
       @param {boolean} preview - when true, this is not a real level-up; only a preview to see what the unit *would* look like

       @returns {Unit} new Unit with leveled-up information
     */
    levelUp: function(pathChoice, preview) {
	// only reduce XP if this a real level-up, not a level-up preview for a prompt
	if(!preview) {
	    this.xp = this.xp - this.maxXp;
	}

	var ownProps = this.getStorableObj();

        if(this.advancesTo) {
	    var newType = this.advancesTo[pathChoice];
	    ownProps.type = newType;
	} else {
	    // after maximum level advancement (AMLA)
	    ownProps.level = this.level + 1;
	}

	// console.log("level up", this, ownProps, newType);

	var newUnit = new Unit(ownProps, false, true);
	return newUnit;
    },

    /** Draw an HP bar for this unit */
    drawHpBar: function() {
	if(this.healthBar) { this.shape.removeChild(this.healthBar); }
	
	var hpRatio = this.hp / this.maxHp;
	var barColor = ["#D00", "#DD0"][Math.floor(hpRatio * 3)] || "#0D0";
	
	this.healthBar = new createjs.Shape();
	this.healthBar.graphics.beginFill(barColor).drawRect(54, 8.5 + 20 * (1 - hpRatio), 4, 20 * hpRatio);
	this.healthBar.graphics.beginFill("rgba(0,0,0,0)").beginStroke("#FFF").drawRect(53.5, 8.5, 4, 20);
	this.shape.addChild(this.healthBar);
    },

    /** Draw an XP bar for this unit */
    drawXpBar: function() {
	if(this.xpBar) { this.shape.removeChild(this.xpBar); }
	
	var xpRatio = this.xp / this.maxXp;
	var barColor = "#AAF"; //["#D00", "#DD0"][Math.floor(hpRatio * 3)] || "#0D0";
	
	this.xpBar = new createjs.Shape();
	this.xpBar.graphics.beginFill(barColor).drawRect(59, 8.5 + 20 * (1 - xpRatio), 4, 20 * xpRatio);
	this.xpBar.graphics.beginFill("rgba(0,0,0,0)").beginStroke("#FFF").drawRect(58.5, 8.5, 4, 20);
	this.shape.addChild(this.xpBar);
    },

    /** Draw a crown on this unit (should only be called on commanders) */
    drawCrown: function() {
	var crown = new createjs.Shape();
	crown.graphics.beginFill("gold").drawRect(10,9,12,3).drawRect(10,7,3,3).drawRect(15,7,3,3).drawRect(19,7,3,3);
	this.shape.addChild(crown);
    },

    /** Draw gem representing unit's current ability to move/attack */
    drawGem: function() {
	if(this.gem) { this.shape.removeChild(this.gem); }

	var availability = this.calculateAvailability();
	if(availability == -1) { return; }

	var color = ["red","yellow","#0D0"][availability];

	this.gem = new createjs.Shape();
	this.gem.graphics.beginStroke("black").beginFill(color).drawRect(10.5,15.5,5,10);
	this.shape.addChild(this.gem);
    },

    /**
       Return the alliance number of this unit's team
     */
    getAlliance: function(gameInfo) {
	return gameInfo.alliances[this.team];
    }, 

    /**
       Computer this unit's ability for gem rendering
     */
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
	// remove expired conditions
	var prop, conditionName;
	for(conditionName in update.conditionChanges) {
	    var change = update.conditionChanges[conditionName];
	    if(change === false) { this.removeCondition(conditionName); }
	    else {
		this.removeCondition(conditionName);
		this.addCondition(change);
	    }
	}
	delete update.conditionChanges;

	for(prop in update) {
	    this[prop] = update[prop];
	}

	var thisUnit = this;
	while(thisUnit.xp >= thisUnit.maxXp) {
	    if(!thisUnit.advancesTo || thisUnit.advancesTo.length < 2) {
		world.removeUnit(thisUnit);
		thisUnit = thisUnit.levelUp(0);
		world.addUnit(thisUnit, world.getSpaceByCoords(thisUnit));
	    } else {
		if(gameInfo.activeTeam == thisUnit.team) {
		    // show level-up prompt to active attacking player
		    if(gameInfo.player.team == gameInfo.activeTeam) {
			ui.showAdvancementPromptFor(thisUnit, function(choiceNum) {
			    socket.emit("levelup", { gameId: gameInfo.gameId, choiceNum: choiceNum });
			});
		    }
		    break;
		} else {
		    // defender with a branching level-up does not get to choose
		    world.removeUnit(thisUnit);
		    thisUnit = thisUnit.levelUp(0);
		    world.addUnit(thisUnit, world.getSpaceByCoords(thisUnit));
		}
	    }
	}

	ui.updateUnitSidebar();
	thisUnit.drawHpBar();
	thisUnit.drawXpBar();
	thisUnit.drawGem();
	thisUnit.redrawConditions();
	world.stage.update();
    },

    drawDamageNumber: function(value) {
	if(!value) { return; }
	this.damageNumber = new createjs.Text(Math.abs(value));
	this.shape.addChild(this.damageNumber);
	this.damageNumber.x = 30;
	this.damageNumber.y = -10;
	this.damageNumber.color = value>0?"#E00":"#0E0";
	this.damageNumber.font = "bold 12pt sans serif";
    },

    dismissDamageNumber: function() {
	if(this.damageNumber) {
	    this.shape.removeChild(this.damageNumber);
	    this.damageNumber = null;
	}
    },

    addCondition: function(c, isMulti) {
	if(!(this.conditions instanceof Array)) {
	    this.conditions = [];
	}
	if(isMulti || !this.hasCondition(c)) { this.conditions.push(c); }
	else {
	    var storedCondition = this.getCondition(c);
	    var conditionIndex = this.conditions.indeOf(storedCondition)
	    this.conditions.splice(conditionIndex, 1, storedCondition);
	}

	this.redrawConditions();
    },

    removeCondition: function(c) {
	c = this.getCondition(c);
	if(c === false) { return false; }
	var index = this.conditions.indexOf(c);
	this.conditions.splice(c, 1);
	if(this.conditions.length == 0) {
	    delete this.conditions;
	}
	this.redrawConditions();
	return true;
    },

    hasCondition: function(c) {
	return !!this.getCondition(c);
    },

    getCondition: function(c) {
	if(!this.conditions) { return false; }
	c = c.name || c;
	var index = this.conditions.map(function(c) { return c.name || c; }).indexOf(c);
	return this.conditions[index];
    },

    redrawConditions: function() {
	if(this.shape) {
	    var filters = [];
	    if(this.hasCondition("poisoned")) {
		filters.push(new createjs.ColorFilter(0.7,1,0.7,1, 0,100,0,0));
	    }
	    if(this.hasCondition("slowed")) {
		filters.push(new createjs.ColorFilter(0.7,0.7,0.9,1, 0,0,0,0));
	    }
	    this.bodyShape.filters = filters;
	    this.bodyShape.cache(0, 0, this.bodyShape.image.width, this.bodyShape.image.height);
	    world.stage.update();
	}	
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
    applyAttack: function(attack, attacker, timeOfDay, attackSpace, units, mapData) {
	if(!attack) { return attack; }

        units = units || Object.keys(world.units).map(function(k) { return world.units[k] });

	var result = {};
	for(var prop in attack) {
	    result[prop] = attack[prop];
	}
	result.damage = result.damage * (1 - this.resistances[result.damageType]);

	result.damage = result.damage * attacker.getDaytimeMultiplier(timeOfDay);

	// check for adjacent, higher-level, same-team leadership-units to boost attack
	var highestLeaderLevel = null;
	var coords = Terrain.getNeighborCoords(attackSpace).map(function(v) { return v.x+","+v.y });
	units.filter(function(u) {
	    if(u.attributes.indexOf("leadership")>=0 && u.team == attacker.team && u.level > attacker.level && coords.indexOf(u.x+","+u.y)>=0) {
		highestLeaderLevel = Math.max(highestLeaderLevel, u.level);
	    }
	});

	if(highestLeaderLevel != null) {
	    result.damage *= 1 + (highestLeaderLevel - attacker.level) * 0.25;
	}

	result.damage = Math.round(result.damage);

	return result;
    },

    getDaytimeMultiplier: function(timeOfDay) {
	if(this.alignment == "neutral") { return 1; }

	if(timeOfDay == "morning" || timeOfDay == "afternoon") {
	    return 1 + (this.alignment=="lawful"?1:-1) * 0.25;
	}

	if(timeOfDay == "first watch" || timeOfDay == "second watch") {
	    return 1 + (this.alignment=="chaotic"?1:-1) * 0.25;
	}

	return 1;
    },

    getCoverOnSpace: function(space) {
	var unit = this;
	return Math.max.apply(Math,
		      space.terrain.properties.map(function(i) {
			  if(!unit.terrain[i]) { return 0; }
			  return unit.terrain[i].cover;
		      })
	       );
    },

    getMoveCostForSpace: function(space) {
	var unit = this;
        var terrain = space.terrain || space;
	var costs = terrain.properties.map(function(i) {
	                if(!unit.terrain[i] || unit.terrain[i].move == -1) { return Infinity; }
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

	    if(prop == "attacks") {
		var proto = unitLib.protos[this.type];
		var storableAttacks = [];
		for(var j=0; j<this.attacks.length; ++j) {
		    var newAttack = {};
		    var oldAttack = this.attacks[j];
		    var protoAttack = proto.attacks[j];
		    for(var attackProp in oldAttack) {
			// populate newAttack with properties that differ from the prototype's attack
			if(oldAttack[attackProp] != protoAttack[attackProp]) {
			    newAttack[attackProp] = oldAttack[attackProp];
			}
		    }
		    storableAttacks[j] = newAttack;
		}
		storableObj["attacks"] = storableAttacks;
	    } else {
		storableObj[prop] = this[prop];
	    }
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

    var Terrain = require("./terrain.js").Terrain
} else {
    window.unitLib = unitLib;
    window.Unit = Unit;
}
