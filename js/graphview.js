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

// CONSTANTS
var itemHeight = 26;
var groupVGap = 15;
var groupVMargin = 20;
var groupHMargin = 10;
var groupHorVar = 20;
var groupVerVar = 5;
var noIdYet = "NO_ID";

function displayIdeasByGraph() {
	display = "graph";
	displayIdeas();
}

function displayIdeasGrouped(ideas) {
	if (ideas.length == 0) {
		$("#resultsNote").append("- Double-click anywhere to add one");
	}

	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		
		if (idea.children.length == 0) {
			// Standalone ideas (not in a group)
			genIdeaHTML(idea.idea, idea.id, idea.x, idea.y, true);
		} else {
			// Group
			genGroupHTML(idea);
		}
	}

	createEventHandlers();

	// TODO: HELP - item height's are set properly after they are inserted into the DOM
	// so layout is broken. Instead, if I wait a bit, and then layout, then the heights
	// are propertly computed and everything is fine - but this solution results in a screen flash.
	setTimeout(function() {
		$(".group").each(function() {
			layoutGroupChildren($(this));
		})
	}, 50);
}

function genGroupHTML(idea) {
	var children = idea.children;
	var numChildren = children.length;

	// Select an image to use for the group
	var rectNum = 1 + Math.floor(NUM_RECTS * Math.random());
	var rectImageName = "images/rect" + rectNum + ".png";

	// First create group
	var html = "";
	var maxGroupWidth = TEXT_MAX_WIDTH + (2* groupHMargin) + groupHorVar;
	html += "<div id='" + idea.id + "' class='group draggable' behavior='selectable' style='position:absolute; left:" + idea.x + "px; top:" + idea.y + "px; width:" + maxGroupWidth + "px'>";
	html += "<img src='" + rectImageName + "' style='position:absolute'></img>";
	html += "<span class='groupLabel editable' style='position:absolute; left:50px; top:-10px; white-space:nowrap;'>" + idea.idea + "</span>";

	// Then add children
	for (var i=0; i<numChildren; i++) {
		var child = children[i];
		html += genIdeaHTML(child.idea, child.id, 0, 0, false);
	}
	
	html += "</div>";
	
	$("#ideas").append(html);
	
	layoutGroupChildren($("#" + idea.id))
}

function genIdeaHTML(text, id, x, y, addToDOM) {
	var html = "";

	var pos = "";
	if (!(typeof x === 'undefined') && !(typeof y === 'undefined')) {
		pos = " left:" + x + "px; top:" + y + "px;";
	}
	html += "<div id='" + id + "' class='item draggable editable' behavior='selectable' style='position:absolute;" + pos + "'>";
	html += text;
	html += "</div>";

	if (addToDOM) {
		$("#ideas").append(html);
	}
	
	return html;
}

function savePosition(idea) {
	var pos = idea.position();
	var data = {
		"id" : idea[0].id,
		"x" : pos.left,
		"y" : pos.top
	};
	$.post("/move", data);
}

function addIdeaVis(fatherid, x, y) {
	// Save any open idea boxes
	if ($("#ideaBoxVis").size() > 0) {
		saveAndCloseIdeaVis();
	}
	
	var text = "New idea";
	var html = genIdeaHTML(text, noIdYet, x, y, true);
	editIdeaVis($("#" + noIdYet));

	var data = {
		"action":"id", 
		"idea": text, 
		"x": x,
		"y": y,
		"father": fatherid
	};
	$.post("/new", data, function(result) {
		if (result.id == "") {
			// Failed to create object
			$("#" + noIdYet).remove();
		} else {
			$("#" + noIdYet).attr("id", result.id);
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
	var parent = node.parent();
	if (parent.hasClass("group")) {
		var left = parent.position().left + node.position().left;
		var top = parent.position().top + node.position().top;
	} else {
		var left = node.position().left;
		var top = node.position().top;
	}
	var html = "<textarea id='ideaBoxVis' style='position:absolute; left:" + left + "px; top:" + top + "px;'></textarea>";
	$("#ideas").append(html);
	var ideaBox = $("#ideaBoxVis");
	ideaBox.val(origText);
	ideaBox.autogrow();
	ideaBox.select();
	ideaBox.focus();

	createEventHandlers();
	ideaBox.on("keydown", function(evt) {
		// Return or ESC key
		if ((evt.keyCode == 13) || (evt.keyCode == 27)) {
			saveAndCloseIdeaVis();
		}
	});
}

function saveAndCloseIdeaVis() {
	var ideaBox = $("#ideaBoxVis");
	if (ideaBox.length > 0) {
		var node = $(".editing");
		var text = ideaBox.val();
		ideaBox.remove();
		node.html(text);
		node.removeClass("editing");
		if (node.hasClass("groupLabel")) {
			var group = node.parent();
			var id = group.attr("id");
			layoutGroupChildren(group);
		} else {
			var id = node.attr("id");
			updateItemBounds(node);
		}

		// Safety - shouldn't happen (ID not yet assigned), but sometimes it does
		if (id != noIdYet) {
			var data = {
				"idea": text,
				"id": id
			};
			$.post("/edit", data);

			$("*").removeClass("selected");		// First remove any existing selection
			$("*").removeClass("hilited");		// Remove any hiliting
		}
	}
}

function updateItemBounds(node) {
	var width = node.width();
	if (width > TEXT_MAX_WIDTH) {
		node.width(TEXT_MAX_WIDTH);
	}
}

function deleteIdea(node) {
	if (node.length > 0) {
		if (node.hasClass("groupLabel")) {
			node = node.parent();
		}
		var id = node.attr("id");
		node.remove();
		$.post("/delete", {"id" : id});
	}
}

/////////////////////
// GROUP MANAGEMENT
/////////////////////

// Create a new group out of the specified items
function combineItemsInToGroup(item1, item2) {
	// Position group correctly
	var item1Pos = item1.position();
	var item1x = item1Pos.left;
	var item1y = item1Pos.top;
	var item2Pos = item2.position();
	var item2x = item2Pos.left;
	var item2y = item2Pos.top;
	var x = Math.min(item1x, item2x);
	var y = Math.min(item1y, item2y);

	var id = "none";
	var idea = {
		id: id,
		idea: "GROUP",
		children: [],
		x: x,
		y: y
	}
	var html = genGroupHTML(idea);
	var ideas = $("#ideas");
//	ideas.append(html);
	var group = $("#none");
	
	moveInToGroup(item1, group);
	moveInToGroup(item2, group);

	var topicid = getURLParameter("topicid");
	var data = {
		"action": "id",
		"idea": idea.idea,
		"x": x,
		"y": y,
		"father" : topicid
	};
	$.post("/new", data, function(result) {
		if (result.id == "") {
			// Failed to create object
//			$("#" + noIdYet).remove();
			console.log("FAILED TO CREATE NEW GROUP");
		} else {
			$("#" + id).attr("id", result.id);
			createEventHandlers();

			// Reparent items in DB
			data = {
				"id": item1.attr("id"),
				"newFather": result.id
			};
			$.post("/reparent", data, function() {
				data = {
					"id": item2.attr("id"),
					"newFather": result.id
				};
				$.post("/reparent", data);
			});
		}
	});
}

// Move the specified node in to the specified group
function moveInToGroup(node, group) {
	// Insure that specified node is a regular item
	if (!node.hasClass("item")) {
		return;
	}
	// Insure that specified group is a valid group
	if (!group.hasClass("group")) {
		return;
	}
	
	node.appendTo(group);		// Update data structure to move node in to group
	
	// Keep node in same position on screen
	var groupPos = group.position();
	var groupx = groupPos.left;
	var groupy = groupPos.top;
	var nodePos = node.position();
	if (node.hasClass("selected")) {
		var x = parseInt(node.attr("nodedownx"));
		var y = parseInt(node.attr("nodedowny"));
	} else {
		var nodePos = node.position();
		var x = nodePos.left;
		var y = nodePos.top;
	}
	x -= groupx;
	y -= groupy;
	node.css("left", x);
	node.css("top", y);
	node.attr("nodedownx", x);
	node.attr("nodedowny", y);

	updateGroupBounds(group);
	group.addClass("groupUpdated");

	// Update database - only if group has already been put in DB
	var groupID = group.attr("id");
	if (groupID != "none") {
		data = {
			"id": node.attr("id"),
			"newFather": group.attr("id")
		};
		$.post("/reparent", data);
	}
}

// Move the specified node out of its group
function moveOutOfGroup(node) {
	// Insure that node is a regular item
	if (!node.hasClass("item")) {
		return;
	}
	var group = node.parent();
	// Insure that item is in a group
	if (!group.hasClass("group")) {
		return;
	}
	
	node.appendTo(group.parent());		// Update data structure to move node out of group
	
	// Keep node in same position on screen
	var groupPos = group.position();
	var groupx = groupPos.left;
	var groupy = groupPos.top;
	var nodePos = node.position();
	var x = parseInt(node.attr("nodedownx"));
	var y = parseInt(node.attr("nodedowny"));
	x += groupx;
	y += groupy;
	node.css("left", x);
	node.css("top", y);
	node.attr("nodedownx", x);
	node.attr("nodedowny", y);

	layoutGroupChildren(group);

	// Update database
	var topicid = getURLParameter("topicid");
	data = {
		"id": node.attr("id"),
		"newFather": topicid
	};
	$.post("/reparent", data, function() {
		// Delete group if it is now empty
		if (group.children(".item").length == 0) {
			deleteIdea(group);
		}
	});
}

// Relayout position of children with a group
function layoutGroupChildren(group) {
	// Insure valid group
	if (!group.hasClass("group")) {
		return;
	}

	var maxGroupWidth = TEXT_MAX_WIDTH + (2* groupHMargin) + groupHorVar;
	group.width(maxGroupWidth);
	
	var children = group.children();
	var firstChild = true;
	var x = groupHMargin + groupHorVar;		// Always put first item all the way to the right (to avoid looking hierarchical)
	var y = groupVMargin;
	var maxWidth = 0;
	children.each(function() {
		var child = $(this);
		if (child.hasClass("item")) {
			updateItemBounds(child);
			var gap = 2 + Math.ceil(Math.random() * groupVerVar);
			if (firstChild) {
				firstChild = false;
			} else {
				x = groupHMargin + Math.floor(Math.random() * groupHorVar);
			}
			child.css("left", x);
			child.css("top", y);
			var width = child.width();
			maxWidth = Math.max(width, maxWidth);
			y += child.height() + gap;
		}
	});
	y += groupVMargin;
	var groupWidth = maxWidth + (2 * groupHMargin) + groupHorVar + 10;
	group.width(groupWidth);
	group.height(y);

	// Update image dimensions
	var image = group.children("img");
	image.width(groupWidth);
	image.height(group.height());
}

// Update group bounds to include all children
function updateGroupBounds(group) {
	var children = group.children();
	var w = 0;
	var h = 0;
	children.each(function() {
		var child = $(this);
		if (child.hasClass("item")) {
			var child = $(this);
			var childRight = child.position().left + child.width();
			if (childRight > w) w = childRight;
			var childBottom = child.position().top + child.height();
			if (childBottom > h) h = childBottom;
		}
	});
	w += groupHMargin + groupHorVar;
	h += groupVMargin;
	group.width(w);
	group.height(h);

	// Update image dimensions
	var image = group.children("img");
	image.width(w);
	image.height(h);
}

// Node has moved - determine if it should be removed from or added to any groups
function updateGroups(node) {
	// Only update groups when dealing with individual items
	if (!node.hasClass("item")) {
		return;
	}
	
	var buffer = 5;

	// node bounds
	var nodePos = node.position();
	var nodex = nodePos.left;
	var nodey = nodePos.top;
	var nodew = node.width();
	var nodeh = node.height();

	var parent = node.parent();
	if (parent.hasClass("group")) {
		// Determine if node should be dragged OUT OF GROUP
//		console.log("Check if node (" + node.attr("id") + ": '" + node.html() + "') should be dragged OUT OF group");
		var group = parent;
		updateGroupBounds(group);

		// Original group bounds (w/ buffer)
		var groupx = parseInt(group.attr("origx")) - buffer;
		var groupy = parseInt(group.attr("origy")) - buffer;
		var groupw = parseInt(group.attr("origw")) + 2*buffer;
		var grouph = parseInt(group.attr("origh")) + 2*buffer;
	
		// Determine if node has been dragged out of group
		if ((nodex > groupw) || (nodey > grouph) || ((nodex + nodew) < 0) || ((nodey + nodeh) < 0)) {
//			console.log("node dragged OUT OF GROUP");
			moveOutOfGroup(node);
		}
	} else {
		// Determine if node should be dragged INTO GROUP
//		console.log("Check if node (" + node.attr("id") + ": '" + node.html() + "') should be dragged IN TO group");
		var nodex1 = nodex;
		var nodey1 = nodey;
		var nodex2 = nodex + nodew;
		var nodey2 = nodey + nodeh;
		
		// First look at groups to see if we are dragging into a group
		var groups = $(".group");
		groups.each(function() {
			var group = $(this);
			// Group bounds (w/ buffer)
			var groupPos = group.position();
			var groupx1 = groupPos.left + buffer;
			var groupy1 = groupPos.top + buffer;
			var groupx2 = groupx1 + group.width() - 2*buffer;
			var groupy2 = groupy1 + group.height() - 2*buffer;
			
			if ((nodex1 < groupx2) && (nodey1 < groupy2) && (nodex2 > groupx1) && (nodey2 > groupy1)) {
				// console.log("node dragged IN TO GROUP");
				moveInToGroup(node, group);
			}
		});
		
		// Then look at items to see if we are dragging onto another item
		var items = $("#ideas").children(".item");
		items.each(function() {
			var item = $(this);
			if (item.attr("id") != node.attr("id")) {
				// Item bounds (w/ buffer)
				var itemPos = item.position();
				var itemx1 = itemPos.left + buffer;
				var itemy1 = itemPos.top + buffer;
				var itemx2 = itemx1 + item.width() - 2*buffer;
				var itemy2 = itemy1 + item.height() - 2*buffer;
				if ((nodex1 < itemx2) && (nodey1 < itemy2) && (nodex2 > itemx1) && (nodey2 > itemy1)) {
					// console.log("node dragged ON TO ITEM: " + item.html());
					combineItemsInToGroup(node, item);
				}
			}
		});
	}
}

// EVENT HANDLERS
function createEventHandlers() {
	// First remove all old event handlers
	$("*").off("mousedown");
	$("*").off("mousemove");
	$("*").off("mouseup");
	$("*").off("keydown");
	$("*").off("dblclick");
	
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
			var group = node;
			itemToHilite = node.find(".groupLabel");
		}
		var parent = node.parent();
		if (parent.hasClass("group")) {
			// Remember original group bounds
			var group = parent;
			var groupPos = group.position();
			group.attr("origx", groupPos.left);
			group.attr("origy", groupPos.top);
			group.attr("origw", group.width());
			group.attr("origh", group.height());
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
			node.css("left", x + "px");
			node.css("top", y + "px");
			node.addClass("moved");

			updateGroups(node);

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
			layoutGroupChildren(node.parent());
			savePosition(node);		// Update database
		}
		
		// Clear saved data
		node.removeAttr("nodedownx");
		node.removeAttr("nodedowny");
		node.removeAttr("mousedownx");
		node.removeAttr("mousedowny");
		node.removeAttr("origx");
		node.removeAttr("origy");
		node.removeAttr("origw");
		node.removeAttr("origh");

		$(".groupUpdated").each(function() {
			var group = $(this);
			layoutGroupChildren(group);
			updateGroupBounds(group);
			group.removeClass("groupUpdated");
		})

		return false;
	});

	// Double click to edit existing item
	$(".item").on("dblclick", function(evt) {
		editIdeaVis($(this));
		evt.stopPropagation();
	});
	$(".groupLabel").on("dblclick", function(evt) {
		editIdeaVis($(this));
		evt.stopPropagation();
	});

	// Double click on background to create new item
	$("#ideas").on("dblclick", function(evt) {
		var topicid = getURLParameter("topicid");
		var ideasPos = $("#ideas").position();
		var x = evt.pageX - ideasPos.left;
		var y = evt.pageY - ideasPos.top;
		addIdeaVis(topicid, x, y);
	});
}