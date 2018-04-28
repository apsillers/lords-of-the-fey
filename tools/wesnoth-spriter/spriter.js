go.addEventListener("click", function() {
    var animList = anims.value.split(","),
	    animCount = 0,
	    count = 1,
		animations = {},
		images = [];
		
	var img = new Image();
	img.src = "https://github.com/wesnoth/wesnoth/raw/master/data/core/images/units/"+path.value+".png";
	img.onload = function() {
	    images.push(img);
	    loadNext();
	}
	
	function loadNext(tryingWithoutDash) {
	    var animationName = animList[animCount];
		output.textContent = "Loading " + animationName + " #" + count;
		
	    var img = new Image();

		img.src = "https://github.com/wesnoth/wesnoth/raw/master/data/core/images/units/"+path.value+
		            "-"+animationName+(tryingWithoutDash?"":"-")+count+".png";
	    img.onload = function() {
	        images.push(img);
			count++;
			if(animations[animationName] == undefined) { animations[animationName] = [images.length-1]; }
	        loadNext(tryingWithoutDash);
	    }
		img.onerror = function() {
			if(!tryingWithoutDash && count==1) {
			    loadNext(true);
				return;
			}
			
			animations[animationName].push(images.length-1);
		    animCount++;
		    if(animCount < animList.length) {
			    count = 1;
				loadNext();
			} else {
				canvas.width = images.length * images[0].width;
				canvas.height = images[0].height;
				var ctx = canvas.getContext("2d");
				for(var i=0; i<images.length; i++) {
				    ctx.drawImage(images[i], images[0].width*i, 0);
				}
				output.textContent = JSON.stringify(animations);
			}
		}
		
	}
});