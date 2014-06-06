exports.getLevelUp = function(thisUnit, owner, isOffender) {
    var leveledUnit;

    if(!thisUnit.advancesTo || thisUnit.advancesTo.length < 2) {
	leveledUnit = thisUnit.levelUp(0);
    } else if(thisUnit.advancesTo && thisUnit.advancesTo.length > 1) {
	if(isOffender) {
	    // if offender, user must choose advancement path
	    // so mark this player as requiring a choice; client should show prompt
	    owner.advancingUnit = thisUnit.x + "," + thisUnit.y;
	    console.log("expecting choice");
	    leveledUnit = thisUnit;
	} else {
	    // defending unit level-up does not offer a choice to player
	    leveledUnit = thisUnit.levelUp(0);
	};
    }
    
    return leveledUnit;
};

exports.applyNewProperties = function(thisUnit, leveledUnit) {
    // modify unit with new properties after level-up
    var leveledOwnProps = leveledUnit.getStorableObj();
    for(var prop in leveledOwnProps) {
	thisUnit[prop] = leveledOwnProps[prop]; 
    }     
};