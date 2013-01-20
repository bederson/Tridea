// Copyright 2013 Ben Bederson - http://www.cs.umd.edu/~bederson
// University of Maryland
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//	   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// CONSTANTS
var NUM_RECTS = 7;		// Number of group rectangle images
var TEXT_MAX_WIDTH = 300;
var TEXT_MIN_WIDTH = 100;
var TEXT_GROW_AHEAD = 40;

var display = "list";	// Display type ("list" or "graph")

function getURLParameter(name) {
	return decodeURI(
		(RegExp(name + '=' + '(.+?)(&|$)').exec(window.location.search)||[,null])[1]
	);
}

/*
 * Auto-growing textareas; modified from:
 * http://onehackoranother.com/projects/jquery/jquery-grab-bag/autogrow-textarea.html
 */
(function($){
	$.fn.autogrow = function(opt) {
		opt = $.extend({
			maxWidth: TEXT_MAX_WIDTH,
			minWidth: TEXT_MIN_WIDTH,
			comfortZone: TEXT_GROW_AHEAD
		}, opt);

		this.filter('textarea').each(function(){
			var minWidth = opt.minWidth || $(this).width(),
				maxWidth = opt.maxWidth || $(this).width(),
				val = '',
				input = $(this),
				minHeight	= input.height(),
				lineHeight	= input.css('lineHeight');
				tester = $("#autogrowtester");
				if (tester.length == 0) {
					tester = $("<div id='autogrowtester'></div>").css({
						position: 'absolute',
						top: -9999,
						left: -9999,
						width: 'auto',
						height: 'auto',
						fontSize: input.css('fontSize'),
						fontFamily: input.css('fontFamily'),
						fontWeight: input.css('fontWeight'),
						lineHeight: input.css('lineHeight'),
						letterSpacing: input.css('letterSpacing'),
						resize: 'none'
					});
				}
			var check = function() {
				var times = function(string, number) {
					for (var i = 0, r = ''; i < number; i ++) r += string;
					return r;
				};

				var escaped = this.value.replace(/</g, '&lt;')
									.replace(/>/g, '&gt;')
									.replace(/&/g, '&amp;')
									.replace(/\n$/, '<br/>&nbsp;')
									.replace(/\n/g, '<br/>')
									.replace(/ {2,}/g, function(space) { return times('&nbsp;', space.length -1) + ' ' });
				tester.html(escaped);

				// Calculate new width + whether to change
				var testerWidth = tester.width(),
					newWidth = testerWidth + opt.comfortZone;
					newWidth = Math.max(newWidth, minWidth);
					newWidth = Math.min(newWidth, maxWidth);
					currentWidth = input.width();

				// Update textbox dimensions
				if (currentWidth != newWidth) {
					input.width(newWidth);
				}
				if (testerWidth > opt.maxWidth) {
					tester.width(opt.maxWidth);
				}

				var newHeight = Math.max(tester.height() + 20, minHeight);
				input.height(newHeight);
			};
			tester.appendTo(document.body);

			$(this).change(check).keyup(check).keydown(check);
			check.apply(this);
		});

		return this;
	};
})(jQuery);