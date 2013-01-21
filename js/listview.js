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

function displayIdeasByList() {
	display = "list";
	displayIdeas();
}

function displayIdeasList(ideas) {
	html = displayIdeasListRecurse(ideas, 0);
	$("#ideas").append(html);
}

function displayIdeasListRecurse(ideas, depth) {
	var html = "";
	for (var i=0; i<ideas.length; i++) {
		var idea = ideas[i];
		// Edit icons at beginning of line
		var tools = "<span class='editIcons' style='visibility:hidden; float:left; width:75px'>";
		if (idea.doesLike) {
			tools += "<a id='likeIdea' href='javascript:unlikeIdea()'>unlike</a>&nbsp;&nbsp;";
		} else {
			tools += "<a id='likeIdea' href='javascript:likeIdea()'>like</a>&nbsp;&nbsp;";
		}
		if (depth == 0) {
			tools += "<a id='addIdea' href='javascript:addIdea(" + idea.id + ")'>add</a>";
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
		html += displayIdeasListRecurse(idea.children, depth + 1);
	}

	return html;
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
	$("#ideaBox").select();
	$("#ideaBox").focus();

	$("#ideaSave").click(function() {
		var text = $("#ideaBox").val();
		var data = {
			"client_id": client_id,
			"idea": text,
			"x": 50,
			"y": 50,
			"father": fatherId
		};
		$.post("/new", data, function() {
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
		var data = {
			"client_id": client_id,
			"idea": idea,
			"id": id
		};
		$.post("/edit", data, function() {
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
	var data = {
		"client_id": client_id,
		"id": id,
	}
	$.post("/delete", data, function() {
		window.location.reload();
	});
}