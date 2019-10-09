const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.apiGetPostsByUsername = async function(req, res) {
    try {
        let authorDoc = await User.findByUsername(req.params.username)
        let posts = await Post.findByAuthorId(authorDoc._id)
        res.json(posts)
    } catch {
        res.json("Sorry, invalid user requested.")
    }
}

exports.sharedProfileData = async function(req, res, next) {
    let isFollowing = false
    let isVisitorsProfile = false
    if(req.session.user) {
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id, req.visitorId)
        isVisitorsProfile = req.profileUser._id.equals(req.visitorId)
    }
    req.isFollowing = isFollowing
    req.isVisitorsProfile = isVisitorsProfile

    // Retrieve Post, Followers, Following counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followersCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingById(req.profileUser._id)
    let [postCount, followersCount, followingCount] = await Promise.all([postCountPromise, followersCountPromise, followingCountPromise])

    req.postCount = postCount
    req.followersCount = followersCount
    req.followingCount = followingCount
    next()
}

exports.mustBeLoggedIn = function(req, res, next) {
    if(req.session.user) {
        next()
    } else {
        req.flash('errors', 'You must be logged in to perform that action.')
        req.session.save(function() {
            res.redirect('/')
        })
    }
}

exports.apiMustBeLoggedIn = function(req, res, next) {
    try {
        req.apiUser = jwt.verify(req.body.token, process.env.JWTSECRET)
        next()
    } catch {
        res.json("You must provide a valid token.")
    }
}

exports.login = function(req, res) {
    let user = new User(req.body)
    user.login().then(function(result) {
        req.session.user = {avatar: user.avatar, username: user.data.username, _id: user.data._id}
        req.session.save(function() {
            res.redirect('/')
        })
    }).catch(function(e) {
        req.flash('errors', e)
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.apiLogin = function(req, res) {
    let user = new User(req.body)
    user.login().then(function(result) {
        res.json(jwt.sign({_id: user.data._id}, process.env.JWTSECRET, {expiresIn: "7d"}))
    }).catch(function(e) {
        res.json("Login failed")
    })
}

exports.logout = function(req, res) {
    req.session.destroy(function() {
        res.redirect('/')
    })
}

exports.register = function(req, res) {
    let user = new User(req.body)
    user.register().then(() => {
        req.session.user = {username: user.data.username, avatar: user.avatar, _id: user.data._id}
        req.session.save(function() {
            res.redirect('/')
        })
    }).catch((regErrors) => {
        regErrors.forEach(function(error) {
            req.flash('regErrors', error)
        })
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.home = async function(req, res) {
    if(req.session.user) {
        // fetch feed of posts for current user
        let posts = await Post.getFeed(req.session.user._id)
        res.render('home-dashboard', {posts: posts})
    } else {
        res.render('home-guest', {regErrors: req.flash('regErrors')})
    }
}

exports.ifUserExists = function(req, res, next) {
    User.findByUsername(req.params.username).then(function(userDocument) {
        req.profileUser = userDocument
        next()
    }).catch(function() {
        res.render('404')
    })
}

exports.profilePostsScreen = function(req, res) {
    Post.findByAuthorId(req.profileUser._id).then(function(posts) {
        res.render('profile', {
            posts: posts,
            title: "Profile for " + req.profileUser.username,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            site: "profile",
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    }).catch(function() {
        res.render('404')
    })
}

exports.profileFollowersScreen = async function(req, res) {
    try {
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers', {
            followers: followers,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            site: "followers",
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    } catch {
        res.render('404')
    }
}

exports.profileFollowingScreen = async function(req, res) {
    try {
        let following = await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following', {
            following: following,
            profileUsername: req.profileUser.username,
            profileAvatar: req.profileUser.avatar,
            isFollowing: req.isFollowing,
            isVisitorsProfile: req.isVisitorsProfile,
            site: "following",
            counts: {postCount: req.postCount, followersCount: req.followersCount, followingCount: req.followingCount}
        })
    } catch {
        res.render('404')
    }
}

exports.doesUsernameExist = function(req, res) {
    User.findByUsername(req.body.username).then(function() {
        res.json(true)
    }).catch(function() {
        res.json(false)
    })
}

exports.doesEmailExist = async function(req, res) {
    let emailBool = await User.doesEmailExist(req.body.email)
    console.log(emailBool)
    res.json(emailBool)
}