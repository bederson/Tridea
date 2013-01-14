$(function() {
	// Initialization goes here
});

function displayTopics() {
	$("#loading").css("display", "block");
	$.getJSON("/qTopics", "", displayTopicsImpl)
}

function displayIdeas(topicId) {
	$("#loading").css("display", "block");
	var topicId = getURLParameter("topicId");
	var queryStr = {"topicId" : topicId};
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
			var editable = "";
			if (user_id == topic.authorId) {
				editable = "behavior='editable'";
			}
			html += "<div class='idea' id='" + topic.id + "' " + editable + ">";
			// Topic
			if (logged_in) {  // Only allow interaction with ideas if logged in
				html += tools;
			}
			html += "<a class='topicText' href='/ideas?topicId=" + topic.id + "'>" + topic.idea + "</a>";
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
		var topicId = result['topicId'];
		var numIdeasStr = 'No ideas yet';
	} else if (numIdeas == 1) {
		var numIdeasStr = '1 Idea';
	} else {
		var numIdeasStr = numIdeas + ' Ideas';
	}
	$("#resultsOverview").html(numIdeasStr);
	$("#topic").html("Topic: " + result['topic']);

	if (numIdeas > 0) {
		var html = "";
		for (var i=0; i<ideas.length; i++) {
			var idea = ideas[i];
			// Edit icons at beginning of line
			var tools = "<span class='editIcons' style='visibility:hidden; float:left; width:105px'>";
			if (user_id == idea.authorId) {
				tools += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='float:left; vertical-align:bottom'></a>&nbsp;&nbsp;";
			}
			tools += "<a id='addIdea' href='javascript:addIdea(" + idea.id + ")'>add</a>&nbsp;&nbsp;";
			if (idea.doesLike) {
				tools += "<a id='likeIdea' href='javascript:unlikeIdea()'>unlike</a>";
			} else {
				tools += "<a id='likeIdea' href='javascript:likeIdea()'>like</a>";
			}
			tools += "</span>";

			// Indentation for hierarchy
			var indent = "";
			if (idea.father != null) {
				for (var j=1; j<idea.depth; j++) {
					indent += "<span style='margin-right:15px; color:#bbb'>|</span>";
				}
			}
			
			// Likes
			var likes = "<span style='float:left; width:35px'>&nbsp;";
			if (idea.likes > 0) {
				likes += idea.likes + "<img src='images/heart.png'> ";
			}
			likes += "</span>"

			// Idea
			html += "<div class='idea' id='" + idea.id + "' behavior='editable'>";
			if (logged_in) {  // Only allow interaction with ideas if logged in
				html += tools;
			}
			html += likes;
			html += indent;
			html += "<span class='ideaText'>" + idea.idea + "</span>";
			html += "<span class='author'>&nbsp;&nbsp;&nbsp -- " + idea.author + "</span>";
			html += "</div>";
		}
		$("#ideas").append(html);
	}

	enableIdeaTools();
}

function enableIdeaTools() {
	// Don't allow interaction with ideas if not logged in
	if (!logged_in) {
		return;
	}
	
	// Event handlers on ideas
	$("[behavior=editable]").on("mouseenter", function(evt) {
	    showIdeaTools(evt);
	});
	$("[behavior=editable]").on("mouseleave", function(evt) {
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
	disableIdeaTools();
	
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
		var queryStr = {"idea" : idea, "father" : fatherId};
		$.post("/new", queryStr, function() {
			window.location.reload();
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
		window.location.reload();
	});
}