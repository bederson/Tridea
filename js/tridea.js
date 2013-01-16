// Copyright 2012 Ben Bederson - http://www.cs.umd.edu/~bederson
// University of Maryland
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var numRects = 7;		// Number of group rectangle images
var display = "list";

$(function() {
	// Initialization goes here
});

function show(display) {
	var topicid = getURLParameter("topicid");
	var url = window.location.protocol + "//" + window.location.host + window.location.pathname + "?topicid=" + topicid + "&display=" + display;
	window.location.replace(url);
}

function displayTopics() {
	$("#loading").css("display", "block");
	$.getJSON("/qTopics", "", displayTopicsImpl)
}

function displayIdeas(topicid) {
	$("#loading").css("display", "block");
	var topicid = getURLParameter("topicid");
	display = getURLParameter("display");
	var queryStr = {"topicid" : topicid};
	$.getJSON("/qIdeas", queryStr, displayIdeasImpl)
}

function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(window.location.search)||[,null])[1]
    );
}

function displayTopicsImpl(result) {
	$("#loading").css("display", "none");

	var topics = result['topics'];
	var html = "";
	var numTopics = 0;
	for (var i=0; i<topics.length; i++) {
		var topic = topics[i];
		// Determine if root topic
		if (topic.father == null) {
			numTopics += 1;
			// Edit icons
			var tools = "<span class='editIcons' style='visibility:hidden; float:left; width:25px'>";
			tools += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='float:left; vertical-align:bottom'></a>";
			tools += "</span>";
			var actionable = "";
			if (user_id == topic.authorId) {
				actionable = "behavior='actionable'";
			}
			html += "<div class='idea' id='" + topic.id + "' " + actionable + ">";
			// Topic
			if (logged_in) {  // Only allow interaction with ideas if logged in
				html += tools;
			}
			html += "<a class='topicText' href='/ideas?topicid=" + topic.id + "&display=list'>" + topic.idea + "</a>";
			html += "<span class='author'>&nbsp;&nbsp;&nbsp -- " + topic.author + "</span>";
			html += "</div>";
		}
	}
	$("#topics").append(html);

	// Display # Topics
	if (numTopics == 0) {
		var numTopicsStr = 'No topics yet';
	} else if (numTopics == 1) {
		var numTopicsStr = '1 Topic';
	} else {
		var numTopicsStr = numTopics + ' Topics';
	}
	$("#resultsOverview").html(numTopicsStr);

	enableIdeaTools();
}

function displayIdeasImpl(result) {
	$("#loading").css("display", "none");

	var numIdeas = result['count'];
	var ideas = result['ideas'];
	if (numIdeas == 0) {
		var topicid = result['topicid'];
		var numIdeasStr = 'No ideas yet';
	} else if (numIdeas == 1) {
		var numIdeasStr = '1 Idea';
	} else {
		var numIdeasStr = numIdeas + ' Ideas';
	}
	$("#resultsOverview").html(numIdeasStr);
	$("#topic").html("Topic: " + result['topic']);

	if (display == "list") {
		var listHTML = displayIdeasList(ideas, 0);
		$("#ideaList").append(listHTML);
	} else {
		var groupHTML = displayIdeasGrouped(ideas);
		$("#ideaGroups").append(groupHTML);
	}
	
	positionFooter();
	$(window).resize(function() {
		positionFooter();
	});

	enableIdeaTools();	
}

function positionFooter() {
	var bottom = $(window).height() - 50 + "px";
	$("#footer").css("top", bottom);
}

function displayIdeasGrouped(ideas) {
	var html = "";
	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		
		if (idea.children.length == 0) {
			html += genIdeaHTML(idea, i);
		} else {
			html += genGroupHTMLStart(idea, idea.children.length);
			html += displayIdeasGrouped(idea.children)
			html += genGroupHTMLEnd(idea);
		}
	}
	
	return html;
}

function genGroupHTMLStart(idea, numChildren) {
	var html = "";
	
	var rectNum = 1 + Math.floor(numRects * Math.random());
	var rectImageName = "images/rect" + rectNum + ".png";
	var height = 40 + numChildren * 23;
	html += "<div class='group draggable' behavior='selectable' style='position:absolute; left:" + idea.x + "px; top:" + idea.y + "px;'>";
	html += "<img src='" + rectImageName + "' style='position:absolute' width=200px height=" + height + "px></img>";
	html += "<span class='groupLabel' style='position:absolute; left:75px; top:-10px'>" + idea.idea + "</span>";
	
	return html;
}

function genGroupHTMLEnd(idea) {
	return "</div>";
}

function genIdeaHTML(idea, i) {
	var html = "";
	
	var x = 30 + Math.floor(Math.random() * 20);
	var y = 20 + i * 23;
	html += "<span class='item draggable' behavior='selectable' style='position:absolute; left:" + x + "px; top:" + y + "px; white-space:nowrap;'>";
	html += idea.idea;
	html += "</span>";
	
	return html;
}

function displayIdeasList(ideas, depth) {
	var html = "";
	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		// Edit icons at beginning of line
		var tools = "<span class='editIcons' style='visibility:hidden; float:left; width:75px'>";
		tools += "<a id='addIdea' href='javascript:addIdea(" + idea.id + ")'>add</a>&nbsp;&nbsp;";
		if (idea.doesLike) {
			tools += "<a id='likeIdea' href='javascript:unlikeIdea()'>unlike</a>";
		} else {
			tools += "<a id='likeIdea' href='javascript:likeIdea()'>like</a>";
		}
		tools += "</span>";

		// Indentation for hierarchy
		var indent = "";
		for (var j=0; j<depth; j++) {
			indent += "<span style='margin-right:15px; color:#bbb'>|</span>";
		}
		
		// Likes
		var likes = "<span style='float:left; width:35px'>&nbsp;";
		if (idea.likes > 0) {
			likes += idea.likes + "<img src='images/heart.png'> ";
		}
		likes += "</span>"

		// Idea
		html += "<div class='idea' id='" + idea.id + "' behavior='actionable'>";
		if (logged_in) {  // Only allow interaction with ideas if logged in
			html += tools;
		}
		var editable = "";
		if (user_id == idea.authorId) {
			editable = "behavior='editable'";
		}
		html += likes;
		html += indent;
		html += "<span class='ideaText' " + editable + ">" + idea.idea + "</span>";
		html += "<span class='author'>&nbsp;&nbsp;&nbsp -- " + idea.author + "</span>";
		html += "</div>";
		
		// Process children
		html += displayIdeasList(idea.children, depth + 1);
	}

	return html;
}

function enableIdeaTools() {
	// Don't allow interaction with ideas if not logged in
	if (!logged_in) {
		return;
	}
	
	// Event handlers on ideas
	$("[behavior=actionable]").on("mouseenter", function(evt) {
	    showIdeaTools(evt);
	});
	$("[behavior=actionable]").on("mouseleave", function(evt) {
	    hideIdeaTools(evt);
	});
	
	$(".ideaText[behavior=editable]").on("click", function(evt) {
		editIdea();
	});
	
	// Single click select
	$("[behavior=selectable]").on("mousedown", function(evt) {
		$(".selected").removeClass("selected");  // First remove any existing selection
		var node = $(this);
		var nodePos = node.position();
//		console.log("mouse DOWN: " + "node: " + nodePos.left + ", " + nodePos.top + " mouse: " + evt.pageX + ", " + evt.pageY);
		node.attr("nodedownx", nodePos.left);
		node.attr("nodedowny", nodePos.top);
		node.attr("mousedownx", evt.pageX);
		node.attr("mousedowny", evt.pageY);
		$(node).addClass("selected");
		var itemToHilite = node;
		if (node.hasClass("group")) {
			itemToHilite = node.find(".groupLabel");
		}
		itemToHilite.addClass("hilited");

		// Drag support
		$("*").on("mousemove", function(evt) {
			var node = $(".selected");
			var nodePos = node.position();
			var dx = evt.pageX - node.attr("mousedownx");
			var dy = evt.pageY - node.attr("mousedowny");
			var x = parseInt(node.attr("nodedownx")) + dx + "px";
			var y = parseInt(node.attr("nodedowny")) + dy + "px";
//			console.log("mouse DRAG: " + "node: " + nodePos.left + ", " + nodePos.top + " mouse: " + evt.pageX + ", " + evt.pageY);
//			console.log("drag: dx = " + dx + ", dy = " + dy + ", x = " + x + ", y = " + y);
			node.css("left", x);
			node.css("top", y);

			return false;
		});

		return false;
	});
	$("[behavior=selectable]").on("mouseup", function(evt) {
//		console.log("mouse UP");
		var node = $(this);
		$("*").removeClass("selected");
		$("*").removeClass("hilited");
		$("*").off("mousemove");

		return false;
	});

	// Double click edit
	$("[behavior=xxx]").on("dblclick", function(evt) {
		var node = evt.currentTarget;
		console.log("double click: " + node.text());
//		$(node).addClass("selected");
	});
}

function disableIdeaTools() {
	$("[behavior=actionable]").off("mouseenter");
	$("[behavior=actionable]").off("mouseleave");
	$(".ideaText[behavior=editable]").off("click");
}

function showIdeaTools(evt) {
	var ideaNode = evt.currentTarget;
	$(ideaNode).addClass("editActive");
	$(ideaNode).find(".editIcons").css("visibility", "visible");
}

function hideIdeaTools(evt) {
	var ideaNode = evt.currentTarget;
	$(ideaNode).removeClass("editActive");
	$(ideaNode).find(".editIcons").css("visibility", "hidden");
}

function likeIdea() {
	var id = $(".editActive").attr("id");
	$.post("/like", {"id" : id}, function() {
		window.location.reload();
	});
}

function unlikeIdea() {
	var id = $(".editActive").attr("id");
	$.post("/unlike", {"id" : id}, function() {
		window.location.reload();
	});
}

function addIdea(fatherId) {
	// Don't do anything if idea box already open
	if ($("#ideaBox").size() > 0) {
		return;
	}
	disableIdeaTools();
	$(".editActive").find(".editIcons").css("visibility", "hidden");

	var html = "<div id='ideaAdd'>";
	html += "<textarea id='ideaBox' type='text'></textarea><br>";
	html += "<input id='ideaSave' type='button' value='Add Idea'>&nbsp;&nbsp;"
	html += "<a id='ideaCancel' href='#'>Cancel</a>";
	html += "</div>";
	$(".editActive").append(html);
	var origText = $(".editActive").find(".ideaText").text();
	var origLeft = $(".editActive").find(".ideaText").position().left;
	$("#ideaAdd").css("margin-left", origLeft);
	$("#ideaBox").val(origText);
	$("#ideaBox").focus();

	$("#ideaSave").click(function() {
		var idea = $("#ideaBox").val();
		var queryStr = {"idea" : idea, "father" : fatherId};
		$.post("/new", queryStr, function() {
			window.location.reload();
		});
	});

	$("#ideaCancel").click(function() {
		cancelAddIdea();
	});
}

function editIdea() {
	// Don't do anything if idea box already open
	if ($("#ideaBox").size() > 0) {
		return;
	}
	disableIdeaTools();
	$(".editActive").find(".editIcons").css("visibility", "hidden");

	var id = $(".editActive").attr("id");
	var html = "<div id='ideaAdd' style='position:absolute; background:white'>";
	html += "<textarea id='ideaBox' type='text'></textarea><br>";
	html += "<input id='ideaSave' type='button' value='Save Idea'>&nbsp;&nbsp;"
	html += "<a id='ideaCancel' href='#'>Cancel</a>&nbsp;&nbsp;";
	html += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='vertical-align: text-bottom'></a>&nbsp;&nbsp;";
	html += "</div>";
	var ideaText = $(".editActive").find(".ideaText");
	var origText = ideaText.text();
	ideaText.append(html);
	var origLeft = ideaText.position().left;
	var origTop = ideaText.position().top;
	var ideaAdd = $("#ideaAdd");
	ideaAdd.css("left", origLeft);
	ideaAdd.css("top", origTop);
	var ideaBox = $("#ideaBox");
	ideaBox.width(ideaText.width());
	ideaBox.val(origText);
	ideaBox.select();
	ideaBox.focus();

	$("#ideaSave").click(function() {
		var idea = $("#ideaBox").val();
		var queryStr = {"idea" : idea, "id" : id};
		$.post("/edit", queryStr, function() {
			window.location.reload();
		});
	});

	$("#ideaCancel").click(function() {
		cancelAddIdea();
	});
}

function cancelAddIdea() {
	$(".editActive").removeClass("editActive");
	$("#ideaAdd").remove();
	// Delay re-enabling tools or else the click that caused this cancel could re-invoke editing
	setTimeout(function() {
		enableIdeaTools();
	}, 100);
}

function deleteIdea() {
	var id = $(".editActive").attr("id");
	$.post("/delete", {"id" : id}, function() {
		window.location.reload();
	});
}