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

/*

A* implementation with built-in move rules (e.g.Only finds paths whose cost is less than the `moveLeft` property of the unit.

*/

function aStar(world, unit, start, goal, prevPath, game) {
    var attackTarget = world.getUnitAt(goal);

    // if the unit has already attacked, another unit cannot be a valid destination
    if(attackTarget && unit.hasAttacked) {
	return false;
    }

    if(prevPath) {
	var prevDest = prevPath[prevPath.length-1].space;

	// if the previous path was a move adjacent to an enemy, and now the path is *on* that abjecent enemy, do not recompute the path
	// this allows the player to pcik the offense location, instead of relying on the normal A* path to the enemy
	if(!world.getUnitAt(prevDest) && // if the previous path did not end on an occupied space (i.e., was not an attack)
	   attackTarget &&                   // if the goal space is occupied...
	   attackTarget.getAlliance(game) != unit.getAlliance(game) && // ...by an opponent
	   world.getNeighbors(goal).indexOf(prevDest) != -1 // and the occupied goal space is adjacent to the end of the previous path
	  ) {
	    var newPath = prevPath.slice();
	    newPath.push({ space: goal, g_score:prevDest.g_score }); // return the previous path with the enemy target appended
	    return newPath;
	}
    }

    var g_score = {}, f_score = {};
    var current;
    var closedset = {};    // The set of nodes already evaluated.
    var openset = {}; openset[start] = start;    // The set of tentative nodes to be evaluated, initially containing the start node
    var came_from = {};    // The map of navigated nodes.
 
    g_score[start] = 0;    // Cost from start along best known path.
    // Estimated total cost from start to goal through y.
    f_score[start] = g_score[start] + heuristic_cost_estimate(start, goal);
 
    while(Object.keys(openset).length) {
        current = null;
        for(var k in openset) {
            if(!current || f_score[k] < f_score[current]) {
                var current = k;
            }
        }
        current = world.getSpaceByCoords(current);
        
        if(current == goal) {
            return reconstruct_path(came_from, goal);
        }
        
        delete openset[current];
        closedset[current] = current;
        
        var neighbors = world.getNeighbors(current);
        neighbors = neighbors.filter(not_blocked_by_enemy).filter(not_blocked_by_friend).filter(function(n) {
	    var currentOccupant = world.getUnitAt(current);
	    var neighborOccupant = world.getUnitAt(n);
	    // if this prospective neighbor is the goal and it occupied (i.e. this is an attack)
	    // AND the *current* space is occupied, you may not complete an attack path to the goal from this current space
	    // because the attacker would not have an empty final space to attack from
	    if(n == goal && neighborOccupant && currentOccupant && currentOccupant != unit) return false;
	    return true;
	});
        for(var i=0; i < neighbors.length; ++i) {
            var neighbor = neighbors[i];

            if(neighbor in closedset) { continue; }
            var tentative_g_score = g_score[current] + cost_to_move_here(neighbor);

            if(tentative_g_score > unit.moveLeft) { continue; }
            //console.log(tentative_g_score, unit.moveLeft)

            if(!(neighbor in openset) || tentative_g_score < g_score[neighbor]) {
                came_from[neighbor] = current;
                g_score[neighbor] = tentative_g_score;
                f_score[neighbor] = g_score[neighbor] + heuristic_cost_estimate(neighbor, goal);
                if(!(neighbor in openset)) {
                    openset[neighbor] = neighbor;
                }
            }
        }
    }
    
    return false;
    
    function reconstruct_path(came_from, current_node) {
        if(current_node in came_from) {
            p = reconstruct_path(came_from, came_from[current_node]);
            p.push({ space: current_node, g_score: g_score[current_node] });
            return p;
        } else {
            return [{ space: current_node, g_score: g_score[current_node] }];
        }
    }

    // TODO: some kind of A* estimate
    function heuristic_cost_estimate(start, goal) {
        //return Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y);
        return 0;
    }

    function cost_to_move_here(space) {
	var occupant = world.getUnitAt(space);
        var is_enemy_present = occupant && occupant.getAlliance(game) != unit.getAlliance(game);
	var normal_move_cost = unit.getMoveCostForSpace(space);
	if(space == goal && is_enemy_present) { return 0; }

        // test if this pace has an enemy adjacent
        var is_enemy_adjacent = world.getNeighbors(space).some(function(n) {
            var n_occupant = world.getUnitAt(n);
            if(n_occupant && n_occupant.getAlliance(game) != unit.getAlliance(game)) {
                return true;
            }
        });

        // if so, moving here either costs all our remaining move
        // OR the normal cost for this terrain (in case that's MORE than all our remaining move)
        // so you can move adjacent to an enemy only if you could move there normally
	if(is_enemy_adjacent) {
            var all_remaining_move = unit.moveLeft - g_score[current];
            return Math.max(all_remaining_move, normal_move_cost);
        } else {
            // just normal move cost
            return normal_move_cost;
        }
    }

    // is this space free of enemies?
    function not_blocked_by_enemy(space) {
        var occupant = world.getUnitAt(space);
        if(occupant && occupant.getAlliance(game) != unit.getAlliance(game) && space != goal) { return false; }
        return true;
    }

    // is this space non-final or free of friendly units?
    function not_blocked_by_friend(space) {
        var occupant = world.getUnitAt(space);
        if(occupant && occupant.getAlliance(game) == unit.getAlliance(game) && space == goal) { return false; }
        return true;
    }
}
