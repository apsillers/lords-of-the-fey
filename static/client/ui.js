var ui = {
    moveHappening: false,
    hasTurn: true,

    debugTeamToggle: true,

    pathSource: null,
    pathTarget: null,
    pathShape: null,
    path: null,
    hoverSpace: null,

    onSpaceHover: function(e) {
	var space = e.target.owner;
	ui.hoverSpace = space;
    
	if(ui.pathSource && space != ui.pathTarget) {
            ui.pathTarget = space;
	
            ui.path = aStar(world, world.getUnitAt(ui.pathSource), ui.pathSource, ui.pathTarget);
            world.stage.removeChild(ui.pathShape);
            
            ui.pathShape = new createjs.Container();
            for(var i=0;i<ui.path.length;++i){
		var s = ui.path[i].space;
		var pip = new createjs.Container();
		pip.x = s.shape.x + 17;
		pip.y = s.shape.y + 16;
		var bar = new createjs.Shape();
		bar.graphics.beginFill("rgba(128,128,200,0.7)").drawRect(0, 0, 38, 38);
		bar.regX = 0;
		bar.regY = 0;
		pip.addChild(bar);
                
		ui.pathShape.addChild(pip);
            }
            world.stage.addChild(ui.pathShape);
            world.stage.update();
	}

	// show a unit's stats in the right side area
	ui.updateUnitDisplay();
    },

    updateUnitDisplay: function() {
	var hoveringUnit = world.getUnitAt(this.hoverSpace);
	if(hoveringUnit) {
            $("#right_data_image").attr("src", hoveringUnit.img);
            $("#right_data_hp").html(hoveringUnit.hp + "/" + hoveringUnit.maxHp);
            $("#right_data_xp").html(hoveringUnit.xp + "/" + hoveringUnit.maxXp);
            $("#right_data_name").html(hoveringUnit.name);
	}
    },

    onSpaceClick: function(e) {
	var space = e.target.owner;
	console.log(e.target, space);
	
	if(ui.moveHappening) { return; }

	if(e.nativeEvent.button == 2) {
	    if(ui.debugTeamToggle) {
		socket.emit("create", { gameId: 1, team: 1, type: "scout", x: space.x, y: space.y });
	    } else {
		socket.emit("create", { gameId: 1, team: 2, type: "grunt", x: space.x, y: space.y });
	    }
	    ui.debugTeamToggle = !ui.debugTeamToggle;
	    return;
	}

	if(!ui.pathSource) {
            if(world.getUnitAt(space)) {
		ui.pathSource = space;
            }
	} else {
            world.stage.removeChild(ui.pathShape);
            
            if(space != ui.pathSource) {
		var unit = world.getUnitAt(ui.pathSource);
		var destUnit = world.getUnitAt(space);
		
		if(!destUnit) {
		    world.moveUnit(unit, ui.path);
		} else {
		    // show attack prompt
		    world.moveUnit(unit, ui.path, 0);
		}
            }
	    
            ui.pathSource = null;
            world.stage.update();
	}
    },

    animateUnitMove: function(moveData) {
        var path = moveData.path;
        var currSpace = world.getSpaceByCoords(path[0]),
            nextSpace = world.getSpaceByCoords(path[1]),
            unit = world.units[currSpace.x+","+currSpace.y]
            start = null, stepProgress = 0, prevX = unit.shape.x, prevY = unit.shape.y, pathPos = 1;

	// TODO: reveal response.revealedUnits

        if(path.length < 2) {
	    if(moveData.combat) { ui.animateAttack(moveData); }
            else { ui.moveHappening = false; }
	    return;
	}

	delete world.units[unit.x+","+unit.y];

	unit.x = path[path.length-1].x;
	unit.y = path[path.length-1].y;

	world.units[unit.x+","+unit.y] = unit;

        window.requestAnimationFrame(function step(timestamp) {
            if (start == null) { start = timestamp; }
            
            var diffX = nextSpace.shape.x - currSpace.shape.x,
                diffY = nextSpace.shape.y - currSpace.shape.y;
            var fraction = (timestamp - start) / 600;
            stepProgress += fraction;
            stepProgress = Math.min(1, stepProgress);
            
            unit.shape.x = prevX + stepProgress * diffX;
            unit.shape.y = prevY + stepProgress * diffY;
            world.stage.update();
            
            if(stepProgress == 1) {
                currSpace = world.getSpaceByCoords(path[pathPos]);
                nextSpace = world.getSpaceByCoords(path[pathPos + 1]);
                
                prevX = unit.shape.x;
                prevY = unit.shape.y;
                
                pathPos += 1;
                stepProgress = 0;
            }
            
            if(!nextSpace) {
                world.units[currSpace.x+","+currSpace.y] = unit;
		if(moveData.combat) { ui.animateAttack(moveData); }
                else { ui.moveHappening = false; }
            } else {
                start = timestamp;
                window.requestAnimationFrame(step);
            }
        });
    },

    animateAttack: function(moveData) {
	var offender = world.getUnitAt(moveData.combat.offender);
	var defender = world.getUnitAt(moveData.combat.defender);
	var record = moveData.combat.record;

	var dX = (offender.shape.x - defender.shape.x) / 15;
	var dY = (offender.shape.y - defender.shape.y) / 15;

	for(var i = 0; i < record.length; ++i) {
	    var entry = record[i];

	    var attackStep = function(entry, i) {
		return function() {
		    var actor = entry.offense ? offender : defender;
		    var oldActor = entry.offense ? defender : offender;
		    
		    if(i != 0) {
			oldActor.shape.x += (entry.offense ? -1 : 1) * dX;
			oldActor.shape.y += (entry.offense ? -1 : 1) * dY;
		    }
		    
		    actor.shape.x += (entry.offense ? -1 : 1) * dX;
		    actor.shape.y += (entry.offense ? -1 : 1) * dY;
		    
		    world.stage.update();

		    if(entry.damage) {
			oldActor.hp -= entry.damage;
		    }

		    if(entry.kill) {
			world.removeUnit(oldActor);
		    }
		    
		    if(i == record.length - 1) {
			// TODO: reset positions
			ui.moveHappening = false;
		    }
		}
	    };

	    setTimeout(attackStep(entry, i), i*1000);
	    
	}

	console.log(offender, defender, moveData.combat.record);
    }
}
