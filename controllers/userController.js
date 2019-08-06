///// ///// IMPORTS ///// /////
///// LIBRARIES ///// 
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
///// CUSTOM FILES
// Database configuration file
const dbconfig = require("../config/dbconnection");
// JS file containing helper methods, such as password validation etc. 
const helper = require('./helper.js');

///// ///// DB CONNETION
// Establish connection with MySQL database using credentials from db.config file
var connection
function handleDisconnect() {
    connection = mysql.createConnection(dbconfig.connection); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();




///// ///// END-POINTS FUNCTIONS
exports.registerUser = async (req, res) => {
    const body = req.body;
    const email = body.email;
    const password = body.password;
    // const hashed_password = await bcrypt.hash(password, 10)
    const hashed_password = bcrypt.hashSync(password, 10);
    console.log("email: " + email + "\npassword: " + password + "\nhashed_password: " + hashed_password)
    const sql = 'SELECT * FROM user WHERE email = ?';

    if (!helper.validateEmail(email)) {
        res.status(400).send({ error: "This e-mail is invalid." });
        return
    }
    connection.query(sql, email, function (err, result) {
        // res.status(200).send(result);
        // console.log("User ID :"+req.params.uid + result[0].name)
        if (err) { res.status(500).send(err) }
        if (result[0]) {
            console.log("Email address already exists in the database.");
            res.status(409).send({ error: "This e-mail address is already registered." });
            return
        }
        const sql =
            "INSERT INTO `user` (`email`, `password`) VALUES (?,?)";

        connection.query(sql, [email, hashed_password], function (err, result) {
            if (err) { res.status(500).send(err) }
            console.log("User successfully created.")
            res.status(201).send();
        })
        console.log("Email: " + email + " \nPassword: " + password);
    })
}

exports.loginUser = async (req, res) => {
    const user_email = req.body.email;

    if (!helper.validateEmail(user_email)) {
        res.status(400).send("This e-mail is invalid.");
        return
    }

    console.log("Logging in " + user_email)

    const sql =
        'SELECT * FROM user WHERE email = ?';

    connection.query(sql, user_email, async (err, result) => {
        if (err) { res.status(500).send(err) }
        const user = result[0]
        if (user == null) {
            return res.status(404).send("Incorrect Credentials.")
        }
        try {
            if (await bcrypt.compare(req.body.password, user.password)) {
                console.log("SUCCESS")
                return res.status(200).send("" + user.userID)
            }
            else {
                console.log("FAIL")
                return res.status(404).send('Incorrect Credentials.')
            }
        }
        catch (err) {
            res.status(500).send(err)
        }
    })
}

exports.getUser = async (req, res) => {
    const uid = req.params.uid;
    console.log("User ID: " + uid)
    const sql =
        `SELECT * FROM user
    JOIN location
    ON user.location_id = location.locationID
    WHERE userID = ?`

    connection.query(sql, uid, function (err, result) {
        if (err) { res.status(500).send(err) }
        res.status(200).send(result)
    })
}

exports.updateUserLocation = async (req, res) => {
    const uid = req.params.uid;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;

    const sql =
        `SELECT * FROM user WHERE userID = ?`;

    connection.query(sql, uid, (err, result) => {
        if (err) { res.status(500).send(err) }
        const user = result[0]
        if (user.location_id == 0) {
            console.log("No current user location found. Adding new location" + latitude, longitude)
            // insert new location record and give its ID to user.location_id
            const sql =
                `INSERT INTO location (latitude, longitude) VALUES (?,?)`;
            connection.query(sql, [latitude, longitude], (err, result) => {
                if (err) { console.log(err) };
                console.log("Insert ID: " + result.insertId)
                const sql =
                    `UPDATE user SET location_id = last_insert_id() WHERE (userID = ?);`
                connection.query(sql, uid, (err, result) => {
                    updateConnectionDistance(uid)
                    res.status(200).send()
                })
            })

        }
        else {
            var tzoffset = (new Date()).getTimezoneOffset() * 60000;
            var datetime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1).replace('T', ' '); // DECORATOR PATTERN?? 
            console.log("UPDATING LOCATION: " + user.location_id + "\nLatitude: " + latitude + "\nLongitude: " + longitude + "\nDate: " + datetime)
            const sql =
                `UPDATE location SET latitude = '?', longitude = '?', date_time = ? WHERE (locationID = ?);`
            connection.query(sql, [latitude, longitude, datetime, user.location_id], (err, result) => {
                if (err) { res.status(500).send(err) }
                updateConnectionDistance(uid)
                res.status(200).send()
            })
        }
    })
}

exports.updateUserProfile = async (req, res) => {
    const user_id = req.params.uid
    const user_name = req.body.username
    const user_age = req.body.age

    console.log(user_id, user_name, user_age)

    if (user_name && user_age) {
        const sql =
            `UPDATE user SET username = ?, age = ? WHERE (userID = ?);`

        connection.query(sql, [user_name, user_age, user_id], (err, result) => {
            if (err) { res.status(500).send(err) }
            console.log(result)
            res.status(200).send(result)
        })
    }
    else if (user_name) {
        const sql =
            `UPDATE user SET username = ? WHERE (userID = ?);`

        connection.query(sql, [user_name, user_id], (err, result) => {
            if (err) { res.status(500).send(err) }
            console.log(result)
            res.status(200).send(result)
        })
    }
    else if (user_age) {
        const sql =
            `UPDATE user SET age = ? WHERE (userID = ?);`

        connection.query(sql, [user_age, user_id], (err, result) => {
            if (err) { res.status(500).send(err) }
            console.log(result)
            res.status(200).send(result)
        })
    }
}

exports.updateUserPassword = async (req, res) => {
    const user_id = req.params.uid
    const old_password = req.body.oldpass
    const new_password = req.body.newpass
    const hashed_password = bcrypt.hashSync(new_password, 10);

    const sql =
        'SELECT * FROM user WHERE userID = ?';

    connection.query(sql, user_id, async (err, result) => {
        if (err) { res.status(500).send(err) }
        const user = result[0]
        if (user == null) {
            return res.status(404).send("User not found")
        }
        try {
            if (await bcrypt.compare(old_password, user.password)) {
                console.log("Passwords Match!\nUpdating password...")
                const sql =
                    `UPDATE user SET password = ? WHERE (userID = ?);`

                connection.query(sql, [hashed_password, user_id], (err, result) => {
                    if (err) { res.status(500).send(err) }
                    console.log(result)
                    res.status(200).send("Password Updated!" + JSON.stringify(result))
                })
            }
            else {
                console.log("Passwords don't match")
                return res.status(404).send("Password don't match")
            }
        }
        catch (err) {
            res.status(500).send(err)
        }
    })
}

exports.changeVisibilityStatus = async (req, res) => {
    const user_id = req.params.uid

    const sql =
        `SELECT visibility_status FROM user WHERE userID = ?`
    connection.query(sql, user_id, (err, result) => {
        const visibility_status = result[0].visibility_status
        if (visibility_status == 0) {
            connection.query(`UPDATE user SET visibility_status = 1 WHERE (userID = ?);`, user_id, (err, result) => {
                res.status(200).send(result)
            })
        }
        else {
            connection.query(`UPDATE user SET visibility_status = 0 WHERE (userID = ?);`, user_id, (err, result) => {
                res.status(200).send(result)
            })
        }
    })

}

exports.updateStatusMsg = async (req, res) => {
    const user_id = req.params.uid
    const status_msg = req.body.statusmsg
    console.log(user_id, status_msg)
    sql =
        `UPDATE user SET status_msg = ? WHERE (userID = ?);`

    connection.query(sql, [status_msg, user_id], (err, result) => {
        res.status(200).send(result)
    })
}

exports.deleteUser = async (req, res) => {
    const user_id = req.params.uid

    sql =
        `DELETE FROM user WHERE (userID = ?);`

    connection.query(sql, user_id, (err, result) => {
        res.status(200).send(result)
    })
}

exports.searchUser = async (req, res) => {
    const search_user_email = ("%" + req.query.q + "%")
    console.log("Email to search: " + search_user_email)

    const sql = `SELECT * FROM user WHERE email LIKE ?`;

    connection.query(sql, search_user_email, (err, result) => {
        if (err) { res.status(500).send(err) }
        console.log(result)
        res.status(200).send(result)
    })
}

exports.sendConnectionRequest = async (req, res) => {
    const uid = req.params.uid;
    const friend_id = req.body.friend_id
    const radius = req.body.discovery_radius

    console.log("UID:" + uid + "FID:" + friend_id)

    const sql =
        `SELECT * FROM user_connection WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
    connection.query(sql, [uid, friend_id, friend_id, uid], (err, result) => {
        if (err) { res.status(500).send("Request cannot be processed.\n" + err) }
        console.log(result)
        const user_connections = result[0]
        if (user_connections == null) {
            console.log("Connection not found")
            const sql =
                `INSERT INTO user_connection (user_id, friend_id, visibility_radius) VALUES (?, ?,?);`
            connection.query(sql, [uid, friend_id, radius], (err, result) => {
                if (err) { res.status(404).send("Request cannot be processed.\n" + err) }
                res.status(201).send();
            })
        }
        else {
            res.status(200).send("Connection already exists.")
        }
    })
}

exports.acceptConnectionRequest = async (req, res) => {
    const uid = req.params.uid
    const friend_id = req.body.friend_id
    const radius = req.body.discovery_radius

    const sql =
        `SELECT * FROM user_connection WHERE (user_id = ? AND friend_id = ?);`
    connection.query(sql, [uid, friend_id, friend_id, uid], (err, result) => {
        if (err) { res.status(500).send("Request cannot be processed.\n" + err) }
        const user_connections = result[0]
        if (user_connections == null) {
            const sql =
                `INSERT INTO user_connection (user_id, friend_id, visibility_radius ,accepted) VALUES (?, ?,?,1);`

            connection.query(sql, [uid, friend_id, radius], function (err, result) {
                if (err) { res.status(500).send(err) }
                const sql =
                    `UPDATE user_connection SET accepted = '1' WHERE (user_id = ? AND friend_id = ?);`

                connection.query(sql, [friend_id, uid], (err, result) => {
                    res.status(200).send(result)
                })
            })
        }
        else {
            res.status(200).send("Connection already exists")
        }
    })
}

exports.validateUserConnection = async (req, res) => {
    const connection_id = req.params.cid

    const sql =
        `UPDATE user_connection SET validated = '1' WHERE (connection_id = ?);`

    connection.query(sql, connection_id, (err, result) => {
        res.status(200).send(result)
    })

}

exports.removeUserConnection = async (req, res) => {
    const connection_id = req.params.cid

    const sql =
        `DELETE FROM user_connection WHERE (connection_id = ?);`

    connection.query(sql, connection_id, (err, result) => {
        res.status(200).send(result)
    })

}

exports.updateVisibilityRadius = async (req, res) => {
    const connection_id = req.params.cid
    const radius = req.body.radius

    const sql =
        `UPDATE user_connection SET visibility_radius = ? WHERE (connection_id = ?);`

    connection.query(sql, [radius, connection_id], (err, result) => {
        res.status(200).send(result)
    })

}

exports.createMeeting = async (req, res) => {
    const connection_id = req.params.cid
    const location_id = req.query.lid
    console.log(connection_id, location_id)

    const sql =
        `SELECT * FROM meeting WHERE user_connection_id = ? AND end_time IS NULL`

    connection.query(sql, connection_id, (err, result) => {
        console.log(result)
        if (result[0]) {
            res.sendStatus(409).send()
        }
        else {
            const sql =
                `SELECT * FROM user_connection WHERE connection_id = ?;`
            connection.query(sql, connection_id, (err, result) => {
                if (result[0].distance > 10) {
                    console.log("You're too far to create a meeting with this person.")
                    res.sendStatus(406).send()
                }
                else {
                    const sql =
                        `INSERT INTO meeting (user_connection_id, location_id) VALUES (?, ?);`
                    connection.query(sql, [connection_id, location_id], (err, result) => {
                        console.log(result)
                        res.sendStatus(201)
                    })
                }
            })
        }
    })
}

exports.showAllMeetings = async (req, res) => {
    const uid = req.params.uid

    const sql =
        `SELECT * FROM meeting as m
    JOIN user_connection as uc
    ON m.user_connection_id = uc.connection_id
    WHERE uc.user_id = ?;`

    connection.query(sql, uid, (err, result) => {
        res.status(200).send(result)
    })

}

exports.showUserConnections = async (req, res) => {
    const uid = req.params.uid
    console.log("User" + uid + " connections list: ")
    const sql =
        `SELECT uc.connection_id, uc.friend_id, u.username , uc.distance, uc.social_score, uc.validated, uc.accepted, uc.visibility_radius FROM user_connection as uc
        JOIN user as u 
        ON uc.friend_id = u.userID
        WHERE user_id = ?;`
    connection.query(sql, uid, (err, result) => {
        if (err) { res.status(500).send(err) }
        const query_result = result
        result.forEach(connection => {
            console.log(connection)
        });
        res.status(200).send(query_result)
    })
}

exports.validateUserConnection = async (req, res) => {
    const cid = req.params.cid
    console.log("Connection ID" + cid)
    const sql =
        `UPDATE user_connection SET validated = '1' WHERE (connection_id = ?);`

    connection.query(sql, cid, (err, result) => {
        if (err) { res.status(500).send(err) }
        const query_result = result
        res.sendStatus(200)
    })
}

exports.finishMeeting = async (req, res) => {
    const meeting_id = req.params.mid
    console.log("Meeting ID" + meeting_id)



    const sql =
        `SELECT * FROM meeting WHERE meeting_id = ? AND end_time IS NULL`
    connection.query(sql, meeting_id, (err, result) => {
        if (err) { res.status(500).send(err) }
        if (!result[0]) {
            res.status(200).send("Meeting already finished.")
        }
        else {
            console.log("FINISH THE MEETING")

            const sql =
                `UPDATE meeting SET end_time = ? WHERE (meeting_id = ?);`
            var tzoffset = (new Date()).getTimezoneOffset() * 60000;
            var datetime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1).replace('T', ' '); // DECORATOR PATTERN?? 

            connection.query(sql, [datetime, meeting_id], (err, result) => {
                if (err) { res.status(500).send(err) }
                const sql =
                    `SELECT * FROM meeting AS m JOIN user_connection AS uc ON 
                    m.user_connection_id = uc.connection_id
                    WHERE meeting_id = ?`
                connection.query(sql, meeting_id, (err, result) => {
                    if (err) { console.log(err) }
                    const user_1 = result[0].user_id
                    const user_2 = result[0].friend_id
                    const start_time = result[0].start_time
                    const end_time = result[0].end_time
                    const connection_id = result[0].user_connection_id
                    console.log(start_time, end_time)
                    const meeting_time = helper.calculateTime(start_time, end_time)
                    console.log("Meeting Time: " + meeting_time)
                    updateMeetingDuration(meeting_id, meeting_time, (err, result) => {
                        if (err) { console.log(err) }
                    })
                    updateUserSocialScore(user_1, meeting_time, (err, result) => {
                        if (err) { console.log(err) }
                    })
                    updateConnectionSocialScore(connection_id, meeting_time, (err, result) => {
                        if (err) { console.log(err) }
                    })
                    updateUserSocialScore(user_2, meeting_time, (err, result) => {
                        if (err) { console.log(err) }
                    })
                    res.sendStatus(200)
                })
            })
        }
    })
}

exports.addSpecialEventToMeeting = async (req, res) => {
    const meeting_id = req.params.mid
    const special_event_id = req.query.sid
    console.log("Meeting ID" + meeting_id + "\nSID: " + special_event_id)
    const sql =
        `UPDATE meeting SET special_event_id = ? WHERE (meeting_id = ?);`

    connection.query(sql, [special_event_id, meeting_id], (err, result) => {
        if (err) { res.status(500).send(err) }
        const query_result = result
        res.sendStatus(200)
    })
}

exports.showCurrentSpecialEvents = async (req, res) => {
    sql = `SELECT * FROM special_event WHERE end_date > current_time();`
    connection.query(sql, (err, result) => {
        res.status(200).send(result)
    })
}

exports.showSpecialEvent = async (req, res) => {
    const spid = req.params.spid
    sql = `SELECT * FROM special_event WHERE special_event_id = ?;`
    connection.query(sql, spid, (err, result) => {
        if (err) { return res.status(500).send(err) }
        if (!result[0]) { return res.status(404).send("Event not found.") }
        res.status(200).send(result)
    })
}

exports.getDistance = async (req, res) => {
    const lid1 = req.query.lid1
    const lid2 = req.query.lid2
    console.log(lid1, lid2)
    const sql =
        `SELECT * FROM location WHERE (locationID = ? OR locationID = ?);`

    connection.query(sql, [lid1, lid2], (err, result) => {
        const location_1 = result[0]
        const location_2 = result[1]

        let distance = helper.checkDistance(location_1.latitude, location_1.longitude, location_2.latitude, location_2.longitude)
        distance = distance * 1000
        console.log(err || "Location A and Location B are " + distance + " metres away.")
        // if (distance < 5) {
        //     console.log("You're close!!")
        // }
        // else {
        //     console.log("You're too far to complete this action.")
        // }
        res.status(200).send(result)
    })
}

updateUserSocialScore = async (uid, social_score, callback) => {
    console.log("Function Called with UID:" + uid + "\nSocialScore:" + social_score)
    sql =
        `UPDATE user SET social_score = (social_score + ?) WHERE (userID = ?);`
    connection.query(sql, [social_score, uid], (err, result) => {
        callback(err, result)
    })
}

updateConnectionSocialScore = async (cid, social_score, callback) => {
    console.log("Function Called with CID:" + cid + "\nSocialScore:" + social_score)
    sql =
        `UPDATE user_connection SET social_score = (social_score + ?) WHERE (connection_id = ?);`
    connection.query(sql, [social_score, cid], (err, result) => {
        callback(err, result)
    })
}

updateMeetingDuration = async (mid, duration, callback) => {
    console.log("Function Called with MID:" + mid + "\nDuration:" + duration)
    sql =
        `UPDATE meeting SET duration = ? WHERE (meeting_id = ?);`
    connection.query(sql, [duration, mid], (err, result) => {
        callback(err, result)
    })
}

updateConnectionDistance = async (uid) => {
    const user_id = uid
    const sql =
        `SELECT * FROM user_connection WHERE user_id = ?;`
    connection.query(sql, user_id, (err, result) => {
        if (err) { res.status(500).send(err) }
        const connections = result
        connections.forEach(userconnection => {
            const sql =
                `SELECT uc.connection_id, uc.user_id, uc.friend_id, uc.distance,
                u.location_id as 'User Location ID', l.latitude as 'User latitude', l.longitude as 'User longitude', 
                f.location_id as 'Friend Location ID', fl.latitude as 'Friend latitude', fl.longitude as 'Friend longitude'
                FROM user_connection as uc
                JOIN user as u ON uc.user_id = u.userID
                JOIN user as f on uc.friend_id = f.userID
                JOIN location as l on u.location_id = l.locationID
                JOIN location as fl on f.location_id = fl.locationID
                WHERE uc.connection_id = ?`

            connection.query(sql, userconnection.connection_id, (err, result) => {
                if (err) { res.status(500).send(err) }
                const query_result = result[0]
                // console.log(query_result)

                const my_lat = query_result["User latitude"]
                const my_long = query_result["User longitude"]
                const friend_lat = query_result["Friend latitude"]
                const friend_long = query_result["Friend longitude"]
                const distance = helper.checkDistance(my_lat, my_long, friend_lat, friend_long)
                const sql =
                    `UPDATE user_connection SET distance = ? WHERE (connection_id = ?);`
                connection.query(sql, [distance, userconnection.connection_id], (err, result) => {
                    if (err) { console.log(err) }
                    else {
                        console.log("Connection ID: " + "Distance: " + distance + "UID: " + uid)
                        // res.status(200).send()
                    }
                })
            })

        });
    })
}