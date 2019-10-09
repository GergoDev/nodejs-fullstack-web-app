const Follow = require('../models/Follow')

exports.addFollow = function (req, res) {
    let follow = new Follow(req.params.username, req.visitorId)
    follow.create().then(() => {
        req.flash("success", `You started to follow ${req.params.username}`)
        req.session.save(() => {res.redirect(`/profile/${req.params.username}`)})
    }).catch((errors) => {
        follow.errors.forEach(error => {
            req.flash("errors", error)            
        })
        req.session.save(() => {res.redirect('/')})
    })
}

exports.removeFollow = function (req, res) {
    let follow = new Follow(req.params.username, req.visitorId)
    follow.delete().then(() => {
        req.flash("success", `You stopped to follow ${req.params.username}`)
        req.session.save(() => {res.redirect(`/profile/${req.params.username}`)})
    }).catch((errors) => {
        follow.errors.forEach(error => {
            req.flash("errors", error)            
        })
        req.session.save(() => {res.redirect('/')})
    })
}