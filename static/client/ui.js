/**
    Copyright 2014, 2015 Andrew P. Sillers

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
    justMadeContextMenu: false,

    pathSource: null,
    pathTarget: null,
    pathShape: null,
    path: null,
    hoverSpace: null,
    hoverUnit: null,

    totalVillageCount: 0,
    ownedVillageCount: 0,
    ownedUnitCount: 0,
    costlyUnitCount: 0,
    netIncome: 0,

    animationFactor: 0.66,

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

            $("#right_data_resistances").empty().append($("<table>").append(
                Object.keys(ui.hoverUnit.resistances).map(function(resistName) {
                    var resist = ui.hoverUnit.resistances[resistName];
                    return $("<tr>").append([
                        $("<td>", {text: resistName.replace(/\b\w/g, function(match) { return match.toUpperCase(); }) }),
                        $("<td>", {text: (resist<0?"":"+")+resist*100+"%" })
                    ]);
                })
            ));

            $("#right_data_xp").text(ui.hoverUnit.xp + "/" + ui.hoverUnit.maxXp);
            $("#right_data_move").text(ui.hoverUnit.moveLeft + "/" + ui.hoverUnit.move);

            $("#right_data_move_costs").empty().append($("<table>").append(
                Object.keys(ui.hoverUnit.terrain).map(function(terrainName) {
                    var move = ui.hoverUnit.terrain[terrainName].move;
                    if(move == -1) { move = "-"; }
                    return $("<tr>").append([
                        $("<td>", {text: terrainName.replace("_"," ").replace(/\b\w/g, function(match) { return match.toUpperCase(); }) }),
                        $("<td>", {text: move })
                    ]);
                })
            ));

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
            if(!ui.justMadeContextMenu) {
                ui.hideMenus();
                ui.justMadeContextMenu = false;
                return;
            }
        }

        var space = e.target.owner;
        
        if(ui.moveHappening || !ui.hasTurn) { return; }

        if(e.nativeEvent.button == 2) {
            if(ui.pathSource) { ui.hideMoveRange(); world.mapContainer.removeChild(ui.pathShape); ui.pathSource = null; }
            else { ui.onContextMenu(space, { x: e.stageX, y: e.stageY }); }
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
    drawReverseHexWithGraphic: function(gfx) {
        gfx.moveTo(18, 0).lineTo(0, 36).lineTo(18, 72).lineTo(53, 72).lineTo(72, 36).lineTo(53, 0).lineTo(18, 0);
        
    },

    showMoveRange: function(space, unitToMove) {
        ui.inspectedUnit = unitToMove;
        if(unitToMove.team != gameInfo.activeTeam) { var actualMove = unitToMove.moveLeft; unitToMove.moveLeft = unitToMove.move; }
        var accessibleSpaces = allAccessibleSpaces(world, space, unitToMove, gameInfo);
        if(unitToMove.team != gameInfo.activeTeam) { unitToMove.moveLeft = actualMove; }
        ui.rangeShape = new createjs.Container();
        ui.rangeShape.addChild(ui.rangeBackdrop);
        for(var coord in accessibleSpaces) {
                 var s = world.getSpaceByCoords(coord);
                var pip = new createjs.Container();
                pip.x = s.shape.x;
                pip.y = s.shape.y;
                pip.owner = s;
                pip.addEventListener("click", Space.passthroughFunc);
                pip.addEventListener("rollover", Space.passthroughFunc);
                var bar = new createjs.Shape();
                bar.compositeOperation = 'destination-out';
                ui.drawReverseHexWithGraphic(bar.graphics.beginFill("rgba(160,160,160,1)"));
                pip.addChild(bar);
                ui.rangeShape.addChild(pip);
        }
        ui.rangeShape.cache(0,0,world.mapWidth,world.mapHeight);
        world.mapContainer.addChild(ui.rangeShape);
        world.stage.update();
    },

    hideMoveRange: function() {
        ui.inspectedUnit = null;
        world.mapContainer.removeChild(ui.rangeShape);
        ui.rangeShape = null;
        world.stage.update();
    },

    onContextMenu: function(space, coords) {
        if(ui.showingMenu) { ui.hideMenus(); return; }

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
                        socket.emit("create", { gameId: gameInfo.gameId, type: typeName, x: space.x, y: space.y, anonToken: gameInfo.anonToken });
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
             
            listItem.append($("<div>", { class: "img-wrapper"}).append(unit.imgObj));

            var unitText = $("<div>");
            unitText.append($("<span>", { text: unit.name }));
            unitText.append($("<br>"));
            unitText.append($("<span>", { text: unit.cost + " Gold" }));

            unitText.css({"padding-top": "10px"});
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

        recruitListDOM.scrollTop(0);
    },

    hideMenus: function() {
        world.stage.removeChild(ui.contextMenu);
        world.stage.update();
        ui.showingMenu = false;
        menuControl.hideMenu();
    },

    animateUnitMove: function(moveData) {
        ui.moveAnimating = true;
        var path = moveData.path;
        var currSpace = world.getSpaceByCoords(path[0]),
            nextSpace = world.getSpaceByCoords(path[1]);

        var unit;
        if(currSpace) { unit = world.units[currSpace.x+","+currSpace.y]; }
        if(!unit && moveData.unit) {
            var moveSuppliedUnit = true;
            unit = new Unit(moveData.unit);
            if(currSpace && currSpace.x) { world.addUnit(unit, currSpace); }
            //console.log("using move-supplied unit", moveData.unit, unit);
            moveData.unit = unit;
        }

        if(!unit) {
            ui.clearPath();
            ui.finishAnimation();
            return;
        }

        var start = null, stepProgress = 0, prevX = unit.shape.x, prevY = unit.shape.y, pathPos = 1;

        var remainingMove = !moveSuppliedUnit ? unit.moveLeft - (moveData.moveCost || 0) : unit.moveLeft;
        if(moveData.capture || moveData.combat) { remainingMove = 0; }

        if(path.length < 2) {
            if(moveData.combat) { ui.animateAttack(moveData); }
            else {
                ui.finishAnimation();
            }
            return;
        }

        // animate above other units while moving
        world.mapContainer.setChildIndex(unit.shape, world.mapContainer.children.length - 1);

        if(!moveSuppliedUnit) { var target = unit; }
        else { path.some(function(s) { return target = world.getSpaceByCoords(s); }); }
        if(target) {
            var cornerX = target.shape.x - world.stage.canvas.width / 2;
            var cornerY = target.shape.y - world.stage.canvas.height / 2;
            scroll.scrollTo(-cornerX, -cornerY);
        }

        window.requestAnimationFrame(function step(timestamp) {
            if (start == null) { start = timestamp; }
            
            var fraction = (timestamp - start) / (600 * ui.animationFactor);
            stepProgress += fraction;
            stepProgress = Math.min(1, stepProgress);

            if(nextSpace && currSpace) {
                var diffX = nextSpace.shape.x - currSpace.shape.x,
                    diffY = nextSpace.shape.y - currSpace.shape.y;

                // flip unit left or right to match x-direction
                if(diffX < 0) {
		    unit.bodyShape.regX = 72;
                    unit.bodyShape.scaleX = -1;
                }
                if(diffX > 0){
                    unit.bodyShape.regX = 0;
                    unit.bodyShape.scaleX = 1;
                }

                unit.shape.x = prevX + stepProgress * diffX;
                unit.shape.y = prevY + stepProgress * diffY;

                world.stage.update();
            } else if(nextSpace && nextSpace.x) {
                world.addUnit(unit, nextSpace);
            }

            if(stepProgress == 1) {
                currSpace = world.getSpaceByCoords(path[pathPos]);
                nextSpace = world.getSpaceByCoords(path[pathPos + 1]);
                
                prevX = unit.shape.x;
                prevY = unit.shape.y;
                
                pathPos += 1;
                stepProgress = 0;
            }
            
            if(path.length == pathPos) {
                if(moveData.capture) {
                    currSpace.setVillageFlag(unit.team);
                    ui.updateVillageStats();
                }

                if(moveData.revealedUnits) {
                    moveData.revealedUnits.forEach(function(u) {
                        u = new Unit(u);
                        if(!world.getUnitAt(u)) {
                            world.addUnit(u, world.getSpaceByCoords(u));
                        }
                    });
                }

                if(currSpace && !path[pathPos-1].hidden) {
                    world.positionUnit(unit, currSpace);
                    unit.update({ moveLeft: remainingMove });
                } else {
                    world.removeUnit(unit);
                }

                if(moveData.combat) {
                    ui.animateAttack(moveData);
                } else {
                    ui.clearPath();
                    ui.finishAnimation();
                }

                if(moveData.hide) {
                    unit.addCondition("hidden");
                } else {
                    unit.removeCondition("hidden");
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

        // flip unit left or right to match x-direction
        if(dX > 0) {
            offender.bodyShape.regX = 72;
            offender.bodyShape.scaleX = -1;
            defender.bodyShape.regX = 0;
            defender.bodyShape.scaleX = 1;
        }
        if(dX < 0){
            offender.bodyShape.regX = 0;
            offender.bodyShape.scaleX = 1;
            defender.bodyShape.regX = 72;
            defender.bodyShape.scaleX = -1;
        }

        var attackStep = function(entry, i, retreat) {
            return function() {
                var actor = entry.offense ? offender : defender;
                var hittee = entry.offense ? defender : offender;

                var attack = entry.offense?offense:defense;
                var attackIndex = actor.attacks.indexOf(attack);

                var direction;
                if(entry.offense) { direction = world.getDirection(offender.shape.owner, defender.shape.owner); }
                else {              direction = world.getDirection(defender.shape.owner, offender.shape.owner); }

                if(!retreat && attack.animation) {
                    var frameCount = attack.animation[1] - attack.animation[0] + 1;
                    // get in all frames in half a second, multiplied by animationFactor speedup
                    actor.bodyShape.framerate  = frameCount * 2 * ui.animationFactor;
                    actor.bodyShape.gotoAndPlay("attack-"+attackIndex);
                }

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

                    if(!retreat && actor.bodyShape.spriteSheet.animations.indexOf("") > -1) {
                        var attackFrames = actor.animations.attack;
                        var frameCount = attackFrames[1] - attackFrames[0] + 1;
                        // get in all frames in half a second, multiplied by animationFactor speedup
                        actor.bodyShape.framerate  = frameCount * 2 * ui.animationFactor;
                        actor.bodyShape.gotoAndPlay("ranged");
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
        var promptHeight = 68 * attacker.attacks.length + 110;

        var attackPromptDOM = $("#attack-prompt");
        var attackListDOM = $("#attack-list");

        attackPromptDOM.width(promptWidth);
        attackPromptDOM.height(promptHeight);
        attackPromptDOM.show();

        ui.attackPrompt = new createjs.DOMElement(attackPromptDOM.get(0));
        ui.attackPrompt.x = (canvas.width - promptWidth) / 2;
        ui.attackPrompt.y = -canvas.height + ((canvas.height - promptHeight) / 2);

        attackListDOM.html("");

        var makeAttackStatsElem = function(attack, hitChance) {
            if(!attack) { return $("<td>").text("-- none --"); }
            var hitPercent = Math.round(hitChance*100);
            return $("<td>").append([
                $("<span>").text(attack.name).css("font-weight", "bold"),
                $("<br>"),
                $("<span>").text(attack.damage + "-" + attack.number + " " + (attack.properties?attack.properties.join(", "):"")),
                $("<br>"),
                $("<span>").text(hitPercent+"%").css("color", {
                    "10": "#F00", "20": "#F00", "30": "#F00",
                    "40": "#FF0", "50": "#FF0",
                    "60": "#ADFF2F",
                    "70": "#0F0", "80": "#0F0", "90": "#0F0"
                }[hitPercent])
            ]);
        };

        var makeCombatantElem = function(combatant, floatDir) {
            return [
                $($("<div>", { class: "img-wrapper" }).append(combatant.imgObj)).css("float",floatDir),
                $("<div>").append([
                    $("<span>").text(combatant.name),
                    $("<br>"),
                    $("<span>").text(combatant.hp + "/" + combatant.maxHp),
                ]).css("float",floatDir),
            ];
        }

        var selectedItem;

        $("#attack-combatants").empty().append(makeCombatantElem(attacker, "left")).append(makeCombatantElem(defender, "right"));

        for(var i=0; i<attacker.attacks.length; ++i) {
            var attack = attacker.attacks[i];
            attack = defender.applyAttack(attack, attacker, gameInfo.timeOfDay, ui.path[ui.path.length-2].space);
            var attackIcon = new Image();
            attackIcon.src = attack.icon;
            $(attackIcon).css("float","left");

            var attackerCover = attacker.getCoverOnSpace(world.getSpaceByCoords(attacker));
            var defenderCover = defender.getCoverOnSpace(world.getSpaceByCoords(defender), attack, true);

            var defense = defender.selectDefense(attacker, attack, gameInfo.timeOfDay, attackerCover, defenderCover).defense;
            defense = attacker.applyAttack(defense, defender, gameInfo.timeOfDay, ui.path[ui.path.length-1].space);
            attackerCover = attacker.getCoverOnSpace(world.getSpaceByCoords(attacker), defense, false);

            var defenseIcon;
            if(defense) {
                defenseIcon = new Image();
                defenseIcon.src = defense.icon;
            } else {
                defenseIcon = null;
            }

            var attackButton = $("<tr class='attack-item'>");

            attackButton.append($("<td>").append(attackIcon).css("width", 60));
            attackButton.append(makeAttackStatsElem(attack, 1-defenderCover).css("width", 180));
            attackButton.append($("<td>").text("--"+attack.type+"--").css({ "text-align":"center" }));
            attackButton.append(makeAttackStatsElem(defense, 1-attackerCover).css({ "width":180 }));
            attackButton.append($("<td>").append(defenseIcon).css("width", 60));

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
            
            listItem.append($("<div>", { class: "img-wrapper", style:{float:"left"} }).appendChild(unit.imgObj));

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

        recruitListDOM.scrollTop(0);
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
    },

    updateVillageStats: function() {
        var villageKeys = Object.keys(gameInfo.villages);
        ui.totalVillageCount = villageKeys.length;
        ui.ownedVillageCount = 0;
        for(var i=0; i<villageKeys.length; i++) {
            if(gameInfo.player.team == gameInfo.villages[villageKeys[i]]) {
                ui.ownedVillageCount++;
            }
        }
        $("#top-village-count-text").text(ui.ownedVillageCount + "/" + ui.totalVillageCount);
        ui.updateNetIncome();
    },

    updateOwnedUnitsCount: function() {
        ui.ownedUnitCount = 0;
        ui.costlyUnitCount = 0;
        for(var coords in world.units) {
            var unit = world.units[coords];
            if(unit.team == gameInfo.player.team) {
                ui.ownedUnitCount++;
                if(!unit.isCommander && (!unit.attributes || unit.attributes.indexOf("loyal")==-1)) {
                    ui.costlyUnitCount++;
                }
            }
        }
        $("#top-unit-count-text").text(ui.ownedUnitCount)
        ui.updateNetIncome();
    },

    updateNetIncome: function() {
        $("#top-income-text").text(2 + ui.ownedVillageCount*2 - ui.costlyUnitCount);
        ui.updateUpkeep();
    },

    updateUpkeep: function() {
        $("#top-upkeep-text").text(Math.max(0, ui.costlyUnitCount - ui.ownedVillageCount) + " (" + ui.costlyUnitCount + ")");
    },

    showPlayerStats: function() {
        $table = $("<table>");
        $("<tr>").append([
            $("<td>", {text: "Team" }),
            $("<td>", {text: "Username" }),
            $("<td>", {text: "Alliance" })
        ]).appendTo($table);
        for(var i=0; i<gameInfo.players.length; ++i) {
            if(!gameInfo.players[i]) { continue; }
            $("<tr>").append([
                $("<td>", {text: gameInfo.players[i].team }).css("color", ["rgba(0,0,0,0)","#F00","#00F","#F0F", "#444"][gameInfo.players[i].team]),
                $("<td>", {text: gameInfo.players[i].username }),
                $("<td>", {text: gameInfo.players[i].alliance }),
                $("<td>").append(gameInfo.players[i].anonToken?$("<a>", {text: "Link to control this player", title: "Use this link to play as this anonymous player", href: window.location.href.replace(/&?token=([0-9a-f.])*&?/, "")+"&token="+gameInfo.players[i].anonToken }):"")
            ]).css("font-weight", gameInfo.players[i].team == gameInfo.player.team?"bold":"").appendTo($table);
        }

        var $closeButton = $("<button>", { text: "Close" }).click(function() { ui.hidePlayerStats(); });

        $("#player-overlay").empty().append($table).append($closeButton).css({ left: ($(window).width() - $("#player-overlay").width()) / 2 }).show();
    },

    hidePlayerStats: function() { $("#player-overlay").hide(); },

    showCredits: function() {
        $("#credits-overlay").css({ left: ($(window).width() - $("#credits-overlay").width()) / 2 }).show();
    },

    hideCredits: function() {
        $("#credits-overlay").hide();
    }
};

(function() {
    var rangeBackdrop;
    Object.defineProperty(ui, "rangeBackdrop", {
        get: function() {
            if(rangeBackdrop) { return rangeBackdrop; }
            rangeBackdrop = new createjs.Container();
            for(var i=0;i<=world.maxX;++i){
                for(var j=0;j<=world.maxY;++j) {
                     var s = world.getSpaceByCoords(i,j);
                    var pip = new createjs.Container();
                    pip.x = s.shape.x;
                    pip.y = s.shape.y;
                    pip.owner = s;
                    pip.addEventListener("click", Space.passthroughFunc);
                    pip.addEventListener("rollover", Space.passthroughFunc);
                    var bar = new createjs.Shape();
                    ui.drawHexWithGraphic(bar.graphics.beginFill("rgba(160,160,160,0.6)"));
                    pip.addChild(bar);
                    rangeBackdrop.addChild(pip);
                }
            }
            rangeBackdrop.cache(0,0,world.mapWidth,world.mapHeight);
            return rangeBackdrop;
        }
    });
})();

