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
			tools += "<a href='javascript:deleteIdea()'><img id='ideaDelete' src='/images/trash.png' width='13' height='14' style='float:left'></a>&nbsp;";
			tools += "<a id='editIdea' href='javascript:editIdea()'>edit</a>";
			tools += "&nbsp;&nbsp;</span>";

			html += "<div class='idea' id='" + idea.key + "' behavior='editable'>";
			html += tools;
			html += "<span class='ideaText'>" + idea.idea + "</span>";
			html += "<span class='author'>&nbsp;&nbsp;&nbsp -- " + idea.author + "</span>";
			html += "</div>";
		}
		$("#ideas").append(html);

		// Event handlers on ideas
		$(".idea[behavior=editable]").mouseenter(function(evt) {
		    showIdeaTools(evt);
		});
		$(".idea[behavior=editable]").mouseleave(function(evt) {
		    hideIdeaTools(evt);
		});
	}
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

function editNote() {
	$("#editNoteLabel").css("visibility", "hidden");

	var id = $("#editNote").parents("table").attr("id");
	var key = id.substring(6);
	var tableDiv = $("#" + id);
	var noteDiv = $("#editNote").parents("table").find("td:last");
	var origText = noteDiv.text();
	var origWidth = noteDiv.width();
	if (origWidth < 250) origWidth = 250;
	var origHeight = noteDiv.height();
	if (origHeight < 35) origHeight = 35;
	var html = "<textarea id='noteBox' type='text'></textarea><br>";
	html += "<input id='noteSave' type='button' value='Save Note'> <a id='noteCancel' noteid='" + id + "' href='javascript:return false'>Cancel</a>"
	noteDiv.html(html);
	$("#noteBox").val(origText);
	$("#noteBox").css("width", origWidth);
	$("#noteBox").css("height", origHeight + 20);
	$("#noteBox").focus();
	$("#noteBox").keydown(function(event) {
		if (event.which == 27) {  // Escape key
			cancelEditNote(noteDiv, origText, key);
		}
	});

	$("#noteSave").click(function() {
		var note = $("#noteBox").val();
		noteDiv.html(note);
		hideNoteTools(key);
		var labelDiv = tableDiv.find("td:first").next();
		if (labelDiv.hasClass("empty")) {
			labelDiv.html("");
		}

		$.post("/save", {"key" : key, "note" : note});

		paperNum = paperNumsByKey[key];
		papers[paperNum]['note'] = note;

		$('#paper' + currentPaperIndex).focus();
	});

	$("#noteCancel").click(function() {
		cancelEditNote(noteDiv, origText, key);
	});
}

function cancelEditNote(noteDiv, origText, key) {
	noteDiv.html(origText);
	hideNoteTools(key);
	$('#paper' + currentPaperIndex).focus();
}

function deleteIdea() {
	var key = $(".editActive").attr("id");
	$.post("/delete", {"key" : key}, function() {
		window.location.href = "/";
	});
}