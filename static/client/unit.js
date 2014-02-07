var unitLib = {

    protoList: ["grunt", "scout"],
    protos: {},

    init: function() {
        
    },
    
    create: function(proto, team, options) {
        options = options || {};
        var unit = Object.create(proto);
        unit.movesLeft = options.movesLeft || proto.move;
        unit.hp = options.hp || proto.maxHp;
        unit.xp = options.xp || 0;

        unit.team = team;
        unit.shape = new createjs.Bitmap(proto.imgObj);
        
        return unit;
    }
    
}

var genId;
(function() {
    var id = 0;
    genId = function() { return id++; }
})();
