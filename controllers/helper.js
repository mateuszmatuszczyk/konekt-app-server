const gps_distance = require('gps-distance')

exports.validateEmail = (email) => {
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return (true) // -- Valid     
    }
    return (false) // -- Invalid 
}

exports.checkDistance = (l1_lat, l1_long, l2_lat, l2_long) =>{
    const distance = gps_distance(l1_lat, l1_long, l2_lat, l2_long)
    console.log("Distance between {"+l1_lat+","+l1_long+"} and {"+l2_lat+","+l2_long+"} is "+distance)
    return distance 
}

exports.calculateTime = (start_time, end_time)=>{
    let time_difference = Math.abs(end_time - start_time)
    time_difference = time_difference/60000
    time_difference = Math.trunc(time_difference)
    return time_difference
}