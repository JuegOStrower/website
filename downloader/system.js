$(document).ready(function(){
	$("#downproj").bind("keydown keyup keypress", function(){
		$(this).css("color", "black");
		var projectId = $("#downproj").val();
		projectId = projectId.replace("://scratch.mit.edu/projects/", "").replace("https", "").replace("http", "");
		projectId = parseInt(projectId);
		if(isNaN(projectId)){
			$("#downproj").css("color", "red");
		}
	}).on("paste", function(){
		$(this).val("");
	});
	if (!window.location.hash.replace("#", "") == ""){
		$("#downproj").val("https://scratch.mit.edu/projects/" + window.location.hash.replace("#", ""));
		document.getElementById("downdirect").click();
	}
	$("#downnow").click(function(){
		$("#progress").removeClass("error success");
		var projectId = $("#downproj").val();
		projectId = projectId.replace("://scratch.mit.edu/projects/", "").replace("https", "").replace("http", "");
		projectId = parseInt(projectId);
		if(isNaN(projectId)){
			$("#downproj").css("color", "red");
			return;
		}
		$("#downproj").attr("disabled","");
		$("#downinput").attr("style", "background-color:rgb(235, 235, 228)");
		$("#downnow").attr("class", "w3-gray w3-center");
		startDownload(projectId);
	});
	$("#downdirect").click(function(){
		$("#progress").removeClass("error success");
		var projectId = $("#downproj").val();
		projectId = projectId.replace("://scratch.mit.edu/projects/", "").replace("https", "").replace("http", "");
		projectId = parseInt(projectId);
		prompt('Copy and paste this link to auto download the enetered project',document.getElementById(projectId).value);
	});
});

var maxWidth = 0;
var jszip = null;
var project = null;
var id = null;
var soundId = 0;
var costumeId = 0;
var soundsToDownload = [];
var costumesToDownload = [];
var totalAssets = 0;
var completeAssets = 0;

function startDownload(projectId){
	$("#log").text("");
	$("#progress").text("");
	logMessage("Downloading project: "+projectId);
	soundId = 0;
	costumeId = 0;
	totalAssets = 0;
	completeAssets = 0;
	soundsToDownload = [];
  costumesToDownload = [];
	id = projectId;
	setProgress(0);
	jszip = new JSZip();
	jszip.comment = "Created with JuegOStrower's Project Downloader";
	$.get("https://cdn.projects.scratch.mit.edu/internalapi/project/"+projectId+"/get/", function(data){
		setProgress(10);
		logMessage("Loaded JSON");
		project = data;
		processSoundsAndCostumes(project);
		if(project.hasOwnProperty("children")){
			for(child in project.children){
				processSoundsAndCostumes(project.children[child]);
			}
		}
		logMessage("Found "+totalAssets+" assets");
		jszip.file("project.json", JSON.stringify(project));
		downloadCostume();
	}).fail(perror);
}

function downloadCostume(){
	if(costumesToDownload.length > 0){
		var current = costumesToDownload.pop();
		logMessage("Loading asset "+current.costumeName+" ("+completeAssets+"/"+totalAssets+")");
		JSZipUtils.getBinaryContent(
			"https://cdn.assets.scratch.mit.edu/internalapi/asset/"+current.baseLayerMD5+"/get/", 
			function(err, data){
				if(err) {error();return;}
				var ext = current.baseLayerMD5.match(/\.[a-zA-Z0-9]+/)[0];
				jszip.file(current.baseLayerID+ext, data, {binary: true});
				completeAssets++;
				setProgress(10+89*(completeAssets/totalAssets));
				downloadCostume();
		});
	} else {
		downloadSound();
	}
}

function downloadSound(){
	if(soundsToDownload.length > 0){
		var current = soundsToDownload.pop();
		logMessage("Loading asset "+current.soundName+" ("+completeAssets+"/"+totalAssets+")");
		JSZipUtils.getBinaryContent(
			"https://cdn.assets.scratch.mit.edu/internalapi/asset/"+current.md5+"/get/", 
			function(err, data){
				if(err) {error();return;}
				var ext = current.md5.match(/\.[a-zA-Z0-9]+/)[0];
				jszip.file(current.soundID+ext, data, {binary: true});
				completeAssets++;
				setProgress(10+89*(completeAssets/totalAssets));
				downloadSound();
		});
	} else {
		logMessage("Loading project title...");
		$.get("https://scratch.mit.edu/api/v1/project/"+id+"/?format=json", function(data){
			logMessage("Generating ZIP...");
			var content = jszip.generate({type:"blob"});
			logMessage("Saving...");
			try {
				saveAs(content, data.title+".sb2");
			} catch(e){
				saveAs(content, "project.sb2");
			}
			logMessage("Complete");
			psuccess();
		}).fail(function(){
			logMessage("Failed to load project title");
			logMessage("Generating ZIP...");
			var content = jszip.generate({type:"blob"});
			logMessage("Saving...");
      saveAs(content, "project.sb2");
			logMessage("Complete");
			psuccess();
		});
	}
}

function processSoundsAndCostumes(node){
	if(node.hasOwnProperty("costumes")){
		for(var i=0;i<node.costumes.length;i++){
			var current = node.costumes[i];
			current.baseLayerID = costumeId;
			costumeId++;
			totalAssets++;
			costumesToDownload.push(current);
		}
	}
	if(node.hasOwnProperty("sounds")){
		for(var i=0;i<node.sounds.length;i++){
			var current = node.sounds[i];
			current.soundID = soundId;
			soundId++;
			totalAssets++;
			soundsToDownload.push(current);
		}
	}
}

function perror(){
	logMessage("Download error");
	setProgress(100);
	$("#progress").addClass("error");
	$("#progress").animate({opacity:0}, 1000, function(){
		$(this).css({"opacity":1, width:0});
		reset();
	});
}

function psuccess(){
	setProgress(100);
	$("#progress").addClass("success");
	$("#progress").animate({opacity:0}, 1000, function(){
		$(this).css({"opacity":1, width:0});
		reset();
	});
}

function setProgress(perc){
	maxWidth = $("#downproj").width() + $("#downnow").width();
	$("#progress").css("left", $("#downproj").position().left+"px");
	$("#progress").width(perc * maxWidth * 1.055 / 100);
}

function reset(){
	$("#downnow, #downproj").removeAttr("disabled");
	$("#downproj").removeAttr("disabled");
	$("#downinput").removeAttr("style");
	$("#downproj").attr("class", "w3-gray w3-hover-indigo w3-center w3-button");
}

function logMessage(msg){
	$("#log").text(msg+"\n"+$("#log").text());
}
