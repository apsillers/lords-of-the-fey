/*

Absolute rubbish implementation of A*

Only finds paths whose cost is less than the `movesLeft` property of the unit.

*/

function aStar(world, unit, start, goal) {
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
        neighbors = neighbors.filter(not_blocked_by_enemy);
        for(var i=0; i < neighbors.length; ++i) {
            var neighbor = neighbors[i];

            if(neighbor in closedset) { continue; }
            var tentative_g_score = g_score[current] + cost_to_move_here(neighbor);

            if(tentative_g_score > unit.movesLeft) { continue; }
            //console.log(tentative_g_score, unit.movesLeft)

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
        var is_enemy_present = occupant && occupant.team != unit.team;

	if(space == goal && is_enemy_present) { return 0; }

        // test if this pace has an enemy adjacent
        var is_enemy_adjacent = world.getNeighbors(space).some(function(n) {
            var n_occupant = world.getUnitAt(n);
            if(n_occupant && n_occupant.team != unit.team) {
                return true;
            }
        });

        // if so, moving heere either costs all our remaining move
        // OR the normal cost for this terrain (in case that's MORE than all our remaining move)
        if(is_enemy_adjacent) {
            var all_remaining_move = unit.movesLeft - g_score[current];
            return Math.max(all_remaining_move, unit.moveCost[space.terrain]);
        } else {
            // just normal move cost
            return unit.moveCost[space.terrain];
        }
    }

    // is this space free of enemies?
    function not_blocked_by_enemy(space) {
        var occupant = world.getUnitAt(space);
        if(occupant && occupant.team != unit.team && space != goal) { return false; }
        return true;
    }
}
