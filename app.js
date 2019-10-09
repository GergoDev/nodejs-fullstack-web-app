const express = require('express')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const sanitizeHTML = require('sanitize-html')
const csrf = require('csurf')
const app = express()

app.use(express.urlencoded({extended:false}))
app.use(express.json())

app.use('/api', require('./router-api'))

let sessionOptions = session({
    secret: "JavaScript is sooo coool",
    store: new MongoStore({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 1000 * 60 * 60 * 24, httpOnly: true}
})
app.use(sessionOptions)

app.use(flash())

app.use(function(req, res, next) {
    // Make markdown available form any ejs templates.
    res.locals.filterUserHTML = function(content) {
        return sanitizeHTML(markdown(content), {allowedTags: ['p', 'strong', 'b', 'i', 'em', 'li', 'ol', 'ul', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], allowedAttributes: {}})
    }

    // Make flash messages avaible on every page
    res.locals.success = req.flash('success')
    res.locals.errors = req.flash('errors')

    // Make UserID avaible within every request
    if(req.session.user) {req.visitorId = req.session.user._id} else {req.visitorId = 0}

    // Make session data avaible within ejs templates
    res.locals.user = req.session.user
    next()
})

const router = require('./router')

app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'ejs')

app.use(csrf())

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken()
    next()
})

app.use('/', router)

app.use(function(err, req, res, next) {
    if(err) {
        if(err.code == "EBADCSRFTOKEN") {
            req.flash("errors", "Cross site request forgery detected.")
            req.session.save(() => res.redirect('/'))
        } else {
            res.render('404')
        }
    }
})

const server = require('http').createServer(app)
const io = require('socket.io')(server)

io.use(function(socket, next) {
    sessionOptions(socket.request, socket.request.res, next)
})

io.on('connection', function(socket) {
    if(socket.request.session.user) {
        let user = socket.request.session.user

        socket.emit('welcome', {avatar: user.avatar})

        socket.on('chatMessageFromBrowser', function(data) {
            socket.broadcast.emit('chatMessageFromServer', {message: sanitizeHTML(data.message, {allowedTags: [], allowedAttributes: {}}), username: user.username, avatar: user.avatar})
        })
    }
})

module.exports = server