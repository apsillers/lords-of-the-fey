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
var ui = {
    moveHappening: false,
    moveAnimating: false,
    hasTurn: false,
    showingMenu: false,

    pathSource: null,
    pathTarget: null,
    pathShape: null,
    path: null,
    hoverSpace: null,
    hoverUnit: null,

    animationFactor: 1,

    onSpaceHover: function(e) {
	
	if(ui.showingMenu && ui.modal) { return; }

	var space = e.target.owner;
	ui.hoverSpace = space;

	if(ui.pathSource && space != ui.pathTarget) {
            ui.pathTarget = space;

            ui.path = aStar(world, world.getUnitAt(ui.pathSource), ui.pathSource, ui.pathTarget, ui.path, gameInfo);
	    world.mapContainer.removeChild(ui.pathShape);

	    if(ui.path) {
		var attackTarget = world.getUnitAt(ui.path[ui.path.length-1].space);
	    }

            ui.pathShape = new createjs.Container();
            for(var i=0;i<ui.path.length;++i){
		var s = ui.path[i].space;
		var pip = new createjs.Container();
		pip.x = s.shape.x;
		pip.y = s.shape.y;
		pip.owner = s;
		pip.addEventListener("click", Space.passthroughFunc);
		pip.addEventListener("rollover", Space.passthroughFunc);
		var bar = new createjs.Shape();
		ui.drawHexWithGraphic(bar.graphics.beginFill("rgba(128,128,200,0.7)"));
		bar.regX = 0;
		bar.regY = 0;
		pip.addChild(bar);

		// draw the cover for the final space: the real final space if not an attack, otherwise the second-to-last
		if(i == ui.path.length-(attackTarget?2:1)) {
		    var unit = world.getUnitAt(ui.pathSource);
		    var coverValue = unit.getCoverOnSpace(s);
		    var coverText = 100 * coverValue + "%";
		    var textShape = new createjs.Text(coverText);
		    textShape.font = "14pt sans serif";
		    textShape.x = 17;
		    textShape.y = 24;
		    pip.addChild(textShape);
		}

		// draw cover for attack target
		if(i == ui.path.length-1 && attackTarget) {
		    var unit = attackTarget;
		    var coverValue = unit.getCoverOnSpace(s);
		    var coverText = 100 * coverValue + "%";
		    var textShape = new createjs.Text(coverText);
		    textShape.font = "14pt sans serif";
		    textShape.x = 17;
		    textShape.y = 24;
		    textShape.color = "#F00";
		    pip.addChild(textShape);
		}

		ui.pathShape.addChild(pip);
            }
            world.mapContainer.addChild(ui.pathShape);
            world.stage.update();
	}

	if(!ui.pathSource) {
	    var unit = world.getUnitAt(space);
	    if(unit) {
		if(unit != ui.inspectedUnit) {
		    ui.hideMoveRange();
		    ui.showMoveRange(space, unit);
		}
	    } else {
		ui.hideMoveRange();
	    }
	}

	// show a unit's stats in the right side area
	ui.updateUnitSidebar();
    },

    updateUnitSidebar: function() {
	if(ui.hoverSpace) {
	    var hoveringUnit = world.getUnitAt(ui.hoverSpace);
	    if(hoveringUnit) {
		ui.hoverUnit = hoveringUnit;
	    }
	}

	if(ui.hoverUnit) {
            $("#right_data_image").attr("src", ui.hoverUnit.img);

            $("#right_data_hp").text(ui.hoverUnit.hp + "/" + ui.hoverUnit.maxHp);
	    var hpRatio = ui.hoverUnit.hp / ui.hoverUnit.maxHp;
	    var hpColor = ["#A00", "#f0ed00"][Math.floor(hpRatio * 3)] || "green";
	    $("#right_data_hp").css("color", hpColor);

            $("#right_data_xp").text(ui.hoverUnit.xp + "/" + ui.hoverUnit.maxXp);
            $("#right_data_move").text(ui.hoverUnit.moveLeft + "/" + ui.hoverUnit.move);
            $("#right_data_name").text(ui.hoverUnit.name);

            $("#right_data_attributes").text((ui.hoverUnit.attributes||[]).join(", "));

	    $("#right_data_attacks").html("");
	    for(var i=0; i<ui.hoverUnit.attacks.length; ++i) {
		var attackNameElm = $("<div style='font-weight: bold;'>");
		var attackTypeElm = $("<div>");
		var attackPropsElm = $("<div>");
		var attack = ui.hoverUnit.attacks[i];
		attackNameElm.text(attack.name + " " + attack.damage + "-" + attack.number);
		attackTypeElm.text(attack.type);
		attackPropsElm.text((attack.properties||[]).join(", "));
		$("#right_data_attacks").append(attackNameElm);
		$("#right_data_attacks").append(attackTypeElm);
		$("#right_data_attacks").append(attackPropsElm);
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
	if(ui.modal) { return; }

	if(ui.showingMenu) {
	    ui.hideMenus();
	    return;
	}

	var space = e.target.owner;
	
	if(ui.moveHappening || !ui.hasTurn) { return; }

	if(e.nativeEvent.button == 2) {
	    ui.onContextMenu(space, { x: e.stageX, y: e.stageY });
	    return;
	}

	if(!ui.pathSource) {
            var unitToMove = world.getUnitAt(space);
            if(unitToMove && unitToMove.team == gameInfo.player.team) {
		ui.pathSource = space;
		ui.hideMoveRange();
		ui.showMoveRange(space, unitToMove);
            }
	} else {
            world.mapContainer.removeChild(ui.pathShape);
            ui.hideMoveRange();
            
            if(ui.path && space != ui.pathSource) {
		var unit = world.getUnitAt(ui.pathSource);
		var destUnit = world.getUnitAt(space);
		
		if(!destUnit) {
		    world.moveUnit(unit, ui.path);
		} else {
		    if(!unit.hasAttacked) {
			// show attack prompt
			ui.showAttackPrompt(unit, destUnit, function(attackSlot) {
			    if(attackSlot == -1) { return; }
			    world.moveUnit(unit, ui.path, attackSlot);
			});
		    }
		}
            }
	    
            ui.pathSource = null;
            world.stage.update();
	}
    },

    drawHexWithGraphic: function(gfx) {
        gfx.moveTo(18, 0).lineTo(53, 0).lineTo(72, 36).lineTo(53, 72).lineTo(18,72).lineTo(0, 36).lineTo(18,0);
    },

    showMoveRange: function(space, unitToMove) {
	ui.inspectedUnit = unitToMove;
	var accessibleSpaces = allAccessibleSpaces(world, space, unitToMove, gameInfo);
	ui.rangeShape = new createjs.Container();
        for(var i=0;i<=world.maxX;++i){
	    for(var j=0;j<=world.maxY;++j) {
		if(i+","+j in accessibleSpaces) { continue; }
 		var s = world.getSpaceByCoords(i,j);
		var pip = new createjs.Container();
		pip.x = s.shape.x;
		pip.y = s.shape.y;
		pip.owner = s;
		pip.addEventListener("click", Space.passthroughFunc);
		pip.addEventListener("rollover", Space.passthroughFunc);
		var bar = new createjs.Shape();
		ui.drawHexWithGraphic(bar.graphics.beginFill("rgba(160,160,160,0.6)"));
		bar.cache(0,0,72,72);
		pip.addChild(bar);
		ui.rangeShape.addChild(pip);
	    }
	}
	world.mapContainer.addChild(ui.rangeShape);
	world.stage.update();
    },

    hideMoveRange: function() {
	ui.inspectedUnit = null;
        world.mapContainer.removeChild(ui.rangeShape);
	world.stage.update();
    },

    onContextMenu: function(space, coords) {
	var cm = ui.contextMenu = new createjs.Container();
	cm.x = coords.x;
	cm.y = coords.y;

	var cmBacking = new createjs.Shape();
	cmBacking.graphics.beginFill("rgb(0,0,170)").drawRect(0, 0, 100, 205);
	cm.addChild(cmBacking);

	for(pos in world.units) {
	    var unit = world.units[pos];
	    var isKeep = world.getSpaceByCoords(pos).terrain.properties.indexOf("keep") != -1;
	    if(isKeep && unit.isCommander && unit.team == gameInfo.player.team) {
		var foundPath = utils.castlePathExists(unit, space, world.grid);
		if(foundPath) { break; }
	    }
	}

	function createMenuItem(row, text, callback) {
	    var item = new createjs.Shape();
	    item.graphics.beginFill("#99F").drawRect(5, row * 50 + 5, 90, 45);
	    cm.addChild(item);

	    var itemText = new createjs.Text(text);
	    itemText.x = 10;
	    itemText.y = row * 50 + 10;
	    cm.addChild(itemText);

	    item.addEventListener("click", callback);
	    item.addEventListener("click", ui.hideMenus);
	}

	if(foundPath) {
	    createMenuItem(0, "Recruit", function() {
		ui.showRecruitPrompt(function(typeName) {
		    if(typeName) {
			socket.emit("create", { gameId: gameInfo.gameId, type: typeName, x: space.x, y: space.y });
		    	ui.moveHappening = true;
		    }
		});
	    });
	}

	world.stage.addChild(cm);
	world.stage.update();

	ui.showingMenu = true;

    },

    resizeModalWallToCanvas: function() {
	if(!ui.modalWall) { return; }

	ui.modalWall.graphics = new createjs.Graphics();
	ui.modalWall.graphics.beginFill("rgba(128,128,128,0.5)").drawRect(0, 0, canvas.width, canvas.height);
    },

    showRecruitPrompt: function(resolutionCallback) {
	var canvas = world.stage.canvas;

	ui.modal = new createjs.Container();
	ui.modalWall = new createjs.Shape();
	ui.resizeModalWallToCanvas();
	ui.modal.addChild(ui.modalWall);
	world.stage.addChild(ui.modal);

	var promptWidth = 400;
	var promptHeight = 350;

	var recruitPromptDOM = $("#recruit-prompt");
	var recruitListDOM = $("#recruit-list");
	var recruitStatsDOM = $("#recruit-stats");

	recruitPromptDOM.width(promptWidth);
	recruitPromptDOM.height(promptHeight);
	recruitPromptDOM.show();

	ui.recruitPrompt = new createjs.DOMElement(recruitPromptDOM.get(0));
	ui.recruitPrompt.x = (canvas.width - promptWidth) / 2;
	ui.recruitPrompt.y = -canvas.height + ((canvas.height - promptHeight) / 2);

	recruitListDOM.html("");

	for(var i=0; i<gameInfo.player.recruitList.length; ++i) {
	    var unitId = gameInfo.player.recruitList[i];
	    var unit = unitLib.protos[unitId];

	    var listItem = $("<div class='recruit-item'>");
	    
	    listItem.append(unit.imgObj);

	    var unitText = $("<span>");
	    unitText.text(unit.name);
	    unitText.css({top: "-40px", position: "relative"});

	    listItem.append(unitText);
	    recruitListDOM.append(listItem);

	    listItem.on("click", function(unit) {
		$("#recruit-stats-img").prop("src", unit.img);
		$("#recruit-stats-hp").text(unit.maxHp);
		$("#recruit-stats-xp").text(unit.maxXp);
		$("#recruit-stats-move").text(unit.move);

		$("#recruit-stats-attacks").html("");
		for(var i=0; i<unit.attacks.length; ++i) {
		    var attackNameElm = $("<div style='font-weight: bold;'>");
		    var attackTypeElm = $("<div>");
		    var attackPropsElm = $("<div>");
		    var attack = unit.attacks[i];
		    attackNameElm.text(attack.name + " " + attack.damage + "-" + attack.number);
		    attackTypeElm.text(attack.type);
		    attackPropsElm.text((attack.properties||[]).join(", "));
		    $("#recruit-stats-attacks").append(attackNameElm);
		    $("#recruit-stats-attacks").append(attackTypeElm);
		    $("#recruit-stats-attacks").append(attackPropsElm);
		}
	    }.bind(null, unit));

	    var selectedItem;

	    listItem.on("click", function(unitId) {
		$(".recruit-item").removeClass("selected");
		if(this == selectedItem) {
		    resolutionCallback(unitId);
		    ui.clearModal();
		} else {
		    selectedItem = this;
		    $(this).addClass("selected");
		}
	    }.bind(listItem, unitId));
	}

	var cancelButton = $("<button>Cancel</button>");
	cancelButton.on("click", resolutionCallback.bind(null, false));
	cancelButton.on("click", ui.clearModal);
	$("#recruit-cancel").html("").append(cancelButton);

	ui.modal.addChild(ui.recruitPrompt);
	world.stage.update();
    },

    hideMenus: function() {
	world.stage.removeChild(ui.contextMenu);
	world.stage.update();
	ui.showingMenu = false;
    },

    animateUnitMove: function(moveData) {
	ui.moveAnimating = true;
        var path = moveData.path;
        var currSpace = world.getSpaceByCoords(path[0]),
            nextSpace = world.getSpaceByCoords(path[1]),
            unit = world.units[currSpace.x+","+currSpace.y]
            start = null, stepProgress = 0, prevX = unit.shape.x, prevY = unit.shape.y, pathPos = 1;

	var remainingMove = unit.moveLeft - (moveData.moveCost || 0);
	if(moveData.capture || moveData.combat) { remainingMove = 0; }

	// TODO: reveal response.revealedUnits

        if(path.length < 2) {
	    if(moveData.combat) { ui.animateAttack(moveData); }
            else {
		ui.finishAnimation();
	    }
	    return;
	}

	// animate above other units while moving
	world.mapContainer.setChildIndex(unit.shape, world.mapContainer.children.length - 1);

        window.requestAnimationFrame(function step(timestamp) {
            if (start == null) { start = timestamp; }
            
            var diffX = nextSpace.shape.x - currSpace.shape.x,
                diffY = nextSpace.shape.y - currSpace.shape.y;
            var fraction = (timestamp - start) / (600 * ui.animationFactor);
            stepProgress += fraction;
            stepProgress = Math.min(1, stepProgress);
            
            unit.shape.x = prevX + stepProgress * diffX;
            unit.shape.y = prevY + stepProgress * diffY;
            world.stage.update();

	    var cornerX = unit.shape.x - world.stage.canvas.width / 2;
	    var cornerY = unit.shape.y - world.stage.canvas.height / 2;
	    scroll.scrollTo(-cornerX, -cornerY);

            if(stepProgress == 1) {
                currSpace = world.getSpaceByCoords(path[pathPos]);
                nextSpace = world.getSpaceByCoords(path[pathPos + 1]);
                
                prevX = unit.shape.x;
                prevY = unit.shape.y;
                
                pathPos += 1;
                stepProgress = 0;
            }
            
            if(!nextSpace) {
		if(moveData.capture) {
		    currSpace.setVillageFlag(unit.team);
		}

		world.positionUnit(unit, currSpace);
		unit.update({ moveLeft: remainingMove });

		if(moveData.combat) {
		    ui.animateAttack(moveData);
		}
                else {
		    ui.clearPath();
		    ui.finishAnimation();
		}
            } else {
                start = timestamp;
                window.requestAnimationFrame(step);
            }
        });
    },

    animateAttack: function(moveData) {
	ui.moveAnimating = true;

	var offender = world.getUnitAt(moveData.combat.offender);
	var defender = world.getUnitAt(moveData.combat.defender);

	var cornerX = offender.shape.x - world.stage.canvas.width / 2;
	var cornerY = offender.shape.y - world.stage.canvas.height / 2;
	scroll.scrollTo(-cornerX, -cornerY);

	var offense = offender.attacks[moveData.combat.offenseIndex];
	var defense = defender.attacks[moveData.combat.defenseIndex];

	var record = moveData.combat.record;

	offender.update({ hasAttacked: true, moveLeft: 0 });

	var dX = (offender.shape.x - defender.shape.x) / 15;
	var dY = (offender.shape.y - defender.shape.y) / 15;

	var attackStep = function(entry, i, retreat) {
	    return function() {
		var actor = entry.offense ? offender : defender;
		var hittee = entry.offense ? defender : offender;

		var attack = entry.offense?offense:defense;

		var direction;
		if(entry.offense) { direction = world.getDirection(offender.shape.owner, defender.shape.owner); }
		else {              direction = world.getDirection(defender.shape.owner, offender.shape.owner); }

		if(attack.type == "melee") {
		    actor.shape.x += (retreat ? 1 : -1) * (entry.offense ? 1 : -1) * dX;
		    actor.shape.y += (retreat ? 1 : -1) * (entry.offense ? 1 : -1) * dY;
		    world.stage.update();
		} else if(attack.type == "ranged" && !retreat) {
		    var projectile = new createjs.Shape();

		    if(attack.img) {
			var path = (direction=="n" || direction=="s") ? attack.img["n"] : attack.img["ne"];
			projectile = new createjs.Bitmap(path);
			var rotationTable = { s: 180, n: 0, ne: 0, nw: -90, se: 90, sw: 180 };
			projectile.rotation = rotationTable[direction];
			projectile.x = actor.shape.x + Space.WIDTH/2;
			projectile.y = actor.shape.y + Space.HEIGHT/2;
			projectile.regX = Space.WIDTH/2;
			projectile.regY = Space.HEIGHT/2;
		    } else {
			projectile.graphics.beginFill("black").drawRect(0,0,7,7);
			projectile.x = actor.shape.x + Space.WIDTH / 2;;
			projectile.y = actor.shape.y + Space.HEIGHT / 2;;
		    }

		    for(var j=0; j<15; j++) {
			setTimeout(function() {
			    projectile.x += (entry.offense ? -1 : 1) * dX;
			    projectile.y += (entry.offense ? -1 : 1) * dY;
			    world.stage.update();
			}, (500/15*j) * ui.animationFactor);
		    }
		    setTimeout(function() {
			world.mapContainer.removeChild(projectile);
			world.stage.update();
		    }, 500 * ui.animationFactor)
		    world.mapContainer.addChild(projectile);
		    world.stage.update();
		}

		if(!retreat) {
		    hittee.drawDamageNumber(entry.damage);
		} else {
		    hittee.dismissDamageNumber();
		}

		// show damage at appropriate time for melee and ranged attacks
		if((attack.type == "ranged" && retreat) || (attack.type == "melee" && !retreat)) {
		    if(entry.damage) {
			hittee.update({ hp: hittee.hp - entry.damage });
		    }
		    
		    if(entry.kill) {
			world.removeUnit(hittee);
		    }

		    if(entry.poisoned) {
			hittee.addCondition("poisoned");
		    }
		    if(entry.slowed) {
			hittee.addCondition(entry.slowed);
		    }
		}

		// if this is the final step of the final round, animation is done
		if(i == record.length - 1 && retreat) {
		    offender.update({ "xp": moveData.combat.xp.offense});
		    defender.update({ "xp": moveData.combat.xp.defense});

		    ui.clearPath();
		    ui.finishAnimation();
		}

		world.stage.update();
	    }
	};

	for(var i = 0; i < record.length; ++i) {
	    var entry = record[i];

	    setTimeout(attackStep(entry, i, false), (i*1000)*ui.animationFactor);
	    setTimeout(attackStep(entry, i, true), (i*1000+500)*ui.animationFactor);
	}
    },

    clearPath: function() {
	this.path = null;
	this.pathShape = null;
	this.pathTarget = null;
	this.pathSource = null;
    },

    showAttackPrompt: function(attacker, defender, resolutionCallback) {
	var canvas = world.stage.canvas;

	ui.modal = new createjs.Container();
	ui.modalWall = new createjs.Shape();
	ui.resizeModalWallToCanvas();
	ui.modal.addChild(ui.modalWall);
	world.stage.addChild(ui.modal);

	var promptWidth = 600;
	var promptHeight = 68 * attacker.attacks.length + 30;

	var attackPromptDOM = $("#attack-prompt");
	var attackListDOM = $("#attack-list");

	attackPromptDOM.width(promptWidth);
	attackPromptDOM.height(promptHeight);
	attackPromptDOM.show();

	ui.attackPrompt = new createjs.DOMElement(attackPromptDOM.get(0));
	ui.attackPrompt.x = (canvas.width - promptWidth) / 2;
	ui.attackPrompt.y = -canvas.height + ((canvas.height - promptHeight) / 2);

	attackListDOM.html("");

	var stringifyAttack = function(attack) {
	    if(!attack) { return "-- none --"; }
	    return attack.name + ": " + attack.damage + "-" + attack.number + " (" + attack.type + ")";
	}

	var selectedItem;

	for(var i=0; i<attacker.attacks.length; ++i) {
	    var attackerCover = attacker.getCoverOnSpace(world.getSpaceByCoords(attacker));
	    var defenderCover = defender.getCoverOnSpace(world.getSpaceByCoords(defender));

	    var attack = attacker.attacks[i];
	    attack = defender.applyAttack(attack, attacker, gameInfo.timeOfDay, ui.path[ui.path.length-2].space);
	    var attackText = stringifyAttack(attack);
	    var attackIcon = new Image();
	    attackIcon.src = attack.icon;
	    $(attackIcon).css("float","left");

	    var defense = defender.selectDefense(attacker, attack, gameInfo.timeOfDay, attackerCover, defenderCover).defense;
	    defense = attacker.applyAttack(defense, defender, gameInfo.timeOfDay, ui.path[ui.path.length-1].space);
	    var defenseText = stringifyAttack(defense);
	    var defenseIcon;
	    if(defense) {
		defenseIcon = new Image();
		defenseIcon.src = defense.icon;
		$(defenseIcon).css("float","right");
	    } else {
		defenseIcon = null;
		defense = {};
	    }

	    var attackButton = $("<div class='attack-item'>");

	    attackButton.append(attackIcon);
	    var itemText = $("<span>", { text: attackText + " | " + defenseText });
	    itemText.css({ position:"relative", top:"20px" });
	    attackButton.append(itemText);
	    attackButton.append(defenseIcon);

	    attackListDOM.append(attackButton);

	    attackButton.on("click", function(i) {
		$(".attack-item").removeClass("selected");
		if(this == selectedItem) {
		    resolutionCallback(i);
		    ui.clearModal();
		} else {
		    selectedItem = this;
		    $(this).addClass("selected");
		}
	    }.bind(attackButton, i));
	}

	var cancelButton = $("<button>Cancel</button>");
	cancelButton.on("click", resolutionCallback.bind(null, -1));
	cancelButton.on("click", ui.clearModal);
	$("#attack-cancel").html("").append(cancelButton);

	ui.modal.addChild(ui.attackPrompt);
	world.stage.update();

    },

    showAdvancementPromptFor: function(levelingUnit, resolutionCallback) {
	var canvas = world.stage.canvas;

	ui.modal = new createjs.Container();
	ui.modalWall = new createjs.Shape();
	ui.resizeModalWallToCanvas();
	ui.modal.addChild(ui.modalWall);
	world.stage.addChild(ui.modal);

	var promptWidth = 400;
	var promptHeight = 350;

	var recruitPromptDOM = $("#recruit-prompt");
	var recruitListDOM = $("#recruit-list");
	var recruitStatsDOM = $("#recruit-stats");

	recruitPromptDOM.width(promptWidth);
	recruitPromptDOM.height(promptHeight);
	recruitPromptDOM.show();

	ui.recruitPrompt = new createjs.DOMElement(recruitPromptDOM.get(0));
	ui.recruitPrompt.x = (canvas.width - promptWidth) / 2;
	ui.recruitPrompt.y = -canvas.height + ((canvas.height - promptHeight) / 2);

	recruitListDOM.html("");

	for(var i=0; i<levelingUnit.advancesTo.length; ++i) {
	    var unit = levelingUnit.levelUp(i, true);

	    var listItem = $("<div class='recruit-item'>");
	    
	    listItem.append(unit.imgObj);

	    var unitText = $("<span>");
	    unitText.text(unit.name);
	    unitText.css({top: "-40px", position: "relative"});

	    listItem.append(unitText);
	    recruitListDOM.append(listItem);

	    listItem.on("click", function(unit) {
		$("#recruit-stats-img").prop("src", unit.img);
		$("#recruit-stats-hp").text(unit.maxHp);
		$("#recruit-stats-xp").text(unit.maxXp);
		$("#recruit-stats-move").text(unit.move);

		$("#recruit-stats-attacks").html("");
		for(var i=0; i<unit.attacks.length; ++i) {
		    var attackNameElm = $("<div style='font-weight: bold;'>");
		    var attackTypeElm = $("<div>");
		    var attack = unit.attacks[i];
		    attackNameElm.text(attack.name + " " + attack.damage + "-" + attack.number);
		    attackTypeElm.text(attack.type);
		    $("#recruit-stats-attacks").append(attackNameElm);
		    $("#recruit-stats-attacks").append(attackTypeElm);
		}
	    }.bind(null, unit));

	    var selectedItem;

	    listItem.on("click", function(i) {
		$(".recruit-item").removeClass("selected");
		if(this == selectedItem) {
		    resolutionCallback(i);
		    ui.clearModal();
		} else {
		    selectedItem = this;
		    $(this).addClass("selected");
		}
	    }.bind(listItem, i));
	}

	$("#recruit-cancel").html("");

	ui.modal.addChild(ui.recruitPrompt);
	world.stage.update();	
    },

    clearModal: function() {
	world.stage.removeChild(ui.modal);

	// hide DOM menus
	for(var i=0; i<ui.modal.children.length;++i) {
	    if(ui.modal.children[i] instanceof createjs.DOMElement) {
		$(ui.modal.children[i].htmlElement).hide();
	    }
	}

	ui.modal = undefined;
	world.stage.update();
    },

    updatePlayer: function(data) {
	if(data.gold != undefined) {
	    $("#top-gold-text").text(data.gold);
	}
    },

    finishAnimation: function() {
	ui.moveHappening = false;
	ui.moveAnimating = false;
	actionQueue.doNext();	
    }
}
