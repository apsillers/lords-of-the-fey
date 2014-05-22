// offender attacks defender with the attack of the given index
// returns an array of objects representing swings
// [ {
//     "offense": Boolean, (is swing by initiator)
//     "event": "hit"/"miss",
//     "damage": Number,
//     "kill": Boolean
//   }, ...]
function executeAttack(offender, attackIndex, defender, units, mapData, game) {
    var battleRecord = [];
    var swingResult;
    var defenseIndex;

    var defenderCover = defender.getCoverOnSpace(mapData[defender.x+","+defender.y]);
    var offenderCover = offender.getCoverOnSpace(mapData[offender.x+","+offender.y]);

    var offense = offender.attacks[attackIndex];
    offense = defender.applyAttack(offense, offender, game.timeOfDay);

    var defenseChoice = defender.selectDefense(offender, offense, game.timeOfDay, offenderCover, defenderCover);
    var defense = defender.applyAttack(defenseChoice.defense, defender, game.timeOfDay);
    var defenseIndex = defenseChoice.defenseIndex;

    console.log(offender.name, offense);
    console.log(defender.name, defense);

    for(var round = 0; round < offense.number || (defense && round < defense.number); round++) {
	if(round < offense.number) {
	    swingResult = attackSwing(true, offense, offender, defender, defenderCover, units);
	    battleRecord.push(swingResult);
	    if(swingResult.kill) { break; }
	}

	if(defense && round < defense.number) {
	    swingResult = attackSwing(false, defense, defender, offender, offenderCover, units);
	    battleRecord.push(swingResult);
	    if(swingResult.kill) { break; }
	}
    }

    function awardXp(thisUnit, enemy) {
	if(thisUnit.hp > 0) {
	    if(enemy.hp > 0) {
		thisUnit.xp += enemy.level || 1;
	    } else {
		thisUnit.xp += (enemy.level * 8) || 4;
	    }

	    var xpBeforeLevel = thisUnit.xp;

	    if(thisUnit.xp >= thisUnit.maxXp) {
		if(!thisUnit.advancesTo || thisUnit.advancesTo.length < 2) {
		    var leveledUnit = thisUnit.levelUp(0);
		} else if(thisUnit.advancesTo && thisUnit.advancesTo,length > 1) {
		    // user must choose advancement path
		}

		// modify unit with new properties after level-up
		var leveledOwnProps = leveledUnit.getStorableObj();
		console.log(leveledOwnProps);
	        for(var prop in leveledOwnProps) {
		    thisUnit[prop] = leveledOwnProps[prop]; 
		} 
	    }

	    return xpBeforeLevel;
	}
	return thisUnit.xp;
    }
    var offenseXp = awardXp(offender, defender);
    var defenseXp = awardXp(defender, offender);

    return { record: battleRecord, offender: {x: offender.x, y: offender.y}, defender: {x: defender.x, y: defender.y}, offenseIndex: attackIndex, defenseIndex: defenseIndex, xp: {offense: offenseXp, defense: defenseXp } };
}

// perform one swing of an attack, by the hitter, on the hittee
// return a swing record object
function attackSwing(isOffense, attack, hitter, hittee, hitteeCover, units) {
    var swingRecord;

    hitteeCover = attack.magic ? Math.min(hitteeCover, .3) : hitteeCover;

    if(Math.random() > hitteeCover) {
	hittee.hp -= attack.damage;
	swingRecord = { event: "hit", offense: isOffense, damage: attack.damage };
	
	if(hittee.hp < 0) {
	    swingRecord.kill = true;
	}
    } else {
	swingRecord = { event: "miss", offense: isOffense };
    }

    return swingRecord;
}

module.exports = executeAttack;
