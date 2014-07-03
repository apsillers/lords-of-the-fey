/*
  When run on a unit page in Wesnoth's Unit Database (http://units.wesnoth.org/1.10/mainline/en_US/era_default.html), this script outputs a JSON document that describes the unit, formatted for use by Lords of the Fey.
  
  NOTE: this script does not capture al the information, because not all the information is present on the page. Notably abset are race-specific attributes (e.g., undead attribute, dextrous for Elves, dim/slow for Goblins, etc.) as well as animation images.
*/

function nameToId(name) {
    return name.toLowerCase().replace(/ /g, "_");
}

unit = {};

// basic stats
var c = document.querySelector(".unitinfo tbody").children;
unit.name = c[8].children[1].textContent;
unit.img = "/data/img/units/"+nameToId(unit.name);
unit.cost = parseInt(c[2].children[1].textContent);
unit.maxHp = parseInt(c[3].children[1].textContent);
unit.move = parseInt(c[4].children[1].textContent);
unit.maxXp = parseInt(c[5].children[1].textContent);
unit.level = parseInt(c[6].children[1].textContent);
unit.alignment = c[7].children[1].textContent;
if(c[9].children[1].textContent) { unit.fixedAttributes = c[9].children[1].textContent.split(", "); }

// advancesTo
var c = document.querySelector(".unitinfo tbody").children;
var advancesTo = [].map.call(c[1].children[1].children, function(el) {
    return nameToId(el.textContent);
});
if(advancesTo.length > 0) { unit.advancesTo = advancesTo; }

// attacks
unit.attacks = [];
[].forEach.call(document.querySelector(".attacks tbody").children, function(el) {
    var attack = {};
    var c = el.children;
    attack.icon = "/data/img/attacks/"+c[0].firstChild.src.split("$").pop();
    attack.name = c[1].children[0].textContent.replace(/^[a-z]/, function(m) { return m.toUpperCase(); });
    attack.type = c[1].lastChild.textContent;

    var attackProps = c[2].children[0].textContent.split(" - ");
    attack.damage = attackProps[0];
    attack.number = attackProps[1];
    attack.damageType = c[2].lastChild.textContent;

    if(c[3].textContent) { attack.properties = c[3].textContent.split(", "); }

    unit.attacks.push(attack);
});

// terrain
var types = ["castle", "cave", "reef", "deep_water", "flat", "forest", "frozen", "hills", "mountains", "fungus", "sand", "shallow_water", "swamp", "unwalkable", "village"];
unit.terrain = {};
[].forEach.call(document.querySelector(".terrain tbody").children, function(el, idx) {
    // strip headers
    if(idx < 2) { return; }

    var terrain = {};
    var type = types[idx];

    var c = el.children;

    console.log(terrain.move = parseInt(c[2].textContent) || -1)
    console.log(terrain.cover = parseInt(c[3].textContent) / 100)

    unit.terrain[type] = terrain;
});
unit.terrain.impassable = { move: -1, cover: 0 };

// resistences
unit.resistances = {};
[].forEach.call(document.querySelector(".resistances tbody").children, function(el, idx) {
    // ignore header row
    if(idx < 1) { return; }

    var c = el.children;
    unit.resistances[c[1].textContent] = parseInt(c[2].textContent) / 100;
    unit.resistances[c[5].textContent] = parseInt(c[6].textContent) / 100;
});

console.log(JSON.stringify(unit));
