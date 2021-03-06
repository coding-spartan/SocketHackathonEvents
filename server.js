const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session")({
    secret: "swordfish",
    resave: true,
    saveUninitialized: true
});
const sharedSession = require("express-socket.io-session");
app.use(express.static(__dirname + "/static"));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(session);
var socket_users = {};
var chat_rooms = {};
app.get("/", function(req, res){
    if(req.session.name) {
        res.render("index");
    }
    else {
        res.redirect("/login");
    }
});
app.get("/login", function(req, res){
    res.render("login");
});
app.post("/process", function(req, res){
    if(req.body["name"]){
        req.session.name = req.body.name;
        res.redirect("/");
    }
    else{
        res.redirect("/login");
    }
});
app.get("/events/:id", function(req, res){
    if(req.session.name) {
        res.render("event", {event_id: req.params.id});
    }
    else {
        res.redirect("/login");
    }
});
server = app.listen(8000);
const io = require("socket.io")(server);
io.use(sharedSession(session, {autoSave: true}));
io.on("connection", function(socket){ 
    socket.on("join_room", function(data){
        console.log(data.username + " is joining room " + data.room);
        socket.join(data.room);
        socket_users[socket.id] = [socket.handshake.session.name, data.room];
        if(chat_rooms[data.room]) {
            console.log("sending chat logs for room " + data.room);
            socket.emit("past_chat", {messages: chat_rooms[data.room]});
        }
        else {
            console.log("creating new logs for room " + data.room);
            chat_rooms[data.room] = [];
        }
    });
    socket.on("post_message", function(data){
        console.log("received message from " + socket_users[socket.id][0] + ": " + data.msg);
        var message = {username: socket_users[socket.id][0], msg: data.msg}
        chat_rooms[socket_users[socket.id][1]].push(message);
        io.in(socket_users[socket.id][1]).emit("new_message", message);
    });
    socket.on("disconnect", function(data){
        if(socket_users[socket.id]) {
            console.log("disconnecting " + socket_users[socket.id][0]);
            delete socket_users[socket.id];
        }
    });
});