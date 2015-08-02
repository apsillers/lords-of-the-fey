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

/** @module executeAttack */

/**
   Represents a single swing of an attack
   @typedef {Object} SwingResult 
   @prop {boolean} offense - is swing by initiator?
   @prop {string} event - "hit" or "miss"
   @prop {number} damage - damage inflicted by this swing
   @prop {boolean} kill - did this swing kill the hitee?
*/

/**
 Offender attacks defender with the attack of the given index

 @param {Unit} offender - unit initiating attack
 @param {boolean} attackIndex - index of attack used by offensive unit

 @returns {SwingResult[]} an array of objects representing swings from this combat, in order
*/
module.exports = function executeAttack(offender, attackIndex, attackSpace, defender, units, mapData, game) {
    var battleRecord = [];
    var swingResult;
    var defenseIndex;

    var defenderCover = defender.getCoverOnSpace(mapData[defender.x+","+defender.y]);
    var offenderCover = offender.getCoverOnSpace(mapData[offender.x+","+offender.y]);

    var offense = offender.attacks[attackIndex];
    offense = defender.applyAttack(offense, offender, game.timeOfDay, attackSpace, units, mapData);

    var defenseChoice = defender.selectDefense(offender, offense, game.timeOfDay, offenderCover, defenderCover);
    var defense = offender.applyAttack(defenseChoice.defense, defender, game.timeOfDay, defender, units, mapData);
    var defenseIndex = defenseChoice.defenseIndex;

    if(defense) {
	var defenseFirst = ((defense.properties||[]).indexOf("firststrike") != -1) > ((offense.properties||[]).indexOf("firststrike") != -1);
    } else {
	var defenseFirst = false;
    }

    for(var round = 0; round < offense.number || (defense && round < defense.number); round++) {
	if(defenseFirst) {
	    if(defense && round < defense.number) {
		swingResult = attackSwing(false, defense, defender, offender, offenderCover, units);
		battleRecord.push(swingResult);
	    	if(swingResult.kill) { break; }
	    }
	}

	if(round < offense.number) {
	    swingResult = attackSwing(true, offense, offender, defender, defenderCover, units);
	    battleRecord.push(swingResult);
	    if(swingResult.kill) { break; }
	}

	if(!defenseFirst) {
	    if(defense && round < defense.number) {
		swingResult = attackSwing(false, defense, defender, offender, offenderCover, units);
		battleRecord.push(swingResult);
	    	if(swingResult.kill) { break; }
	    }
	}
    }

    function awardXp(thisUnit, enemy, isOffender) {
	if(thisUnit.hp > 0) {
	    if(enemy.hp > 0) {
		thisUnit.xp += enemy.level || 1;
	    } else {
		thisUnit.xp += (enemy.level * 8) || 4;
	    }

	    var xpBeforeLevel = thisUnit.xp;
	    var owner = game.players.filter(function(p) { return p.team == thisUnit.team; })[0];

	    var originalUnit = thisUnit;
	    while(thisUnit.xp >= thisUnit.maxXp) {
		var oldXp = thisUnit.xp;

		thisUnit = require("./levelUp").getLevelUp(thisUnit, owner, isOffender);

		// if the XP is above leveling threshold but did not decrease, we hit a branching prompt
		if(oldXp == thisUnit.xp) { break; }
	    }

	    // we must apply the new leveled-up properties to the original Unit object passed into the function
	    require("./levelUp").applyNewProperties(originalUnit, thisUnit);

	    return xpBeforeLevel;
	}
	return thisUnit.xp;
    }
    var offenseXp = awardXp(offender, defender, true);
    var defenseXp = awardXp(defender, offender, false);

    return { record: battleRecord, offender: {x: offender.x, y: offender.y}, defender: {x: defender.x, y: defender.y}, offenseIndex: attackIndex, defenseIndex: defenseIndex, xp: {offense: offenseXp, defense: defenseXp } };
}

// perform one swing of an attack, by the hitter, on the hittee
// return a swing record object
function attackSwing(isOffense, attack, hitter, hittee, hitteeCover, units) {
    var swingRecord;

    if(attack.properties) {
	if(attack.properties.indexOf("magical") != -1) {
	    hitteeCover =  0.3;
	}
	if(isOffense && attack.properties.indexOf("marksman") != -1) {
	    hitteeCover =  Math.min(hitteeCover, 0.4);
	}
    }

    if(Math.random() > hitteeCover) {
	hittee.hp -= attack.damage;
	swingRecord = { event: "hit", offense: isOffense, damage: attack.damage };
	
	if(hittee.hp <= 0) {
	    swingRecord.kill = true;
	}

	if(attack.properties) {
	    if(attack.properties.indexOf("poison") != -1 && !hittee.hasCondition("poisoned")) {
		hittee.addCondition("poisoned");
		swingRecord.poisoned = true;
	    }
	    if(attack.properties.indexOf("slows") != -1 && !hittee.hasCondition("slowed")) {
		hittee.addCondition({ name: "slowed", countdown: 2 });
		swingRecord.slowed = { name: "slowed", countdown: 2 };
	    }
	}
    } else {
	swingRecord = { event: "miss", offense: isOffense };
    }

    return swingRecord;
}

