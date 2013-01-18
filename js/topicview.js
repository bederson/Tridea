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

function displayTopics() {
	$("#loading").css("display", "block");
	$.getJSON("/qtopics", "", displayTopicsImpl)
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
			html += "<a class='topicText' href='/ideagraph?topicid=" + topic.id + "'>" + topic.idea + "</a>";
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

function deleteIdea() {
	var id = $(".editActive").attr("id");
	$.post("/delete", {"id" : id}, function() {
		window.location.reload();
	});
}