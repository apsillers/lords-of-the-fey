var unitLib = {
    
    protoList: ["grunt", "scout", "elven_archer", "orcish_archer"],
    protos: {},

    init: function(initCallback) {
	if(typeof createjs != "undefined") {
	    this.clientInit(initCallback);
	} else {
	    this.serverInit(initCallback);
	}
    },

    clientInit: function(initCallback) {
	// load unit data files
        var queue = new createjs.LoadQueue();
	var unitManifest = unitLib.protoList.map(function(k){
	    return { id:k, src:"/data/units/"+k+".json", type:createjs.LoadQueue.JSON }
	});

	queue.loadManifest(unitManifest);

	queue.on("fileload", function(e) {
	    // make each unit-data object into a unit prototype
	    // with the master unitProto as its prototype
	    var newProto = Object.create(unitLib.unitProto);
	    for(var prop in e.result) {
		newProto[prop] = e.result[prop];
	    }
	    unitLib.protos[e.item.id] = newProto;
        });

	// when all data files have loaded, load images
	queue.on("complete", function() {
            var queue = new createjs.LoadQueue();
            queue.on("complete", handleComplete, this);
            queue.loadManifest(
                Object.keys(unitLib.protos).map(function(k){ return {id:k, src:unitLib.protos[k].img }; })
            );

            function handleComplete() {
		for(var k in unitLib.protos) {
		    var img = queue.getResult(k);
		    unitLib.protos[k].imgObj = img;
		    unitLib.protos[k].colorImgList = [img];

		    // colorize images for teams
		    var colorCanvas = document.createElement("canvas");
		    colorCanvas.width = img.width;
		    colorCanvas.height = img.height;
		    colorContext = colorCanvas.getContext("2d");
		    var teamColors = [[255,255,0], [0,255,255], [255,255,255]]

		    for(var j=0; j<teamColors.length; ++j) {
			colorContext.drawImage(img, 0, 0);
			var imgd = colorContext.getImageData(0,0,img.width,img.height);
			var pix = imgd.data;

			// HACK, FIXME: decided to recolor a pixel if it is
			// more red than green and more blue than green
			// (this works okay-ish for the units so far)
			for(var i=0, n=pix.length; i < n; i += 4) {
			    if(pix[i] > pix[i+1] && pix[i+2] > pix[i+1]) {
				pix[i] = pix[i] & teamColors[j][0];
				pix[i+1] = pix[i+1] & teamColors[j][1];
				pix[i+2] = pix[i+2] & teamColors[j][2];
			    }
			}

			colorContext.putImageData(imgd, 0, 0);
			var coloredImg = new Image();
			coloredImg.src = colorCanvas.toDataURL();
			unitLib.protos[k].colorImgList.push(coloredImg);
		    }
		}
            }

	    initCallback();
        });
    },

    serverInit: function(initCallback) {

    }
}

function Unit(unitData) {
    var proto = unitLib.protos[unitData.type];
    var unit = Object.create(proto);
    unit.moveLeft = unitData.moveLeft;
    unit.hp = unitData.hp;
    unit.xp = unitData.xp;
    
    unit.team = unitData.team;
    unit.imgObj = unit.colorImgList[unit.team];
    console.log(unit.team+1);
    unit.img = unit.imgObj.src;
    
    unit.shape = new createjs.Container();
    unit.shape.owner = unit;
    unit.shape.addChild(new createjs.Bitmap(unit.imgObj));
    
    unit.isCommander = unitData.isCommander;
    
    unit.drawHpBar();
    
    if(unit.isCommander) { unit.drawCrown(); }
    
    return unit;
}

unitLib.unitProto = {
    constructor: Unit,

    drawHpBar: function() {
	if(this.healthBar) { this.shape.removeChild(this.healthBar); }
	
	var hpRatio = this.hp / this.maxHp;
	var barColor = ["#D00", "#DD0"][Math.floor(hpRatio * 3)] || "#0D0";
	
	this.healthBar = new createjs.Shape();
	this.healthBar.graphics.beginFill(barColor).drawRect(54, 8.5 + 20 * (1 - hpRatio), 4, 20 * hpRatio);
	this.healthBar.graphics.beginFill("rgba(0,0,0,0)").beginStroke("#FFF").setStrokeStyle(1).drawRect(53.5, 8.5, 4, 20);
	this.shape.addChild(this.healthBar);
    },
    
    drawCrown: function() {
	var crown = new createjs.Shape();
	crown.graphics.beginFill("gold").drawRect(5,5,15,5);
	this.shape.addChild(crown);
    },
	    
    update: function(update) {
	for(prop in update) {
	    this[prop] = update[prop];
	}
	ui.updateUnitSidebar();
	this.drawHpBar();
    }
};

var genId;
(function() {
    var id = 0;
    genId = function() { return id++; }
})();
