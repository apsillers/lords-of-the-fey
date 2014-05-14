// offender attacks defender with the attack of the given index
// returns an array of objects representing swings
// [ {
//     "offense": Boolean, (is swing by initiator)
//     "event": "hit"/"miss",
//     "damage": Number,
//     "kill": Boolean
//   }, ...]
function executeAttack(offender, attackIndex, defender, units, mapData) {
    var battleRecord = [];
    var swingResult;
    var defenseIndex;

    var offense = offender.attacks[attackIndex];
    offense = defender.applyAttack(offense);

    var defenseChoice = defender.selectDefense(offender, offense);
    var defense = defender.applyAttack(defenseChoice.defense);
    var defenseIndex = defenseChoice.defenseIndex;

    var defenderCover = defender.getCoverOnSpace(mapData[defender.x+","+defender.y]);
    var offenderCover = offender.getCoverOnSpace(mapData[offender.x+","+offender.y]);
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
	}
    }
    awardXp(offender, defender);
    awardXp(defender, offender);

    return { record: battleRecord, offender: {x: offender.x, y: offender.y}, defender: {x: defender.x, y: defender.y}, offenseIndex: attackIndex, defenseIndex: defenseIndex, xp: {offense: offender.xp, defense: defender.xp } };
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