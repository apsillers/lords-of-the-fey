var ui = {
    moveHappening: false,
    hasTurn: true,

    debugTeamToggle: true,

    pathSource: null,
    pathTarget: null,
    pathShape: null,
    path: null,
    hoverSpace: null,
    hoverUnit: null,

    onSpaceHover: function(e) {
	var space = e.target.owner;
	ui.hoverSpace = space;
    
	if(ui.pathSource && space != ui.pathTarget) {
            ui.pathTarget = space;
	
            ui.path = aStar(world, world.getUnitAt(ui.pathSource), ui.pathSource, ui.pathTarget, ui.path);
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
	ui.updateUnitSidebar();
    },

    updateUnitSidebar: function() {
	var hoveringUnit = world.getUnitAt(this.hoverSpace);
	if(hoveringUnit) {
	    ui.hoverUnit = hoveringUnit;
	}

	if(ui.hoverUnit) {
            $("#right_data_image").attr("src", ui.hoverUnit.img);
            $("#right_data_hp").text(ui.hoverUnit.hp + "/" + ui.hoverUnit.maxHp);
            $("#right_data_xp").text(ui.hoverUnit.xp + "/" + ui.hoverUnit.maxXp);
            $("#right_data_name").text(ui.hoverUnit.name);

	    $("#right_data_attacks").html("");
	    for(var i=0; i<ui.hoverUnit.attacks.length; ++i) {
		var attackNameElm = $("<div style='font-weight: bold;''>");
		var attackTypeElm = $("<div>");
		var attack = ui.hoverUnit.attacks[i];
		attackNameElm.text(attack.name + " " + attack.damage + "-" + attack.number);
		attackTypeElm.text(attack.type);
		$("#right_data_attacks").append(attackNameElm);
		$("#right_data_attacks").append(attackTypeElm);
	    }


	    
	    if(ui.hoverUnit.hp <= 0) {
		ui.clearUnitSidebar();
	    }
	}
    },

    clearUnitSidebar: function() {
        $("#right_data_image").attr("src", "");
        $("#right_data_hp").html(" ");
        $("#right_data_xp").html(" ");
        $("#right_data_name").html(" ");

	delete ui.hoverUnit;
    },

    onSpaceClick: function(e) {
	var space = e.target.owner;
	
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
		    ui.showAttackPrompt(unit, destUnit, function(attackSlot) {
			if(attackSlot == -1) { return; }
			world.moveUnit(unit, ui.path, attackSlot);
		    });
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
		world.positionUnit(unit, currSpace);
		if(moveData.combat) { ui.animateAttack(moveData); }
                else {
		    ui.clearPath();
		    ui.moveHappening = false;
		}
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

	    var attackStep = function(entry, i, retreat) {
		return function() {
		    var actor = entry.offense ? offender : defender;
		    var hittee = entry.offense ? defender : offender;

		    actor.shape.x += (retreat ? 1 : -1) * (entry.offense ? 1 : -1) * dX;
		    actor.shape.y += (retreat ? 1 : -1) * (entry.offense ? 1 : -1) * dY;

		    if(entry.damage) {			
			hittee.hp -= entry.damage;
			ui.updateUnitSidebar();
			unitLib.drawHpBar(hittee);
		    }

		    if(entry.kill) {
			world.removeUnit(hittee);
		    }
		    
		    if(i == record.length - 1 && retreat) {
			ui.clearPath();
			ui.moveHappening = false;
		    }

		    world.stage.update();
		}
	    };

	    setTimeout(attackStep(entry, i, false), i*1000);
	    setTimeout(attackStep({ offense: entry.offense }, i, true), i*1000+500);
	}
    },

    clearPath: function() {
	this.path = null;
	this.pathShape = null;
	this.pathTarget = null;
	this.pathSource = null;
    },

    showAttackPrompt: function(attacker, defender, resolutionCallback) {
        setTimeout(function() { resolutionCallback(0); }, 4);
    }
}
