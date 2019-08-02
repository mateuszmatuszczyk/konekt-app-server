///// ///// IMPORTS ///// /////
///// LIBRARIES ///// 
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
var io = require('socket.io')
function socketSetup(app, http){
     
}
///// CUSTOM FILES
// Database configuration file
// const dbconfig = require("../config/dbconnection");
// JS file containing helper methods, such as password validation etc. 

// var dbUrl = 'mongodb+srv://gordon:ksieg4rni4-MDB@cluster0-v4kog.mongodb.net/test?retryWrites=true&w=majority'

// mongoose.connect(dbUrl , (err) => { 
//     console.log("mongodb connected",err);
//  })

var dbUrl = 'mongodb+srv://gordon:schnuggs@cluster0-v4kog.mongodb.net/test?retryWrites=true&w=majority'

mongoose.connect(dbUrl, (err) => {
    console.log("mongodb connected", err);
})

var Message = mongoose.model('Message', { name: String, message: String })


const helper = require('./helper.js');

///// ///// DB CONNETION
// Establish connection with MySQL database using credentials from db.config file
// const connection = mysql.createConnection(dbconfig.connection);

///// ///// END-POINTS FUNCTIONS
// exports.showMessages = async (req, res) => {
//     Message.find({}, (err, messages) => {
//         res.send(messages);
//     })
// }


// exports.sendMessage = async (req, res) => {
//     var message = new Message(req.body);
//     message.save((err) => {
//         if (err)
//             sendStatus(500);
//         app.socketio.emit('message', req.body);
//         res.sendStatus(200);
//     })
// }
    // const body = req.body;
    // const email = body.email;
    // const password = body.password;
    // const hashed_password = await bcrypt.hash(password, 10)

    // console.log("email: " + email + "\npassword: " + password + "\nhashed_password: " + hashed_password)
    // const sql = 'SELECT * FROM user WHERE email = ?';

    // if (!helper.validateEmail(email)) {
    //     res.status(400).send({ error: "This e-mail is invalid." });
    //     return
    // }
    // connection.query(sql, email, function (err, result) {
    //     // res.status(200).send(result);
    //     // console.log("User ID :"+req.params.uid + result[0].name)
    //     if (err) { res.status(500).send(err) }
    //     if (result[0]) {
    //         console.log("Email address already exists in the database.");
    //         res.status(409).send({ error: "This e-mail address is already registered." });
    //         return
    //     }
    //     console.log("result not found");
    //     const sql =
    //         "INSERT INTO `konektdb`.`user` (`email`, `password`) VALUES (?,?)";

    //     connection.query(sql, [email, hashed_password], function (err, result) {
    //         if (err) { res.status(500).send(err) }

    //         res.status(201).send(result);
    //     })
    //     console.log("Email: " + email + " \nPassword: " + password);
    // })
