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

import logging
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

# Topics, Groups and Ideas are all stored by this "Idea"
# Difference is implicit in group level
#   Topics have no fathers
#   Groups always have children
#   Ideas never have chidlren
class Idea(db.Model):
	author = db.UserProperty(auto_current_user_add=True)
	father = db.SelfReferenceProperty()
	children = db.ListProperty(db.Key)			# Child ideas of this idea in sorted order by num likes
	date = db.DateProperty(auto_now=True)
	idea = db.StringProperty(required=True)
	likes = db.IntegerProperty(default=0)
	descLikes = db.IntegerProperty(default=0)
	x = db.IntegerProperty(default=0)
	y = db.IntegerProperty(default=0)

	@property
	def fatherId(self):
		if self.father:
			return self.father.key().id()
		else:
			return None

	@property
	def authorId(self):
		if self.author.user_id():
			return self.author.user_id()
		else:
			return self.author.email()

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

	def editIdea(self, idea):
		self.idea=idea
		self.put()
		
	def moveIdea(self, x, y):
		self.x = x
		self.y = y
		self.put()

	def deletePromote(self):
		"""Remove self from database, promoting children"""
		self.doUnlike()
		fatherObj = self.father
		key = self.key()
		if fatherObj:
			# Remove self pointer from father
			fatherObj.children.remove(key)
			fatherObj.put()
			# Add children to father
			for child in self.children:
				fatherObj.children.append(child)
				fatherObj.put()
		# Change father pointer from children
		for child in self.children:
			childObj = db.get(child)
			childObj.father = fatherObj
			childObj.put()
		# Delete self from DB
		db.delete(key)

	def deleteRecurse(self):
		"""Remove self from database, recursively deleteing all descendants as well"""
		# First recursively delete descendants
		for child in self.children:
			childObj = db.get(child)
			childObj.deleteRecurse()
		# Then delete self
		me = db.get(self.key())  # Necessary to refetch self since previous recursive delete modifies self
		me.doUnlike()
		fatherObj = me.father
		key = me.key()
		if fatherObj:
			# Remove self pointer from father
			fatherObj.children.remove(key)
			fatherObj.put()
		# Remove father pointer from children
		for child in me.children:
			childObj = db.get(child)
			childObj.father = None
			childObj.put()
		# Delete self from DB
		db.delete(key)

class LikedIdea(db.Model):
	author = db.UserProperty(auto_current_user_add=True)
	idea = db.ReferenceProperty(Idea)