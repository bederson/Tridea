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

function displayIdeasByGraph() {
	display = "graph";	
	displayIdeas();
}

function displayIdeasGrouped(ideas) {
	var html = "";
	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		
		if (idea.children.length == 0) {
			// Standalone ideas (not in a group)
			html += genIdeaHTML(idea.idea, idea.id, idea.x, idea.y);
		} else {
			// Group
			html += genGroupHTMLStart(idea, idea.children.length);
		}
	}

	$("#ideas").append(html);
	createEventHandlers();
}

function genGroupHTMLStart(idea, numChildren) {
	// Select an image to use for the group
	var rectNum = 1 + Math.floor(numRects * Math.random());
	var rectImageName = "images/rect" + rectNum + ".png";

	// First create group
	var height = 40 + numChildren * 23;
	var html = "";
	html += "<div id='" + idea.id + "' class='group draggable' behavior='selectable' style='position:absolute; left:" + idea.x + "px; top:" + idea.y + "px;'>";
	html += "<img src='" + rectImageName + "' style='position:absolute' width=200px height=" + height + "px></img>";
	html += "<span class='groupLabel editable' style='position:absolute; left:50px; top:-10px; white-space:nowrap;'>" + idea.idea + "</span>";

	// Then add children
	var children = idea.children
	for (var i=0; i<children.length; i++) {
		var child = children[i];
		var x = 30 + Math.floor(Math.random() * 20);
		var y = 20 + i * 28;
		html += genIdeaHTML(child.idea, child.id, x, y);
	}
	
	html += "</div>";
	
	return html;
}

function genIdeaHTML(text, id, x, y) {
	var html = "";

	html += "<span id='" + id + "' class='item draggable editable' behavior='selectable' style='position:absolute; left:" + x + "px; top:" + y + "px; white-space:nowrap;'>";
	html += text;
	html += "</span>";
	
	return html;
}

function savePosition(idea) {
	var pos = idea.position();
	var queryStr = {
		"id" : idea[0].id,
		"x" : pos.left,
		"y" : pos.top
	};
	$.post("/move", queryStr);
}

function addIdeaVis(fatherId) {
	// Save any open idea boxes
	if ($("#ideaBoxVis").size() > 0) {
		saveAndCloseIdeaVis();
	}
	
	var ideas = $("#ideas");
	var text = "New idea";
	var html = genIdeaHTML(text, "newIdea", 50, 50);
	ideas.append(html);
	editIdeaVis($("#newIdea"));

	var queryStr = {"idea" : text, "father" : fatherId};
	$.post("/new", queryStr, function(result) {
		if (result.id == "") {
			// Failed to create object
			$("#newIdea").remove();
		} else {
			$("#newIdea").attr("id", result.id);
			createEventHandlers();
			$("#ideaBoxVis").select();
		}
	});
}

function editIdeaVis(node) {
	// Save any open idea boxes
	if ($("#ideaBoxVis").size() > 0) {
		saveAndCloseIdeaVis();
	}

	node.addClass("editing");
	node.removeClass("hilited");
	var id = node.attr("id");
	var origText = node.text();
	var origLeft = node.position().left;
	var origTop = node.position().top;
	var html = "<input type='text' id='ideaBoxVis' style='position:absolute' type='text'></textarea>";
	node.append(html);
	var ideaBox = $("#ideaBoxVis");
	ideaBox.css("left", 0);
	ideaBox.css("top", 0);
	ideaBox.width(node.width());
	ideaBox.val(origText);
	ideaBox.focus();
	ideaBox.on("keypress", function(evt) {
		if (evt.keyCode == 13) {
			// Return key
			saveAndCloseIdeaVis();
		}
	});
}

function saveAndCloseIdeaVis() {
	var ideaBox = $("#ideaBoxVis");
	if (ideaBox.length > 0) {
		var node = $(".editing");
		var text = ideaBox.val();
		if (node.hasClass("groupLabel")) {
			var id = node.parent().attr("id");
		} else {
			var id = node.attr("id");
		}
		node.html(text);
		node.removeClass("editing");

		var queryStr = {"idea" : text, "id" : id};
		$.post("/edit", queryStr);

		$("*").removeClass("selected");		// First remove any existing selection
		$("*").removeClass("hilited");		// Remove any hiliting
	}
}

function deleteIdea(node) {
	if (node.length > 0) {
		if (node.hasClass("groupLabel")) {
			node = node.parent();
		}
		var id = node.attr("id");
		node.remove();
		$.post("/delete", {"id" : id}, function() {
			window.location.reload();   // Necessary to show promoted notes
		});
	}
}

// EVENT HANDLERS
function createEventHandlers() {
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

		// Key support on selected items
		$("*").on("keydown", function(evt) {
			var kc = evt.keyCode;
			if ((kc == 8) || (kc == 46)) {  // Delete keys
				var node = $(".hilited");
				if (node.length > 0) {
					deleteIdea($(".hilited"));
					evt.preventDefault();
				}
			}
		});

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