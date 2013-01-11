$(function() {
	// Initialization goes here
	displayIdeas();
});

function displayIdeas() {
	$("#loading").css("display", "block");
	$.getJSON("/q", "", displayIdeasImpl)
}

function displayIdeasImpl(result) {
	$("#loading").css("display", "none");

	var numIdeas = result['count'];
	var ideas = result['ideas'];
	if (numIdeas == 0) {
		var numIdeasStr = 'No ideas yet';
	} else if (numIdeas == 1) {
		var numIdeasStr = '1 Idea';
	} else {
		var numIdeasStr = numIdeas + ' Ideas';
	}
	$("#resultsOverview").html(numIdeasStr);

	if (numIdeas > 0) {
		var html = "";
		for (var i=0; i<ideas.length; i++) {
			var idea = ideas[i];
			// Edit icons at beginning of line
			var tools = "<span class='editIcons' style='visibility:hidden; float:left; width:110px'>";
			tools += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='float:left; vertical-align:bottom'></a>&nbsp;&nbsp;";
			tools += "<a id='addIdea' href='javascript:addIdea()'>add</a>&nbsp;&nbsp;";
			if (idea.doesLike) {
				tools += "<a id='likeIdea' href='javascript:unlikeIdea()'>unlike</a>";
			} else {
				tools += "<a id='likeIdea' href='javascript:likeIdea()'>like</a>";
			}
			tools += "&nbsp;&nbsp;</span>";

			// Indentation for hierarchy
			var indent = "";
			if (idea.father != null) {
				for (var j=0; j<idea.depth; j++) {
					indent += "<span style='margin-right:15px; color:#bbb'>|</span>";
				}
			}
			
			// Likes
			var likes = "<span style='float:left; width:40px'>&nbsp;";
			if (idea.likes > 0) {
				likes += idea.likes + "<img src='images/heart.png'> ";
			}
			likes += "</span>"

			// Idea
			html += "<div class='idea' id='" + idea.id + "' behavior='editable'>";
			html += tools;
			html += likes;
			html += indent;
			html += "<span class='ideaText'>" + idea.idea + "</span>";
			html += "<span class='author'>&nbsp;&nbsp;&nbsp -- " + idea.author + "</span>";
			html += "</div>";
		}
		$("#ideas").append(html);

		enableIdeaTools();
	}
}

function enableIdeaTools() {
	// Event handlers on ideas
	$(".idea[behavior=editable]").on("mouseenter", function(evt) {
	    showIdeaTools(evt);
	});
	$(".idea[behavior=editable]").on("mouseleave", function(evt) {
	    hideIdeaTools(evt);
	});
}

function disableIdeaTools() {
	$(".idea[behavior=editable]").off("mouseenter");
	$(".idea[behavior=editable]").off("mouseleave");
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
		window.location.href = "/";
	});
}

function unlikeIdea() {
	var id = $(".editActive").attr("id");
	$.post("/unlike", {"id" : id}, function() {
		window.location.href = "/";
	});
}

function addIdea() {
	disableIdeaTools();
	
	var id = $(".editActive").attr("id");
	$(".editActive").find(".editIcons").css("visibility", "hidden");

	var html = "<div id='ideaAdd'>";
	html += "<textarea id='ideaBox' type='text'></textarea><br>";
	html += "<input id='ideaSave' type='button' value='Add Idea'> <a id='ideaCancel' href='javascript:return false'>Cancel</a>";
	html += "</div>";
	$(".editActive").append(html);
	var origText = $(".editActive").find(".ideaText").text();
	var origLeft = $(".editActive").find(".ideaText").position().left;
	var origWidth = $(".editActive").width() - 200;
	var origHeight = $(".editActive").height();
	$("#ideaAdd").css("margin-left", origLeft);
	$("#ideaBox").val(origText);
	$("#ideaBox").css("width", "70%");
	$("#ideaBox").css("height", origHeight);
	$("#ideaBox").select();
	$("#ideaBox").focus();

	$("#ideaSave").click(function() {
		var idea = $("#ideaBox").val();
		$.post("/new", {"idea" : idea, "father" : id}, function() {
			window.location.href = "/";
		});
	});

	$("#ideaCancel").click(function() {
		cancelAddIdea();
	});
}

function cancelAddIdea() {
	enableIdeaTools();
	$(".editActive").removeClass("editActive");
	$("#ideaAdd").remove();
}

function deleteIdea() {
	var id = $(".editActive").attr("id");
	$.post("/delete", {"id" : id}, function() {
		window.location.href = "/";
	});
}