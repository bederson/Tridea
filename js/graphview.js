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

function displayIdeasGrouped(ideas) {
	var html = "";
	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		
		if (idea.children.length == 0) {
			// Standalone ideas (not in a group)
			html += genIdeaHTML(idea, idea.x, idea.y);
		} else {
			// Group
			html += genGroupHTMLStart(idea, idea.children.length);
		}
	}
	
	return html;
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
	html += "<span class='groupLabel editable' style='position:absolute; left:75px; top:-10px'>" + idea.idea + "</span>";

	// Then add children
	var children = idea.children
	for (var i=0; i<children.length; i++) {
		var child = children[i];
		var x = 30 + Math.floor(Math.random() * 20);
		var y = 20 + i * 28;
		html += genIdeaHTML(child, x, y);
	}
	
	html += "</div>";
	
	return html;
}

function genIdeaHTML(idea, x, y) {
	var html = "";

	html += "<span id='" + idea.id + "' class='item draggable editable' behavior='selectable' style='position:absolute; left:" + x + "px; top:" + y + "px; white-space:nowrap;'>";
	html += idea.idea;
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
	// Don't do anything if idea box already open
	if ($("#ideaBoxVis").size() > 0) {
		saveAndCloseIdeaVis();
	}
	
	var ideas = $("#ideas");
	var text = "New idea";
	var html = genIdeaHTML(text, 50, 50);
	console.log(html);
	ideas.append(html);

	var queryStr = {"idea" : text, "father" : fatherId};
	$.post("/new", queryStr, function() {
		window.location.reload();
	});

//	editIdeaVis(idea);
}

function editIdeaVis(node) {
	// Don't do anything if idea box already open
	if ($("#ideaBoxVis").size() > 0) {
		saveAndCloseIdeaVis();
	}

	node.addClass("editing");
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
