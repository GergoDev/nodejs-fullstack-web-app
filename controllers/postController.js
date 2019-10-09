const Post = require('../models/Post')

exports.viewCreateScreen = function(req, res) {
    res.render('create-post')
}

exports.create = function(req, res) {
    let post = new Post(req.body, req.session.user._id)
    post.create().then(function(newId) {
        req.flash("success", "Post is successfully created.")
        req.session.save(() => res.redirect(`/post/${newId}`))
    }).catch(function(errors) {
        errors.forEach((error) => req.flash("errors", error))
        req.session.save(() => res.redirect('/create-post'))
    })
}

exports.apiCreatePost = function(req, res) {
    let post = new Post(req.body, req.apiUser._id)
    post.create().then(function(newId) {
        res.json("Success")
    }).catch(function(errors) {
        res.json(errors)
    })
}

exports.viewSingle = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)        
        res.render('single-post-screen', {post: post, title: post.title})
    } catch {
        res.render("404")
    }
}

exports.viewEditScreen = async function(req, res) {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        if(post.isVisitorAuthor) {
            res.render('edit-post', {post: post})
        } else {
            req.flash("errors", "You don't have permission to do that action.")
            req.session.save(() => res.redirect('/'))            
        }
    } catch {
        res.render("404")
    }    
}

exports.edit = function(req, res) {
    let post = new Post(req.body, req.visitorId, req.params.id)

    post.update().then((status) => {
        if(status == "success") {
            // the post was successfully updated
            req.flash("success", "Post successfully updated.")
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}`)
            })
        } else {
            // there were validation errors
            post.errors.forEach(function(error) {
                req.flash("errors", error)
            })
            req.session.save(function() {
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(() => {
        // if the current visitor is not the owner of the post
        // the post with the requested id doesn't exist
        req.flash("errors", "You don't have permission to perform that action.")
        req.session.save(function() {
            res.redirect('/')
        })
    })
}

exports.delete = function(req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "The post successfully deleted.")
        req.session.save(() => {
            res.redirect('/profile/' + req.session.user.username)
        })
    }).catch(() => {
        req.flash("errors", "You don't have permission to perform that action.")
        req.session.save(() => {
            res.redirect('/')
        })
    })
}

exports.apiDelete = function(req, res) {
    Post.delete(req.params.id, req.apiUser._id).then(() => {
        res.json("Success")
    }).catch(() => {
        res.json("You don't have permission for that action.")
    })
}

exports.search = function(req, res) {
    Post.search(req.body.searchTerm).then((posts) => {
        res.json(posts)
    }).catch(() => {
        res.json([])
    })
}