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
from google.appengine.ext import db
from google.appengine.api import users

class Author(db.Model):
	# TODO Add support for finding all votes and all ideas
	author = db.UserProperty()
	affiliation = db.StringProperty()

class Idea(db.Model):
	author = db.ReferenceProperty(Author)
	parent = db.SelfReferenceProperty()
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
		author = Author.all().filter('user =', users.get_current_uesr()).get()
		idea = self.request.get('idea')
		ideaObj = Idea()
		ideaObj.author = author
		ideaObj.idea = idea
		ideaObj.put()

class Query(webapp2.RequestHandler):
	def get(self):
		creator = self.request.get('creator')
		tag = self.request.get('tag').lower()
		if creator:
			query = Paper.all().filter('created =', users.User(creator))
			count = query.count()
			results = query.fetch(100)
		elif tag:
			results = []
			resultTitles = set()
			# First find all publicly tagged papers
			query = PersonTags.all().filter('tags =', tag)
			query = query.filter('private =', False)
			count = query.count()
			infoResults = query.fetch(100)
			for info in infoResults:
				if info.paper.title not in resultTitles:
					results.append(info.paper)
					resultTitles.add(info.paper.title)
				else:
					count -= 1
			# Then add current user's tagged papers
			query = PersonTags.all().filter('user =', users.get_current_user())
			query = query.filter('tags =', tag)
			count = count + query.count()
			infoResults = query.fetch(100)
			for info in infoResults:
				if info.paper.title not in resultTitles:
					results.append(info.paper)
					resultTitles.add(info.paper.title)
				else:
					count -= 1
		else:
			title = self.request.get('title')
			results = Paper.search(title)

		paperResult = []
		max = 10
		for paper_obj in results:
			if max < 0:
				break
			max -= 1
			email = ""
			nickname = ""
			tags = []
			note = ""
			if paper_obj.created:
				email = paper_obj.created.email()
				nickname = paper_obj.created.nickname()
				# Personal tags
				tagsQuery = PersonTags.all().filter('user =', users.get_current_user())
				tagsQuery = tagsQuery.filter('paper =', paper_obj)
				tagsObj = tagsQuery.get()
				tags = ""
				if tagsObj:
					tags = tagsObj.tags

				# Personal note
				noteQuery = PersonNote.all().filter('user =', users.get_current_user())
				noteQuery = noteQuery.filter('paper =', paper_obj)
				noteObj = noteQuery.get()
				note = ""
				if noteObj:
					note = noteObj.note
					
				# Other's note count
				notesQuery = PersonNote.all().filter('paper =', paper_obj)
				notesQuery = notesQuery.filter('private =', False)
				notesQuery = notesQuery.filter('user !=', users.get_current_user())
				numNotes = notesQuery.count()
				
				# Build up results dictionary
				paper = {
					'key' : paper_obj.key().id(),
					'title' : paper_obj.title, 
					'url' : paper_obj.url, 
					'abstract' : paper_obj.abstract,
					'citation' : paper_obj.citation,
					'email' : email, 
					'nickname' : nickname,
					'note' : note,
					'tags' : tags,
					'numNotes' : numNotes}
				paperResult.append(paper)

		# Hack: If using search(), then need to check count after iterating results since 
		# automatic de-duping can decrease count
		try: count
		except: count = results.count
		
		result = {'count' : count, 'papers': paperResult}
		self.response.out.write(json.dumps(result))

app = webapp2.WSGIApplication([
	('/', MainHandler),
	('/q', Query),
	('/save', Save)
], debug=True)
