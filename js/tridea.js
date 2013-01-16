// Copyright 2013 Ben Bederson - http://www.cs.umd.edu/~bederson
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

$(function() {
	// Initialization goes here
});

function showView(display) {
	var topicid = getURLParameter("topicid");
	if (display == "list") {
		var pathname = "idealist";
	} else {
		var pathname = "ideagraph";
	}
	var url = window.location.protocol + "//" + window.location.host + "/" + pathname;
	url += "?topicid=" + topicid;
	window.location.replace(url);
}

function displayTopics() {
	$("#loading").css("display", "block");
	$.getJSON("/qTopics", "", displayTopicsImpl)
}

function displayIdeasByList() {
	display = "list";
	displayIdeas();
}

function displayIdeasByGraph() {
	display = "graph";	
	displayIdeas();
}

function displayIdeas() {
	$("#loading").css("display", "block");
	var topicid = getURLParameter("topicid");
	var queryStr = {"topicid" : topicid};

	positionFooter();
	$(window).resize(function() {
		positionFooter();
	});

	$.getJSON("/qIdeas", queryStr, displayIdeasImpl)
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
		$("#ideas").append(listHTML);
	} else {
		var groupHTML = displayIdeasGrouped(ideas);
		$("#ideas").append(groupHTML);
	}
	
	enableIdeaTools();	
}

// Put the footer at the bottom of the page
function positionFooter() {
	var bottom = $(window).height() - 30 + "px";
	$("#footer").css("top", bottom);
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
	
	// Single click select (with Drag)
	$("*").on("mousedown", function(evt) {
		saveAndCloseIdeaVis();
		$("*").removeClass("selected");		// First remove any existing selection
		$("*").removeClass("hilited");		// Remove any hiliting
	});
	$("[behavior=selectable]").on("mousedown", function(evt) {
		var node = $(this);
		var nodePos = node.position();
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
			var x = parseInt(node.attr("nodedownx")) + dx;
			var y = parseInt(node.attr("nodedowny")) + dy;
			if (y < 0) y = 0;
			node.css("left", x + "px");
			node.css("top", y + "px");
			node.addClass("moved");

			return false;
		});

		return false;
	});
	// Mouse up ends drag
	$("[behavior=selectable]").on("mouseup", function(evt) {
		var node = $(this);
		$("*").removeClass("selected");
		$("*").off("mousemove");

		if (node.hasClass("moved")) {
			node.removeClass("moved");
			savePosition(node);
		}

		return false;
	});

	// Double click to edit
	$(".editable").on("dblclick", function(evt) {
		editIdeaVis($(this));
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