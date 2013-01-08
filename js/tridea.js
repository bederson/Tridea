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
		var numPapersStr = 'No ideas yet';
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
			var tools = "<span class='editIcons' key='" + idea.key + "' style='visibility:hidden'>";
			tools += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='float:left; vertical-align:bottom'></a>&nbsp;";
			tools += "<a id='addIdea' href='javascript:addIdea()'>add</a>";
			tools += "&nbsp;&nbsp;</span>";

			html += "<div class='idea' id='" + idea.key + "' behavior='editable'>";
			html += tools;
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

function addIdea() {
	disableIdeaTools();
	
	var key = $(".editActive").attr("id");
	$(".editActive").find(".editIcons").css("visibility", "hidden");

	var html = "<div id='ideaAdd'>";
	html += "<textarea id='ideaBox' type='text'></textarea><br>";
	html += "<input id='ideaSave' type='button' value='Add Idea'> <a id='ideaCancel' key='" + key + "' href='javascript:return false'>Cancel</a>";
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
		$.post("/new", {"idea" : idea, "father" : key}, function() {
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
	var key = $(".editActive").attr("id");
	$.post("/delete", {"key" : key}, function() {
		window.location.href = "/";
	});
}