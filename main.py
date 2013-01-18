#!/usr/bin/env python
#
# Copyright 2013 Ben Bederson - http://www.cs.umd.edu/~bederson
# University of Maryland
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
import random
import os
import json
import webapp2
import logging
import datetime
from models import *
from google.appengine.ext.webapp import template
from google.appengine.api import users

def get_login_template_values(requestHandler):
	"""Return a dictionary of template values used for login template"""
	if users.get_current_user():
		url = users.create_logout_url(requestHandler.request.uri)
		url_linktext = 'Logout'
		logged_in = "true"
	else:
		url = users.create_login_url(requestHandler.request.uri)
		url_linktext = 'Login'
		logged_in = "false"

	template_values = {
		'user': users.get_current_user(),
		'url': url,
		'url_linktext': url_linktext,
		'logged_in': logged_in,
	}
	return template_values

class TopicHandler(webapp2.RequestHandler):
	def get(self):
		template_values = get_login_template_values(self)
		template_values['admin'] = users.is_current_user_admin()
		
		path = os.path.join(os.path.dirname(__file__), 'topicview.html')
		self.response.out.write(template.render(path, template_values))

class IdeaListHandler(webapp2.RequestHandler):
	def get(self):
		template_values = get_login_template_values(self)
		template_values['topicid'] = self.request.get("topicid")

		path = os.path.join(os.path.dirname(__file__), 'listview.html')
		self.response.out.write(template.render(path, template_values))

class IdeaGraphHandler(webapp2.RequestHandler):
	def get(self):
		template_values = get_login_template_values(self)
		template_values['topicid'] = self.request.get("topicid")

		path = os.path.join(os.path.dirname(__file__), 'graphview.html')
		self.response.out.write(template.render(path, template_values))

class LikeHandler(webapp2.RequestHandler):
	def post(self):
		idStr = self.request.get('id')
		ideaObj = Idea.get_by_id(int(idStr))
		ideaObj.doLike()

class UnlikeHandler(webapp2.RequestHandler):
	def post(self):
		idStr = self.request.get('id')
		ideaObj = Idea.get_by_id(int(idStr))
		ideaObj.doUnlike()

class DeleteHandler(webapp2.RequestHandler):
	# Deletes idea from hierarchy
	# If top-level "topic", then recursively deletes all descendants
	# If regular "idea", then promotes descendants
	def post(self):
		idStr = self.request.get('id')
		ideaObj = Idea.get_by_id(int(idStr))
		if ideaObj.father:
			ideaObj.deletePromote()
		else:
			ideaObj.deleteRecurse()

class NewHandler(webapp2.RequestHandler):
	"""Creates a new idea. Either returns JSON with the new id, or redirects to the specified page"""
	# Inserts an idea into hierarchy)
	def post(self):
		idea = self.request.get('idea')
		fatherId = self.request.get('father')
		action = self.request.get('action')		# Can be 'id' for JSON, or URL of target page
		ideaObj = createIdea(idea=idea, fatherId=fatherId)

		if ideaObj:
			idStr = ideaObj.key().id()
		else:
			idStr = ""
		result = {
			'id' : idStr
		}
		if action == 'id':
			self.response.headers['Content-Type'] = 'application/json'
			self.response.out.write(json.dumps(result))
		else:
			self.redirect("/")

class ReparentHandler(webapp2.RequestHandler):
	# Moves item to new parent
	def post(self):
		idStr = self.request.get('id')
		newFatherId = self.request.get('newFather')
		ideaObj = Idea.get_by_id(int(idStr))
		newFatherObj = Idea.get_by_id(int(newFatherId))
		if ideaObj and newFatherObj:
			ideaObj.reparent(newFatherObj)

class EditHandler(webapp2.RequestHandler):
	# Edits an existing idea
	def post(self):
		idea = self.request.get('idea')
		idStr = self.request.get('id')
		ideaObj = Idea.get_by_id(int(idStr))
		if ideaObj:
			ideaObj.editIdea(idea=idea)

class MoveHandler(webapp2.RequestHandler):
	# Edits an existing idea
	def post(self):
		idStr = self.request.get('id')
		x = int(float(self.request.get('x')))
		y = int(float(self.request.get('y')))
		ideaObj = Idea.get_by_id(int(idStr))
		if ideaObj:
			ideaObj.moveIdea(x=x, y=y)

class QueryTopicsHandler(webapp2.RequestHandler):
	# Returns all topics in alphabetical order
	def get(self):
		ideas = Idea.all().filter("father =", None)
		count = ideas.count()
		topicResult = []
		for ideaObj in ideas:
			# Build up results dictionary
			topicJSON = {
				'id' : ideaObj.key().id(),
				'author' : ideaObj.author.nickname(),
				'authorId' : ideaObj.authorId,
				'idea' : ideaObj.idea,
			}
			topicResult.append(topicJSON)

		result = {
			'count' : count, 
			'topics': topicResult
		}
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(result))

class QueryIdeasHandler(webapp2.RequestHandler):
	# Returns all notes in depth-first search order
	def get(self):
		# Return ideas in depth-first search order
		# TODO: Make more efficient by storing DFS sort order in DB
		# TODO: Make more efficient by only retrieving ideas relevant to this topic
		topicidStr = self.request.get("topicid")
		topicObj = Idea.get_by_id(int(topicidStr))
		if topicObj == None:
			result = {
				'count' : 0
			}
		else:
			topicKey = topicObj.key()
			root = topicObj.children
			ideas = Idea.all()
			ideaDict = {}

			# Pass 1: Load all idea objects into dictionary, indexed by Key
			for ideaObj in ideas:
				ideaKey = ideaObj.key()
				ideaDict[ideaKey] = ideaObj

			# Pass 2: Depth first search, using dictionary for random access, produce list of idea objects
			ideaJSON, count = self.depthFirstSearch(root, ideaDict)

			result = {
				'count' : count, 
				'topic': topicObj.idea, 
				'topicid': topicidStr,
				'ideas': ideaJSON
			}
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(result))

	def depthFirstSearch(self, ideaObjKeys, ideaDict):
		count = 0
		ideaJSON = []
		for ideaObjKey in ideaObjKeys:
			ideaObj = ideaDict[ideaObjKey]
			ideaObj.depth = 0
			json = self.createIdeaJSON(ideaObj)
			ideaJSON.append(json)
			if len(ideaObj.children) > 0:
				descendants, numd = self.depthFirstSearch(ideaObj.children, ideaDict)
				json['children'] = descendants
				count += numd
			else:
				count += 1
		return ideaJSON, count

	def createIdeaJSON(self, ideaObj):
		ideaJSON = {
			'id' : ideaObj.key().id(),
			'author' : ideaObj.author.nickname(),
			'authorId' : ideaObj.authorId,
			'idea' : ideaObj.idea,
			'father' : ideaObj.fatherId,
			'children' : [],
			'depth' : ideaObj.depth,
			'doesLike' : ideaObj.doesLike(),
			'likes' : ideaObj.likes,
			'x' : ideaObj.x,
			'y' : ideaObj.y
		}
		return ideaJSON

app = webapp2.WSGIApplication([
	('/', TopicHandler),
	('/idealist', IdeaListHandler),
	('/ideagraph', IdeaGraphHandler),
	('/delete', DeleteHandler),
	('/new', NewHandler),
	('/reparent', ReparentHandler),
	('/edit', EditHandler),
	('/move', MoveHandler),
	('/qtopics', QueryTopicsHandler),
	('/qideas', QueryIdeasHandler),
	('/like', LikeHandler),
	('/unlike', UnlikeHandler)
], debug=True)