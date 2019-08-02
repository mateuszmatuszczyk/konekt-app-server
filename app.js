const express = require('express');
const body_parser = require("body-parser");
const http = require('http')
const io = require('socket.io')
const mongoose = require('mongoose');


// CONTROLLERS
const user_controller = require("./controllers/userController")
// const chat_controller = require("./controllers/chatController")

const app = express();
const router = express.Router();

var http_server = http.Server(app);

var socketio = io(http_server)

socketio.on('connection', () => {
    console.log('a user is connected')
})

app.use(body_parser.urlencoded({ extended: false }));
app.use(body_parser.json());
app.use("/api", router);
app.use(express.static(__dirname));


var dbUrl = 'mongodb+srv://gordon:schnuggs@cluster0-v4kog.mongodb.net/test?retryWrites=true&w=majority'

mongoose.connect(dbUrl, (err) => {
    console.log("mongodb connected", err);
})

var Message = mongoose.model('Message', { uid: Number, friend_id: Number, name: String, message: String })


// CHAT CONTROLLER ROUTES
router.route('/users/:uid/messages').get((req, res) => {
        Message.find({ uid:req.params.uid }, (err, messages) => {
        res.send(messages);
    })
})

router.route('/users/:uid/messages').post((req, res) => {
    const uid = req.params.uid
    const fid = req.body.friend_id
    const new_message = req.body.message



    var message = new Message(req.body);
    Object.assign(message, {uid: uid});

    console.log(message)

    message.save((err) => {
        if (err)
            sendStatus(500);
        socketio.emit('message', req.body);
        res.sendStatus(200);
    })
})

// USER CONTROLLER ROUTES 
router.route("/").get((req, res) => {
    console.log("Accessing ROOT"); res.send("Hello, this is root");
});

// register new user
router.route("/users/register").post(user_controller.registerUser)

// login user
router.route("/users/login").post(user_controller.loginUser)

//search for user
router.route("/users/search").get(user_controller.searchUser)

// get user by userID
router.route("/users/:uid").get(user_controller.getUser)
// remove user by userID
router.route("/users/:uid").delete(user_controller.deleteUser)
// update user profile
router.route("/users/:uid/profile").put(user_controller.updateUserProfile)
// update user password
router.route("/users/:uid/profile/password").put(user_controller.updateUserPassword)
// update user profile
router.route("/users/:uid/visibility").put(user_controller.changeVisibilityStatus)
// update status msg
router.route("/users/:uid/status").put(user_controller.updateStatusMsg)
// update user's location
router.route("/users/:uid/location").put(user_controller.updateUserLocation)
//show user connections
router.route("/users/:uid/connections").get(user_controller.showUserConnections)
//send connection request
router.route("/users/:uid/newconnection").post(user_controller.sendConnectionRequest)
//confirm connection request
router.route("/users/:uid/acceptconnection").post(user_controller.acceptConnectionRequest)
//show all user meetings
router.route("/users/:uid/meetings").get(user_controller.showAllMeetings)


//validate connection
router.route("/connections/:cid/validate").put(user_controller.validateUserConnection)
//update connection visibility radius
router.route("/connections/:cid/visibility").put(user_controller.updateVisibilityRadius)
//remove user conncetion
router.route("/connections/:cid").delete(user_controller.removeUserConnection)
//create user-meeting
router.route("/connections/:cid/meeting").post(user_controller.createMeeting)
//add special event to a meeting
router.route("/meetings/:mid/specialevent").put(user_controller.addSpecialEventToMeeting)
//end the meeting -> adds end_time to the record in db
router.route("/meetings/:mid/end").put(user_controller.finishMeeting)

//show all special events 
router.route("/specialevents").get(user_controller.showCurrentSpecialEvents)

//show all special events 
router.route("/specialevents/:spid").get(user_controller.showSpecialEvent)

//check distance between two locations (query params: lid1=locationId1, lid2=locationId2)
router.route("/checkdistance/").get(user_controller.getDistance)



//start the server on the defined port -> 3000
const port = 3000
var app_server = http_server.listen(port, () => {
    console.log('Server started on port ' + app_server.address().port);
})





