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