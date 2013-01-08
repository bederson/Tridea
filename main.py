#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
import datetime
import json
from google.appengine.ext import db
from google.appengine.api import users

class Author(db.Model):
	# TODO Add support for finding all votes and all ideas
	author = db.UserProperty()
	affiliation = db.StringProperty()

class Idea(db.Model):
	author = db.ReferenceProperty(Author)
	father = db.SelfReferenceProperty()
	date = db.DateProperty(auto_now=True)
	idea = db.StringProperty(required=True)
	thumbsUp = db.IntegerProperty(default=0)
	thumbsDown = db.IntegerProperty(default=0)

class MainHandler(webapp2.RequestHandler):
	def get(self):
		self.response.write('Hello there!')

class Save(webapp2.RequestHandler):
	# TODO: add parent
	# TODO: support modification of existing idea
	def post(self):
		author = Author.all().filter('user =', users.get_current_user()).get()
		idea = self.request.get('idea')
		ideaObj = Idea(idea=idea)
		ideaObj.author = author
		ideaObj.put()

class Query(webapp2.RequestHandler):
	def get(self):
		ideas = Idea.all()
		count = ideas.count()
		ideaResult = []
		for idea in ideas:
			# Build up results dictionary
			if idea.author:
				author = idea.author.name
			else:
				author = None
			idea = {
				'author' : author,
				'idea' : idea.idea
			}
			ideaResult.append(idea)

		result = {'count' : count, 'ideas': ideaResult}
		self.response.out.write(json.dumps(result))

app = webapp2.WSGIApplication([
	('/', MainHandler),
	('/q', Query),
	('/save', Save)
], debug=True)
