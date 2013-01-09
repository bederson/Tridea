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
import datetime
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import users

class Idea(db.Model):
	author = db.UserProperty(auto_current_user=True)
	father = db.SelfReferenceProperty()
	children = db.ListProperty(db.Key)
	date = db.DateProperty(auto_now=True)
	idea = db.StringProperty(required=True)
	thumbsUp = db.IntegerProperty(default=0)
	thumbsDown = db.IntegerProperty(default=0)

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
	def post(self):
		key = self.request.get('key')
		ideaObj = Idea.get_by_id(int(key))
		if ideaObj:
			db.delete(ideaObj.key())
			return self.redirect('/')

class New(webapp2.RequestHandler):
	def post(self):
		idea = self.request.get('idea')
		fatherKey = self.request.get('father')
		ideaObj = Idea(idea=idea)
		if fatherKey:
			fatherObj = Idea.get_by_id(int(fatherKey))
			ideaObj.father = fatherObj
			# Add self to father
			fatherObj.children = fatherObj.children.append(ideaObj)
			fatherObj.put()
		ideaObj.put()
		return self.redirect('/')

class Query(webapp2.RequestHandler):
	# TODO: CONVERT TO DEPTH-FIRST SEARCH
	def get(self):
		ideas = Idea.all()
		count = ideas.count()
		ideaResult = []
		for ideaObj in ideas:
			# Build up results dictionary
			if ideaObj.author:
				author = ideaObj.author.nickname()
			else:
				author = None
			if ideaObj.father:
				father = ideaObj.father.key().id()
			else:
				father = None
			ideaJSON = {
				'key' : ideaObj.key().id(),
				'author' : author,
				'idea' : ideaObj.idea,
				'father' : father
			}
			ideaResult.append(ideaJSON)

		result = {'count' : count, 'ideas': ideaResult}
		self.response.out.write(json.dumps(result))

app = webapp2.WSGIApplication([
	('/', MainHandler),
	('/delete', Delete),
	('/new', New),
	('/q', Query),
], debug=True)
