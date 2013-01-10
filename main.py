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
import os
import json
import webapp2
import logging
import datetime
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import users

class Idea(db.Model):
	author = db.UserProperty(auto_current_user_add=True)
	father = db.SelfReferenceProperty()
	children = db.ListProperty(db.Key)
	date = db.DateProperty(auto_now=True)
	idea = db.StringProperty(required=True)
	thumbs = db.IntegerProperty(default=0)
	maxThumbs = db.IntegerProperty(default=0)

	@property
	def fatherID(self):
		if self.father:
			return self.father.key().id()
		else:
			return None

class MainHandler(webapp2.RequestHandler):
	def get(self):
		if users.get_current_user():
			url = users.create_logout_url(self.request.uri)
			url_linktext = 'Logout'
		else:
			url = users.create_login_url(self.request.uri)
			url_linktext = 'Login'

		template_values = {
			'user': users.get_current_user(),
			'url': url,
			'url_linktext': url_linktext,
		}

		path = os.path.join(os.path.dirname(__file__), 'index.html')
		self.response.out.write(template.render(path, template_values))

class Delete(webapp2.RequestHandler):
	# Deletes idea from hierarchy
	def post(self):
		idStr = self.request.get('id')
		ideaObj = Idea.get_by_id(int(idStr))
		if ideaObj:
			fatherObj = ideaObj.father
			if fatherObj:
				# Remove self pointer from father
				fatherObj.children.remove(ideaObj.key())
				fatherObj.put()
			# Remove father pointer from children
			for child in ideaObj.children:
				childObj = db.get(child)
				childObj.father = None
				childObj.put()
			# Delete self from DB
			db.delete(ideaObj.key())
			return self.redirect('/')

class New(webapp2.RequestHandler):
	# Inserts an idea into hierarchy)
	def post(self):
		idea = self.request.get('idea')
		fatherKey = self.request.get('father')
		ideaObj = Idea(idea=idea)
		ideaObj.put()
		if fatherKey:
			fatherObj = Idea.get_by_id(int(fatherKey))
			if fatherObj:
				ideaObj.father = fatherObj
				ideaObj.put()
				# Add self to father
				fatherObj.children.append(ideaObj.key())
				fatherObj.put()
		return self.redirect('/')

class Query(webapp2.RequestHandler):
	# Returns all notes in depth-first search order
	def get(self):
		# Implemented by performing depth-first search.
		# TODO: Make more efficient by storing DFS sort order in DB
		ideas = Idea.all()
		count = ideas.count()
		ideaDict = {}
		roots = []
		
		# Pass 1: Load all idea objects into dictionary, indexed by Key
		for ideaObj in ideas:
			ideaKey = ideaObj.key()
			ideaDict[ideaKey] = ideaObj
			if ideaObj.father == None:
				roots.append(ideaKey)

		# Pass 2: Depth first search, using dictionary for random access, produce list of idea objects
		ideaObjList = self.depthFirstSearch(roots, ideaDict)

		# Pass 3: Go through depth first search order and create JSON
		ideaResult = []
		for ideaObj in ideaObjList:
			# Build up results dictionary
			ideaJSON = {
				'id' : ideaObj.key().id(),
				'author' : ideaObj.author.nickname(),
				'idea' : ideaObj.idea,
				'father' : ideaObj.fatherID,
				'depth' : ideaObj.depth
			}
			ideaResult.append(ideaJSON)

		result = {'count' : count, 'ideas': ideaResult}
		self.response.out.write(json.dumps(result))

	def depthFirstSearch(self, ideaObjKeys, ideaDict):
		ideaObjList = []
		for ideaObjKey in ideaObjKeys:
			ideaObj = ideaDict[ideaObjKey]
			ideaObj.depth = 0
			ideaObjList.append(ideaObj)
			if len(ideaObj.children) > 0:
				descendants = self.depthFirstSearch(ideaObj.children, ideaDict)
				for descendant in descendants:
					descendant.depth += 1
					ideaObjList.append(descendant)
		return ideaObjList

app = webapp2.WSGIApplication([
	('/', MainHandler),
	('/delete', Delete),
	('/new', New),
	('/q', Query),
], debug=True)