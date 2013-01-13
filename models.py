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

from google.appengine.ext import db
from google.appengine.api import users

def createIdea(idea, fatherId):
	ideaObj = Idea(idea=idea)
	ideaObj.put()
	if fatherId:
		fatherObj = Idea.get_by_id(int(fatherId))
		if fatherObj:
			ideaObj.father = fatherObj
			ideaObj.put()
			# Add self to father
			fatherObj.children.append(ideaObj.key())
			fatherObj.put()

class Idea(db.Model):
	author = db.UserProperty(auto_current_user_add=True)
	father = db.SelfReferenceProperty()
	children = db.ListProperty(db.Key)			# Child ideas of this idea in sorted order by num likes
	date = db.DateProperty(auto_now=True)
	idea = db.StringProperty(required=True)
	likes = db.IntegerProperty(default=0)
	descLikes = db.IntegerProperty(default=0)

	@property
	def fatherID(self):
		if self.father:
			return self.father.key().id()
		else:
			return None

	def doLike(self):
		"""If idea not liked by current user, then like it"""
		if not self.doesLike():
			like = LikedIdea()
			like.idea = self
			like.put()
			self.likes += 1
			self.put()
			self.updateAncestorLikes(1)

	def doesLike(self):
		like = LikedIdea.all()
		like = like.filter('author =', users.get_current_user())
		like = like.filter('idea =', self)
		if like.count() > 0:
			return True
		else:
			return False

	def doUnlike(self):
		"""If idea liked by current user, then unlike it"""
		like = LikedIdea.all()
		like = like.filter('author =', users.get_current_user())
		like = like.filter('idea =', self)
		if like.count() > 0:
			db.delete(like.get().key())
			self.likes -= 1
			self.put()
			self.updateAncestorLikes(-1)

	def updateAncestorLikes(self, delta):
		self.descLikes += delta
		self.put()
		father = self.father
		if father:
			father.sortChildren()		# Maintain sort order of father's children (if there is a father)
			father.updateAncestorLikes(delta)

	def sortChildren(self):
		"""Sorts children by number of likes"""
		def ideaCompareByLikes(key1, key2):
			i1 = db.get(key1)
			i2 = db.get(key2)
			return int(i2.descLikes - i1.descLikes)

		if self:
			self.children.sort(cmp=ideaCompareByLikes)
			self.put()

	def delete(self):
		"""Remove self from database"""
		self.doUnlike()
		fatherObj = self.father
		key = self.key()
		if fatherObj:
			# Remove self pointer from father
			fatherObj.children.remove(key)
			fatherObj.put()
		# Remove father pointer from children
		for child in self.children:
			childObj = db.get(child)
			childObj.father = None
			childObj.put()
		# Delete self from DB
		db.delete(key)

class LikedIdea(db.Model):
	author = db.UserProperty(auto_current_user_add=True)
	idea = db.ReferenceProperty(Idea)